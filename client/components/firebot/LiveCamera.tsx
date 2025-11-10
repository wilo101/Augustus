import { useState } from "react";
import { cn } from "@/lib/utils";
import IpCameraFeed from "./IpCameraFeed";
import LaptopWebcam from "./LaptopWebcam";

type Props = { className?: string };

export default function LiveCamera({ className }: Props) {
  const NETWORK_CAMERA_URL = "http://192.168.69.102:8080/?action=stream";
  const FIRE_DETECT_URL = "http://127.0.0.1:5001/video";
  const [mode, setMode] = useState<"ip" | "webcam" | "detect">("ip");
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border border-red-900/40 bg-[#0b1010] p-3 md:p-4 shadow-[0_0_24px_rgba(239,68,68,0.08)]",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-soft">Camera Source</div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("ip")}
            className={`rounded border px-3 py-1.5 text-[11px] uppercase tracking-widest transition ${
              mode === "ip"
                ? "border-red-500/70 bg-red-700/30 text-red-100"
                : "border-red-900/40 bg-black/60 text-red-100 hover:bg-red-900/30"
            }`}
          >
            Network
          </button>
          <button
            onClick={() => setMode("webcam")}
            className={`rounded border px-3 py-1.5 text-[11px] uppercase tracking-widest transition ${
              mode === "webcam"
                ? "border-red-500/70 bg-red-700/30 text-red-100"
                : "border-red-900/40 bg-black/60 text-red-100 hover:bg-red-900/30"
            }`}
          >
            Laptop
          </button>
          <button
            onClick={() => setMode("detect")}
            className={`rounded border px-3 py-1.5 text-[11px] uppercase tracking-widest transition ${
              mode === "detect"
                ? "border-red-500/70 bg-red-700/30 text-red-100"
                : "border-red-900/40 bg-black/60 text-red-100 hover:bg-red-900/30"
            }`}
          >
            Fire Detect
          </button>
        </div>
      </div>
      {mode === "ip" ? (
        <IpCameraFeed url={NETWORK_CAMERA_URL} title="Robot IP Camera" />
      ) : mode === "webcam" ? (
        <LaptopWebcam title="Laptop Camera" />
      ) : (
        <IpCameraFeed url={FIRE_DETECT_URL} title="Fire Detection (YOLO)" />
      )}
    </div>
  );
}
