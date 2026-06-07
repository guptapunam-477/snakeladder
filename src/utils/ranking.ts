import type { Player } from "../types";

// Rank players by board position (descending). The winner, if any, is forced
// to the top. Ties are broken by who reached their max position first is not
// tracked, so we fall back to stats.maxPosition then name for stability.
export function rankPlayers(players: Player[], winnerId: string | null): Player[] {
  return [...players].sort((a, b) => {
    if (winnerId) {
      if (a.id === winnerId) return -1;
      if (b.id === winnerId) return 1;
    }
    if (b.position !== a.position) return b.position - a.position;
    if (b.stats.maxPosition !== a.stats.maxPosition)
      return b.stats.maxPosition - a.stats.maxPosition;
    return a.name.localeCompare(b.name);
  });
}

export function rankingIds(players: Player[], winnerId: string | null): string[] {
  return rankPlayers(players, winnerId).map((p) => p.id);
}
