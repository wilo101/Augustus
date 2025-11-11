import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import IpCameraFeed from "./IpCameraFeed";

type Props = { className?: string };

export default function LiveCamera({ className }: Props) {
  const DEFAULT_NETWORK_URL = "http://192.168.69.102:8080/?action=stream";
  const [networkUrl, setNetworkUrl] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_NETWORK_URL;
    return window.localStorage.getItem("augustus-network-url") ?? DEFAULT_NETWORK_URL;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("augustus-network-url", networkUrl.trim());
  }, [networkUrl]);

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-3 rounded-2xl border border-red-900/40 bg-[#0b1010] p-3 md:p-4 shadow-[0_0_24px_rgba(239,68,68,0.08)]",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="text-[11px] uppercase tracking-[0.32em] text-red-200/70 sm:w-40">Network URL</label>
        <div className="flex w-full gap-2">
          <input
            value={networkUrl}
            onChange={(event) => setNetworkUrl(event.target.value)}
            spellCheck={false}
            className="min-w-0 flex-1 rounded-lg border border-red-900/40 bg-black/40 px-3 py-2 text-[11px] uppercase tracking-[0.25em] text-red-100 outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500"
            placeholder="http://192.168.x.x:8080/?action=stream"
          />
          <button
            type="button"
            onClick={() => setNetworkUrl(DEFAULT_NETWORK_URL)}
            className="rounded-lg border border-red-900/40 bg-black/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-red-100 transition hover:bg-red-900/30"
          >
            Reset
          </button>
        </div>
      </div>
      <IpCameraFeed url={networkUrl || DEFAULT_NETWORK_URL} title="Robot IP Camera" />
    </div>
  );
}
