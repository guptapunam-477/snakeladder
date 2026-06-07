import { useState, type ReactNode } from "react";
import type { Room } from "../types";
import type { Action } from "../net/protocol";
import Board from "../components/Board";
import Dice from "../components/Dice";
import PlayerList from "../components/PlayerList";
import PowerCards from "../components/PowerCards";
import EventFeed from "../components/EventFeed";
import EventModal from "../components/EventModal";
import Timer from "../components/Timer";
import Chat from "../components/Chat";
import Stickers from "../components/Stickers";
import { useVoice } from "../hooks/useVoice";
import { REACTIONS } from "../gameConfig";

interface Props {
  room: Room;
  myId: string;
  isHost: boolean;
  dispatch: (a: Action) => void;
}

type Tab = "chat" | "throw" | "players" | "cards" | "feed";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
      <h3 className="mb-2 text-sm font-bold text-slate-200">{title}</h3>
      {children}
    </div>
  );
}

export default function GamePage({ room, myId, isHost, dispatch }: Props) {
  const [tab, setTab] = useState<Tab>("chat");
  const voice = useVoice({ players: room.players, myId, dispatch });

  const currentPlayer = room.players[room.turnIndex] || null;
  const me = room.players.find((p) => p.id === myId) || null;
  const isMyTurn = !!currentPlayer && currentPlayer.id === myId;
  const pe = room.pendingEvent;
  const canRoll = isMyTurn && !pe && !room.rolling && room.status === "active";
  const canUseCards = isMyTurn && !pe && !room.rolling;
  const others = room.players.filter((p) => p.id !== myId);

  const VoiceButton = voice.supported ? (
    <div className="flex items-center gap-1">
      {!voice.voiceOn ? (
        <button
          onClick={voice.enable}
          className="rounded-md bg-white/10 px-2 py-1 text-[11px] text-slate-200 active:scale-95"
          title="Voice chat (beta)"
        >
          🎙️ Voice
        </button>
      ) : (
        <>
          <button
            onClick={voice.toggleMute}
            className={`rounded-md px-2 py-1 text-[11px] active:scale-95 ${voice.muted ? "bg-rose-600/70 text-white" : "bg-emerald-500/70 text-white"}`}
          >
            {voice.muted ? "🔇 Muted" : "🎙️ Live"}
          </button>
          <button onClick={voice.disable} className="rounded-md bg-white/10 px-2 py-1 text-[11px] text-slate-200 active:scale-95">
            ✕
          </button>
        </>
      )}
    </div>
  ) : null;

  // --- reusable panels ---
  const reactionsRow = (
    <div className="flex flex-wrap gap-1">
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
  );

  const playersPanel = (
    <Panel title="Standings">
      <PlayerList players={room.players} currentPlayerId={currentPlayer?.id} hostId={room.hostId} meId={myId} showPositions />
    </Panel>
  );
  const cardsPanel = room.settings.powerCardsEnabled && me && (
    <Panel title="Your power cards">
      <PowerCards me={me} others={others} canUse={canUseCards} onUse={(cardId, targetId) => dispatch({ kind: "usePower", cardId, targetId })} />
    </Panel>
  );
  const chatPanel = (
    <Panel title="Chat">
      <div className="h-56">
        <Chat chat={room.chat} myId={myId} onSend={(text) => dispatch({ kind: "chat", text })} />
      </div>
    </Panel>
  );
  const throwPanel = (
    <Panel title="Throw a sticker 🎯">
      <Stickers players={room.players} myId={myId} onFling={(targetId, sticker) => dispatch({ kind: "fling", targetId, sticker })} />
    </Panel>
  );
  const feedPanel = (
    <Panel title="Event feed">
      <EventFeed feed={room.feed} />
    </Panel>
  );

  return (
    <div className="mx-auto max-w-6xl px-3 py-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs text-slate-400">
          Room <span className="font-bold text-emerald-300">{room.code}</span>
          {room.turnDir === -1 && <span className="ml-2 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] text-sky-300">🔄 Reversed</span>}
          {room.advanced.finalRoundChaos && (
            <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">🔥 Final Chaos</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {VoiceButton}
          {isHost && (
            <button onClick={() => dispatch({ kind: "restart" })} className="rounded-md bg-white/10 px-2 py-1 text-[11px] text-slate-200 active:scale-95">
              Restart
            </button>
          )}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)_300px] lg:gap-4">
        {/* Left column (desktop) */}
        <aside className="hidden flex-col gap-3 lg:flex">
          {playersPanel}
          {cardsPanel}
        </aside>

        {/* Center */}
        <main className="flex flex-col gap-3">
          <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <div className="mb-2 text-sm">
              {currentPlayer ? (
                <>
                  <span style={{ color: currentPlayer.color }}>{currentPlayer.avatar}</span>{" "}
                  <b className="text-white">{isMyTurn ? "Your turn!" : `${currentPlayer.name}'s turn`}</b>
                </>
              ) : (
                "—"
              )}
            </div>
            <Timer startedAt={room.turnStartedAt} durationSeconds={room.settings.turnTimerSeconds} label="Turn timer" />
          </div>

          <Board board={room.board} players={room.players} currentPlayerId={currentPlayer?.id} lastFx={room.lastFx} flings={room.flings} />

          <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <Dice onRoll={() => dispatch({ kind: "roll" })} disabled={!canRoll} value={room.lastRoll?.value ?? null} rollKey={room.lastRoll?.ts} />
            <div className="flex-1">
              <p className={`text-sm ${isMyTurn ? "text-emerald-300" : "text-slate-400"}`}>
                {isMyTurn ? (pe ? "Resolve the event ⬆️" : room.rolling ? "Rolling…" : "Tap roll to move!") : `Waiting for ${currentPlayer?.name ?? "next player"}…`}
              </p>
              <div className="mt-2">{reactionsRow}</div>
            </div>
          </div>
        </main>

        {/* Right column (desktop) */}
        <aside className="hidden flex-col gap-3 lg:flex">
          {chatPanel}
          {throwPanel}
          {feedPanel}
        </aside>
      </div>

      {/* Mobile: tabbed secondary panels */}
      <div className="mt-3 lg:hidden">
        <div className="mb-2 flex gap-1 overflow-x-auto">
          {([
            ["chat", "💬 Chat"],
            ["throw", "🎯 Throw"],
            ["players", "🏁 Players"],
            ["cards", "🃏 Cards"],
            ["feed", "📜 Feed"],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${tab === t ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-300"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "chat" && chatPanel}
        {tab === "throw" && throwPanel}
        {tab === "players" && playersPanel}
        {tab === "cards" && (cardsPanel || <Panel title="Power cards">Power cards are off.</Panel>)}
        {tab === "feed" && feedPanel}
      </div>

      {voice.error && <p className="mt-2 text-center text-xs text-rose-400">Voice: {voice.error}</p>}

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
