import { useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ITEMS = ["Motors", "Pump", "LIDAR", "Camera", "Comms", "Battery"] as const;

type Status = "idle" | "running" | "ok" | "fail";

export default function DiagnosticsPanel() {
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (running) return;
    setRunning(true);
    const next: Record<string, Status> = {};
    for (const item of ITEMS) {
      next[item] = "running";
      setStatus({ ...next });
      // simulate checks
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
      next[item] = Math.random() > 0.08 ? "ok" : "fail";
      setStatus({ ...next });
    }
    setRunning(false);
  };

  const statusLabel = useMemo<Record<Status, { badge: string; tone: string; description: string }>>(
    () => ({
      idle: { badge: "🟡 Standby", tone: "text-amber-200/90", description: "Awaiting diagnostic cycle." },
      running: { badge: "🟡 Scanning", tone: "text-amber-200/90", description: "Running live checks…" },
      ok: { badge: "🟢 Active", tone: "text-emerald-200/90", description: "System operating nominally." },
      fail: { badge: "🔴 Error", tone: "text-red-200/90", description: "Fault detected — review immediately." },
    }),
    [],
  );

  return (
    <div className="rounded-2xl border border-red-900/40 bg-[#0b1010] p-4 shadow-[0_0_22px_rgba(239,68,68,0.08)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-soft">Self-Diagnostics</div>
        <button
          onClick={run}
          disabled={running}
          className="relative overflow-hidden rounded border border-red-900/40 bg-black/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-red-100 transition hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className={running ? "animate-pulse" : ""}>{running ? "Scanning" : "Run Check"}</span>
          {running && <span className="absolute inset-0 animate-[pulse_1.5s_linear_infinite] bg-red-500/10" aria-hidden />}
        </button>
      </div>
      <ul className="space-y-2 text-sm">
        {ITEMS.map((k) => {
          const s = status[k] || "idle";
          return (
            <li
              key={k}
              className="relative overflow-hidden rounded border border-red-900/30 bg-black/40 px-3 py-2 backdrop-blur-sm transition"
            >
              {s === "running" && (
                <span className="absolute inset-x-0 top-0 h-0.5 animate-[pulse_1.2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-red-400/40 to-transparent" />
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-soft">{k}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest ${statusLabel[s].tone}`}>
                      <span className="indicator-dot" />
                      {statusLabel[s].badge}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{statusLabel[s].description}</TooltipContent>
                </Tooltip>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
