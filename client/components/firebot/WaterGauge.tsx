import { Droplets, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaterGaugeProps {
  value: number;
  className?: string;
}

export default function WaterGauge({ value, className }: WaterGaugeProps) {
  const isLow = value <= 15;

  return (
    <div className={cn("panel-base rounded-lg p-4 flex flex-col justify-between", className)}>
      <div className="flex items-center justify-between">
        <span className="text-label">Water Tank</span>
        {isLow ? (
          <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" />
        ) : (
          <Droplets className="w-4 h-4 text-cyan-500" />
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-mono font-medium tracking-tighter text-foreground">
            {value.toFixed(0)}
            <span className="text-sm text-muted-foreground ml-1">%</span>
          </span>
        </div>

        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 ease-out rounded-full",
              isLow ? "bg-rose-500" : "bg-cyan-500"
            )}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono mt-2">
        <span>{isLow ? "REFILL REQ" : "LEVEL OK"}</span>
        <span>{value > 0 ? "PUMP READY" : "EMPTY"}</span>
      </div>
    </div>
  );
}
