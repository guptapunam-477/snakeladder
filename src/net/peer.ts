import Peer, { type DataConnection } from "peerjs";
import {
  hostPeerId,
  ICE_SERVERS,
  type Action,
  type ClientMsg,
  type HostMsg,
} from "./protocol";
import type { Room } from "../types";

const peerOptions = { config: { iceServers: ICE_SERVERS } };

// ---------------------------------------------------------------------------
// HOST side: registers a well-known peer id, accepts connections, routes
// incoming actions, and broadcasts full room snapshots.
// ---------------------------------------------------------------------------
export class PeerHost {
  private peer: Peer | null = null;
  private conns = new Map<string, DataConnection>();

  onJoin?: (playerId: string, name: string) => void;
  onAction?: (playerId: string, action: Action) => void;
  onLeave?: (playerId: string) => void;

  // Resolves once the host id is registered. Rejects with "ID_TAKEN" if the
  // code is already hosted by someone else (caller should pick a new code).
  start(code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const peer = new Peer(hostPeerId(code), peerOptions);
      this.peer = peer;
      let opened = false;

      peer.on("open", () => {
        opened = true;
        resolve();
      });
      peer.on("connection", (conn) => this.setupConn(conn));
      peer.on("error", (err: any) => {
        const type = err?.type || "";
        if (!opened && (type === "unavailable-id" || /taken|unavailable/i.test(String(err?.message)))) {
          reject(new Error("ID_TAKEN"));
        } else if (!opened) {
          reject(err);
        }
        // post-open errors (a peer dropping, etc.) are non-fatal
      });
    });
  }

  private setupConn(conn: DataConnection) {
    conn.on("data", (raw) => {
      const msg = raw as ClientMsg;
      if (!msg || typeof msg !== "object") return;
      if (msg.t === "join") {
        this.conns.set(msg.playerId, conn);
        (conn as any).__pid = msg.playerId;
        this.onJoin?.(msg.playerId, msg.name);
      } else if (msg.t === "action") {
        this.onAction?.(msg.playerId, msg.action);
      }
    });
    conn.on("close", () => {
      const pid = (conn as any).__pid as string | undefined;
      if (pid) {
        this.conns.delete(pid);
        this.onLeave?.(pid);
      }
    });
    conn.on("error", () => {
      /* ignore — handled by close */
    });
  }

  broadcast(room: Room) {
    const msg: HostMsg = { t: "state", room };
    this.conns.forEach((c) => {
      if (c.open) {
        try {
          c.send(msg);
        } catch {
          /* ignore */
        }
      }
    });
  }

  sendError(playerId: string, message: string) {
    const c = this.conns.get(playerId);
    if (c?.open) c.send({ t: "error", message } satisfies HostMsg);
  }

  sendKicked(playerId: string) {
    const c = this.conns.get(playerId);
    if (c?.open) c.send({ t: "kicked" } satisfies HostMsg);
  }

  close() {
    this.conns.forEach((c) => {
      try {
        c.close();
      } catch {
        /* ignore */
      }
    });
    this.conns.clear();
    try {
      this.peer?.destroy();
    } catch {
      /* ignore */
    }
  }
}

export type ClientStatus = "connecting" | "connected" | "host-left" | "error";

// ---------------------------------------------------------------------------
// CLIENT side: connects to the host's peer id, sends actions, receives state.
// Auto-retries if the connection drops (e.g. host refreshed their tab).
// ---------------------------------------------------------------------------
export class PeerClient {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private code = "";
  private joinMsg: ClientMsg = { t: "join", playerId: "", name: "" };
  private closed = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  onState?: (room: Room) => void;
  onError?: (message: string) => void;
  onKicked?: () => void;
  onStatus?: (status: ClientStatus) => void;

  connect(code: string, playerId: string, name: string) {
    this.code = code;
    this.joinMsg = { t: "join", playerId, name };
    this.open();
  }

  private open() {
    if (this.closed) return;
    this.onStatus?.("connecting");
    const peer = new Peer(peerOptions);
    this.peer = peer;

    peer.on("open", () => {
      const conn = peer.connect(hostPeerId(this.code), { reliable: true });
      this.conn = conn;
      conn.on("open", () => {
        this.onStatus?.("connected");
        conn.send(this.joinMsg);
      });
      conn.on("data", (raw) => {
        const msg = raw as HostMsg;
        if (msg.t === "state") this.onState?.(msg.room);
        else if (msg.t === "error") this.onError?.(msg.message);
        else if (msg.t === "kicked") {
          this.onKicked?.();
          this.close();
        }
      });
      conn.on("close", () => {
        if (!this.closed) {
          this.onStatus?.("host-left");
          this.scheduleRetry();
        }
      });
      conn.on("error", () => {
        if (!this.closed) this.scheduleRetry();
      });
    });

    peer.on("error", (err: any) => {
      // "peer-unavailable" => host isn't online (yet). Keep retrying.
      if (!this.closed) {
        this.onStatus?.(err?.type === "peer-unavailable" ? "host-left" : "error");
        this.scheduleRetry();
      }
    });
  }

  private scheduleRetry() {
    if (this.closed || this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      try {
        this.peer?.destroy();
      } catch {
        /* ignore */
      }
      this.open();
    }, 2500);
  }

  send(action: Action, playerId: string) {
    if (this.conn?.open) {
      this.conn.send({ t: "action", playerId, action } satisfies ClientMsg);
    }
  }

  close() {
    this.closed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    try {
      this.conn?.close();
    } catch {
      /* ignore */
    }
    try {
      this.peer?.destroy();
    } catch {
      /* ignore */
    }
  }
}
