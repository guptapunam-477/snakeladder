// ---------------------------------------------------------------------------
// Shared types for Chaos Ladder.
// The whole game lives in ONE Firestore document: rooms/{roomCode}.
// This makes real-time sync trivial (one onSnapshot) and lets us mutate the
// game atomically inside Firestore transactions to avoid race conditions.
// ---------------------------------------------------------------------------

export type TileType =
  | "normal"
  | "ladder"
  | "snake"
  | "chaos"
  | "challenge"
  | "vote"
  | "power"
  | "collab";

export interface Tile {
  index: number; // 1..50
  type: TileType;
  // For ladder/snake: the destination tile index.
  to?: number;
}

export type GameSpeed = "Fast" | "Normal" | "Chaos";
export type ChallengeMode = "Safe Funny" | "Office Funny" | "Family Friendly";
export type ThemeName =
  | "Office Chaos"
  | "House Party"
  | "Startup Survival"
  | "Family Drama";
export type TimeoutAction = "auto-roll" | "skip";

export interface RoomSettings {
  speed: GameSpeed;
  turnTimerSeconds: number; // 15 | 30 | 45
  challengeMode: ChallengeMode;
  powerCardsEnabled: boolean;
  theme: ThemeName;
  timeoutAction: TimeoutAction;
}

export interface PlayerStats {
  snakesHit: number;
  laddersHit: number;
  chaosHit: number;
  timesBetrayed: number;
  timesSaved: number;
  rerolls: number;
  powerCardsUsed: number;
  maxPosition: number;
  forwardTiles: number;
  backwardTiles: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string; // emoji
  color: string; // hex
  position: number; // 0..50 (0 = start, off board)
  isHost: boolean;
  connected: boolean;
  lastSeen: number; // ms epoch
  powerCards: string[]; // card ids
  // status flags consumed on the player's next/own turn
  skipNextTurn: boolean;
  halfMoveNext: boolean;
  shield: boolean;
  ladderInsurance: boolean;
  extraDiceNext: boolean;
  rollAgain: boolean;
  stats: PlayerStats;
}

// A pending interactive event that pauses the turn until resolved.
export type PendingEventType =
  | "info" // just an acknowledgement (ladder/snake/chaos result)
  | "challenge" // current player performs a prompt
  | "vote" // everyone votes between options
  | "collab" // current player picks a target player
  | "power-grant"; // current player received a power card

export interface VoteOption {
  id: string;
  label: string;
}

export interface PendingEvent {
  id: string;
  type: PendingEventType;
  title: string;
  description: string; // funny flavour text
  effectText: string; // plain explanation of the mechanical effect
  forPlayerId: string; // who the event is "about" / who resolves it (for collab/challenge)
  emoji?: string;
  // vote events:
  options?: VoteOption[];
  voteEndsAt?: number; // ms epoch
  // collab events: list of selectable target player ids is computed in UI
  collabKind?: "save" | "hurt" | "help";
  // power grant:
  grantedCardId?: string;
}

export interface FeedItem {
  id: string;
  type: "dice" | "movement" | "chaos" | "challenge" | "vote" | "power" | "system" | "reaction";
  message: string;
  ts: number;
  emoji?: string;
}

export interface RoomStateAdvanced {
  // final-round chaos toggle (activated when someone crosses tile 40)
  finalRoundChaos: boolean;
}

export type RoomStatus = "waiting" | "active" | "completed";

export interface Room {
  code: string;
  hostId: string;
  status: RoomStatus;
  createdAt: number;
  updatedAt: number;
  settings: RoomSettings;
  board: Tile[]; // 50 tiles, generated at room creation
  players: Player[];
  turnIndex: number; // index into players[] of whose turn it is
  turnStartedAt: number; // ms epoch — used by the client timer
  rolling: boolean; // transaction lock to prevent double rolls
  lastRoll: { playerId: string; value: number; rolls?: number[]; ts: number } | null;
  pendingEvent: PendingEvent | null;
  // votes are stored as { [eventId]: { [voterId]: optionId } }
  votes: Record<string, Record<string, string>>;
  feed: FeedItem[]; // capped to last N items
  winnerId: string | null;
  ranking: string[]; // ordered player ids, filled at game end
  advanced: RoomStateAdvanced;
}

export interface Award {
  id: string;
  playerId: string;
  playerName: string;
  title: string;
  emoji: string;
  reason: string;
}
