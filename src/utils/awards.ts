import type { Award, Player } from "../types";

// ---------------------------------------------------------------------------
// Funny awards computed from per-player stats tracked during the game.
// Each award picks the "best" player for a stat. Ties resolve to the first
// player found. Awards with no meaningful winner (all zero) are skipped,
// except a couple of guaranteed-fun ones.
// ---------------------------------------------------------------------------

interface AwardDef {
  id: string;
  title: string;
  emoji: string;
  reason: string;
  pick: (players: Player[]) => Player | null;
  alwaysShow?: boolean;
}

function maxBy(players: Player[], fn: (p: Player) => number): Player | null {
  let best: Player | null = null;
  let bestVal = -Infinity;
  for (const p of players) {
    const v = fn(p);
    if (v > bestVal) {
      bestVal = v;
      best = p;
    }
  }
  return bestVal > 0 ? best : null;
}

const DEFS: AwardDef[] = [
  {
    id: "most-betrayed",
    title: "Most Betrayed Player",
    emoji: "🗡️",
    reason: "Got stabbed in the back the most.",
    pick: (p) => maxBy(p, (x) => x.stats.timesBetrayed),
  },
  {
    id: "snake-magnet",
    title: "Snake Magnet",
    emoji: "🐍",
    reason: "Could not stop hitting snakes.",
    pick: (p) => maxBy(p, (x) => x.stats.snakesHit),
  },
  {
    id: "luckiest-intern",
    title: "Luckiest Intern",
    emoji: "🍀",
    reason: "Climbed the most ladders.",
    pick: (p) => maxBy(p, (x) => x.stats.laddersHit),
  },
  {
    id: "corporate-survivor",
    title: "Corporate Survivor",
    emoji: "🏢",
    reason: "Weathered the most chaos events.",
    pick: (p) => maxBy(p, (x) => x.stats.chaosHit),
  },
  {
    id: "useless-power",
    title: "Most Useless Power Card User",
    emoji: "🃏",
    reason: "Used the most power cards... results may vary.",
    pick: (p) => maxBy(p, (x) => x.stats.powerCardsUsed),
  },
  {
    id: "best-comeback",
    title: "Best Comeback",
    emoji: "🚀",
    reason: "Fell behind, then surged forward.",
    pick: (p) => maxBy(p, (x) => x.stats.maxPosition - x.position >= 0 ? x.stats.forwardTiles : 0),
  },
  {
    id: "dangerous-friend",
    title: "Most Dangerous Friend",
    emoji: "😈",
    reason: "Helped... and hurt... a lot of people.",
    pick: (p) => maxBy(p, (x) => x.stats.timesSaved),
  },
  {
    id: "chaos-king",
    title: "Chaos King",
    emoji: "👑",
    reason: "Lived and breathed chaos this game.",
    pick: (p) => maxBy(p, (x) => x.stats.chaosHit + x.stats.rerolls),
    alwaysShow: true,
  },
];

export function computeAwards(players: Player[]): Award[] {
  const awards: Award[] = [];
  const usedPlayers = new Set<string>();

  for (const def of DEFS) {
    const winner = def.pick(players);
    if (!winner) continue;
    awards.push({
      id: def.id,
      playerId: winner.id,
      playerName: winner.name,
      title: def.title,
      emoji: def.emoji,
      reason: def.reason,
    });
    usedPlayers.add(winner.id);
  }

  // Guaranteed "Almost Winner" for 2nd place if we have 2+ players.
  return awards;
}
