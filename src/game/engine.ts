import type { Player, Room } from "../types";
import type { Action } from "../net/protocol";
import { makePlayer, makeRoom, emptyStats } from "../services/factories";
import { pickAvatar, pickColor } from "../utils/identity";
import { generateBoard } from "../utils/board";
import { rollDie, rollBetterOfTwo } from "../utils/dice";
import {
  CHALLENGE_PROMPTS,
  CHAOS_EVENTS,
  MAX_PLAYERS,
  POWER_CARD_MAP,
  VOTE_EVENTS,
} from "../gameConfig";
import {
  applyChaosEvent,
  detectAndApplyWinner,
  findPlayer,
  maybeActivateFinalRound,
  movePlayerBy,
  pushFeed,
  resolveLanding,
  setPositionTo,
  uid,
} from "../utils/resolveTileEffect";
import { advanceTurn, endTurnOrContinue } from "../utils/turn";

// ===========================================================================
// HOST-AUTHORITATIVE GAME ENGINE
// Pure functions that mutate a plain Room object. The host runs these and
// broadcasts the result; clients never run them. Validation failures throw
// Error(message) — the host relays the message back to the acting client.
// ===========================================================================

export function createRoom(code: string, hostId: string, hostName: string): Room {
  const host = makePlayer({
    id: hostId,
    name: (hostName || "Host").trim().slice(0, 14) || "Host",
    avatar: "🦊",
    color: "#f97316",
    isHost: true,
  });
  return makeRoom({ code, host });
}

// --- presence / membership -------------------------------------------------

export function addOrReconnectPlayer(room: Room, playerId: string, rawName: string) {
  const name = (rawName || "").trim().slice(0, 14);
  if (!name) throw new Error("Please enter a name.");

  const existing = room.players.find((p) => p.id === playerId);
  if (existing) {
    existing.connected = true;
    existing.lastSeen = Date.now();
    return;
  }
  if (room.status === "active") throw new Error("This game is already in progress.");
  if (room.status === "completed") throw new Error("This game has finished.");
  if (room.players.length >= MAX_PLAYERS) throw new Error(`Room is full (max ${MAX_PLAYERS}).`);
  if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase()))
    throw new Error("That name is taken in this room.");

  const player = makePlayer({
    id: playerId,
    name,
    avatar: pickAvatar(room.players),
    color: pickColor(room.players),
    isHost: false,
  });
  room.players.push(player);
  pushFeed(room, { type: "system", emoji: player.avatar, message: `${name} joined the room.` });
}

export function markDisconnected(room: Room, playerId: string) {
  const p = findPlayer(room, playerId);
  if (!p) return;
  p.connected = false;
  p.lastSeen = Date.now();
  pushFeed(room, { type: "system", emoji: "📴", message: `${p.name} disconnected.` });
}

function removePlayer(room: Room, playerId: string) {
  const idx = room.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return;
  const leaving = room.players[idx];
  if (leaving.isHost) return; // host can't leave its own authoritative room
  if (room.status === "waiting") {
    room.players.splice(idx, 1);
  } else {
    leaving.connected = false;
  }
  // If it was their turn, keep the game moving.
  if (room.status === "active" && room.players[room.turnIndex]?.id === playerId) {
    advanceTurn(room);
  } else if (room.turnIndex >= room.players.length) {
    room.turnIndex = 0;
  }
  pushFeed(room, { type: "system", emoji: "👋", message: `${leaving.name} left.` });
}

// --- the action reducer ----------------------------------------------------

export function applyAction(room: Room, playerId: string, action: Action) {
  switch (action.kind) {
    case "start":
      return doStart(room, playerId);
    case "restart":
      return doRestart(room, playerId);
    case "updateSettings":
      return doUpdateSettings(room, playerId, action.settings);
    case "kick":
      return doKick(room, playerId, action.targetId);
    case "roll":
      return doRoll(room, playerId);
    case "acknowledge":
      return doAcknowledge(room, playerId);
    case "collab":
      return doCollab(room, playerId, action.targetId);
    case "usePower":
      return doUsePower(room, playerId, action.cardId, action.targetId);
    case "vote":
      return doVote(room, playerId, action.optionId);
    case "reaction":
      return doReaction(room, playerId, action.emoji);
    case "leave":
      return removePlayer(room, playerId);
  }
}

