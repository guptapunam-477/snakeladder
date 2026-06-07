import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TILE_ICONS } from "../gameConfig";

export default function LandingPage() {
  const navigate = useNavigate();
  const [showHow, setShowHow] = useState(false);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-6 px-5 py-10">
      <div className="text-center">
        <div className="mb-2 text-5xl animate-floaty">🪜⚡🐍</div>
        <h1 className="bg-gradient-to-r from-orange-400 via-pink-400 to-violet-400 bg-clip-text text-4xl font-black tracking-tight text-transparent">
          Chaos Ladder
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Snakes & Ladders, but make it a chaotic office party. 2–5 players,
          private rooms, dares, sabotage, and questionable alliances. No install —
          just open and play.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          onClick={() => navigate("/create")}
          className="rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-white shadow-lg active:scale-95"
        >
          ➕ Create Room
        </button>
        <button
          onClick={() => navigate("/join")}
          className="rounded-2xl bg-white/10 py-4 text-lg font-bold text-white ring-1 ring-white/15 active:scale-95"
        >
          🚪 Join Room
        </button>
        <button
          onClick={() => setShowHow(true)}
          className="rounded-2xl py-2 text-sm font-semibold text-slate-300 underline-offset-2 hover:underline"
        >
          How to Play
        </button>
      </div>

      {showHow && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowHow(false)}
        >
          <div
            className="max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-slate-900 p-5 ring-1 ring-white/10 animate-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-xl font-bold">How to Play</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-200">
              <li>One person taps <b>Create Room</b> and shares the 5-letter code (or link).</li>
              <li>Everyone else taps <b>Join Room</b> and enters their name + the code.</li>
              <li>The host starts the game. Take turns rolling the dice.</li>
              <li>First to reach <b>tile 50</b> wins. But the board fights back…</li>
            </ol>
            <div className="mt-4 space-y-1 text-sm text-slate-300">
              <p className="font-semibold text-white">Tile types</p>
              <p>{TILE_ICONS.ladder} Ladder — climb up. {TILE_ICONS.snake} Snake — slide down.</p>
              <p>{TILE_ICONS.chaos} Chaos — a funny random event.</p>
              <p>{TILE_ICONS.challenge} Challenge — perform a silly prompt.</p>
              <p>{TILE_ICONS.vote} Vote — everyone decides your fate.</p>
              <p>{TILE_ICONS.power} Power — draw a power card.</p>
              <p>{TILE_ICONS.collab} Collab — help (or betray) a friend.</p>
            </div>
            <button
              onClick={() => setShowHow(false)}
              className="mt-5 w-full rounded-xl bg-emerald-500 py-3 font-bold text-white active:scale-95"
            >
              Let's go!
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-[11px] text-slate-500">
        Best with friends in the same room or on a call. Keep it kind. 🤝
      </p>
    </div>
  );
}
