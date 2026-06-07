import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { BoardFx, Fling, Player, Tile as TileT } from "../types";
import { BOARD_SIZE } from "../gameConfig";
import Tile from "./Tile";

interface Props {
  board: TileT[];
  players: Player[];
  currentPlayerId?: string;
  lastFx?: BoardFx | null;
  flings?: Fling[];
}

const COLS = 5;
const ROWS = BOARD_SIZE / COLS; // 10

function rc(index: number) {
  const i = Math.max(1, Math.min(BOARD_SIZE, index));
  const r0 = Math.floor((i - 1) / COLS);
  let col = (i - 1) % COLS;
  if (r0 % 2 === 1) col = COLS - 1 - col;
  return { col, displayRow: ROWS - 1 - r0 };
}
// viewBox coords (0..50 x, 0..100 y) — square units, undistorted
function vb(index: number) {
  const { col, displayRow } = rc(index);
  return { x: col * 10 + 5, y: displayRow * 10 + 5 };
}
// percentage coords for HTML overlay layers
function pct(index: number) {
  const { col, displayRow } = rc(index);
  return { left: ((col * 10 + 5) / 50) * 100, top: ((displayRow * 10 + 5) / 100) * 100 };
}

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

// --- Ladder graphic: two rails + rungs ---
function Ladder({ from, to }: { from: number; to: number }) {
  const a = vb(from);
  const b = vb(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const off = 2.1;
  const r1 = { ax: a.x + px * off, ay: a.y + py * off, bx: b.x + px * off, by: b.y + py * off };
  const r2 = { ax: a.x - px * off, ay: a.y - py * off, bx: b.x - px * off, by: b.y - py * off };
  const rungCount = Math.max(2, Math.round(len / 6));
  const rungs = [];
  for (let i = 1; i < rungCount; i++) {
    const t = i / rungCount;
    const cx = a.x + dx * t;
    const cy = a.y + dy * t;
    rungs.push(
      <line key={i} x1={cx + px * off} y1={cy + py * off} x2={cx - px * off} y2={cy - py * off} stroke="#d6a35c" strokeWidth={0.8} strokeLinecap="round" />
    );
  }
  return (
    <g opacity={0.92}>
      <line x1={r1.ax} y1={r1.ay} x2={r1.bx} y2={r1.by} stroke="#c98a3c" strokeWidth={1.2} strokeLinecap="round" />
      <line x1={r2.ax} y1={r2.ay} x2={r2.bx} y2={r2.by} stroke="#c98a3c" strokeWidth={1.2} strokeLinecap="round" />
      {rungs}
    </g>
  );
}

// --- Snake graphic: wavy body with a head (on the higher tile) ---
function Snake({ head, tail }: { head: number; tail: number }) {
  const h = vb(head); // higher tile (where you get bitten)
  const t = vb(tail); // lower tile (where you land)
  const dx = t.x - h.x;
  const dy = t.y - h.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const segs = 8;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= segs; i++) {
    const tt = i / segs;
    const amp = 3.2 * Math.sin(tt * Math.PI); // bulge in the middle
    const wave = Math.sin(tt * Math.PI * 2.4) * amp;
    pts.push({ x: h.x + dx * tt + px * wave, y: h.y + dy * tt + py * wave });
  }
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const mx = (prev.x + cur.x) / 2;
    const my = (prev.y + cur.y) / 2;
    d += ` Q ${prev.x} ${prev.y} ${mx} ${my}`;
  }
  // eye direction
  const ex = px * 1.1;
  const ey = py * 1.1;
  return (
    <g>
      <path d={d} fill="none" stroke="#1f7a3f" strokeWidth={3.4} strokeLinecap="round" opacity={0.55} />
      <path d={d} fill="none" stroke="#34d27a" strokeWidth={2.2} strokeLinecap="round" opacity={0.9} strokeDasharray="0.2 3" />
      {/* head */}
      <circle cx={h.x} cy={h.y} r={3} fill="#34d27a" stroke="#1f7a3f" strokeWidth={0.6} />
      <circle cx={h.x + ex} cy={h.y + ey} r={0.7} fill="#08220f" />
      <circle cx={h.x - ex} cy={h.y - ey} r={0.7} fill="#08220f" />
      {/* tongue */}
      <line x1={h.x - ux * 2.6} y1={h.y - uy * 2.6} x2={h.x - ux * 4.2} y2={h.y - uy * 4.2} stroke="#ef4444" strokeWidth={0.6} strokeLinecap="round" />
    </g>
  );
}

const CLUSTER: [number, number][] = [
  [0, 0],
  [-7, -6],
  [7, -6],
  [-7, 7],
  [7, 7],
];

// --- transient effect layer: flung stickers + snake poop-drop + splats ---
interface ActiveFx {
  key: string;
  kind: "fling" | "drop" | "splat" | "rise";
  emoji: string;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
}

