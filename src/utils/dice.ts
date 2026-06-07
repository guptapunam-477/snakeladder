// Dice helpers. Rolls are computed on whichever client owns the turn, then
// committed inside a Firestore transaction. For a private party game this is
// perfectly fine; the transaction prevents double-commits / race conditions.

export function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

// Roll twice and keep the better result (used by the Extra Dice power card).
export function rollBetterOfTwo(): { value: number; rolls: [number, number] } {
  const a = rollDie();
  const b = rollDie();
  return { value: Math.max(a, b), rolls: [a, b] };
}