function requireHost(room: Room, playerId: string) {
  if (room.hostId !== playerId) throw new Error("Only the host can do that.");
}

function doStart(room: Room, playerId: string) {
  requireHost(room, playerId);
  if (room.status === "active") throw new Error("Game already started.");
  if (room.players.length < 2) throw new Error("Need at least 2 players to start.");
  room.status = "active";
  room.turnIndex = 0;
  room.turnStartedAt = Date.now();
  room.rolling = false;
  room.pendingEvent = null;
  room.winnerId = null;
  room.ranking = [];
  pushFeed(room, { type: "system", emoji: "🚀", message: `Game on! ${room.players[0].name} goes first.` });
}

function doRestart(room: Room, playerId: string) {
  requireHost(room, playerId);
  room.status = "waiting";
  room.board = generateBoard();
  room.turnIndex = 0;
  room.turnStartedAt = 0;
  room.rolling = false;
  room.lastRoll = null;
  room.pendingEvent = null;
  room.votes = {};
  room.winnerId = null;
  room.ranking = [];
  room.advanced = { finalRoundChaos: false };
  room.players.forEach((p) => {
    p.position = 0;
    p.powerCards = [];
    p.skipNextTurn = false;
    p.halfMoveNext = false;
    p.shield = false;
    p.ladderInsurance = false;
    p.extraDiceNext = false;
    p.rollAgain = false;
    p.stats = emptyStats();
  });
  pushFeed(room, { type: "system", emoji: "🔄", message: "New game! Back to the lobby." });
}

function doUpdateSettings(room: Room, playerId: string, settings: Partial<Room["settings"]>) {
  requireHost(room, playerId);
  if (room.status !== "waiting") throw new Error("Settings can only change in the lobby.");
  room.settings = { ...room.settings, ...settings };
}

function doKick(room: Room, playerId: string, targetId: string) {
  requireHost(room, playerId);
  if (targetId === room.hostId) throw new Error("Host can't kick themselves.");
  const target = findPlayer(room, targetId);
  if (!target) return;
  const wasCurrent = room.players[room.turnIndex]?.id === targetId;
  room.players = room.players.filter((p) => p.id !== targetId);
  if (room.turnIndex >= room.players.length) room.turnIndex = 0;
  if (wasCurrent && room.status === "active") {
    room.pendingEvent = null;
    room.rolling = false;
    room.turnStartedAt = Date.now();
  }
  pushFeed(room, { type: "system", emoji: "👋", message: `${target.name} was removed by the host.` });
}

// --- core play -------------------------------------------------------------

function performRoll(room: Room, cur: Player) {
  let steps: number;
  let rolls: number[] | undefined;

  if (cur.extraDiceNext) {
    cur.extraDiceNext = false;
    cur.powerCards = cur.powerCards.filter((c) => c !== "extra-dice");
    const r = rollBetterOfTwo();
    steps = r.value;
    rolls = r.rolls;
    pushFeed(room, { type: "dice", emoji: "🎲", message: `${cur.name} used Extra Dice (${r.rolls[0]} & ${r.rolls[1]}) and kept ${steps}.` });
  } else {
    steps = rollDie();
    pushFeed(room, { type: "dice", emoji: "🎲", message: `${cur.name} rolled a ${steps}.` });
  }

  if (cur.halfMoveNext) {
    cur.halfMoveNext = false;
    const reduced = Math.max(1, Math.ceil(steps / 2));
    pushFeed(room, { type: "system", emoji: "🐢", message: `${cur.name} has lag — moves ${reduced} instead of ${steps}.` });
    steps = reduced;
  }

  room.lastRoll = { playerId: cur.id, value: steps, rolls, ts: Date.now() };
  movePlayerBy(room, cur, steps);
  maybeActivateFinalRound(room);

  const ev = resolveLanding(room, cur);
  if (room.status === "completed") return;
  if (ev) {
    room.pendingEvent = ev;
    room.rolling = false;
  } else {
    endTurnOrContinue(room);
  }
}

