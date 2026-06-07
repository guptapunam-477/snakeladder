import { useState } from "react";
import type { Player } from "../types";
import { POWER_CARD_MAP } from "../gameConfig";

interface Props {
  me: Player;
  others: Player[];
  canUse: boolean; // your turn, no pending event, not rolling
  onUse: (cardId: string, targetId?: string) => void;
}

export default function PowerCards({ me, others, canUse, onUse }: Props) {
  const [targeting, setTargeting] = useState<string | null>(null);

  if (me.powerCards.length === 0) {
    return <p className="text-xs text-slate-500">No power cards yet. Land on a 🃏 tile!</p>;
  }

  // Show one chip per card (cards can repeat).
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {me.powerCards.map((cardId, i) => {
          const def = POWER_CARD_MAP[cardId];
          if (!def) return null;
          const playable = canUse && def.usable;
          return (
            <div
              key={`${cardId}-${i}`}
              className={`w-28 rounded-lg border p-2 text-xs ${
                playable ? "border-indigo-400/60 bg-indigo-500/15" : "border-white/10 bg-white/5"
              }`}
            >
              <div className="font-bold text-white">
                {def.emoji} {def.name}
              </div>
              <div className="mt-0.5 text-[10px] leading-snug text-slate-300">{def.effect}</div>
              {def.usable ? (
                <button
                  disabled={!playable}
                  onClick={() => {
                    if (def.needsTarget) setTargeting(cardId);
                    else onUse(cardId);
                  }}
                  className="mt-1 w-full rounded bg-indigo-500 py-1 text-[11px] font-semibold text-white disabled:bg-slate-600 disabled:text-slate-400"
                >
                  Use
                </button>
              ) : (
                <div className="mt-1 text-center text-[10px] text-emerald-300">Auto</div>
              )}
            </div>
          );
        })}
      </div>

      {targeting && (
        <div className="rounded-lg bg-black/40 p-2">
          <div className="mb-1 text-xs text-slate-300">Choose a target:</div>
          <div className="flex flex-wrap gap-1">
            {others.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onUse(targeting, p.id);
                  setTargeting(null);
                }}
                className="rounded-md bg-white/10 px-2 py-1 text-xs text-white active:scale-95"
                style={{ borderLeft: `3px solid ${p.color}` }}
              >
                {p.avatar} {p.name}
              </button>
            ))}
            <button
              onClick={() => setTargeting(null)}
              className="rounded-md bg-rose-600/70 px-2 py-1 text-xs text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
