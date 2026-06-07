import type { FeedItem } from "../types";

interface Props {
  feed: FeedItem[];
}

function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m`;
}

export default function EventFeed({ feed }: Props) {
  const items = [...feed].reverse(); // newest first
  return (
    <div className="nice-scroll flex max-h-48 flex-col gap-1 overflow-y-auto pr-1 sm:max-h-72">
      {items.length === 0 && (
        <p className="text-xs text-slate-500">Nothing has happened yet…</p>
      )}
      {items.map((it) => (
        <div
          key={it.id}
          className="flex items-start gap-2 rounded-md bg-white/5 px-2 py-1 text-xs text-slate-200 animate-fadeIn"
        >
          <span className="text-sm leading-none">{it.emoji || "•"}</span>
          <span className="flex-1">{it.message}</span>
          <span className="shrink-0 text-[10px] text-slate-500">{ago(it.ts)}</span>
        </div>
      ))}
    </div>
  );
}
