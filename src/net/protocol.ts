import type { Room, RoomSettings } from "../types";

// ---------------------------------------------------------------------------
// Peer-to-peer wire protocol.
//
// The game is HOST-AUTHORITATIVE: the player who created the room runs the
// real game state in their browser and acts as the server. Everyone else is a
// thin client that sends "actions" to the host and renders whatever full room
// snapshot the host broadcasts back. No accounts, no servers, no logins —
// just WebRTC data channels brokered by the public PeerJS signalling server.
// ---------------------------------------------------------------------------

// The deterministic peer id the host registers under, derived from the code.
// Bumped (-v2-) so it never clashes with the old Firebase build's ids.
export function hostPeerId(code: string): string {
  return `chaosladder-v2-${code.toUpperCase()}`;
}

// Actions a client can ask the host to perform. The host validates every one.
export type Action =
  | { kind: "start" }
  | { kind: "restart" }
  | { kind: "updateSettings"; settings: Partial<RoomSettings> }
  | { kind: "kick"; targetId: string }
  | { kind: "roll" }
  | { kind: "acknowledge" }
  | { kind: "collab"; targetId: string }
  | { kind: "usePower"; cardId: string; targetId?: string }
  | { kind: "vote"; optionId: string }
  | { kind: "reaction"; emoji: string }
  | { kind: "leave" };

// Client -> Host messages.
export type ClientMsg =
  | { t: "join"; playerId: string; name: string }
  | { t: "action"; playerId: string; action: Action };

// Host -> Client messages.
export type HostMsg =
  | { t: "state"; room: Room }
  | { t: "error"; message: string }
  | { t: "kicked" };

// STUN servers help peers find each other across NATs. These are free public
// servers. (No TURN server is configured — see README; a small % of very
// strict corporate networks may fail to connect without one.)
export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];
