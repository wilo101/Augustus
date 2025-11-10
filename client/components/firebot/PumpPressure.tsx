import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = { value: number; className?: string };

export default function PumpPressure({ value, className }: Props) {
  const val = Math.max(0, Math.min(2, value));
  const pct = (val / 2) * 100;
  const low = val < 0.8;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div className={cn("flex h-full flex-col rounded-2xl border border-red-900/40 bg-[#0b1010] p-4 shadow-[0_0_22px_rgba(239,68,68,0.08)]", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-red-900/60 bg-red-900/30 text-base">
            ⚙️
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-soft">Pump Pressure</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help text-[10px] uppercase tracking-widest text-gray-300/70">
              Stability band
            </span>
          </TooltipTrigger>
          <TooltipContent>Maintain between 0.8 and 1.4 bar for optimal nozzle pressure.</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex flex-grow items-center gap-4">
        <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
          <circle cx="60" cy="60" r={radius} stroke="rgba(248,113,113,0.15)" strokeWidth="12" fill="none" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke={low ? "#f87171" : "#fbbf24"}
            strokeLinecap="round"
            strokeWidth="12"
            strokeDasharray={`${dash} ${circumference - dash}`}
            fill="none"
          />
        </svg>
        <div className="space-y-3 w-full">
          <div className="text-3xl font-extrabold text-red-100">{val.toFixed(2)} bar</div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-black/60">
            <div
              className={`absolute inset-y-0 left-0 rounded-full ${
                low ? "bg-gradient-to-r from-[#f87171] to-[#ef4444]" : "bg-gradient-to-r from-[#f87171] via-[#fbbf24] to-[#facc15]"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[11px] uppercase tracking-widest text-gray-300/80">
            Status <span className={low ? "text-red-300" : "text-green-300/80"}>{low ? "Below nominal" : "Nominal"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
