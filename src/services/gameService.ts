import { withRoom } from "./db";
import { rollDie, rollBetterOfTwo } from "../utils/dice";
import {
  applyChaosEvent,
  detectAndApplyWinner,
  findPlayer,
  maybeActivateFinalRound,
  movePlayerBy,
  pushFeed,
  resolveLanding,
  setPositionTo,
} from "../utils/resolveTileEffect";
import { advanceTurn, endTurnOrContinue } from "../utils/turn";
import { CHAOS_EVENTS, POWER_CARD_MAP } from "../gameConfig";
import type { Player, Room } from "../types";

// ---------------------------------------------------------------------------
// Core roll logic, shared by manual rolls and the auto-roll timeout.
// MUTATES the room in place. Assumes validation already passed.
// ---------------------------------------------------------------------------
function performRoll(room: Room, cur: Player) {
  let steps: number;
  let rolls: number[] | undefined;

  if (cur.extraDiceNext) {
    cur.extraDiceNext = false;
    cur.powerCards = cur.powerCards.filter((c) => c !== "extra-dice");
    const r = rollBetterOfTwo();
    steps = r.value;
    rolls = r.rolls;
    pushFeed(room, {
      type: "dice",
      emoji: "🎲",
      message: `${cur.name} used Extra Dice (${r.rolls[0]} & ${r.rolls[1]}) and kept ${steps}.`,
    });
  } else {
    steps = rollDie();
    pushFeed(room, { type: "dice", emoji: "🎲", message: `${cur.name} rolled a ${steps}.` });
  }

  if (cur.halfMoveNext) {
    cur.halfMoveNext = false;
    const reduced = Math.max(1, Math.ceil(steps / 2));
    pushFeed(room, {
      type: "system",
      emoji: "🐢",
      message: `${cur.name} has lag — moves ${reduced} instead of ${steps}.`,
    });
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

export async function rollDice(code: string, playerId: string): Promise<void> {
  await withRoom(code, (room) => {
    if (room.status !== "active") throw new Error("The game is not active.");
    const cur = room.players[room.turnIndex];
    if (!cur) throw new Error("No current player.");
    if (cur.id !== playerId) throw new Error("It's not your turn.");
    if (room.pendingEvent) throw new Error("Resolve the current event first.");
    if (room.rolling) throw new Error("A roll is already in progress.");

    room.rolling = true;
    performRoll(room, cur);
  });
}

// Acknowledge an info / power-grant / challenge event and continue the turn.
export async function acknowledgeEvent(code: string, playerId: string): Promise<void> {
  await withRoom(code, (room) => {
    const pe = room.pendingEvent;
    if (!pe) return;
    if (!["info", "power-grant", "challenge"].includes(pe.type)) {
      throw new Error("This event can't be dismissed like that.");
    }
    if (pe.forPlayerId !== playerId) throw new Error("Only the active player can do this.");
    if (pe.type === "challenge") {
      const p = findPlayer(room, playerId);
      pushFeed(room, { type: "challenge", emoji: "🎤", message: `${p?.name ?? "Player"} completed the challenge!` });
    }
    endTurnOrContinue(room);
  });
}

// Resolve a 'collab' event by picking a target player.
export async function chooseCollabTarget(
  code: string,
  playerId: string,
  targetId: string
): Promise<void> {
  await withRoom(code, (room) => {
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
      // Revenge: the betrayed player gets a Shield (auto-armed).
      target.powerCards.push("shield");
      target.shield = true;
      pushFeed(room, {
        type: "system",
        emoji: "🗡️",
        message: `${actor.name} betrayed ${target.name} (back 3) — but ${target.name} got a Shield for revenge!`,
      });
    } else {
      // help
      movePlayerBy(room, target, 3);
      actor.stats.timesSaved += 1;
      pushFeed(room, {
        type: "system",
        emoji: "🤝",
        message: `${actor.name} helped ${target.name} forward 3 tiles!`,
      });
      detectAndApplyWinner(room);
    }
    if (room.status !== "completed") endTurnOrContinue(room);
  });
}

// Play a usable power card from your hand (only on your turn, before rolling).
export async function usePowerCard(
  code: string,
  playerId: string,
  cardId: string,
  targetId?: string
): Promise<void> {
  await withRoom(code, (room) => {
    if (room.status !== "active") throw new Error("The game is not active.");
    if (!room.settings.powerCardsEnabled) throw new Error("Power cards are disabled in this room.");
    const cur = room.players[room.turnIndex];
    if (!cur || cur.id !== playerId) throw new Error("You can only use cards on your turn.");
    if (room.pendingEvent) throw new Error("Resolve the current event first.");
    if (room.rolling) throw new Error("Wait for the current roll to finish.");

    const def = POWER_CARD_MAP[cardId];
    if (!def) throw new Error("Unknown card.");
    if (!def.usable) throw new Error("That card activates automatically — you can't play it.");
    if (!cur.powerCards.includes(cardId)) throw new Error("You don't have that card.");

    const target = targetId ? findPlayer(room, targetId) : undefined;
    if (def.needsTarget && (!target || target.id === cur.id)) {
      throw new Error("Choose a valid target player.");
    }

    switch (cardId) {
      case "extra-dice":
        cur.extraDiceNext = true;
        pushFeed(room, { type: "power", emoji: "🎲", message: `${cur.name} armed Extra Dice for this roll.` });
        break;
      case "friendship-tax":
        movePlayerBy(room, target!, -2);
        movePlayerBy(room, cur, 2);
        cur.powerCards = cur.powerCards.filter((c) => c !== cardId);
        pushFeed(room, { type: "power", emoji: "🤲", message: `${cur.name} taxed ${target!.name}: +2 to ${cur.name}, -2 to ${target!.name}.` });
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
        const def2 = CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)];
        cur.powerCards = cur.powerCards.filter((c) => c !== cardId);
        pushFeed(room, { type: "power", emoji: "💣", message: `${cur.name} detonated a Chaos Bomb!` });
        // Apply a random immediate-ish chaos to the user; vote/betrayal chaos
        // would create a pending event, which is fine — it pauses for them.
        const ev = applyChaosEvent(room, cur, def2);
        if (ev.type === "vote" || ev.type === "collab") {
          room.pendingEvent = ev;
        }
        break;
      }
      default:
        throw new Error("That card can't be played right now.");
    }

    cur.stats.powerCardsUsed += 1;
    detectAndApplyWinner(room);
  });
}

