import type { Room } from "../types";
import { pushFeed } from "./resolveTileEffect";

// Advance to the next player, consuming "skip next turn" flags along the way.
export function advanceTurn(room: Room) {
  const n = room.players.length;
  room.pendingEvent = null;
  room.rolling = false;
  if (n === 0) return;

  const dir = room.turnDir === -1 ? -1 : 1;
  let idx = room.turnIndex;
  for (let i = 0; i < n; i++) {
    idx = (idx + dir + n) % n;
    const p = room.players[idx];
    if (p.skipNextTurn) {
      p.skipNextTurn = false;
      pushFeed(room, { type: "system", emoji: "⏭️", message: `${p.name} skips this turn.` });
      continue;
    }
    room.turnIndex = idx;
    break;
  }
  room.turnStartedAt = Date.now();
}

// Called whenever an action that could end the turn completes. If the current
// player earned a "roll again", we keep the turn with them; otherwise advance.
export function endTurnOrContinue(room: Room) {
  if (room.status === "completed") {
    room.pendingEvent = null;
    room.rolling = false;
    return;
  }
  const cur = room.players[room.turnIndex];
  if (cur && cur.rollAgain) {
    cur.rollAgain = false;
    room.pendingEvent = null;
    room.rolling = false;
    room.turnStartedAt = Date.now();
    pushFeed(room, { type: "system", emoji: "🔁", message: `${cur.name} rolls again!` });
    return;
  }
  advanceTurn(room);
}