function doRoll(room: Room, playerId: string) {
  if (room.status !== "active") throw new Error("The game is not active.");
  const cur = room.players[room.turnIndex];
  if (!cur) throw new Error("No current player.");
  if (cur.id !== playerId) throw new Error("It's not your turn.");
  if (room.pendingEvent) throw new Error("Resolve the current event first.");
  if (room.rolling) throw new Error("A roll is already in progress.");
  room.rolling = true;
  performRoll(room, cur);
}

function doAcknowledge(room: Room, playerId: string) {
  const pe = room.pendingEvent;
  if (!pe) return;
  if (!["info", "power-grant"].includes(pe.type)) {
    throw new Error("That event can't be dismissed like that.");
  }
  if (pe.forPlayerId !== playerId) throw new Error("Only the active player can continue.");
  endTurnOrContinue(room);
}

function doCollab(room: Room, playerId: string, targetId: string) {
  const pe = room.pendingEvent;
  if (!pe || pe.type !== "collab") throw new Error("No collab choice is pending.");
  if (pe.forPlayerId !== playerId) throw new Error("Only the active player can choose.");
  const actor = findPlayer(room, playerId);
  const target = findPlayer(room, targetId);
  if (!actor || !target) throw new Error("Invalid target.");
  if (target.id === actor.id) throw new Error("Pick someone else.");

  if (pe.collabKind === "hurt") {
    movePlayerBy(room, target, -3);
    target.stats.timesBetrayed += 1;
    target.powerCards.push("shield");
    target.shield = true;
    pushFeed(room, { type: "system", emoji: "🗡️", message: `${actor.name} betrayed ${target.name} (back 3) — but ${target.name} got a Shield for revenge!` });
  } else {
    movePlayerBy(room, target, 3);
    actor.stats.timesSaved += 1;
    pushFeed(room, { type: "system", emoji: "🤝", message: `${actor.name} helped ${target.name} forward 3 tiles!` });
    detectAndApplyWinner(room);
  }
  if (room.status !== "completed") endTurnOrContinue(room);
}

function doUsePower(room: Room, playerId: string, cardId: string, targetId?: string) {
  if (room.status !== "active") throw new Error("The game is not active.");
  if (!room.settings.powerCardsEnabled) throw new Error("Power cards are disabled.");
  const cur = room.players[room.turnIndex];
  if (!cur || cur.id !== playerId) throw new Error("You can only use cards on your turn.");
  if (room.pendingEvent) throw new Error("Resolve the current event first.");
  if (room.rolling) throw new Error("Wait for the roll to finish.");

  const def = POWER_CARD_MAP[cardId];
  if (!def) throw new Error("Unknown card.");
  if (!def.usable) throw new Error("That card activates automatically.");
  if (!cur.powerCards.includes(cardId)) throw new Error("You don't have that card.");

  const target = targetId ? findPlayer(room, targetId) : undefined;
  if (def.needsTarget && (!target || target.id === cur.id)) throw new Error("Choose a valid target.");

  switch (cardId) {
    case "extra-dice":
      cur.extraDiceNext = true;
      pushFeed(room, { type: "power", emoji: "🎲", message: `${cur.name} armed Extra Dice for this roll.` });
      break;
    case "friendship-tax":
      movePlayerBy(room, target!, -2);
      movePlayerBy(room, cur, 2);
      cur.powerCards = cur.powerCards.filter((c) => c !== cardId);
      pushFeed(room, { type: "power", emoji: "🤲", message: `${cur.name} taxed ${target!.name}: +2 / -2.` });
      break;
    case "swap-token": {
      const a = cur.position;
      setPositionTo(room, cur, target!.position);
      setPositionTo(room, target!, a);
      cur.powerCards = cur.powerCards.filter((c) => c !== cardId);
      pushFeed(room, { type: "power", emoji: "🔁", message: `${cur.name} swapped tokens with ${target!.name}!` });
      break;
    }
    case "chaos-bomb": {
      const d = CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)];
      cur.powerCards = cur.powerCards.filter((c) => c !== cardId);
      pushFeed(room, { type: "power", emoji: "💣", message: `${cur.name} detonated a Chaos Bomb!` });
      const ev = applyChaosEvent(room, cur, d);
      if (ev.type === "vote" || ev.type === "collab") room.pendingEvent = ev;
      break;
    }
    default:
      throw new Error("That card can't be played right now.");
  }
  cur.stats.powerCardsUsed += 1;
  detectAndApplyWinner(room);
}

