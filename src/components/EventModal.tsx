import type { Room } from "../types";
import VotePanel from "./VotePanel";

interface Props {
  room: Room;
  playerId: string;
  onAcknowledge: () => void;
  onChooseCollab: (targetId: string) => void;
  onVote: (optionId: string) => void;
}

export default function EventModal({
  room,
  playerId,
  onAcknowledge,
  onChooseCollab,
  onVote,
}: Props) {
  const pe = room.pendingEvent;
  if (!pe) return null;

  const forPlayer = room.players.find((p) => p.id === pe.forPlayerId);
  const isMine = pe.forPlayerId === playerId;
  const others = room.players.filter((p) => p.id !== pe.forPlayerId);
  const name = forPlayer?.name ?? "Player";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-2xl animate-pop">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-2xl">{pe.emoji || "✨"}</span>
          <h3 className="text-lg font-extrabold text-white">{pe.title}</h3>
        </div>
        <p className="text-sm text-slate-200">{pe.description}</p>
        {pe.effectText && (
          <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
            {pe.effectText}
          </p>
        )}

        <div className="mt-4">
          {/* INFO / POWER GRANT / CHALLENGE */}
          {(pe.type === "info" || pe.type === "power-grant" || pe.type === "challenge") &&
            (isMine ? (
              <button
                onClick={onAcknowledge}
                className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-white active:scale-95"
              >
                {pe.type === "challenge" ? "✅ I did it!" : "Continue"}
              </button>
            ) : (
              <p className="text-center text-sm text-slate-400">
                Waiting for <span className="text-white">{name}</span>…
              </p>
            ))}

          {/* COLLAB: active player picks a target */}
          {pe.type === "collab" &&
            (isMine ? (
              <div className="flex flex-wrap gap-2">
                {others.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onChooseCollab(p.id)}
                    className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white active:scale-95"
                    style={{ borderLeft: `4px solid ${p.color}` }}
                  >
                    {p.avatar} {p.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-slate-400">
                Waiting for <span className="text-white">{name}</span> to choose…
              </p>
            ))}

          {/* VOTE: everyone votes */}
          {pe.type === "vote" && (
            <VotePanel room={room} meId={playerId} onVote={onVote} />
          )}
        </div>
      </div>
    </div>
  );
}
