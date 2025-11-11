import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CircleDot, Info, Maximize2, Pause, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type CameraStatus = "loading" | "online" | "error" | "paused";

type Props = {
  url: string;
  title?: string;
  className?: string;
};

export default function IpCameraFeed({
  url,
  title = "IP Camera Feed",
  className,
}: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const recordTimeoutRef = useRef<number | null>(null);
  const recordIntervalRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const shouldDownloadRef = useRef<boolean>(true);
  const actionInfoTimeoutRef = useRef<number | null>(null);
  const actionErrorTimeoutRef = useRef<number | null>(null);

  const [status, setStatus] = useState<CameraStatus>("loading");
  const [error, setError] = useState<string>("");
  const [reloadToken, setReloadToken] = useState(0);
  const [lastConnectedAt, setLastConnectedAt] = useState<Date | null>(null);
  const [recording, setRecording] = useState<boolean>(false);
  const [actionInfo, setActionInfo] = useState<string>("");
  const [actionError, setActionError] = useState<string>("");
  const [paused, setPaused] = useState(false);

  const effectiveSrc = useMemo(() => {
    if (paused) return "";
    if (reloadToken === 0) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}reload=${reloadToken}`;
  }, [url, reloadToken, paused]);

  const clearTimeoutRef = (ref: React.MutableRefObject<number | null>) => {
    if (ref.current) {
      window.clearTimeout(ref.current);
      ref.current = null;
    }
  };

  const pushInfo = useCallback((message: string) => {
    if (actionInfoTimeoutRef.current) {
      window.clearTimeout(actionInfoTimeoutRef.current);
    }
    setActionInfo(message);
    actionInfoTimeoutRef.current = window.setTimeout(() => {
      setActionInfo("");
      actionInfoTimeoutRef.current = null;
    }, 4000);
  }, []);

  const pushError = useCallback((message: string) => {
    if (actionErrorTimeoutRef.current) {
      window.clearTimeout(actionErrorTimeoutRef.current);
    }
    setActionError(message);
    actionErrorTimeoutRef.current = window.setTimeout(() => {
      setActionError("");
      actionErrorTimeoutRef.current = null;
    }, 6000);
  }, []);

  useEffect(() => {
    setStatus("loading");
    setError("");
    clearTimeoutRef(timeoutRef);
    timeoutRef.current = window.setTimeout(() => {
      setStatus((prev) => (prev === "loading" ? "error" : prev));
      setError("Connection timeout — check that the camera is reachable on the network.");
    }, 10000);

    return () => {
      clearTimeoutRef(timeoutRef);
    };
  }, [effectiveSrc]);

  useEffect(
    () => () => {
      clearTimeoutRef(timeoutRef);
      clearTimeoutRef(recordTimeoutRef);
      if (recordIntervalRef.current) {
        window.clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          shouldDownloadRef.current = false;
          recorderRef.current.stop();
        } catch {
          // ignore
        }
      }
    },
    [],
  );

  useEffect(() => {
    const img = imgRef.current;
    if (img) {
      img.crossOrigin = "anonymous";
    }
  }, [effectiveSrc]);

  const drawFrameToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return false;
    const width = img.naturalWidth || img.width || 1280;
    const height = img.naturalHeight || img.height || 720;
    if (!width || !height) return false;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    try {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return true;
    } catch (err) {
      console.warn("Unable to draw IP camera frame", err);
      return false;
    }
  }, []);

  const finalizeRecording = useCallback(() => {
    setRecording(false);
    const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
    recordedChunksRef.current = [];
    const shouldDownload = shouldDownloadRef.current;
    shouldDownloadRef.current = true;
    if (blob.size && shouldDownload) {
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `ip-camera-recording-${Date.now()}.webm`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      pushInfo("Recording saved.");
    } else if (!shouldDownload) {
      pushInfo("Recording cancelled.");
    }
    recorderRef.current = null;
  }, [pushInfo]);

  const stopRecording = useCallback(
    (download = true) => {
      shouldDownloadRef.current = download;
      clearTimeoutRef(recordTimeoutRef);
      if (recordIntervalRef.current) {
        window.clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
      const recorder = recorderRef.current;
      if (recorder) {
        try {
          if (recorder.state !== "inactive") {
            recorder.stop();
          } else {
            finalizeRecording();
          }
        } catch (err) {
          console.warn("Unable to stop recording", err);
          finalizeRecording();
        }
      }
    },
    [finalizeRecording],
  );

  const handleLoad = () => {
    clearTimeoutRef(timeoutRef);
    setStatus("online");
    setError("");
    setLastConnectedAt(new Date());
  };

  const handleError = () => {
    clearTimeoutRef(timeoutRef);
    setStatus("error");
    setError("Unable to load IP camera stream. Make sure the device is on the same network.");
  };

  const handleReload = () => {
    setPaused(false);
    setStatus("loading");
    setReloadToken((token) => token + 1);
  };

  const handleSnapshot = useCallback(() => {
    if (!drawFrameToCanvas()) {
      pushError("Snapshot failed — camera must expose frames with CORS enabled.");
      return;
    }
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL("image/png");
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = `ip-camera-snapshot-${Date.now()}.png`;
      anchor.click();
      pushInfo("Snapshot saved.");
    } catch (err) {
      console.warn("Snapshot error", err);
      pushError("Snapshot failed — remote stream blocked canvas capture.");
    }
  }, [drawFrameToCanvas, pushError, pushInfo]);

  const startRecording = useCallback(() => {
      if (recording) return;
      if (typeof MediaRecorder === "undefined") {
        pushError("Recording not supported in this browser.");
        return;
      }
      if (!drawFrameToCanvas()) {
        pushError("Recording unavailable — camera stream did not provide drawable frames.");
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      if (typeof canvas.captureStream !== "function") {
        pushError("Recording not supported — canvas captureStream is unavailable.");
        return;
      }

      try {
        recordedChunksRef.current = [];
        const stream = canvas.captureStream(12);
        const recorder = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp8",
        });
        recorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        recorder.onstop = finalizeRecording;
        recorder.start();
        setRecording(true);
        pushInfo("Recording in progress…");

        recordIntervalRef.current = window.setInterval(() => {
          const ok = drawFrameToCanvas();
          if (!ok) {
            pushError("Recording stopped — unable to copy frames (CORS?).");
            stopRecording(false);
          }
        }, 1000 / 12);

      } catch (err) {
        console.warn("Recording error", err);
        pushError("Recording failed to start.");
        setRecording(false);
        recorderRef.current = null;
      }
    },
    [drawFrameToCanvas, finalizeRecording, pushError, pushInfo, recording, stopRecording],
  );

  useEffect(() => {
    if (status !== "online" && recording) {
      stopRecording(false);
    }
  }, [recording, status, stopRecording]);

  useEffect(
    () => () => {
      if (actionInfoTimeoutRef.current) {
        window.clearTimeout(actionInfoTimeoutRef.current);
      }
      if (actionErrorTimeoutRef.current) {
        window.clearTimeout(actionErrorTimeoutRef.current);
      }
    },
    [],
  );

  const statusLabel =
    status === "online"
      ? "Live"
      : status === "loading"
        ? "Connecting…"
        : status === "paused"
          ? "Paused"
          : "Offline";

  const statusTone =
    status === "online"
      ? "text-green-400"
      : status === "loading"
        ? "text-yellow-300"
        : status === "paused"
          ? "text-amber-300"
          : "text-red-300";

  const handleFullscreen = useCallback(() => {
    const node = containerRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    node.requestFullscreen?.().catch(() => {});
  }, []);

  const recordButton = recording ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded bg-red-700/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-red-200 transition hover:bg-red-700/50"
          onClick={() => stopRecording(true)}
        >
          <Square size={14} />
          Stop
        </button>
      </TooltipTrigger>
      <TooltipContent>Stop and save current recording</TooltipContent>
    </Tooltip>
  ) : (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded bg-black/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-red-100 transition hover:bg-red-900/40 disabled:opacity-60"
          onClick={() => startRecording()}
          disabled={status !== "online"}
        >
          <CircleDot size={14} className={status === "online" ? "text-red-300" : "text-gray-500"} />
          Record
        </button>
      </TooltipTrigger>
      <TooltipContent>Capture continuous footage until stopped</TooltipContent>
    </Tooltip>
  );

  return (
    <div ref={containerRef} className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-900/40 bg-black/50 px-3 py-2 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold uppercase tracking-widest text-soft">
              {title}
            </div>
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
                  <div>Primary feed</div>
                  <div className="text-[11px] text-gray-300/80 break-all">{url}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="inline-flex items-center gap-1.5 rounded bg-black/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-red-100 transition hover:bg-red-900/40 disabled:opacity-60"
                onClick={handleSnapshot}
                disabled={status !== "online"}
              >
                <Camera size={14} />
                Snapshot
              </button>
            </TooltipTrigger>
            <TooltipContent>Download current frame as PNG</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="inline-flex items-center gap-1.5 rounded bg-black/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-red-100 transition hover:bg-red-900/40"
                onClick={() => {
                  if (!paused) {
                    clearTimeoutRef(timeoutRef);
                    setPaused(true);
                    setStatus("paused");
                    if (imgRef.current) {
                      imgRef.current.src = "";
                    }
                  } else {
                    setPaused(false);
                    setStatus("loading");
                    setReloadToken((token) => token + 1);
                  }
                }}
                type="button"
              >
                {paused ? <Play size={14} /> : <Pause size={14} />}
                {paused ? "Resume" : "Stop"}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {paused ? "Reconnect to the camera stream" : "Pause the camera stream"}
            </TooltipContent>
          </Tooltip>
          {recordButton}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="inline-flex items-center gap-1.5 rounded bg-black/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-red-100 transition hover:bg-red-900/40"
                onClick={handleFullscreen}
                type="button"
              >
                <Maximize2 size={14} />
                Fullscreen
              </button>
            </TooltipTrigger>
            <TooltipContent>Toggle fullscreen view</TooltipContent>
          </Tooltip>
        </div>
        <div className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${statusTone}`}>
          <span className="indicator-dot" />
          {statusLabel}
        </div>
      </div>

      <div className="relative">
        <img
          ref={imgRef}
          src={effectiveSrc}
          crossOrigin="anonymous"
          className="aspect-video w-full rounded-2xl border border-red-900/30 bg-black/70 object-contain shadow-[0_0_30px_rgba(255,45,45,0.1)]"
          alt={title}
          onLoad={handleLoad}
          onError={handleError}
          style={paused ? { opacity: 0.1 } : undefined}
        />
        {paused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-4 text-center text-xs text-red-100">
            <span>Stream paused.</span>
            <button
              className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
              onClick={() => {
                setPaused(false);
                setStatus("loading");
                setReloadToken((token) => token + 1);
              }}
            >
              Resume
            </button>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-red-900/60 bg-black/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-red-200/90">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
          {status === "online" ? "LIVE · Network Camera" : status === "loading" ? "Connecting…" : "Offline"}
          {lastConnectedAt && status === "online"
            ? ` · updated ${lastConnectedAt.toLocaleTimeString()}`
            : ""}
        </div>

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-4 text-center text-xs text-red-100">
            <span>{error}</span>
            <button
              className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
              onClick={handleReload}
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-red-200/70">
        {status === "online" ? <span className="text-gray-300/80">Feed nominal</span> : <span />}
        <button
          className="rounded bg-black/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-red-100 transition hover:bg-red-900/40"
          onClick={handleReload}
        >
          Reload Stream
        </button>
      </div>

      {actionError && <div className="rounded border border-red-900/60 bg-red-900/30 px-3 py-2 text-xs text-red-200/90">{actionError}</div>}
      {actionInfo && !actionError && <div className="rounded border border-emerald-900/60 bg-emerald-900/30 px-3 py-2 text-xs text-emerald-200/90">{actionInfo}</div>}

      {error && status !== "error" && <div className="rounded border border-amber-900/60 bg-amber-900/20 px-3 py-2 text-xs text-amber-200/90">{error}</div>}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

