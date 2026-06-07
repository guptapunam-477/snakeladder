import { useEffect, useRef, useState } from "react";

interface Props {
  onRoll: () => void | Promise<void>;
  disabled?: boolean;
  value?: number | null;
  // bump this whenever a new roll lands so we can animate
  rollKey?: number;
}

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function Face({ value }: { value: number }) {
  const pips = PIPS[value] || [];
  return (
    <div className="grid h-16 w-16 grid-cols-3 grid-rows-3 gap-0.5 p-2">
      {Array.from({ length: 9 }).map((_, i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const on = pips.some(([pr, pc]) => pr === r && pc === c);
        return (
          <div key={i} className="flex items-center justify-center">
            {on && <div className="h-3 w-3 rounded-full bg-slate-900" />}
          </div>
        );
      })}
    </div>
  );
}

export default function Dice({ onRoll, disabled, value, rollKey }: Props) {
  const [display, setDisplay] = useState<number>(value || 1);
  const [spinning, setSpinning] = useState(false);
  const lastKey = useRef<number | undefined>(rollKey);

  // Animate a quick shuffle whenever a new roll value arrives.
  useEffect(() => {
    if (rollKey === undefined || rollKey === lastKey.current) {
      if (value) setDisplay(value);
      return;
    }
    lastKey.current = rollKey;
    setSpinning(true);
    let ticks = 0;
    const iv = setInterval(() => {
      setDisplay(Math.floor(Math.random() * 6) + 1);
      ticks++;
      if (ticks > 8) {
        clearInterval(iv);
        if (value) setDisplay(value);
        setSpinning(false);
      }
    }, 60);
    return () => clearInterval(iv);
  }, [rollKey, value]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`rounded-2xl bg-gradient-to-br from-white to-slate-200 shadow-[0_6px_0_rgba(0,0,0,0.25)] ${
          spinning ? "animate-shake" : "animate-pop"
        }`}
      >
        <Face value={display} />
      </div>
      <button
        onClick={() => onRoll()}
        disabled={disabled || spinning}
        className="rounded-xl bg-emerald-500 px-6 py-3 text-base font-bold text-white shadow-md transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
      >
        {spinning ? "Rolling…" : "🎲 Roll Dice"}
      </button>
    </div>
  );
}
