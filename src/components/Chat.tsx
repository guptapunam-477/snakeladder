import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../types";
import { CHAT_COOLDOWN_MS, CHAT_MAX_LEN } from "../gameConfig";

interface Props {
  chat: ChatMessage[];
  myId: string;
  onSend: (text: string) => void;
}

export default function Chat({ chat, myId, onSend }: Props) {
  const [text, setText] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // auto-scroll to newest
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [chat.length]);

  const send = () => {
    const t = text.trim().slice(0, CHAT_MAX_LEN);
    if (!t || cooldown) return;
    onSend(t);
    setText("");
    setCooldown(true);
    setTimeout(() => setCooldown(false), CHAT_COOLDOWN_MS);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="nice-scroll flex-1 space-y-1 overflow-y-auto pr-1">
        {chat.length === 0 && <p className="text-xs text-slate-500">Say hi! 👋 (max {CHAT_MAX_LEN} chars)</p>}
        {chat.map((m) => (
          <div key={m.id} className="text-xs leading-snug">
            <span className="font-bold" style={{ color: m.color }}>
              {m.name}
              {m.playerId === myId && " (you)"}:
            </span>{" "}
            <span className="text-slate-200">{m.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="mt-2 flex items-center gap-1">
        <input
          value={text}
          maxLength={CHAT_MAX_LEN}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={cooldown ? "Slow down…" : "Message…"}
          className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/15 focus:ring-emerald-400"
        />
        <button
          onClick={send}
          disabled={cooldown || !text.trim()}
          className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white active:scale-95 disabled:bg-slate-600"
        >
          Send
        </button>
      </div>
      <div className="mt-0.5 text-right text-[10px] text-slate-500">
        {text.length}/{CHAT_MAX_LEN}
      </div>
    </div>
  );
}
