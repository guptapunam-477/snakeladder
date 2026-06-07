import { useState, type ReactNode } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useRoom } from "../hooks/useRoom";
import { getOrCreatePlayerId, rememberName, recallName } from "../utils/identity";
import { joinRoom } from "../services/roomService";
import LobbyPage from "./LobbyPage";
import GamePage from "./GamePage";
import WinnerPage from "./WinnerPage";

function Center({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      {children}
    </div>
  );
}

export default function RoomPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const playerId = getOrCreatePlayerId();
  const roomCode = (code || "").toUpperCase();
  const { room, loading, error, me, currentPlayer, isMyTurn, isHost } = useRoom(
    roomCode,
    playerId
  );

  const [name, setName] = useState(recallName());
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  if (loading) {
    return (
      <Center>
        <div className="text-4xl animate-floaty">🪜</div>
        <p className="text-slate-300">Loading room {roomCode}…</p>
      </Center>
    );
  }

  if (error === "ROOM_NOT_FOUND" || !room) {
    return (
      <Center>
        <div className="text-4xl">🤷</div>
        <h1 className="text-xl font-bold text-white">Room not found</h1>
        <p className="text-sm text-slate-400">
          No room with code <b>{roomCode}</b>. It may have been closed.
        </p>
        <Link to="/" className="rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white">
          Back to start
        </Link>
        {error && error !== "ROOM_NOT_FOUND" && (
          <p className="text-xs text-rose-400">{error}</p>
        )}
      </Center>
    );
  }

  // I'm viewing a room I haven't joined yet (e.g. opened a share link).
  if (!me) {
    if (room.status !== "waiting") {
      return (
        <Center>
          <div className="text-4xl">🚪</div>
          <h1 className="text-xl font-bold text-white">
            This game is {room.status === "active" ? "in progress" : "finished"}.
          </h1>
          <p className="text-sm text-slate-400">
            Ask the host to restart so you can join the next round.
          </p>
          <Link to="/" className="rounded-xl bg-white/10 px-5 py-3 font-semibold text-white">
            Back to start
          </Link>
        </Center>
      );
    }
    const submit = async () => {
      const n = name.trim();
      if (!n) return setJoinError("Enter your name.");
      setJoining(true);
      setJoinError(null);
      try {
        rememberName(n);
        await joinRoom(roomCode, playerId, n);
      } catch (e) {
        setJoinError(e instanceof Error ? e.message : "Could not join.");
        setJoining(false);
      }
    };
    return (
      <Center>
        <h1 className="text-2xl font-black text-white">Join room {roomCode}</h1>
        <input
          value={name}
          maxLength={14}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Your name"
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-center text-white outline-none ring-1 ring-white/15 focus:ring-emerald-400"
        />
        {joinError && <p className="text-sm text-rose-400">{joinError}</p>}
        <button
          onClick={submit}
          disabled={joining}
          className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-white active:scale-95 disabled:bg-slate-600"
        >
          {joining ? "Joining…" : "Join"}
        </button>
        <button onClick={() => navigate("/")} className="text-xs text-slate-400 hover:underline">
          Cancel
        </button>
      </Center>
    );
  }

  if (room.status === "waiting") {
    return <LobbyPage room={room} playerId={playerId} isHost={isHost} />;
  }
  if (room.status === "completed") {
    return <WinnerPage room={room} playerId={playerId} isHost={isHost} />;
  }
  return (
    <GamePage
      room={room}
      playerId={playerId}
      isHost={isHost}
      isMyTurn={isMyTurn}
      currentPlayer={currentPlayer}
      me={me}
    />
  );
}
