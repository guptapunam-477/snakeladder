import { useCallback, useEffect, useRef, useState } from "react";
import Peer, { type MediaConnection } from "peerjs";
import { ICE_SERVERS } from "../net/protocol";
import type { Action } from "../net/protocol";
import type { Player } from "../types";

// ---------------------------------------------------------------------------
// Optional, BEST-EFFORT peer-to-peer voice chat (beta).
//
// Each player who turns on voice creates a dedicated voice peer and shares its
// id through the game state (setVoice action). Everyone then connects in a mesh
// (with glare avoidance so only one side initiates each pair). This is fully
// isolated from the game loop — every call is wrapped in try/catch and a
// failure here can never affect gameplay.
// ---------------------------------------------------------------------------

export interface UseVoice {
  supported: boolean;
  voiceOn: boolean;
  muted: boolean;
  error: string | null;
  connected: number;
  enable: () => void;
  disable: () => void;
  toggleMute: () => void;
}

export function useVoice(opts: {
  players: Player[];
  myId: string;
  dispatch: (a: Action) => void;
}): UseVoice {
  const { players, myId, dispatch } = opts;
  const [voiceOn, setVoiceOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(0);

  const peerRef = useRef<Peer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const callsRef = useRef<Map<string, MediaConnection>>(new Map());
  const audioRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const supported =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof window.RTCPeerConnection !== "undefined";

  const attachStream = useCallback((peerId: string, stream: MediaStream) => {
    try {
      let el = audioRef.current.get(peerId);
      if (!el) {
        el = document.createElement("audio");
        el.autoplay = true;
        (el as any).playsInline = true;
        el.style.display = "none";
        document.body.appendChild(el);
        audioRef.current.set(peerId, el);
      }
      el.srcObject = stream;
      el.play().catch(() => {});
      setConnected(audioRef.current.size);
    } catch {
      /* ignore */
    }
  }, []);

  const cleanupCall = useCallback((peerId: string) => {
    try {
      callsRef.current.get(peerId)?.close();
    } catch {
      /* ignore */
    }
    callsRef.current.delete(peerId);
    const el = audioRef.current.get(peerId);
    if (el) {
      try {
        el.srcObject = null;
        el.remove();
      } catch {
        /* ignore */
      }
      audioRef.current.delete(peerId);
    }
    setConnected(audioRef.current.size);
  }, []);

  const setupCall = useCallback(
    (call: MediaConnection, peerId: string) => {
      callsRef.current.set(peerId, call);
      call.on("stream", (s) => attachStream(peerId, s));
      call.on("close", () => cleanupCall(peerId));
      call.on("error", () => cleanupCall(peerId));
    },
    [attachStream, cleanupCall]
  );

  const enable = useCallback(async () => {
    if (!supported || voiceOn) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const peer = new Peer({ config: { iceServers: ICE_SERVERS } });
      peerRef.current = peer;
      peer.on("open", (id) => {
        dispatch({ kind: "setVoice", voicePeerId: id });
        setVoiceOn(true);
      });
      peer.on("call", (call) => {
        try {
          call.answer(streamRef.current || undefined);
          setupCall(call, call.peer);
        } catch {
          /* ignore */
        }
      });
      peer.on("error", () => setError("Voice connection error."));
    } catch {
      setError("Microphone permission denied or unavailable.");
    }
  }, [supported, voiceOn, dispatch, setupCall]);

  const disable = useCallback(() => {
    callsRef.current.forEach((c) => {
      try {
        c.close();
      } catch {
        /* ignore */
      }
    });
    callsRef.current.clear();
    audioRef.current.forEach((el) => {
      try {
        el.srcObject = null;
        el.remove();
      } catch {
        /* ignore */
      }
    });
    audioRef.current.clear();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try {
      peerRef.current?.destroy();
    } catch {
      /* ignore */
    }
    peerRef.current = null;
    setConnected(0);
    setMuted(false);
    setVoiceOn(false);
    dispatch({ kind: "setVoice", voicePeerId: null });
  }, [dispatch]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [muted]);

  // Mesh management: call peers we should initiate to; drop peers who left.
  const peerIdsKey = players
    .filter((p) => p.id !== myId && p.voicePeerId)
    .map((p) => p.voicePeerId)
    .sort()
    .join(",");

  useEffect(() => {
    if (!voiceOn || !peerRef.current) return;
    const myPid = peerRef.current.id;
    const wanted = players.filter((p) => p.id !== myId && p.voicePeerId).map((p) => p.voicePeerId!) as string[];

    wanted.forEach((tp) => {
      if (callsRef.current.has(tp)) return;
      // glare avoidance: only the lexicographically-smaller id initiates
      if (myPid < tp && streamRef.current) {
        try {
          const call = peerRef.current!.call(tp, streamRef.current);
          if (call) setupCall(call, tp);
        } catch {
          /* ignore */
        }
      }
    });
    // drop calls to peers who turned voice off / left
    Array.from(callsRef.current.keys()).forEach((pid) => {
      if (!wanted.includes(pid)) cleanupCall(pid);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceOn, peerIdsKey]);

  // clean up on unmount
  useEffect(() => {
    return () => {
      try {
        disable();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { supported, voiceOn, muted, error, connected, enable, disable, toggleMute };
}
