import type { Player } from "../types";

interface Props {
  player: Player;
  active?: boolean;
  size?: "sm" | "md";
}

// A round token showing the player's emoji avatar with their colour ring.
export default function PlayerToken({ player, active, size = "sm" }: Props) {
  const dim = size === "sm" ? "h-6 w-6 text-[13px]" : "h-9 w-9 text-lg";
  return (
    <div
      title={`${player.name} — tile ${player.position}`}
      className={`flex ${dim} items-center justify-center rounded-full border-2 bg-slate-900/80 ${
        active ? "ring-2 ring-white animate-floaty" : ""
      } ${player.connected ? "" : "opacity-50"}`}
      style={{ borderColor: player.color }}
    >
      <span>{player.avatar}</span>
    </div>
  );
}
