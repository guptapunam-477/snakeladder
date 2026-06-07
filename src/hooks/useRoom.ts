import { useEffect, useRef, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { roomRef } from "../services/db";
import { isFirebaseConfigured } from "../firebase";
import { heartbeat, setConnection } from "../services/playerService";
import { forceTimeoutTurn } from "../services/gameService";
import { resolveVoteIfDue } from "../services/voteService";
import type { Player, Room } from "../types";

export interface UseRoom {
  room: Room | null;
  loading: boolean;
  error: string | null;
  me: Player | null;
  currentPlayer: Player | null;
  isMyTurn: boolean;
  isHost: boolean;
}

export function useRoom(code: string | undefined, playerId: string): UseRoom {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const roomRefData = useRef<Room | null>(null);
  const lastTimeoutFire = useRef(0);

  // Subscribe to the single room document.
  useEffect(() => {
    if (!code) return;
    if (!isFirebaseConfigured) {
      setError("Firebase is not configured. See README to add your .env keys.");
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      roomRef(code),
      (snap) => {
        if (!snap.exists()) {
          setError("ROOM_NOT_FOUND");
          setRoom(null);
        } else {
          const data = snap.data() as Room;
          roomRefData.current = data;
          setRoom(data);
          setError(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err.message || "Connection error.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [code]);

  // Presence: heartbeat while mounted; mark disconnected on unload.
  useEffect(() => {
    if (!code || !playerId) return;
    const hb = setInterval(() => heartbeat(code, playerId), 15000);
    heartbeat(code, playerId);
    const onHide = () => {
      if (document.visibilityState === "hidden") setConnection(code, playerId, false);
      else setConnection(code, playerId, true);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(hb);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [code, playerId]);

  // Timer driver: drives auto-roll / skip / vote resolution.
  useEffect(() => {
    if (!code) return;
    const tick = setInterval(() => {
      const r = roomRefData.current;
      if (!r || r.status !== "active") return;
      const now = Date.now();
      const isHost = r.hostId === playerId;
      const cur = r.players[r.turnIndex];
      const isCurrent = cur?.id === playerId;
      const timerMs = r.settings.turnTimerSeconds * 1000;

      // Throttle so we don't spam transactions while waiting for the snapshot.
      if (now - lastTimeoutFire.current < 1500) return;

      const pe = r.pendingEvent;
      if (pe && pe.type === "vote") {
        if (isHost && pe.voteEndsAt && now >= pe.voteEndsAt) {
          lastTimeoutFire.current = now;
          resolveVoteIfDue(code).catch(() => {});
        }
        return;
      }
      if (pe) {
        if (isHost && now - r.turnStartedAt > timerMs + 1200) {
          lastTimeoutFire.current = now;
          forceTimeoutTurn(code, cur?.id ?? "").catch(() => {});
        }
        return;
      }
      // No pending event: current player auto-acts; host is the backup driver.
      if ((isCurrent || isHost) && now - r.turnStartedAt > timerMs + 800) {
        lastTimeoutFire.current = now;
        forceTimeoutTurn(code, cur?.id ?? "").catch(() => {});
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [code, playerId]);

  const me = room?.players.find((p) => p.id === playerId) || null;
  const currentPlayer = room ? room.players[room.turnIndex] || null : null;
  const isMyTurn = !!currentPlayer && currentPlayer.id === playerId;
  const isHost = !!room && room.hostId === playerId;

  return { room, loading, error, me, currentPlayer, isMyTurn, isHost };
}
