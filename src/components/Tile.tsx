import type { Player, Tile as TileT } from "../types";
import { TILE_ICONS } from "../gameConfig";
import PlayerToken from "./PlayerToken";

interface Props {
  tile: TileT;
  players: Player[]; // players currently on this tile
  currentPlayerId?: string;
}

const TYPE_BG: Record<string, string> = {
  normal: "bg-slate-800/60",
  ladder: "bg-emerald-700/50",
  snake: "bg-rose-800/50",
  chaos: "bg-amber-600/40",
  challenge: "bg-fuchsia-700/40",
  vote: "bg-sky-700/45",
  power: "bg-indigo-700/45",
  collab: "bg-teal-700/45",
};

export default function Tile({ tile, players, currentPlayerId }: Props) {
  const icon = TILE_ICONS[tile.type];
  const isFinish = tile.index === 50;
  const isStart = tile.index === 1;

  return (
    <div
      className={`relative flex aspect-square min-w-0 flex-col rounded-md border border-white/5 p-0.5 ${
        TYPE_BG[tile.type]
      } ${isFinish ? "ring-2 ring-yellow-400" : ""}`}
    >
      <div className="flex items-center justify-between leading-none">
        <span className="text-[9px] font-semibold text-white/50">{tile.index}</span>
        {icon && <span className="text-[11px] sm:text-sm">{icon}</span>}
      </div>
      {isFinish && <span className="absolute right-0.5 bottom-0.5 text-[10px]">🏁</span>}
      {isStart && <span className="absolute right-0.5 bottom-0.5 text-[9px] text-white/40">start</span>}

      {/* Tokens of players on this tile */}
      <div className="mt-auto flex flex-wrap gap-0.5">
        {players.map((p) => (
          <PlayerToken key={p.id} player={p} active={p.id === currentPlayerId} />
        ))}
      </div>
    </div>
  );
}
