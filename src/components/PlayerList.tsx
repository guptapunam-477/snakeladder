import type { Player } from "../types";

interface Props {
  players: Player[];
  currentPlayerId?: string;
  hostId: string;
  meId: string;
  showKick?: boolean;
  onKick?: (id: string) => void;
  showPositions?: boolean;
}

export default function PlayerList({
  players,
  currentPlayerId,
  hostId,
  meId,
  showKick,
  onKick,
  showPositions,
}: Props) {
  const ordered = showPositions
    ? [...players].sort((a, b) => b.position - a.position)
    : players;

  return (
    <ul className="flex flex-col gap-1.5">
      {ordered.map((p, i) => {
        const isCurrent = p.id === currentPlayerId;
        return (
          <li
            key={p.id}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
              isCurrent ? "bg-emerald-500/15 ring-1 ring-emerald-400/40" : "bg-white/5"
            }`}
          >
            {showPositions && (
              <span className="w-4 text-center text-xs font-bold text-slate-400">{i + 1}</span>
            )}
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm"
              style={{ borderColor: p.color }}
            >
              {p.avatar}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 truncate text-sm font-semibold text-white">
                <span className="truncate">{p.name}</span>
                {p.id === meId && <span className="text-[10px] text-emerald-300">(you)</span>}
                {p.id === hostId && <span title="Host">👑</span>}
                {!p.connected && <span title="Disconnected">📴</span>}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                {showPositions && <span>Tile {p.position}</span>}
                {p.powerCards.length > 0 && <span>🃏 {p.powerCards.length}</span>}
                {p.skipNextTurn && <span title="Skips next turn">⏭️</span>}
                {p.shield && <span title="Shielded">🛡️</span>}
              </div>
            </div>
            {isCurrent && <span className="text-xs text-emerald-300">turn</span>}
            {showKick && onKick && p.id !== hostId && (
              <button
                onClick={() => onKick(p.id)}
                className="rounded-md bg-rose-600/80 px-2 py-1 text-[11px] text-white active:scale-95"
              >
                Kick
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
