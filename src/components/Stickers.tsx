import { useEffect, useState } from "react";
import type { Player } from "../types";
import { FLING_COOLDOWN_MS, STICKERS } from "../gameConfig";

interface Props {
  players: Player[];
  myId: string;
  onFling: (targetId: string, sticker: string) => void;
}

export default function Stickers({ players, myId, onFling }: Props) {
  const [armed, setArmed] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const others = players.filter((p) => p.id !== myId);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [cooldownUntil]);

  const onCooldown = cooldownUntil > now;
  const secsLeft = Math.ceil((cooldownUntil - now) / 1000);

  const throwAt = (targetId: string) => {
    if (!armed || onCooldown) return;
    onFling(targetId, armed);
    setArmed(null);
    setCooldownUntil(Date.now() + FLING_COOLDOWN_MS);
    setNow(Date.now());
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {STICKERS.map((s) => (
          <button
            key={s.emoji}
            disabled={onCooldown}
            onClick={() => setArmed(armed === s.emoji ? null : s.emoji)}
            title={s.label}
            className={`rounded-lg px-2 py-1 text-lg transition active:scale-90 ${
              armed === s.emoji ? "bg-emerald-500/30 ring-2 ring-emerald-400" : "bg-white/10"
            } ${onCooldown ? "opacity-40" : ""}`}
          >
            {s.emoji}
          </button>
        ))}
      </div>

      {onCooldown ? (
        <p className="text-[11px] text-slate-400">Reloading… {secsLeft}s ⏳</p>
      ) : armed ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] text-slate-300">Throw {armed} at:</span>
          {others.map((p) => (
            <button
              key={p.id}
              onClick={() => throwAt(p.id)}
              className="rounded-md bg-white/10 px-2 py-1 text-xs text-white active:scale-95"
              style={{ borderLeft: `3px solid ${p.color}` }}
            >
              {p.avatar} {p.name}
            </button>
          ))}
          <button onClick={() => setArmed(null)} className="rounded-md bg-rose-600/60 px-2 py-1 text-xs text-white">
            Cancel
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">Pick a sticker, then a target. (No spamming! 3s cooldown.)</p>
      )}
    </div>
  );
}
