import type { Player, PlayerStats, Room, RoomSettings } from "../types";
import { DEFAULT_SETTINGS } from "../gameConfig";
import { generateBoard } from "../utils/board";

export function emptyStats(): PlayerStats {
  return {
    snakesHit: 0,
    laddersHit: 0,
    chaosHit: 0,
    timesBetrayed: 0,
    timesSaved: 0,
    rerolls: 0,
    powerCardsUsed: 0,
    maxPosition: 0,
    forwardTiles: 0,
    backwardTiles: 0,
  };
}

export function makePlayer(args: {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isHost: boolean;
}): Player {
  return {
    id: args.id,
    name: args.name,
    avatar: args.avatar,
    color: args.color,
    position: 0,
    isHost: args.isHost,
    connected: true,
    lastSeen: Date.now(),
    powerCards: [],
    skipNextTurn: false,
    halfMoveNext: false,
    shield: false,
    ladderInsurance: false,
    extraDiceNext: false,
    rollAgain: false,
    stats: emptyStats(),
  };
}

export function makeRoom(args: {
  code: string;
  host: Player;
  settings?: Partial<RoomSettings>;
}): Room {
  return {
    code: args.code,
    hostId: args.host.id,
    status: "waiting",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: { ...DEFAULT_SETTINGS, ...(args.settings || {}) },
    board: generateBoard(),
    players: [args.host],
    turnIndex: 0,
    turnDir: 1,
    turnStartedAt: 0,
    rolling: false,
    lastRoll: null,
    lastFx: null,
    chat: [],
    flings: [],
    pendingEvent: null,
    votes: {},
    feed: [
      {
        id: "welcome",
        type: "system",
        message: `Room created. Waiting for players to join...`,
        ts: Date.now(),
        emoji: "🎉",
      },
    ],
    winnerId: null,
    ranking: [],
    advanced: { finalRoundChaos: false },
  };
}
