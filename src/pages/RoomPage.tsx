import { useState, type ReactNode } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getOrCreatePlayerId, rememberName, recallName } from "../utils/identity";
import { useGame, type Role } from "../hooks/useGame";
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

function Spinner({ label }: { label: string }) {
  return (
    <Center>
      <div className="text-4xl animate-floaty">🪜</div>
      <p className="text-slate-300">{label}</p>
    </Center>
  );
}

// The live game view — owns the peer connection and renders the right screen.
function GameView({
  code,
  role,
  name,
  playerId,
}: {
  code: string;
  role: Role;
  name: string;
  playerId: string;
}) {
  const navigate = useNavigate();
  const g = useGame({ code, role, name, playerId });
  const onLeave = () => {
    g.leave();
    navigate("/");
  };

  const Toast = g.error ? (
    <button
      onClick={g.clearError}
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-rose-600 px-4 py-2 text-sm text-white shadow-lg animate-pop"
    >
      {g.error} ✕
    </button>
  ) : null;

  const render = (): ReactNode => {
    // Host flows
    if (role === "host") {
      if (g.status === "error") {
        return (
          <Center>
            <div className="text-4xl">⚠️</div>
            <h1 className="text-xl font-bold text-white">Couldn't start hosting</h1>
            <p className="text-sm text-slate-400">{g.error || "Please try again."}</p>
            <Link to="/create" className="rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white">
              Create a new room
            </Link>
          </Center>
        );
      }
      if (!g.room) return <Spinner label="Setting up your room…" />;
    } else {
      // Client flows
      if (g.status === "kicked") {
        return (
          <Center>
            <div className="text-4xl">👋</div>
            <h1 className="text-xl font-bold text-white">You were removed from the room</h1>
            <Link to="/" className="rounded-xl bg-white/10 px-5 py-3 font-semibold text-white">
              Back to start
            </Link>
          </Center>
        );
      }
      if (!g.room || g.status === "connecting") {
        return (
          <Center>
            <div className="text-4xl animate-floaty">📡</div>
            <p className="text-slate-300">Connecting to the host…</p>
            <p className="text-xs text-slate-500">
              Make sure the host has the game open. This can take a few seconds.
            </p>
            {g.error && <p className="text-sm text-rose-400">{g.error}</p>}
            <button onClick={() => navigate("/")} className="text-xs text-slate-400 hover:underline">
              Cancel
            </button>
          </Center>
        );
      }
    }

    const room = g.room!;
    const inner =
      room.status === "waiting" ? (
        <LobbyPage room={room} myId={g.myId} isHost={g.isHost} dispatch={g.dispatch} onLeave={onLeave} />
      ) : room.status === "completed" ? (
        <WinnerPage room={room} myId={g.myId} isHost={g.isHost} dispatch={g.dispatch} onLeave={onLeave} />
      ) : (
        <GamePage room={room} myId={g.myId} isHost={g.isHost} dispatch={g.dispatch} />
      );

    return (
      <>
        {inner}
        {/* Reconnecting overlay for clients who lost the host */}
        {role === "client" && g.status === "host-left" && (
          <div className="fixed inset-x-0 top-0 z-40 bg-amber-500 px-3 py-2 text-center text-xs font-semibold text-black">
            Lost connection to the host — trying to reconnect…
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {render()}
      {Toast}
    </>
  );
}

export default function RoomPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const roomCode = (code || "").toUpperCase();
  const playerId = getOrCreatePlayerId();

  let hostName: string | null = null;
  try {
    hostName = localStorage.getItem(`cl_host_${roomCode}`);
  } catch {
    hostName = null;
  }
  const role: Role = hostName ? "host" : "client";

  const [clientName, setClientName] = useState(recallName());
  const [confirmed, setConfirmed] = useState(role === "host" || !!recallName().trim());

  if (!roomCode) {
    return <Spinner label="Loading…" />;
  }

  // Cold join via a shared link with no remembered name → ask for one.
  if (role === "client" && !confirmed) {
    const submit = () => {
      const n = clientName.trim();
      if (!n) return;
      rememberName(n);
      setConfirmed(true);
    };
    return (
      <Center>
        <h1 className="text-2xl font-black text-white">Join room {roomCode}</h1>
        <input
          value={clientName}
          maxLength={14}
          onChange={(e) => setClientName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Your name"
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-center text-white outline-none ring-1 ring-white/15 focus:ring-emerald-400"
        />
        <button
          onClick={submit}
          className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-white active:scale-95"
        >
          Join
        </button>
        <button onClick={() => navigate("/")} className="text-xs text-slate-400 hover:underline">
          Cancel
        </button>
      </Center>
    );
  }

  const name = role === "host" ? hostName! : clientName.trim() || recallName();
  return <GameView code={roomCode} role={role} name={name} playerId={playerId} />;
}
