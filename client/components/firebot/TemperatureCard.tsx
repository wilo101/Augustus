import { Thermometer, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemperatureCardProps {
  value: number;
  className?: string;
}

export default function TemperatureCard({ value, className }: TemperatureCardProps) {
  const isHigh = value >= 65;
  const pct = Math.min(Math.max((value - 20) / (80 - 20) * 100, 0), 100);

  return (
    <div className={cn("panel-base rounded-lg p-4 flex flex-col justify-between", className)}>
      <div className="flex items-center justify-between">
        <span className="text-label">Core Temp</span>
        {isHigh ? (
          <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
        ) : (
          <Thermometer className="w-4 h-4 text-orange-500" />
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-mono font-medium tracking-tighter text-foreground">
            {value.toFixed(1)}
            <span className="text-sm text-muted-foreground ml-1">°C</span>
          </span>
        </div>

        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 ease-out rounded-full",
              isHigh ? "bg-rose-500" : "bg-orange-500"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono mt-2">
        <span>MAX: 80°C</span>
        <span>{isHigh ? "OVERHEAT" : "OPTIMAL"}</span>
      </div>
    </div>
  );
}
