import { useEffect, useState } from "react";
import type { Room } from "../types";

interface Props {
  room: Room;
  meId: string;
  onVote: (optionId: string) => void;
}

// Voting UI for both group votes and peer-judged challenges.
export default function VotePanel({ room, meId, onVote }: Props) {
  const pe = room.pendingEvent;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  if (!pe || (pe.type !== "vote" && pe.type !== "challenge") || !pe.options) return null;

  const eligibleCount =
    pe.voterScope === "others" ? Math.max(0, room.players.length - 1) : room.players.length;

  const votes = room.votes[pe.id] || {};
  const myVote = votes[meId];
  const counts: Record<string, number> = {};
  pe.options.forEach((o) => (counts[o.id] = 0));
  Object.entries(votes).forEach(([voterId, opt]) => {
    // only count eligible voters
    if (pe.voterScope === "others" && voterId === pe.forPlayerId) return;
    if (opt in counts) counts[opt] += 1;
  });
  const totalVoted = Object.values(counts).reduce((a, b) => a + b, 0);
  const remaining = pe.voteEndsAt ? Math.max(0, Math.ceil((pe.voteEndsAt - now) / 1000)) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>
          {totalVoted}/{eligibleCount} voted
        </span>
        {pe.voteEndsAt && <span className={remaining <= 5 ? "font-bold text-red-400" : ""}>{remaining}s</span>}
      </div>
      <div className="flex flex-col gap-2">
        {pe.options.map((o) => {
          const chosen = myVote === o.id;
          return (
            <button
              key={o.id}
              onClick={() => onVote(o.id)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition active:scale-[0.99] ${
                chosen ? "bg-emerald-500/30 ring-2 ring-emerald-400" : "bg-white/10 hover:bg-white/15"
              }`}
            >
              <span className="text-white">{o.label}</span>
              <span className="ml-2 rounded-full bg-black/30 px-2 py-0.5 text-xs text-slate-200">{counts[o.id]}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400">You can change your vote until the timer ends. Majority wins.</p>
    </div>
  );
}
