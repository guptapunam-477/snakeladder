import type { Room } from "../types";
import type { Action } from "../net/protocol";
import Board from "../components/Board";
import Dice from "../components/Dice";
import PlayerList from "../components/PlayerList";
import PowerCards from "../components/PowerCards";
import EventFeed from "../components/EventFeed";
import EventModal from "../components/EventModal";
import Timer from "../components/Timer";
import { REACTIONS } from "../gameConfig";

interface Props {
  room: Room;
  myId: string;
  isHost: boolean;
  dispatch: (a: Action) => void;
}

export default function GamePage({ room, myId, isHost, dispatch }: Props) {
  const currentPlayer = room.players[room.turnIndex] || null;
  const me = room.players.find((p) => p.id === myId) || null;
  const isMyTurn = !!currentPlayer && currentPlayer.id === myId;
  const pe = room.pendingEvent;
  const canRoll = isMyTurn && !pe && !room.rolling && room.status === "active";
  const canUseCards = isMyTurn && !pe && !room.rolling;
  const others = room.players.filter((p) => p.id !== myId);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col gap-3 px-3 py-4 sm:max-w-lg">
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
            onClick={() => dispatch({ kind: "restart" })}
            className="rounded-md bg-white/10 px-2 py-1 text-[11px] text-slate-200 active:scale-95"
          >
            Restart
          </button>
        )}
      </div>

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
        <Timer startedAt={room.turnStartedAt} durationSeconds={room.settings.turnTimerSeconds} label="Turn timer" />
      </div>

      <Board board={room.board} players={room.players} currentPlayerId={currentPlayer?.id} />

      <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
        <Dice
          onRoll={() => dispatch({ kind: "roll" })}
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
            <p className="text-sm text-slate-400">Waiting for {currentPlayer?.name ?? "next player"}…</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {REACTIONS.map((r) => (
              <button
                key={r}
                onClick={() => dispatch({ kind: "reaction", emoji: r })}
                className="rounded-md bg-white/10 px-2 py-1 text-base active:scale-90"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {room.settings.powerCardsEnabled && me && (
        <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
          <h3 className="mb-2 text-sm font-bold text-slate-200">Your power cards</h3>
          <PowerCards
            me={me}
            others={others}
            canUse={canUseCards}
            onUse={(cardId, targetId) => dispatch({ kind: "usePower", cardId, targetId })}
          />
        </div>
      )}

      <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
        <h3 className="mb-2 text-sm font-bold text-slate-200">Standings</h3>
        <PlayerList
          players={room.players}
          currentPlayerId={currentPlayer?.id}
          hostId={room.hostId}
          meId={myId}
          showPositions
        />
      </div>

      <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
        <h3 className="mb-2 text-sm font-bold text-slate-200">Event feed</h3>
        <EventFeed feed={room.feed} />
      </div>

      {pe && (
        <EventModal
          room={room}
          playerId={myId}
          onAcknowledge={() => dispatch({ kind: "acknowledge" })}
          onChooseCollab={(targetId) => dispatch({ kind: "collab", targetId })}
          onVote={(optionId) => dispatch({ kind: "vote", optionId })}
        />
      )}
    </div>
  );
}
