import {
  doc,
  runTransaction,
  type DocumentReference,
  type Transaction,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import type { Room } from "../types";

export const ROOMS = "rooms";

export function ensureConfigured() {
  if (!isFirebaseConfigured || !db) {
    throw new Error(
      "Firebase is not configured. Copy .env.example to .env and fill in your Firebase keys (see README)."
    );
  }
}

export function roomRef(code: string): DocumentReference {
  ensureConfigured();
  return doc(db, ROOMS, code.toUpperCase());
}

// Run a transaction that reads the room, mutates a working copy, and writes it
// back. The mutator returns either the updated room or a value to return to the
// caller. Throwing inside aborts the transaction (no write).
export async function withRoom<T>(
  code: string,
  mutator: (room: Room, tx: Transaction) => T | Promise<T>
): Promise<T> {
  const ref = roomRef(code);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error("ROOM_NOT_FOUND");
    }
    const room = snap.data() as Room;
    const result = await mutator(room, tx);
    room.updatedAt = Date.now();
    tx.set(ref, room);
    return result;
  });
}
