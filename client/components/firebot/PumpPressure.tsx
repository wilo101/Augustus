import { Gauge, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PumpPressureProps {
  value: number;
  className?: string;
}

export default function PumpPressure({ value, className }: PumpPressureProps) {
  const isLow = value < 0.8;
  const isHigh = value > 1.3;
  const isWarning = isLow || isHigh;

  // Normalize for display (0.5 to 1.5 bar range)
  const pct = Math.min(Math.max((value - 0.5) / (1.5 - 0.5) * 100, 0), 100);

  return (
    <div className={cn("panel-base rounded-lg p-4 flex flex-col justify-between", className)}>
      <div className="flex items-center justify-between">
        <span className="text-label">Pump Pressure</span>
        {isWarning ? (
          <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
        ) : (
          <Gauge className="w-4 h-4 text-indigo-500" />
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-mono font-medium tracking-tighter text-foreground">
            {value.toFixed(2)}
            <span className="text-sm text-muted-foreground ml-1">bar</span>
          </span>
        </div>

        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden relative">
          {/* Stability markers */}
          <div className="absolute top-0 bottom-0 left-[30%] w-[40%] bg-white/5" />

          <div
            className={cn(
              "h-full transition-all duration-500 ease-out rounded-full",
              isWarning ? "bg-amber-500" : "bg-indigo-500"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono mt-2">
        <span>NOM: 1.10</span>
        <span>{isWarning ? "CHECK VALVE" : "STABLE"}</span>
      </div>
    </div>
  );
}
