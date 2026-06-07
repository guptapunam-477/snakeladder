import { useNavigate } from "react-router-dom";
import type { Room } from "../types";
import Confetti from "../components/Confetti";
import { computeAwards } from "../utils/awards";
import { rankPlayers } from "../utils/ranking";
import { restartGame } from "../services/roomService";
import { leaveRoom } from "../services/playerService";

interface Props {
  room: Room;
  playerId: string;
  isHost: boolean;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function WinnerPage({ room, playerId, isHost }: Props) {
  const navigate = useNavigate();
  const ranked = rankPlayers(room.players, room.winnerId);
  const winner = ranked[0];
  const awards = computeAwards(room.players);

  const onPlayAgain = async () => {
    try {
      await restartGame(room.code, playerId);
    } catch {
      /* only host can; ignore */
    }
  };

  const onLeave = async () => {
    await leaveRoom(room.code, playerId);
    navigate("/");
  };

  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col gap-5 px-5 py-10">
      <Confetti />
      <div className="text-center">
        <div className="text-5xl animate-floaty">🏆</div>
        <h1 className="mt-2 text-3xl font-black text-white">
          {winner ? `${winner.avatar} ${winner.name} wins!` : "Game Over"}
        </h1>
        <p className="text-sm text-slate-300">Chaos Champion of the Ladder.</p>
      </div>

      {/* Final rankings */}
      <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <h2 className="mb-2 text-sm font-bold text-slate-200">Final standings</h2>
        <ul className="flex flex-col gap-1.5">
          {ranked.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2"
            >
              <span className="w-6 text-center text-lg">{MEDALS[i] || i + 1}</span>
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm"
                style={{ borderColor: p.color }}
              >
                {p.avatar}
              </span>
              <span className="flex-1 truncate font-semibold text-white">
                {p.name}
                {p.id === playerId && <span className="ml-1 text-[10px] text-emerald-300">(you)</span>}
              </span>
              <span className="text-xs text-slate-400">tile {p.position}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Funny awards */}
      <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <h2 className="mb-2 text-sm font-bold text-slate-200">🎖️ Chaos Awards</h2>
        {awards.length === 0 ? (
          <p className="text-xs text-slate-400">A surprisingly calm game. No awards earned!</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {awards.map((a) => (
              <li key={a.id} className="flex items-start gap-2 text-sm">
                <span className="text-lg">{a.emoji}</span>
                <span className="text-slate-200">
                  <b className="text-white">{a.title}</b> — {a.playerName}
                  <span className="block text-[11px] text-slate-400">{a.reason}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {isHost ? (
          <button
            onClick={onPlayAgain}
            className="rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-white active:scale-95"
          >
            🔄 Play Again (back to lobby)
          </button>
        ) : (
          <p className="rounded-2xl bg-white/5 py-3 text-center text-sm text-slate-300">
            Waiting for the host to start a new game…
          </p>
        )}
        <button
          onClick={onLeave}
          className="rounded-2xl bg-white/10 py-3 text-sm font-semibold text-slate-200 active:scale-95"
        >
          Leave room
        </button>
      </div>
    </div>
  );
}
