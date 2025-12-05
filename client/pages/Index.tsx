import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import LiveCamera from "@/components/firebot/LiveCamera";
import BatteryGauge from "@/components/firebot/BatteryGauge";
import WaterGauge from "@/components/firebot/WaterGauge";
import PumpPressure from "@/components/firebot/PumpPressure";
import TemperatureCard from "@/components/firebot/TemperatureCard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import SplashScreen from "@/components/SplashScreen";
import WelcomeScreen from "@/components/WelcomeScreen";

const MapPanel = lazy(() => import("@/components/firebot/MapPanel"));
const DiagnosticsPanel = lazy(() => import("@/components/firebot/DiagnosticsPanel"));

const BASE_LEVELS = { battery: 82, water: 64, pressure: 1.08, temp: 48 };
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// Precision Skeleton
const PanelSkeleton = ({ label, className }: { label: string; className?: string }) => (
  <div
    className={cn(
      "panel-base flex items-center justify-center rounded-lg",
      "text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50 animate-pulse",
      className,
    )}
  >
    {label}
  </div>
);

export default function Index() {
  const [stage, setStage] = useState<"splash" | "welcome" | "app">("splash");
  const [battery, setBattery] = useState(82);
  const [water, setWater] = useState(64);
  const [pressure, setPressure] = useState(1.1);
  const [temp, setTemp] = useState(48);
  const [follow, setFollow] = useState(true);
  const lastAlertRef = useRef<{ [k: string]: number }>({});

  const now = () => Date.now();
  const shouldNotify = (key: string, cooldownMs = 15000) => {
    const last = lastAlertRef.current[key] ?? 0;
    if (now() - last > cooldownMs) {
      lastAlertRef.current[key] = now();
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setInterval(() => {
      setBattery((p) => clamp(p + (BASE_LEVELS.battery + (Math.random() * 4 - 2) - p) * 0.05, 60, 96));
      setWater((p) => clamp(p + (BASE_LEVELS.water + (Math.random() * 4 - 2) - p) * 0.05, 50, 95));
      setPressure((p) => clamp(p + (BASE_LEVELS.pressure + (Math.random() * 0.1 - 0.05) - p) * 0.06, 0.8, 1.35));
      setTemp((p) => clamp(p + (BASE_LEVELS.temp + (Math.random() * 3 - 1.5) - p) * 0.06, 35, 60));
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => { if (battery <= 20 && shouldNotify("battery")) toast.warning("Battery low"); }, [battery]);
  useEffect(() => { if (water <= 15 && shouldNotify("water")) toast.error("Water level critical"); }, [water]);
  useEffect(() => { if (pressure < 0.8 && shouldNotify("pressure")) toast.warning("Pump pressure low"); }, [pressure]);
  useEffect(() => { if (temp >= 65 && shouldNotify("temp")) toast.error("High temperature"); }, [temp]);

  const handleSplashDone = () => setStage("welcome");
  const handleWelcomeDone = () => setStage("app");

  if (stage === "splash") return <SplashScreen onDone={handleSplashDone} />;
  if (stage === "welcome") return <WelcomeScreen onStart={handleWelcomeDone} />;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-8rem)]">
        {/* Left Column: Camera & Map (8 cols) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          {/* Camera Feed */}
          <div className="panel-base rounded-lg overflow-hidden relative group w-full aspect-[3/1]">
            <LiveCamera className="w-full h-full object-cover" />
            <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 backdrop-blur rounded text-[10px] font-mono text-white/80">
              CAM-01: FRONT
            </div>
          </div>

          {/* Map Panel */}
          <div className="panel-base rounded-lg overflow-hidden relative w-full aspect-[2/1]">
            <Suspense fallback={<PanelSkeleton label="Initializing Map System..." className="w-full h-full" />}>
              <MapPanel follow={follow} onFollowChange={setFollow} heightClass="h-full" />
            </Suspense>
          </div>
        </div>

        {/* Right Column: Telemetry & Diagnostics (4 cols) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 gap-4">
            <BatteryGauge value={battery} />
            <WaterGauge value={water} />
            <PumpPressure value={pressure} />
            <TemperatureCard value={temp} />
          </div>

          {/* Diagnostics Panel */}
          <div className="panel-base rounded-lg overflow-hidden flex flex-col">
            <div className="p-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <span className="text-label">System Diagnostics</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="flex-1 overflow-hidden">
              <Suspense fallback={<PanelSkeleton label="Loading Diagnostics..." className="w-full h-full" />}>
                <DiagnosticsPanel />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
