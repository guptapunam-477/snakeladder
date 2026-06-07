import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { Room, RoomSettings } from "../types";
import {
  startGame,
  updateSettings,
  kickPlayer,
} from "../services/roomService";
import { leaveRoom } from "../services/playerService";
import PlayerList from "../components/PlayerList";
import {
  CHALLENGE_MODES,
  MAX_PLAYERS,
  SPEED_OPTIONS,
  THEMES,
  THEME_BLURB,
  TIMER_OPTIONS,
} from "../gameConfig";

interface Props {
  room: Room;
  playerId: string;
  isHost: boolean;
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="flex flex-wrap justify-end gap-1">{children}</div>
    </div>
  );
}

export default function LobbyPage({ room, playerId, isHost }: Props) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareUrl = `${window.location.origin}/join?code=${room.code}`;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  };

  const setS = async (patch: Partial<RoomSettings>) => {
    try {
      await updateSettings(room.code, playerId, patch);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update settings.");
    }
  };

  const onStart = async () => {
    try {
      await startGame(room.code, playerId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start.");
    }
  };

  const onLeave = async () => {
    await leaveRoom(room.code, playerId);
    navigate("/");
  };

  const Pill = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
  }) => (
    <button
      disabled={!isHost}
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? "bg-emerald-500 text-white"
          : "bg-white/10 text-slate-300"
      } ${isHost ? "active:scale-95" : "opacity-80"}`}
    >
      {children}
    </button>
  );

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Lobby</h1>
        <button onClick={onLeave} className="text-xs text-slate-400 hover:underline">
          Leave
        </button>
      </div>

      {/* Room code + share */}
      <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <p className="text-xs text-slate-400">Room code — share it with friends</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-4xl font-black tracking-[0.25em] text-emerald-300">
            {room.code}
          </span>
          <button
            onClick={() => copy(room.code)}
            className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold active:scale-95"
          >
            {copied ? "Copied!" : "Copy code"}
          </button>
        </div>
        <button
          onClick={() => copy(shareUrl)}
          className="mt-2 w-full truncate rounded-lg bg-white/5 px-3 py-2 text-left text-xs text-slate-300 active:scale-[0.99]"
        >
          🔗 {shareUrl}
        </button>
      </div>

      {/* Players */}
      <div>
        <h2 className="mb-2 text-sm font-bold text-slate-200">
          Players ({room.players.length}/{MAX_PLAYERS})
        </h2>
        <PlayerList
          players={room.players}
          hostId={room.hostId}
          meId={playerId}
          showKick={isHost}
          onKick={(id) => kickPlayer(room.code, playerId, id).catch(() => {})}
        />
        {room.players.length < 2 && (
          <p className="mt-2 text-xs text-amber-300">Waiting for at least 1 more player…</p>
        )}
      </div>

      {/* Settings */}
      <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <h2 className="mb-1 text-sm font-bold text-slate-200">
          Game settings {!isHost && <span className="text-xs font-normal text-slate-500">(host controls these)</span>}
        </h2>
        <SettingRow label="Game speed">
          {SPEED_OPTIONS.map((s) => (
            <Pill key={s} active={room.settings.speed === s} onClick={() => setS({ speed: s })}>
              {s}
            </Pill>
          ))}
        </SettingRow>
        <SettingRow label="Turn timer">
          {TIMER_OPTIONS.map((t) => (
            <Pill
              key={t}
              active={room.settings.turnTimerSeconds === t}
              onClick={() => setS({ turnTimerSeconds: t })}
            >
              {t}s
            </Pill>
          ))}
        </SettingRow>
        <SettingRow label="On timeout">
          <Pill active={room.settings.timeoutAction === "auto-roll"} onClick={() => setS({ timeoutAction: "auto-roll" })}>
            Auto-roll
          </Pill>
          <Pill active={room.settings.timeoutAction === "skip"} onClick={() => setS({ timeoutAction: "skip" })}>
            Skip
          </Pill>
        </SettingRow>
        <SettingRow label="Challenges">
          {CHALLENGE_MODES.map((m) => (
            <Pill key={m} active={room.settings.challengeMode === m} onClick={() => setS({ challengeMode: m })}>
              {m}
            </Pill>
          ))}
        </SettingRow>
        <SettingRow label="Power cards">
          <Pill active={room.settings.powerCardsEnabled} onClick={() => setS({ powerCardsEnabled: true })}>
            On
          </Pill>
          <Pill active={!room.settings.powerCardsEnabled} onClick={() => setS({ powerCardsEnabled: false })}>
            Off
          </Pill>
        </SettingRow>
        <SettingRow label="Theme">
          {THEMES.map((t) => (
            <Pill key={t} active={room.settings.theme === t} onClick={() => setS({ theme: t })}>
              {t.split(" ")[0]}
            </Pill>
          ))}
        </SettingRow>
        <p className="mt-1 text-[11px] text-slate-400">{THEME_BLURB[room.settings.theme]}</p>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {isHost ? (
        <button
          onClick={onStart}
          disabled={room.players.length < 2}
          className="rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-white active:scale-95 disabled:bg-slate-600"
        >
          🚀 Start Game
        </button>
      ) : (
        <p className="rounded-2xl bg-white/5 py-4 text-center text-sm text-slate-300">
          Waiting for the host to start…
        </p>
      )}
    </div>
  );
}
