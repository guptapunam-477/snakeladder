import type { Player, Tile as TileT } from "../types";
import { BOARD_SIZE } from "../gameConfig";
import Tile from "./Tile";

interface Props {
  board: TileT[];
  players: Player[];
  currentPlayerId?: string;
}

const COLS = 5;
const ROWS = BOARD_SIZE / COLS; // 10

// Build a serpentine layout: tile 1 sits bottom-left, each row alternates
// direction, finish (50) ends up top-left-ish. Rendered top row first.
function buildRows(): number[][] {
  const rows: number[][] = [];
  for (let r = ROWS - 1; r >= 0; r--) {
    const row: number[] = [];
    for (let c = 0; c < COLS; c++) row.push(r * COLS + c + 1);
    if (r % 2 === 1) row.reverse();
    rows.push(row);
  }
  return rows;
}

export default function Board({ board, players, currentPlayerId }: Props) {
  const rows = buildRows();
  const byTile: Record<number, Player[]> = {};
  players.forEach((p) => {
    if (p.position >= 1) (byTile[p.position] ||= []).push(p);
    else (byTile[0] ||= []).push(p);
  });

  return (
    <div className="w-full">
      <div className="flex flex-col gap-1">
        {rows.map((row, ri) => (
          <div key={ri} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
            {row.map((idx) => (
              <Tile
                key={idx}
                tile={board[idx - 1]}
                players={byTile[idx] || []}
                currentPlayerId={currentPlayerId}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Players still at the starting line (position 0) */}
      {byTile[0]?.length ? (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-300">
          <span>At start:</span>
          {byTile[0].map((p) => (
            <span key={p.id} style={{ color: p.color }}>
              {p.avatar} {p.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
