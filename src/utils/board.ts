import type { Tile, TileType } from "../types";
import { BOARD_SIZE } from "../gameConfig";

// ---------------------------------------------------------------------------
// CURATED board layout.
// Unlike a random scatter, this is a hand-designed, recognizable Snakes &
// Ladders board: ladders climb, snakes (head on the higher tile) drop you to a
// lower tile, and the rest of the special tiles are placed for good pacing.
// A fixed layout makes the board readable and the snakes/ladders draw cleanly.
// ---------------------------------------------------------------------------

// ladder: bottom tile -> top tile (climb up)
const LADDERS: Record<number, number> = {
  3: 16,
  8: 22,
  14: 31,
  21: 38,
  28: 45,
  36: 48,
};

// snake: head tile (higher) -> tail tile (lower). Land on the head, slide down.
const SNAKES: Record<number, number> = {
  47: 26,
  43: 18,
  39: 11,
  33: 6,
  25: 7,
  19: 4,
};

// other special tiles
const SPECIALS: Record<number, TileType> = {
  5: "chaos",
  12: "chaos",
  17: "chaos",
  24: "chaos",
  30: "chaos",
  41: "chaos",
  46: "chaos",
  9: "power",
  34: "power",
  44: "power",
  15: "challenge",
  37: "challenge",
  23: "vote",
  42: "vote",
  32: "collab",
  49: "collab",
};

export function generateBoard(): Tile[] {
  const tiles: Tile[] = [];
  for (let i = 1; i <= BOARD_SIZE; i++) {
    if (LADDERS[i] !== undefined) {
      tiles.push({ index: i, type: "ladder", to: LADDERS[i] });
    } else if (SNAKES[i] !== undefined) {
      tiles.push({ index: i, type: "snake", to: SNAKES[i] });
    } else if (SPECIALS[i] !== undefined) {
      tiles.push({ index: i, type: SPECIALS[i] });
    } else {
      tiles.push({ index: i, type: "normal" });
    }
  }
  return tiles;
}
