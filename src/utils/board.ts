import type { Tile, TileType } from "../types";
import { BOARD_SIZE, TILE_DISTRIBUTION } from "../gameConfig";

// ---------------------------------------------------------------------------
// Board generation.
// Produces a deterministic-but-random 50-tile board with a sensible spread of
// special tiles. Ladders always go forward, snakes always go backward, and
// tile 1 and tile 50 are always normal so the start/finish are clean.
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateBoard(): Tile[] {
  // Tiles 2..49 are eligible for special types (1 and 50 stay normal).
  const eligible: number[] = [];
  for (let i = 2; i <= BOARD_SIZE - 1; i++) eligible.push(i);

  // Build a list of special types to assign based on the distribution weights.
  const specialTypes: TileType[] = [];
  (Object.keys(TILE_DISTRIBUTION) as TileType[]).forEach((type) => {
    if (type === "normal") return;
    const count = Math.round(TILE_DISTRIBUTION[type] * BOARD_SIZE);
    for (let i = 0; i < count; i++) specialTypes.push(type);
  });

  const slots = shuffle(eligible);
  const tileType: Record<number, TileType> = {};
  for (let i = 1; i <= BOARD_SIZE; i++) tileType[i] = "normal";

  for (let i = 0; i < specialTypes.length && i < slots.length; i++) {
    tileType[slots[i]] = specialTypes[i];
  }

  // Build tiles, wiring up ladder/snake destinations.
  const tiles: Tile[] = [];
  for (let i = 1; i <= BOARD_SIZE; i++) {
    const type = tileType[i];
    const tile: Tile = { index: i, type };

    if (type === "ladder") {
      // Forward jump of 4..10 tiles, capped just below the finish.
      const jump = 4 + Math.floor(Math.random() * 7);
      tile.to = Math.min(BOARD_SIZE - 1, i + jump);
      if (tile.to <= i) tile.to = Math.min(BOARD_SIZE - 1, i + 4);
    } else if (type === "snake") {
      // Backward slide of 3..9 tiles, floored at tile 2.
      const slide = 3 + Math.floor(Math.random() * 7);
      tile.to = Math.max(2, i - slide);
      if (tile.to >= i) tile.to = Math.max(2, i - 3);
    }
    tiles.push(tile);
  }

  return tiles;
}
