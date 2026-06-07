import { withRoom } from "./db";
import { pushFeed } from "../utils/resolveTileEffect";

// Lightweight presence: update lastSeen + connected. Called on a timer by the
// useRoom hook. Kept cheap; conflicts are harmless (last write wins).
export async function heartbeat(code: string, playerId: string): Promise<void> {
  try {
    await withRoom(code, (room) => {
      const p = room.players.find((x) => x.id === playerId);
      if (!p) return;
      p.lastSeen = Date.now();
      p.connected = true;
    });
  } catch {
    // Non-fatal — presence is best-effort.
  }
}

export async function setConnection(
  code: string,
  playerId: string,
  connected: boolean
): Promise<void> {
  try {
    await withRoom(code, (room) => {
      const p = room.players.find((x) => x.id === playerId);
      if (!p) return;
      p.connected = connected;
      p.lastSeen = Date.now();
    });
  } catch {
    /* ignore */
  }
}

// Explicitly leave a room. In the lobby we remove the player; mid-game we just
// mark them disconnected so their token stays and they can reconnect.
export async function leaveRoom(code: string, playerId: string): Promise<void> {
  await withRoom(code, (room) => {
    const idx = room.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return;
    const leaving = room.players[idx];

    if (room.status === "waiting") {
      room.players.splice(idx, 1);
      // Reassign host if the host left.
      if (leaving.isHost && room.players.length > 0) {
        room.players[0].isHost = true;
        room.hostId = room.players[0].id;
        pushFeed(room, {
          type: "system",
          emoji: "👑",
          message: `${room.players[0].name} is the new host.`,
        });
      }
      pushFeed(room, { type: "system", emoji: "👋", message: `${leaving.name} left.` });
    } else {
      leaving.connected = false;
      leaving.lastSeen = Date.now();
      pushFeed(room, { type: "system", emoji: "📴", message: `${leaving.name} disconnected.` });
    }
  });
}
