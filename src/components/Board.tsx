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

// Display order (top row first), serpentine so tile 1 is bottom-left.
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

// Centre of a tile as a percentage of the board (matches buildRows layout).
function centerOf(index: number): { x: number; y: number } {
  const i = Math.max(1, Math.min(BOARD_SIZE, index));
  const r0 = Math.floor((i - 1) / COLS); // logical row from bottom
  let col = (i - 1) % COLS;
  if (r0 % 2 === 1) col = COLS - 1 - col; // serpentine
  const displayRow = ROWS - 1 - r0; // 0 = top
  return {
    x: ((col + 0.5) / COLS) * 100,
    y: ((displayRow + 0.5) / ROWS) * 100,
  };
}

// Small cluster offsets so multiple tokens on one tile don't fully overlap.
const CLUSTER: [number, number][] = [
  [0, 0],
  [-7, -6],
  [7, -6],
  [-7, 7],
  [7, 7],
];

export default function Board({ board, players, currentPlayerId }: Props) {
  const rows = buildRows();

  // group players by tile for clustering
  const byTile: Record<number, Player[]> = {};
  players.forEach((p) => {
    const key = Math.max(1, p.position);
    (byTile[key] ||= []).push(p);
  });

  const ladders = board.filter((t) => t.type === "ladder" && t.to);
  const snakes = board.filter((t) => t.type === "snake" && t.to);

  return (
    <div className="relative w-full select-none">
      {/* Tile grid */}
      <div className="flex flex-col gap-1">
        {rows.map((row, ri) => (
          <div key={ri} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
            {row.map((idx) => (
              <Tile key={idx} tile={board[idx - 1]} />
            ))}
          </div>
        ))}
      </div>

      {/* Ladder / snake connectors */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {ladders.map((t) => {
          const a = centerOf(t.index);
          const b = centerOf(t.to!);
          return (
            <line
              key={`L${t.index}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#34d399"
              strokeOpacity={0.55}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray="1 5"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {snakes.map((t) => {
          const a = centerOf(t.index);
          const b = centerOf(t.to!);
          const mx = (a.x + b.x) / 2 + (a.y < b.y ? 10 : -10);
          const my = (a.y + b.y) / 2;
          return (
            <path
              key={`S${t.index}`}
              d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
              fill="none"
              stroke="#fb7185"
              strokeOpacity={0.55}
              strokeWidth={4}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {/* Animated token layer */}
      <div className="pointer-events-none absolute inset-0">
        {Object.entries(byTile).flatMap(([tileStr, group]) =>
          group.map((p, i) => {
            const c = centerOf(Number(tileStr));
            const [dx, dy] = CLUSTER[i % CLUSTER.length];
            const active = p.id === currentPlayerId;
            return (
              <div
                key={p.id}
                className="absolute transition-all duration-500 ease-out"
                style={{
                  left: `${c.x}%`,
                  top: `${c.y}%`,
                  transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px)`,
                  zIndex: active ? 20 : 10,
                }}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 bg-slate-900/90 text-[13px] shadow-md ${
                    active ? "ring-2 ring-white animate-floaty" : ""
                  } ${p.connected ? "" : "opacity-50"}`}
                  style={{ borderColor: p.color }}
                  title={`${p.name} — tile ${p.position}`}
                >
                  {p.avatar}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Start-line note for players still at 0 */}
      {players.some((p) => p.position === 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-300">
          <span>At start:</span>
          {players
            .filter((p) => p.position === 0)
            .map((p) => (
              <span key={p.id} style={{ color: p.color }}>
                {p.avatar} {p.name}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
