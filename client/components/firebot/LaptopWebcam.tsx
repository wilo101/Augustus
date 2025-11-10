import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Info, Maximize2, Square, FlipHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type WebcamStatus = "idle" | "asking" | "online" | "error";

type Props = {
  title?: string;
  className?: string;
};

export default function LaptopWebcam({ title = "Laptop Camera", className }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<WebcamStatus>("idle");
  const [error, setError] = useState<string>("");
  const [recording, setRecording] = useState<boolean>(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [mirrored, setMirrored] = useState<boolean>(true);

  const constraints = useMemo<MediaStreamConstraints>(
    () => ({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
      audio: false,
    }),
    [],
  );

  const stopTracks = useCallback(() => {
    const s = streamRef.current;
    if (s) {
      for (const tr of s.getTracks()) {
        try {
          tr.stop();
        } catch {}
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(
    () => () => {
      stopTracks();
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {}
      }
    },
    [stopTracks],
  );

  const start = useCallback(async () => {
    if (status === "asking" || status === "online") return;
    setError("");
    setStatus("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus("online");
    } catch (e: any) {
      setStatus("error");
      setError(e?.message || "Unable to access webcam. Check permissions and that no other app is using it.");
    }
  }, [constraints, status]);

  const stop = useCallback(() => {
    stopTracks();
    setStatus("idle");
  }, [stopTracks]);

  const drawFrameToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return false;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    if (!width || !height) return false;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    try {
      ctx.save();
      if (mirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      return true;
    } catch {
      return false;
    }
  }, [mirrored]);

  const snapshot = useCallback(() => {
    if (!drawFrameToCanvas()) return;
    const canvas = canvasRef.current!;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `webcam-snapshot-${Date.now()}.png`;
    a.click();
  }, [drawFrameToCanvas]);

  const handleFullscreen = useCallback(() => {
    const node = containerRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    node.requestFullscreen?.().catch(() => {});
  }, []);

  const startRecording = useCallback(() => {
    if (recording) return;
    const stream = streamRef.current;
    if (!stream) return;
    if (typeof MediaRecorder === "undefined") return;
    try {
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        setRecording(false);
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        recordedChunksRef.current = [];
        if (blob.size) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `webcam-recording-${Date.now()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
        }
      };
      recorder.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }, [recording]);

  const stopRecording = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") {
      try {
        r.stop();
      } catch {}
    }
  }, []);

  const statusLabel =
    status === "online" ? "Live" : status === "asking" ? "Requesting…" : status === "error" ? "Error" : "Idle";
  const statusTone =
    status === "online" ? "text-green-400" : status === "asking" ? "text-yellow-300" : status === "error" ? "text-red-300" : "text-gray-300";

  return (
    <div ref={containerRef} className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-900/40 bg-black/50 px-3 py-2 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold uppercase tracking-widest text-soft">{title}</div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-red-900/60 bg-black/60 text-red-200/80 transition hover:bg-black/80"
                  aria-label="Stream details"
                >
                  <Info size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1 text-xs">
                  <div>Local device</div>
                  <div className="text-[11px] text-gray-300/80">MediaDevices.getUserMedia()</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest transition ${
                mirrored
                  ? "border border-red-500/70 bg-red-700/30 text-red-100"
                  : "border border-red-900/40 bg-black/60 text-red-100 hover:bg-red-900/40"
              }`}
              onClick={() => setMirrored((v) => !v)}
              aria-pressed={mirrored}
            >
              <FlipHorizontal size={14} />
              Mirror
            </button>
          </TooltipTrigger>
          <TooltipContent>Flip horizontally to match selfie view</TooltipContent>
        </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="inline-flex items-center gap-1.5 rounded bg-black/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-red-100 transition hover:bg-red-900/40 disabled:opacity-60"
                onClick={snapshot}
                disabled={status !== "online"}
              >
                <Camera size={14} />
                Snapshot
              </button>
            </TooltipTrigger>
            <TooltipContent>Download current frame as PNG</TooltipContent>
          </Tooltip>
          {recording ? (
            <button
              className="inline-flex items-center gap-1.5 rounded bg-red-700/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-red-200 transition hover:bg-red-700/50"
              onClick={stopRecording}
            >
              <Square size={14} />
              Stop
            </button>
          ) : (
            <button
              className="inline-flex items-center gap-1.5 rounded bg-black/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-red-100 transition hover:bg-red-900/40 disabled:opacity-60"
              onClick={startRecording}
              disabled={status !== "online"}
            >
              <CircleDotIcon />
              Record
            </button>
          )}
          <button
            className="inline-flex items-center gap-1.5 rounded bg-black/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-red-100 transition hover:bg-red-900/40"
            onClick={handleFullscreen}
            type="button"
          >
            <Maximize2 size={14} />
            Fullscreen
          </button>
        </div>
        <div className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${statusTone}`}>
          <span className="indicator-dot" />
          {statusLabel}
        </div>
      </div>

      <div className="relative">
        <video
          ref={videoRef}
          className="aspect-video w-full rounded-2xl border border-red-900/30 bg-black/70 object-contain shadow-[0_0_30px_rgba(255,45,45,0.1)]"
          style={{ transform: mirrored ? "scaleX(-1)" : "none" }}
          muted
          playsInline
          autoPlay
        />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-red-900/60 bg-black/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-red-200/90">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
          {status === "online" ? "LIVE · Laptop Camera" : status === "asking" ? "Requesting…" : status === "error" ? "Error" : "Idle"}
        </div>
        {status !== "online" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-4 text-center text-xs text-red-100">
            {status === "idle" && <span>Click “Start” to access your webcam.</span>}
            {status === "asking" && <span>Requesting camera permission…</span>}
            {status === "error" && <span>{error || "Unable to access webcam"}</span>}
            <div className="flex gap-2">
              <button
                className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
                onClick={start}
                disabled={status === "asking"}
              >
                Start
              </button>
              {status !== "idle" && (
                <button className="rounded bg-black/60 px-3 py-1 text-sm text-red-100" onClick={stop}>
                  Stop
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function CircleDotIcon() {
  return <div className="h-[14px] w-[14px] rounded-full border-2 border-current" />;
}