function doReaction(room: Room, playerId: string, emoji: string) {
  const p = findPlayer(room, playerId);
  if (!p) return;
  const safe = (emoji || "👍").slice(0, 4);
  pushFeed(room, { type: "reaction", emoji: safe, message: `${p.name} reacted ${safe}` });
}

// --- voting + challenges ---------------------------------------------------

function doVote(room: Room, playerId: string, optionId: string) {
  const pe = room.pendingEvent;
  if (!pe || (pe.type !== "vote" && pe.type !== "challenge")) throw new Error("There's no vote right now.");
  if (!pe.options?.some((o) => o.id === optionId)) throw new Error("Invalid option.");
  if (!findPlayer(room, playerId)) throw new Error("You're not in this room.");
  if (pe.voterScope === "others" && playerId === pe.forPlayerId) {
    throw new Error("You can't judge your own performance!");
  }

  if (!room.votes[pe.id]) room.votes[pe.id] = {};
  room.votes[pe.id][playerId] = optionId;

  const eligible =
    pe.voterScope === "others"
      ? room.players.filter((p) => p.id !== pe.forPlayerId)
      : room.players;
  const votedEligible = eligible.filter((p) => room.votes[pe.id][p.id]).length;
  if (votedEligible >= eligible.length) resolveVote(room);
}

