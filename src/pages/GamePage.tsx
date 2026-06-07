import { useState } from "react";
import type { Player, Room } from "../types";
import Board from "../components/Board";
import Dice from "../components/Dice";
import PlayerList from "../components/PlayerList";
import PowerCards from "../components/PowerCards";
import EventFeed from "../components/EventFeed";
import EventModal from "../components/EventModal";
import Timer from "../components/Timer";
import {
  rollDice,
  acknowledgeEvent,
  chooseCollabTarget,
  usePowerCard,
  sendReaction,
} from "../services/gameService";
import { castVote } from "../services/voteService";
import { restartGame } from "../services/roomService";
import { REACTIONS } from "../gameConfig";

interface Props {
  room: Room;
  playerId: string;
  isHost: boolean;
  isMyTurn: boolean;
  currentPlayer: Player | null;
  me: Player | null;
}

export default function GamePage({
  room,
  playerId,
  isHost,
  isMyTurn,
  currentPlayer,
  me,
}: Props) {
  const [toast, setToast] = useState<string | null>(null);

  const guard = (fn: () => Promise<void>) => async () => {
    try {
      await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setToast(msg);
      setTimeout(() => setToast(null), 2200);
    }
  };

  const pe = room.pendingEvent;
  const canRoll = isMyTurn && !pe && !room.rolling && room.status === "active";
  const canUseCards = isMyTurn && !pe && !room.rolling;
  const others = room.players.filter((p) => p.id !== playerId);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col gap-3 px-3 py-4 sm:max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400">
          Room <span className="font-bold text-emerald-300">{room.code}</span>
          {room.advanced.finalRoundChaos && (
            <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
              🔥 Final Chaos
            </span>
          )}
        </div>
        {isHost && (
          <button
            onClick={guard(() => restartGame(room.code, playerId))}
            className="rounded-md bg-white/10 px-2 py-1 text-[11px] text-slate-200 active:scale-95"
          >
            Restart
          </button>
        )}
      </div>

      {/* Turn banner + timer */}
      <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm">
            {currentPlayer ? (
              <>
                <span style={{ color: currentPlayer.color }}>{currentPlayer.avatar}</span>{" "}
                <b className="text-white">{isMyTurn ? "Your turn!" : `${currentPlayer.name}'s turn`}</b>
              </>
            ) : (
              "—"
            )}
          </span>
        </div>
        <Timer
          startedAt={room.turnStartedAt}
          durationSeconds={room.settings.turnTimerSeconds}
          label="Turn timer"
        />
      </div>

      {/* Board */}
      <Board board={room.board} players={room.players} currentPlayerId={currentPlayer?.id} />

      {/* Dice + actions */}
      <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
        <Dice
          onRoll={guard(() => rollDice(room.code, playerId))}
          disabled={!canRoll}
          value={room.lastRoll?.value ?? null}
          rollKey={room.lastRoll?.ts}
        />
        <div className="flex-1">
          {isMyTurn ? (
            <p className="text-sm text-emerald-300">
              {pe ? "Resolve the event above ⬆️" : room.rolling ? "Rolling…" : "Tap roll to move!"}
            </p>
          ) : (
            <p className="text-sm text-slate-400">
              Waiting for {currentPlayer?.name ?? "next player"}…
            </p>
          )}
          {/* Reactions */}
          <div className="mt-2 flex flex-wrap gap-1">
            {REACTIONS.map((r) => (
              <button
                key={r}
                onClick={guard(() => sendReaction(room.code, playerId, r))}
                className="rounded-md bg-white/10 px-2 py-1 text-base active:scale-90"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Power cards */}
      {room.settings.powerCardsEnabled && me && (
        <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
          <h3 className="mb-2 text-sm font-bold text-slate-200">Your power cards</h3>
          <PowerCards
            me={me}
            others={others}
            canUse={canUseCards}
            onUse={(cardId, targetId) =>
              guard(() => usePowerCard(room.code, playerId, cardId, targetId))()
            }
          />
        </div>
      )}

      {/* Rankings */}
      <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
        <h3 className="mb-2 text-sm font-bold text-slate-200">Standings</h3>
        <PlayerList
          players={room.players}
          currentPlayerId={currentPlayer?.id}
          hostId={room.hostId}
          meId={playerId}
          showPositions
        />
      </div>

      {/* Feed */}
      <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
        <h3 className="mb-2 text-sm font-bold text-slate-200">Event feed</h3>
        <EventFeed feed={room.feed} />
      </div>

      {/* Pending event modal */}
      {pe && (
        <EventModal
          room={room}
          playerId={playerId}
          onAcknowledge={guard(() => acknowledgeEvent(room.code, playerId))}
          onChooseCollab={(targetId) =>
            guard(() => chooseCollabTarget(room.code, playerId, targetId))()
          }
          onVote={(optionId) =>
            guard(() => castVote(room.code, pe.id, playerId, optionId))()
          }
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-rose-600 px-4 py-2 text-sm text-white shadow-lg animate-pop">
          {toast}
        </div>
      )}
    </div>
  );
}
