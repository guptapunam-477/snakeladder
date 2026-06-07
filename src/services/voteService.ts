import { withRoom } from "./db";
import { CHALLENGE_PROMPTS, VOTE_EVENTS } from "../gameConfig";
import {
  findPlayer,
  movePlayerBy,
  pushFeed,
  uid,
} from "../utils/resolveTileEffect";
import { endTurnOrContinue } from "../utils/turn";
import type { Room } from "../types";

// Tally the votes for the current pending vote event and apply the result.
// Ties favour the FIRST option (mercy / determinism).
function resolveVote(room: Room) {
  const pe = room.pendingEvent;
  if (!pe || pe.type !== "vote" || !pe.options) return;

  const cast = room.votes[pe.id] || {};
  const valid = new Set(room.players.map((p) => p.id));
  const counts: Record<string, number> = {};
  pe.options.forEach((o) => (counts[o.id] = 0));
  for (const [voterId, optionId] of Object.entries(cast)) {
    if (valid.has(voterId) && optionId in counts) counts[optionId] += 1;
  }

  let winnerId = pe.options[0].id;
  let best = -1;
  for (const opt of pe.options) {
    if (counts[opt.id] > best) {
      best = counts[opt.id];
      winnerId = opt.id;
    }
  }

  const target = findPlayer(room, pe.forPlayerId);
  if (!target) {
    delete room.votes[pe.id];
    endTurnOrContinue(room);
    return;
  }

  // Figure out the effect of the winning option.
  // Tile 'vote' events stash their definition id in pe.grantedCardId.
  const def = VOTE_EVENTS.find((v) => v.id === pe.grantedCardId);

  let effect: "back" | "forward" | "challenge" | "nothing" = "nothing";
  let amount = 0;

  if (def) {
    const opt = def.options.find((o) => o.id === winnerId);
    if (opt) {
      effect = opt.effect;
      amount = opt.amount ?? 0;
    }
  } else {
    // HR Complaint style (back3 / challenge).
    if (winnerId === "back3") {
      effect = "back";
      amount = 3;
    } else if (winnerId === "challenge") {
      effect = "challenge";
    }
  }

  delete room.votes[pe.id];

  if (effect === "challenge") {
    const prompt =
      CHALLENGE_PROMPTS[room.settings.challengeMode][
        Math.floor(Math.random() * CHALLENGE_PROMPTS[room.settings.challengeMode].length)
      ];
    pushFeed(room, { type: "vote", emoji: "🎤", message: `The people demand a challenge from ${target.name}!` });
    room.pendingEvent = {
      id: uid("ev"),
      type: "challenge",
      title: "Challenge (by popular vote)",
      description: prompt,
      effectText: "Perform it, then tap Done.",
      forPlayerId: target.id,
      emoji: "🎤",
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
    pushFeed(room, { type: "vote", emoji: "🕊️", message: `Vote result: ${target.name} is pardoned. Nothing happens.` });
  }

  endTurnOrContinue(room);
}

export async function castVote(
  code: string,
  eventId: string,
  playerId: string,
  optionId: string
): Promise<void> {
  await withRoom(code, (room) => {
    const pe = room.pendingEvent;
    if (!pe || pe.type !== "vote") throw new Error("There is no vote happening.");
    if (pe.id !== eventId) throw new Error("This vote already ended.");
    if (!pe.options?.some((o) => o.id === optionId)) throw new Error("Invalid option.");
    if (!findPlayer(room, playerId)) throw new Error("You're not in this room.");

    if (!room.votes[eventId]) room.votes[eventId] = {};
    room.votes[eventId][playerId] = optionId; // one effective vote per player

    // Resolve early once everyone has voted.
    const votedCount = Object.keys(room.votes[eventId]).length;
    if (votedCount >= room.players.length) {
      resolveVote(room);
    }
  });
}

// Called by any client when the vote timer expires.
export async function resolveVoteIfDue(code: string): Promise<void> {
  await withRoom(code, (room) => {
    const pe = room.pendingEvent;
    if (!pe || pe.type !== "vote") return;
    if (pe.voteEndsAt && Date.now() < pe.voteEndsAt) return;
    resolveVote(room);
  });
}
