import { useEffect, useRef, useState } from "react";

interface Props {
  onRoll: () => void | Promise<void>;
  disabled?: boolean;
  value?: number | null;
  rollKey?: number; // changes whenever a new roll result lands
}

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

const SIZE = 64;
const HALF = SIZE / 2;

// Cube rotation (deg) that brings each value to the front face.
const FACE_ROT: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  6: { x: 0, y: 180 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  2: { x: -90, y: 0 },
  5: { x: 90, y: 0 },
};

const FACE_TRANSFORMS: Record<number, string> = {
  1: `rotateY(0deg) translateZ(${HALF}px)`,
  6: `rotateY(180deg) translateZ(${HALF}px)`,
  3: `rotateY(90deg) translateZ(${HALF}px)`,
  4: `rotateY(-90deg) translateZ(${HALF}px)`,
  2: `rotateX(90deg) translateZ(${HALF}px)`,
  5: `rotateX(-90deg) translateZ(${HALF}px)`,
};

function Face({ value }: { value: number }) {
  const pips = PIPS[value] || [];
  return (
    <div
      className="absolute grid grid-cols-3 grid-rows-3 gap-0.5 rounded-xl bg-gradient-to-br from-white to-slate-200 p-2 shadow-inner"
      style={{ width: SIZE, height: SIZE, transform: FACE_TRANSFORMS[value], backfaceVisibility: "hidden" }}
    >
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
  const [rot, setRot] = useState({ x: -20, y: 20 });
  const [rolling, setRolling] = useState(false);
  const spins = useRef(0);
  const lastKey = useRef<number | undefined>(rollKey);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Settle the cube on the rolled value whenever a new result arrives.
  useEffect(() => {
    if (rollKey === undefined || !value) return;
    if (rollKey === lastKey.current && !rolling) return;
    lastKey.current = rollKey;
    spins.current += 2;
    const base = FACE_ROT[value] || { x: 0, y: 0 };
    setRot({ x: base.x + 360 * spins.current, y: base.y + 360 * spins.current });
    setRolling(false);
    if (timeout.current) clearTimeout(timeout.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollKey, value]);

  const handleRoll = () => {
    if (rolling || disabled) return;
    setRolling(true);
    // keep the cube tumbling until the value arrives; safety reset after 2.5s
    spins.current += 3;
    setRot((r) => ({ x: r.x + 540, y: r.y + 720 }));
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setRolling(false), 2500);
    onRoll();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div style={{ width: SIZE, height: SIZE, perspective: 320 }}>
        <div
          className="relative h-full w-full"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
            transition: rolling ? "transform 0.5s cubic-bezier(.3,.7,.4,1)" : "transform 0.9s cubic-bezier(.2,.8,.3,1.1)",
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((v) => (
            <Face key={v} value={v} />
          ))}
        </div>
      </div>
      <button
        onClick={handleRoll}
        disabled={disabled || rolling}
        className="rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-6 py-3 text-base font-bold text-white shadow-[0_4px_0_rgb(5,120,75)] transition active:translate-y-0.5 active:shadow-[0_2px_0_rgb(5,120,75)] disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-700 disabled:shadow-none"
      >
        {rolling ? "Rolling…" : "🎲 Roll"}
      </button>
    </div>
  );
}
