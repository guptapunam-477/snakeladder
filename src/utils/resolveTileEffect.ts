import type { FeedItem, PendingEvent, Player, Room } from "../types";
import {
  BOARD_SIZE,
  CHALLENGE_PROMPTS,
  CHAOS_EVENTS,
  EXACT_ROLL_REQUIRED,
  FEED_LIMIT,
  FINAL_ROUND_TILE,
  POWER_CARDS,
  VOTE_EVENTS,
  type ChaosEventDef,
} from "../gameConfig";
import { rankingIds } from "./ranking";

// ---------------------------------------------------------------------------
// Pure-ish game logic. Every function here MUTATES the plain Room object held
// by the authoritative host. Nothing here touches the network — that keeps the
// rules testable and deterministic.
// ---------------------------------------------------------------------------

let idCounter = 0;
export function uid(prefix = "id"): string {
  idCounter = (idCounter + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}_${Math.floor(
    Math.random() * 1e4
  ).toString(36)}`;
}

export function findPlayer(room: Room, id: string): Player | undefined {
  return room.players.find((p) => p.id === id);
}

export function pushFeed(room: Room, item: Omit<FeedItem, "id" | "ts">) {
  const feedItem: FeedItem = { id: uid("f"), ts: Date.now(), ...item };
  room.feed.push(feedItem);
  if (room.feed.length > FEED_LIMIT) {
    room.feed = room.feed.slice(room.feed.length - FEED_LIMIT);
  }
}

function clamp(pos: number): number {
  if (pos < 0) return 0;
  if (pos > BOARD_SIZE) return BOARD_SIZE;
  return pos;
}

// Move a player by a relative number of steps (can be negative).
export function movePlayerBy(room: Room, player: Player, steps: number) {
  setPositionTo(room, player, player.position + steps);
}

// Move a player to an absolute tile, updating stats. Handles overshoot rule.
// (room is accepted for signature symmetry with movePlayerBy / future hooks.)
export function setPositionTo(_room: Room, player: Player, target: number) {
  let next = target;
  if (!EXACT_ROLL_REQUIRED && next > BOARD_SIZE) next = BOARD_SIZE;
  next = clamp(next);
  const delta = next - player.position;
  if (delta > 0) player.stats.forwardTiles += delta;
  if (delta < 0) player.stats.backwardTiles += -delta;
  player.position = next;
  if (next > player.stats.maxPosition) player.stats.maxPosition = next;
}

// Activate the "final round chaos" flag once anyone crosses tile 40.
export function maybeActivateFinalRound(room: Room) {
  if (!room.advanced.finalRoundChaos) {
    if (room.players.some((p) => p.position >= FINAL_ROUND_TILE)) {
      room.advanced.finalRoundChaos = true;
      pushFeed(room, {
        type: "system",
        emoji: "🔥",
        message: "Final Round Chaos activated! Things get spicier from here.",
      });
    }
  }
}

// Returns true and finalizes the room if someone has reached the finish tile.
export function detectAndApplyWinner(room: Room): boolean {
  const winner = room.players.find((p) => p.position >= BOARD_SIZE);
  if (!winner) return false;
  room.status = "completed";
  room.winnerId = winner.id;
  room.pendingEvent = null;
  room.rolling = false;
  room.ranking = rankingIds(room.players, winner.id);
  pushFeed(room, {
    type: "system",
    emoji: "🏆",
    message: `${winner.name} reached the top of the Chaos Ladder and WON!`,
  });
  return true;
}

function nearestPlayer(room: Room, player: Player): Player | undefined {
  let best: Player | undefined;
  let bestDist = Infinity;
  for (const p of room.players) {
    if (p.id === player.id) continue;
    const d = Math.abs(p.position - player.position);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

function isLeading(room: Room, player: Player): boolean {
  const max = Math.max(...room.players.map((p) => p.position));
  return player.position === max && room.players.filter((p) => p.position === max).length === 1;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// CHAOS resolution. Returns a PendingEvent if the chaos needs interaction
// (vote / collab), otherwise applies immediately and returns an "info" event.
// ---------------------------------------------------------------------------
export function applyChaosEvent(
  room: Room,
  player: Player,
  def: ChaosEventDef
): PendingEvent {
  const baseInfo = (effectText: string): PendingEvent => ({
    id: uid("ev"),
    type: "info",
    title: def.name,
    description: def.description,
    effectText,
    forPlayerId: player.id,
    emoji: def.emoji,
  });

  switch (def.effect) {
    case "swap-nearest": {
      const other = nearestPlayer(room, player);
      if (!other) return baseInfo("Nobody nearby to swap with. Lucky you.");
      const tmp = player.position;
      setPositionTo(room, player, other.position);
      setPositionTo(room, other, tmp);
      pushFeed(room, { type: "chaos", emoji: def.emoji, message: `${player.name} swapped places with ${other.name}!` });
      return baseInfo(`You swapped positions with ${other.name}.`);
    }
    case "half-move-next": {
      player.halfMoveNext = true;
      pushFeed(room, { type: "chaos", emoji: def.emoji, message: `${player.name} has lag — half move next turn.` });
      return baseInfo("Next turn you move only HALF your dice roll.");
    }
    case "skip-next": {
      player.skipNextTurn = true;
      pushFeed(room, { type: "chaos", emoji: def.emoji, message: `${player.name} is stuck in a meeting — skip next turn.` });
      return baseInfo("You skip your next turn (this could have been an email).");
    }
    case "overconfidence-tax": {
      if (isLeading(room, player)) {
        movePlayerBy(room, player, -5);
        pushFeed(room, { type: "chaos", emoji: def.emoji, message: `${player.name} got the overconfidence tax: back 5.` });
        return baseInfo("You were leading, so: back 5 tiles.");
      }
      movePlayerBy(room, player, 2);
      pushFeed(room, { type: "chaos", emoji: def.emoji, message: `${player.name} stayed humble: forward 2.` });
      return baseInfo("You weren't leading, so: forward 2 tiles.");
    }
    case "fake-promotion": {
      movePlayerBy(room, player, 6);
      movePlayerBy(room, player, -4);
      pushFeed(room, { type: "chaos", emoji: def.emoji, message: `${player.name} got a fake promotion (+6 then -4).` });
      return baseInfo("Forward 6... then immediately back 4. Net +2.");
    }
    case "roll-again": {
      player.rollAgain = true;
      player.stats.rerolls += 1;
      pushFeed(room, { type: "chaos", emoji: def.emoji, message: `${player.name} is a lucky intern — roll again!` });
      return baseInfo("Lucky you! You get to roll again.");
    }
    case "budget-cut": {
      const ahead = room.players.filter((p) => p.position > player.position);
      ahead.forEach((p) => movePlayerBy(room, p, -2));
      pushFeed(room, { type: "chaos", emoji: def.emoji, message: `Budget cut! Everyone ahead of ${player.name} moves back 2.` });
      return baseInfo(`Everyone ahead of you (${ahead.length}) moved back 2 tiles.`);
    }
    case "viral-meme": {
      movePlayerBy(room, player, 4);
      pushFeed(room, { type: "chaos", emoji: def.emoji, message: `${player.name} went viral — forward 4!` });
      return baseInfo("You went viral! Forward 4 tiles.");
    }
    case "forward": {
      movePlayerBy(room, player, def.amount ?? 2);
      return baseInfo(`Forward ${def.amount ?? 2} tiles.`);
    }
    case "back": {
      movePlayerBy(room, player, -(def.amount ?? 2));
      return baseInfo(`Back ${def.amount ?? 2} tiles.`);
    }
    case "vote-punish": {
      // HR Complaint: everyone votes whether to punish or make them perform.
      return {
        id: uid("ev"),
        type: "vote",
        title: "HR Complaint",
        description: `A complaint was filed about ${player.name}. The people decide.`,
        effectText: "Everyone votes. Majority wins (ties favour mercy).",
        forPlayerId: player.id,
        emoji: "📝",
        options: [
          { id: "back3", label: "Send them back 3 tiles" },
          { id: "challenge", label: "Make them do a funny challenge" },
        ],
        voteEndsAt: Date.now() + 20000,
        voterScope: "all",
      };
    }
    case "betrayal": {
      // Choose a player to move back 3; they get a revenge (power) card.
      return {
        id: uid("ev"),
        type: "collab",
        title: "Best Friend Betrayal",
        description: `${player.name}, choose someone to betray. They drop back 3 — but get a revenge card.`,
        effectText: "Pick a player: they move back 3 tiles and gain a power card.",
        forPlayerId: player.id,
        emoji: "🗡️",
        collabKind: "hurt",
      };
    }
    default:
      return baseInfo("Chaos happened, but the universe shrugged.");
  }
}

// ---------------------------------------------------------------------------
// Main landing resolution. Called AFTER the dice movement has been applied.
// Sets room.pendingEvent (which pauses the turn) OR returns null to advance.
// ---------------------------------------------------------------------------
export function resolveLanding(room: Room, player: Player): PendingEvent | null {
  // Winner check first — reaching the finish ends everything.
  if (player.position >= BOARD_SIZE) {
    detectAndApplyWinner(room);
    return null;
  }

  const tile = room.board[player.position - 1];
  if (!tile || player.position <= 0) return null;

  switch (tile.type) {
    case "normal":
      return null;

    case "ladder": {
      const to = tile.to ?? player.position;
      setPositionTo(room, player, to);
      player.stats.laddersHit += 1;
      pushFeed(room, { type: "movement", emoji: "🪜", message: `${player.name} climbed a ladder to tile ${player.position}!` });
      if (detectAndApplyWinner(room)) return null;
      return {
        id: uid("ev"),
        type: "info",
        title: "Ladder!",
        description: "Up you go.",
        effectText: `You climbed to tile ${player.position}.`,
        forPlayerId: player.id,
        emoji: "🪜",
      };
    }

    case "snake": {
      let to = tile.to ?? player.position;
      // Shield blocks the snake entirely.
      if (player.shield) {
        player.shield = false;
        player.powerCards = player.powerCards.filter((c) => c !== "shield");
        pushFeed(room, { type: "power", emoji: "🛡️", message: `${player.name}'s Shield blocked a snake!` });
        return {
          id: uid("ev"), type: "info", title: "Shield Saved You!",
          description: "A snake tried to bite. Your shield said no.",
          effectText: "Shield consumed. You stay put.", forPlayerId: player.id, emoji: "🛡️",
        };
      }
      // Ladder Insurance halves the backward distance once.
      if (player.ladderInsurance) {
        player.ladderInsurance = false;
        player.powerCards = player.powerCards.filter((c) => c !== "ladder-insurance");
        const reduced = player.position - Math.round((player.position - to) / 2);
        to = reduced;
        pushFeed(room, { type: "power", emoji: "📉", message: `${player.name}'s Ladder Insurance softened the snake bite.` });
      }
      setPositionTo(room, player, to);
      player.stats.snakesHit += 1;
      pushFeed(room, { type: "movement", emoji: "🐍", message: `${player.name} hit a snake and slid to tile ${player.position}.` });
      return {
        id: uid("ev"), type: "info", title: "Snake!",
        description: "Down you go.", effectText: `You slid down to tile ${player.position}.`,
        forPlayerId: player.id, emoji: "🐍",
      };
    }

    case "chaos": {
      player.stats.chaosHit += 1;
      const def = pick(CHAOS_EVENTS);
      const ev = applyChaosEvent(room, player, def);
      detectAndApplyWinner(room);
      return room.status === "completed" ? null : ev;
    }

    case "challenge": {
      const prompt = pick(CHALLENGE_PROMPTS[room.settings.challengeMode]);
      pushFeed(room, { type: "challenge", emoji: "🎤", message: `${player.name} must perform a challenge — the others will judge!` });
      return {
        id: uid("ev"),
        type: "challenge",
        title: "Challenge — perform it live!",
        description: prompt,
        effectText: "If most of your friends approve → forward 3 tiles. If not → back 2 tiles. Stakes are real!",
        forPlayerId: player.id,
        emoji: "🎤",
        options: [
          { id: "good", label: "👍 Nailed it" },
          { id: "bad", label: "👎 Nope" },
        ],
        voterScope: "others",
        voteEndsAt: Date.now() + 25000,
      };
    }

    case "vote": {
      const v = pick(VOTE_EVENTS);
      pushFeed(room, { type: "vote", emoji: "🗳️", message: `${player.name} triggered a group vote: ${v.title}.` });
      return {
        id: uid("ev"), type: "vote", title: v.title, description: v.description,
        effectText: "Everyone votes. Majority wins (ties favour the first option).",
        forPlayerId: player.id, emoji: v.emoji,
        options: v.options.map((o) => ({ id: o.id, label: o.label })),
        voteEndsAt: Date.now() + 20000,
        voterScope: "all",
        // stash the source vote id so resolution knows the effects
        collabKind: undefined,
        grantedCardId: v.id,
      };
    }

    case "power": {
      if (!room.settings.powerCardsEnabled) return null;
      const card = pick(POWER_CARDS);
      player.powerCards.push(card.id);
      // Passive cards arm themselves immediately.
      if (card.id === "shield") player.shield = true;
      if (card.id === "ladder-insurance") player.ladderInsurance = true;
      pushFeed(room, { type: "power", emoji: card.emoji, message: `${player.name} drew a power card: ${card.name}!` });
      return {
        id: uid("ev"), type: "power-grant", title: "Power Card!",
        description: `${card.emoji} ${card.name}`, effectText: card.effect,
        forPlayerId: player.id, emoji: card.emoji, grantedCardId: card.id,
      };
    }

    case "collab": {
      pushFeed(room, { type: "system", emoji: "🤝", message: `${player.name} landed on a collab tile.` });
      return {
        id: uid("ev"), type: "collab", title: "Collaboration Tile",
        description: `${player.name}, choose a player to HELP. They move forward 3 tiles. (Being nice has no cost... this time.)`,
        effectText: "Pick a player to push forward 3 tiles.",
        forPlayerId: player.id, emoji: "🤝", collabKind: "help",
      };
    }

    default:
      return null;
  }
}
