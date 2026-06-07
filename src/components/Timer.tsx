import { useEffect, useState } from "react";

interface Props {
  startedAt: number;
  durationSeconds: number;
  label?: string;
}

// Simple shrinking countdown bar + seconds remaining, driven off the shared
// turnStartedAt timestamp so every client shows roughly the same time.
export default function Timer({ startedAt, durationSeconds, label }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  if (!startedAt) return null;
  const elapsed = (now - startedAt) / 1000;
  const remaining = Math.max(0, durationSeconds - elapsed);
  const pct = Math.max(0, Math.min(100, (remaining / durationSeconds) * 100));
  const danger = remaining <= 5;

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
          <span>{label}</span>
          <span className={danger ? "text-red-400 font-bold" : ""}>
            {Math.ceil(remaining)}s
          </span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-200 ${
            danger ? "bg-red-500" : "bg-emerald-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
