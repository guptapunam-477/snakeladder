import { useMemo } from "react";

// Lightweight CSS confetti — no dependencies. Renders a burst of coloured
// squares that fall and fade. Purely decorative.
export default function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.8;
        const duration = 2 + Math.random() * 2;
        const colors = ["#f97316", "#22d3ee", "#a78bfa", "#f472b6", "#4ade80", "#facc15"];
        const color = colors[i % colors.length];
        const size = 6 + Math.random() * 8;
        return { left, delay, duration, color, size, i };
      }),
    [count]
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {pieces.map((p) => (
        <div
          key={p.i}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: 2,
            animation: `confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
