import { AVATARS, COLORS } from "../gameConfig";
import type { Player } from "../types";

const PLAYER_ID_KEY = "chaosladder.playerId";

// A stable per-browser player id, stored in localStorage so a refresh or
// reconnect maps back to the same player in the room.
export function getOrCreatePlayerId(): string {
  try {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = "p_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  } catch {
    // localStorage blocked (private mode etc.) — fall back to ephemeral id.
    return "p_" + Math.random().toString(36).slice(2, 10);
  }
}

// Remember the last room/name a player used (nice for re-join UX).
export function rememberName(name: string) {
  try {
    localStorage.setItem("chaosladder.name", name);
  } catch {
    /* ignore */
  }
}

export function recallName(): string {
  try {
    return localStorage.getItem("chaosladder.name") || "";
  } catch {
    return "";
  }
}

// Pick the first avatar/color not already used in the room.
export function pickAvatar(existing: Player[]): string {
  const used = new Set(existing.map((p) => p.avatar));
  return AVATARS.find((a) => !used.has(a)) || AVATARS[existing.length % AVATARS.length];
}

export function pickColor(existing: Player[]): string {
  const used = new Set(existing.map((p) => p.color));
  return COLORS.find((c) => !used.has(c)) || COLORS[existing.length % COLORS.length];
}
