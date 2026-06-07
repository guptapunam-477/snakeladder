import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { rememberName, recallName } from "../utils/identity";

export default function JoinRoomPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [name, setName] = useState(recallName());
  const [code, setCode] = useState((params.get("code") || "").toUpperCase());
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const n = name.trim();
    const c = code.trim().toUpperCase();
    if (!n) return setError("Please enter your name.");
    if (c.length < 4) return setError("Enter the room code from the host.");
    rememberName(n);
    navigate(`/room/${c}`);
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-5 px-5 py-10">
      <Link to="/" className="text-sm text-slate-400 hover:underline">
        ← Back
      </Link>
      <h1 className="text-3xl font-black text-white">Join a Room</h1>
      <p className="text-sm text-slate-300">
        Enter your name and the code the host shared. No account needed.
      </p>

      <label className="text-sm font-semibold text-slate-200">
        Your name
        <input
          value={name}
          maxLength={14}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Lil Snake"
          className="mt-1 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none ring-1 ring-white/15 focus:ring-emerald-400"
        />
      </label>

      <label className="text-sm font-semibold text-slate-200">
        Room code
        <input
          value={code}
          maxLength={6}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="ABCDE"
          className="mt-1 w-full rounded-xl bg-white/10 px-4 py-3 text-2xl font-bold tracking-[0.3em] text-white outline-none ring-1 ring-white/15 focus:ring-emerald-400"
        />
      </label>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button
        onClick={submit}
        className="rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-white active:scale-95"
      >
        Join Room
      </button>
    </div>
  );
}
