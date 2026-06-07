import { useCallback, useEffect, useRef, useState } from "react";
import { PeerHost, PeerClient } from "../net/peer";
import type { Action } from "../net/protocol";
import {
  createRoom,
  addOrReconnectPlayer,
  markDisconnected,
  applyAction,
  tickTimers,
} from "../game/engine";
import type { Room } from "../types";

export type GameStatus =
  | "initializing"
  | "hosting"
  | "connecting"
  | "connected"
  | "host-left"
  | "kicked"
  | "error";

export type Role = "host" | "client";

export interface UseGame {
  room: Room | null;
  myId: string;
  isHost: boolean;
  status: GameStatus;
  error: string | null;
  clearError: () => void;
  dispatch: (action: Action) => void;
  leave: () => void;
}

const clone = (r: Room): Room => JSON.parse(JSON.stringify(r));

// Persist the host's authoritative room so a host refresh can resume mid-game.
function saveHostRoom(code: string, room: Room) {
  try {
    localStorage.setItem(`cl_room_${code}`, JSON.stringify({ ts: Date.now(), room }));
  } catch {
    /* ignore */
  }
}
function loadHostRoom(code: string): Room | null {
  try {
    const raw = localStorage.getItem(`cl_room_${code}`);
    if (!raw) return null;
    const { ts, room } = JSON.parse(raw);
    if (Date.now() - ts > 6 * 60 * 60 * 1000) return null; // older than 6h
    return room as Room;
  } catch {
    return null;
  }
}

export function useGame(opts: {
  code: string;
  role: Role;
  name: string;
  playerId: string;
  fresh?: boolean; // host: start a brand-new room (ignore any saved state)
}): UseGame {
  const { code, role, name, playerId, fresh } = opts;
  const [room, setRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState<GameStatus>("initializing");
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const hostRef = useRef<PeerHost | null>(null);
  const clientRef = useRef<PeerClient | null>(null);

  const commit = useCallback(() => {
    const r = roomRef.current;
    if (!r) return;
    const snap = clone(r);
    setRoom(snap);
    hostRef.current?.broadcast(snap);
    saveHostRoom(code, r);
  }, [code]);

  const hostDispatch = useCallback(
    (pid: string, action: Action) => {
      const r = roomRef.current;
      if (!r) return;
      try {
        applyAction(r, pid, action);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid action.";
        if (msg === "__silent") return; // rate-limited; ignore quietly
        if (pid === playerId) setError(msg);
        else hostRef.current?.sendError(pid, msg);
        return;
      }
      commit();
    },
    [commit, playerId]
  );

  // ---- HOST ----
  useEffect(() => {
    if (role !== "host") return;
    let cancelled = false;
    const host = new PeerHost();
    hostRef.current = host;

    const saved = fresh ? null : loadHostRoom(code);
    roomRef.current = saved ?? createRoom(code, playerId, name);

    host.onJoin = (pid, nm) => {
      const r = roomRef.current;
      if (!r) return;
      try {
        addOrReconnectPlayer(r, pid, nm);
      } catch (e) {
        host.sendError(pid, e instanceof Error ? e.message : "Could not join.");
        return;
      }
      commit();
    };
    host.onAction = (pid, action) => hostDispatch(pid, action);
    host.onLeave = (pid) => {
      const r = roomRef.current;
      if (!r) return;
      markDisconnected(r, pid);
      commit();
    };

    (async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await host.start(code);
          if (cancelled) return;
          setStatus("hosting");
          commit();
          return;
        } catch (e) {
          if (e instanceof Error && e.message === "ID_TAKEN") {
            await new Promise((res) => setTimeout(res, 1500));
            continue;
          }
          if (!cancelled) {
            setError("Could not start hosting. Check your connection and try again.");
            setStatus("error");
          }
          return;
        }
      }
      if (!cancelled) {
        setError("This room code is busy. Please create a new room.");
        setStatus("error");
      }
    })();

    const tick = setInterval(() => {
      const r = roomRef.current;
      if (r && tickTimers(r)) commit();
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(tick);
      host.close();
      hostRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, code]);

  // ---- CLIENT ----
  useEffect(() => {
    if (role !== "client") return;
    const client = new PeerClient();
    clientRef.current = client;

    client.onState = (r) => {
      roomRef.current = r;
      setRoom(r);
      if (r.players.some((p) => p.id === playerId)) setStatus("connected");
    };
    client.onError = (m) => setError(m);
    client.onKicked = () => setStatus("kicked");
    client.onStatus = (s) => {
      setStatus((prev) => {
        if (prev === "kicked") return prev;
        if (s === "host-left") return "host-left";
        if (s === "error") return prev === "connected" ? "connected" : "connecting";
        if (s === "connected") return prev === "connected" ? "connected" : "connecting";
        return "connecting";
      });
    };

    client.connect(code, playerId, name);
    return () => {
      client.close();
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, code]);

  const dispatch = useCallback(
    (action: Action) => {
      if (role === "host") hostDispatch(playerId, action);
      else clientRef.current?.send(action, playerId);
    },
    [role, hostDispatch, playerId]
  );

  const leave = useCallback(() => {
    try {
      dispatch({ kind: "leave" });
    } catch {
      /* ignore */
    }
    hostRef.current?.close();
    clientRef.current?.close();
  }, [dispatch]);

  return {
    room,
    myId: playerId,
    isHost: role === "host",
    status,
    error,
    clearError: () => setError(null),
    dispatch,
    leave,
  };
}