function resolveVote(room: Room) {
  const pe = room.pendingEvent;
  if (!pe || (pe.type !== "vote" && pe.type !== "challenge") || !pe.options) return;

  const eligible =
    pe.voterScope === "others"
      ? room.players.filter((p) => p.id !== pe.forPlayerId)
      : room.players;
  const eligibleIds = new Set(eligible.map((p) => p.id));
  const cast = room.votes[pe.id] || {};
  const counts: Record<string, number> = {};
  pe.options.forEach((o) => (counts[o.id] = 0));
  let totalCast = 0;
  for (const [voterId, optionId] of Object.entries(cast)) {
    if (eligibleIds.has(voterId) && optionId in counts) {
      counts[optionId] += 1;
      totalCast += 1;
    }
  }

  const target = findPlayer(room, pe.forPlayerId);
  delete room.votes[pe.id];
  if (!target) {
    endTurnOrContinue(room);
    return;
  }

  // --- peer-judged challenge ---
  if (pe.type === "challenge") {
    const good = counts["good"] || 0;
    const bad = counts["bad"] || 0;
    if (totalCast === 0) {
      pushFeed(room, { type: "challenge", emoji: "🤷", message: `No one judged ${target.name}'s challenge — they're off the hook.` });
    } else if (good >= bad) {
      movePlayerBy(room, target, 3);
      pushFeed(room, { type: "challenge", emoji: "🎉", message: `The crowd approved! ${target.name} moves forward 3.` });
    } else {
      movePlayerBy(room, target, -2);
      pushFeed(room, { type: "challenge", emoji: "🙅", message: `Tough crowd. ${target.name} moves back 2.` });
    }
    detectAndApplyWinner(room);
    if (room.status !== "completed") endTurnOrContinue(room);
    return;
  }

  // --- standard vote ---
  let winnerId = pe.options[0].id;
  let best = -1;
  for (const opt of pe.options) {
    if (counts[opt.id] > best) {
      best = counts[opt.id];
      winnerId = opt.id;
    }
  }

  const def = VOTE_EVENTS.find((v) => v.id === pe.grantedCardId);
  let effect: "back" | "forward" | "challenge" | "nothing" = "nothing";
  let amount = 0;
  if (def) {
    const opt = def.options.find((o) => o.id === winnerId);
    if (opt) {
      effect = opt.effect;
      amount = opt.amount ?? 0;
    }
  } else if (winnerId === "back3") {
    effect = "back";
    amount = 3;
  } else if (winnerId === "challenge") {
    effect = "challenge";
  }

  if (effect === "challenge") {
    const prompts = CHALLENGE_PROMPTS[room.settings.challengeMode];
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    pushFeed(room, { type: "vote", emoji: "🎤", message: `The people demand a challenge from ${target.name}!` });
    room.pendingEvent = {
      id: uid("ev"),
      type: "challenge",
      title: "Challenge (by popular vote)",
      description: prompt,
      effectText: "Approve → forward 3. Reject → back 2.",
      forPlayerId: target.id,
      emoji: "🎤",
      options: [
        { id: "good", label: "👍 Nailed it" },
        { id: "bad", label: "👎 Nope" },
      ],
      voterScope: "others",
      voteEndsAt: Date.now() + 25000,
    };
    room.rolling = false;
    return;
  }

  if (effect === "back") {
    movePlayerBy(room, target, -amount);
    pushFeed(room, { type: "vote", emoji: "🗳️", message: `Vote result: ${target.name} moves back ${amount}.` });
  } else if (effect === "forward") {
    movePlayerBy(room, target, amount);
    pushFeed(room, { type: "vote", emoji: "🗳️", message: `Vote result: ${target.name} moves forward ${amount}.` });
  } else {
    pushFeed(room, { type: "vote", emoji: "🕊️", message: `Vote result: ${target.name} is pardoned.` });
  }
  detectAndApplyWinner(room);
  if (room.status !== "completed") endTurnOrContinue(room);
}

// --- host timer loop -------------------------------------------------------

// Returns true if anything changed (so the host knows to broadcast).
export function tickTimers(room: Room): boolean {
  if (room.status !== "active") return false;
  const now = Date.now();
  const timerMs = room.settings.turnTimerSeconds * 1000;
  const grace = 1000;

  const pe = room.pendingEvent;
  if (pe) {
    if ((pe.type === "vote" || pe.type === "challenge") && pe.voteEndsAt && now >= pe.voteEndsAt) {
      resolveVote(room);
      return true;
    }
    // Abandoned single-player events (info / collab / power-grant).
    if (pe.type === "collab" || pe.type === "info" || pe.type === "power-grant") {
      if (now - room.turnStartedAt > timerMs + grace + 4000) {
        pushFeed(room, { type: "system", emoji: "⌛", message: "Event timed out — moving on." });
        endTurnOrContinue(room);
        return true;
      }
    }
    return false;
  }

  const cur = room.players[room.turnIndex];
  if (!cur) return false;
  if (now - room.turnStartedAt > timerMs + grace) {
    if (room.settings.timeoutAction === "auto-roll") {
      pushFeed(room, { type: "system", emoji: "⌛", message: `${cur.name} ran out of time — auto-rolling.` });
      room.rolling = true;
      performRoll(room, cur);
    } else {
      pushFeed(room, { type: "system", emoji: "⌛", message: `${cur.name} ran out of time — turn skipped.` });
      advanceTurn(room);
    }
    return true;
  }
  return false;
}
