// Dice helpers. Rolls are computed by the authoritative host when it processes
// a player's "roll" action, so every client sees the same result.

export function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

// Roll twice and keep the better result (used by the Extra Dice power card).
export function rollBetterOfTwo(): { value: number; rolls: [number, number] } {
  const a = rollDie();
  const b = rollDie();
  return { value: Math.max(a, b), rolls: [a, b] };
}
