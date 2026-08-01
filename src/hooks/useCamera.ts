"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CameraState {
  stream: MediaStream | null;
  error: string | null;
  facing: "user" | "environment";
  mirror: boolean;
  ready: boolean;
  starting: boolean;
  start: () => Promise<void>;
  stop: () => void;
  flip: () => Promise<void>;
  capture: () => string | null;
}

const FALLBACK_VIDEO = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: "user",
};

/**
 * MediaDevices camera helper. Falls back gracefully when no camera is present
 * (kiosks without hardware), letting the app use demo mode instead.
 *
 * Pass the page's `<video>` ref so the stream is attached and `capture()` can
 * read frames from the live element.
 */
export function useCamera(inputRef?: { current: HTMLVideoElement | null }): CameraState {
  const localRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = inputRef ?? localRef;
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [mirror, setMirror] = useState(true);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setReady(false);
    setStarting(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API unavailable in this browser.");
      }
      const s = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          video: { ...FALLBACK_VIDEO, facingMode: facing },
          audio: false,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Camera timed out — check that a camera is connected and allowed.")), 6000),
        ),
      ]);
      stop();
      streamRef.current = s;
      setStream(s);
      for (let i = 0; i < 40 && !videoRef.current; i++) {
        await new Promise((r) => setTimeout(r, 50));
      }
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => undefined);
      }
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Camera unavailable.");
    } finally {
      setStarting(false);
    }
  }, [facing, stop, videoRef]);

  const flip = useCallback(async () => {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    setMirror(next === "user");
    await new Promise((r) => setTimeout(r, 60));
    await start();
  }, [facing, start]);

  const capture = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const w = video.videoWidth;
    const h = video.videoHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    if (mirror) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.92);
  }, [mirror, videoRef]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { stream, error, facing, mirror, ready, starting, start, stop, flip, capture };
}