function FxLayer({
  players,
  lastFx,
  flings,
}: {
  players: Player[];
  lastFx?: BoardFx | null;
  flings?: Fling[];
}) {
  const [fx, setFx] = useState<ActiveFx[]>([]);
  const seenFlings = useRef<Set<string>>(new Set());
  const seenFx = useRef<string | null>(null);
  const posOf = (id: string) => {
    const p = players.find((x) => x.id === id);
    return p ? pct(p.position) : null;
  };
  const add = (e: ActiveFx, ttl: number) => {
    setFx((cur) => [...cur, e]);
    setTimeout(() => setFx((cur) => cur.filter((x) => x.key !== e.key)), ttl);
  };

  // snake / ladder effect
  useEffect(() => {
    if (!lastFx || lastFx.id === seenFx.current) return;
    seenFx.current = lastFx.id;
    const from = pct(lastFx.from);
    const to = pct(lastFx.to);
    if (lastFx.kind === "snake") {
      add({ key: lastFx.id + "d", kind: "drop", emoji: "💩", sx: from.left, sy: from.top, ex: to.left, ey: to.top }, 900);
      setTimeout(
        () => add({ key: lastFx.id + "s", kind: "splat", emoji: "💩", sx: to.left, sy: to.top, ex: to.left, ey: to.top }, 700),
        650
      );
    } else {
      add({ key: lastFx.id + "r", kind: "rise", emoji: "✨", sx: to.left, sy: to.top, ex: to.left, ey: to.top }, 800);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastFx?.id]);

  // flung stickers
  useEffect(() => {
    if (!flings) return;
    for (const f of flings) {
      if (seenFlings.current.has(f.id)) continue;
      if (Date.now() - f.ts > 4000) {
        seenFlings.current.add(f.id);
        continue;
      }
      seenFlings.current.add(f.id);
      const from = posOf(f.fromId);
      const to = posOf(f.toId);
      if (!from || !to) continue;
      add({ key: f.id, kind: "fling", emoji: f.sticker, sx: from.left, sy: from.top, ex: to.left, ey: to.top }, 750);
      setTimeout(
        () => add({ key: f.id + "s", kind: "splat", emoji: f.sticker, sx: to.left, sy: to.top, ex: to.left, ey: to.top }, 700),
        620
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flings]);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {fx.map((e) => {
        const anim =
          e.kind === "fling"
            ? "cl-fling 0.7s ease-in forwards"
            : e.kind === "drop"
            ? "cl-drop 0.7s ease-in forwards"
            : e.kind === "rise"
            ? "cl-rise 0.75s ease-out forwards"
            : "cl-splat 0.65s ease-out forwards";
        return (
          <span
            key={e.key}
            className="absolute text-xl"
            style={
              {
                left: `${e.sx}%`,
                top: `${e.sy}%`,
                "--sx": `${e.sx}%`,
                "--sy": `${e.sy}%`,
                "--ex": `${e.ex}%`,
                "--ey": `${e.ey}%`,
                transform: "translate(-50%,-50%)",
                animation: anim,
              } as CSSProperties
            }
          >
            {e.emoji}
          </span>
        );
      })}
    </div>
  );
}

export default function Board({ board, players, currentPlayerId, lastFx, flings }: Props) {
  const rows = buildRows();
  const ladders = board.filter((t) => t.type === "ladder" && t.to);
  const snakes = board.filter((t) => t.type === "snake" && t.to);

  const byTile: Record<number, Player[]> = {};
  players.forEach((p) => {
    (byTile[Math.max(1, p.position)] ||= []).push(p);
  });

  return (
    <div className="w-full select-none">
      <div className="relative w-full overflow-hidden rounded-xl ring-1 ring-white/10">
        {/* Tile grid (no gaps so the overlay coordinates line up exactly) */}
        <div className="flex flex-col">
          {rows.map((row, ri) => (
            <div key={ri} className="grid" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
              {row.map((idx) => (
                <Tile key={idx} tile={board[idx - 1]} />
              ))}
            </div>
          ))}
        </div>

        {/* Snakes & ladders */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 50 100" preserveAspectRatio="none">
          {ladders.map((t) => (
            <Ladder key={`L${t.index}`} from={t.index} to={t.to!} />
          ))}
          {snakes.map((t) => (
            <Snake key={`S${t.index}`} head={t.index} tail={t.to!} />
          ))}
        </svg>

        {/* Animated tokens */}
        <div className="pointer-events-none absolute inset-0 z-20">
          {Object.entries(byTile).flatMap(([tileStr, group]) =>
            group.map((p, i) => {
              const c = pct(Number(tileStr));
              const [dx, dy] = CLUSTER[i % CLUSTER.length];
              const active = p.id === currentPlayerId;
              return (
                <div
                  key={p.id}
                  className="absolute transition-all duration-500 ease-out"
                  style={{ left: `${c.left}%`, top: `${c.top}%`, transform: `translate(-50%,-50%) translate(${dx}px,${dy}px)`, zIndex: active ? 25 : 20 }}
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

        {/* Flung stickers / poop-drop effects */}
        <FxLayer players={players} lastFx={lastFx} flings={flings} />
      </div>

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
