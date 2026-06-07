import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { generateRoomCode } from "../utils/generateRoomCode";
import { rememberName, recallName } from "../utils/identity";

export default function CreateRoomPage() {
  const navigate = useNavigate();
  const [name, setName] = useState(recallName());
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter your name.");
      return;
    }
    const code = generateRoomCode(5);
    rememberName(trimmed);
    try {
      // Mark this browser as the HOST of this code, and clear any old saved
      // room so we start fresh. useGame reads these on the room screen.
      localStorage.setItem(`cl_host_${code}`, trimmed);
      localStorage.removeItem(`cl_room_${code}`);
    } catch {
      /* ignore storage issues */
    }
    navigate(`/room/${code}`);
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-5 px-5 py-10">
      <Link to="/" className="text-sm text-slate-400 hover:underline">
        ← Back
      </Link>
      <h1 className="text-3xl font-black text-white">Create a Room</h1>
      <p className="text-sm text-slate-300">
        You'll be the host. You'll get a room code and a shareable link to send
        your friends — no sign-up, no app. Keep this tab open while you play; it
        runs the game for everyone.
      </p>

      <label className="text-sm font-semibold text-slate-200">
        Your name
        <input
          value={name}
          maxLength={14}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="e.g. Captain Chaos"
          className="mt-1 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none ring-1 ring-white/15 focus:ring-emerald-400"
        />
        <span className="mt-1 block text-right text-[11px] text-slate-500">{name.length}/14</span>
      </label>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button
        onClick={submit}
        className="rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-white active:scale-95"
      >
        Create Room
      </button>
    </div>
  );
}