// Lightweight in-game reaction (emoji) shown in the feed.
export async function sendReaction(
  code: string,
  playerId: string,
  emoji: string
): Promise<void> {
  await withRoom(code, (room) => {
    const p = findPlayer(room, playerId);
    if (!p) return;
    pushFeed(room, { type: "reaction", emoji, message: `${p.name} reacted ${emoji}` });
  });
}

// Called by the client when its local turn timer hits zero. Safe to call from
// multiple clients — the turnStartedAt / pendingEvent checks make it idempotent.
export async function forceTimeoutTurn(
  code: string,
  expectedPlayerId: string
): Promise<void> {
  await withRoom(code, (room) => {
    if (room.status !== "active") return;
    const timerMs = room.settings.turnTimerSeconds * 1000;
    const grace = 1200;
    const now = Date.now();

    const pe = room.pendingEvent;
    if (pe) {
      // Votes are resolved by voteService; here we only auto-resolve the
      // single-player events (info/challenge/collab/power-grant) if abandoned.
      if (pe.type === "vote") return;
      if (now - room.turnStartedAt < timerMs + grace) return;
      pushFeed(room, { type: "system", emoji: "⌛", message: "Event timed out — moving on." });
      endTurnOrContinue(room);
      return;
    }

    const cur = room.players[room.turnIndex];
    if (!cur || cur.id !== expectedPlayerId) return; // stale call
    if (now - room.turnStartedAt < timerMs + grace) return; // not actually expired

    if (room.settings.timeoutAction === "auto-roll") {
      pushFeed(room, { type: "system", emoji: "⌛", message: `${cur.name} ran out of time — auto-rolling.` });
      room.rolling = true;
      performRoll(room, cur);
    } else {
      pushFeed(room, { type: "system", emoji: "⌛", message: `${cur.name} ran out of time — turn skipped.` });
      advanceTurn(room);
    }
  });
}
