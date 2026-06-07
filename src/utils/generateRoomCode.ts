// Generates a short, human-friendly room code.
// Avoids ambiguous characters (0/O, 1/I/L) so codes are easy to read out loud.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 5): string {
  let code = "";
  const buf = new Uint32Array(length);
  // Use crypto when available for better randomness; fall back to Math.random.
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < length; i++) {
      code += ALPHABET[buf[i] % ALPHABET.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
  }
  return code;
}
