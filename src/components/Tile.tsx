import type { Tile as TileT } from "../types";
import { TILE_ICONS } from "../gameConfig";

interface Props {
  tile: TileT;
}

const TYPE_BG: Record<string, string> = {
  normal: "bg-slate-800/60",
  ladder: "bg-emerald-700/40",
  snake: "bg-rose-800/40",
  chaos: "bg-amber-600/35",
  challenge: "bg-fuchsia-700/35",
  vote: "bg-sky-700/40",
  power: "bg-indigo-700/40",
  collab: "bg-teal-700/40",
};

export default function Tile({ tile }: Props) {
  const icon = TILE_ICONS[tile.type];
  const isFinish = tile.index === 50;
  const isStart = tile.index === 1;

  return (
    <div
      className={`relative flex aspect-square min-w-0 flex-col border border-white/5 p-0.5 ${
        TYPE_BG[tile.type]
      } ${isFinish ? "z-10 ring-2 ring-inset ring-yellow-400" : ""}`}
    >
      <div className="flex items-center justify-between leading-none">
        <span className="text-[9px] font-semibold text-white/40">{tile.index}</span>
        {icon && <span className="text-[11px] sm:text-sm">{icon}</span>}
      </div>
      {isFinish && <span className="absolute bottom-0.5 right-0.5 text-[11px]">🏁</span>}
      {isStart && <span className="absolute bottom-0.5 right-0.5 text-[8px] text-white/40">start</span>}
    </div>
  );
}
