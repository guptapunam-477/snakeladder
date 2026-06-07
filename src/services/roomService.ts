import { getDoc, setDoc } from "firebase/firestore";
import { ensureConfigured, roomRef, withRoom } from "./db";
import { makePlayer, makeRoom } from "./factories";
import { generateRoomCode } from "../utils/generateRoomCode";
import { pickAvatar, pickColor } from "../utils/identity";
import { MAX_PLAYERS } from "../gameConfig";
import { pushFeed } from "../utils/resolveTileEffect";
import { generateBoard } from "../utils/board";
import { emptyStats } from "./factories";
import type { RoomSettings } from "../types";

// Create a brand-new room with this player as host. Retries a few times in the
// (very unlikely) event of a room-code collision.
export async function createRoom(
  hostId: string,
  hostName: string
): Promise<{ code: string }> {
  ensureConfigured();
  const name = hostName.trim().slice(0, 14) || "Host";

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateRoomCode(5);
    const ref = roomRef(code);
    const existing = await getDoc(ref);
    if (existing.exists()) continue;

    const host = makePlayer({
      id: hostId,
      name,
      avatar: "🦊",
      color: "#f97316",
      isHost: true,
    });
    const room = makeRoom({ code, host });
    await setDoc(ref, room);
    return { code };
  }
  throw new Error("Could not generate a unique room code. Please try again.");
}

// Join an existing room. Validates capacity, status, and duplicate names.
export async function joinRoom(
  code: string,
  playerId: string,
  rawName: string
): Promise<void> {
  const name = rawName.trim().slice(0, 14);
  if (!name) throw new Error("Please enter a name.");

  await withRoom(code, (room) => {
    // Reconnect path: if this player is already in the room, just mark online.
    const existing = room.players.find((p) => p.id === playerId);
    if (existing) {
      existing.connected = true;
      existing.lastSeen = Date.now();
      return;
    }

    if (room.status === "completed") {
      throw new Error("This game has already finished.");
    }
    if (room.status === "active") {
      throw new Error("This game is already in progress. Ask the host to restart.");
    }
    if (room.players.length >= MAX_PLAYERS) {
      throw new Error(`Room is full (max ${MAX_PLAYERS} players).`);
    }
    if (
      room.players.some(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      throw new Error("That name is taken in this room. Pick another.");
    }

    const player = makePlayer({
      id: playerId,
      name,
      avatar: pickAvatar(room.players),
      color: pickColor(room.players),
      isHost: false,
    });
    room.players.push(player);
    pushFeed(room, {
      type: "system",
      emoji: player.avatar,
      message: `${name} joined the room.`,
    });
  });
}

export async function startGame(code: string, requesterId: string): Promise<void> {
  await withRoom(code, (room) => {
    if (room.hostId !== requesterId) throw new Error("Only the host can start the game.");
    if (room.status === "active") throw new Error("Game already started.");
    if (room.players.length < 2) throw new Error("Need at least 2 players to start.");
    room.status = "active";
    room.turnIndex = 0;
    room.turnStartedAt = Date.now();
    room.rolling = false;
    room.pendingEvent = null;
    room.winnerId = null;
    room.ranking = [];
    pushFeed(room, {
      type: "system",
      emoji: "🚀",
      message: `Game started! ${room.players[0].name} goes first.`,
    });
  });
}

// Reset back to the lobby with the same players (fresh board + positions).
export async function restartGame(code: string, requesterId: string): Promise<void> {
  await withRoom(code, (room) => {
    if (room.hostId !== requesterId) throw new Error("Only the host can restart.");
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
    pushFeed(room, { type: "system", emoji: "🔄", message: "Host reset the game. Back to the lobby!" });
  });
}

export async function endGame(code: string, requesterId: string): Promise<void> {
  await withRoom(code, (room) => {
    if (room.hostId !== requesterId) throw new Error("Only the host can end the game.");
    room.status = "completed";
    room.pendingEvent = null;
    if (!room.ranking.length) {
      room.ranking = [...room.players]
        .sort((a, b) => b.position - a.position)
        .map((p) => p.id);
    }
    pushFeed(room, { type: "system", emoji: "🏁", message: "Host ended the game." });
  });
}

export async function updateSettings(
  code: string,
  requesterId: string,
  settings: Partial<RoomSettings>
): Promise<void> {
  await withRoom(code, (room) => {
    if (room.hostId !== requesterId) throw new Error("Only the host can change settings.");
    if (room.status !== "waiting") throw new Error("Settings can only be changed in the lobby.");
    room.settings = { ...room.settings, ...settings };
  });
}

export async function kickPlayer(
  code: string,
  requesterId: string,
  targetId: string
): Promise<void> {
  await withRoom(code, (room) => {
    if (room.hostId !== requesterId) throw new Error("Only the host can remove players.");
    if (targetId === room.hostId) throw new Error("Host cannot kick themselves.");
    const target = room.players.find((p) => p.id === targetId);
    if (!target) return;
    const wasCurrent = room.players[room.turnIndex]?.id === targetId;
    room.players = room.players.filter((p) => p.id !== targetId);
    // Fix turnIndex if it now points past the end or skipped the kicked player.
    if (room.turnIndex >= room.players.length) room.turnIndex = 0;
    if (wasCurrent && room.status === "active") {
      room.turnStartedAt = Date.now();
      room.pendingEvent = null;
      room.rolling = false;
    }
    pushFeed(room, { type: "system", emoji: "👋", message: `${target.name} was removed by the host.` });
  });
}
