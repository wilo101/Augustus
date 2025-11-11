import { Suspense, lazy, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import LiveCamera from "@/components/firebot/LiveCamera";
import BatteryGauge from "@/components/firebot/BatteryGauge";
import WaterGauge from "@/components/firebot/WaterGauge";
import PumpPressure from "@/components/firebot/PumpPressure";
import TemperatureCard from "@/components/firebot/TemperatureCard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import type { Transition } from "framer-motion";
import SplashScreen from "@/components/SplashScreen";
import WelcomeScreen from "@/components/WelcomeScreen";
import LayoutContext from "@/components/firebot/LayoutContext";

const MapPanel = lazy(() => import("@/components/firebot/MapPanel"));
const DiagnosticsPanel = lazy(() => import("@/components/firebot/DiagnosticsPanel"));

const BASE_LEVELS = { battery: 82, water: 64, pressure: 1.08, temp: 48 };
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const spring: Transition = { duration: 0.35, ease: [0.22, 1, 0.36, 1] };

// ✅ اتضاف: سكليتون بسيط للفولباك
const PanelSkeleton = ({ label, className }: { label: string; className?: string }) => (
  <div
    className={cn(
      "flex items-center justify-center rounded-2xl border border-red-900/40 bg-black/40",
      "text-[11px] font-semibold uppercase tracking-[0.35em] text-red-200/70",
      className,
    )}
    aria-label={`${label} loading`}
  >
    {label}
  </div>
);

export default function Index() {
  // 👇 مدير المراحل: splash → welcome → app
  const [stage, setStage] = useState<"splash" | "welcome" | "app">("splash");
  const layoutCtx = useContext(LayoutContext);

  const [battery, setBattery] = useState(82);
  const [water, setWater] = useState(64);
  const [pressure, setPressure] = useState(1.1);
  const [temp, setTemp] = useState(48);
  const [follow, setFollow] = useState(true);
  const [mapFocusLayout, setMapFocusLayout] = useState(false);
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

  // Telemetry mock
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

  useEffect(() => { if (battery <= 20 && shouldNotify("battery")) toast.warning("Battery low", { description: `${battery.toFixed(0)}% remaining — plan recharge` }); }, [battery]);
  useEffect(() => { if (water <= 15 && shouldNotify("water")) toast.error("Water level critical", { description: `${water.toFixed(0)}% — refill tank` }); }, [water]);
  useEffect(() => { if (pressure < 0.8 && shouldNotify("pressure")) toast.warning("Pump pressure below nominal", { description: `${pressure.toFixed(2)} bar — check pump` }); }, [pressure]);
  useEffect(() => { if (temp >= 65 && shouldNotify("temp")) toast.error("High temperature detected", { description: `${temp.toFixed(0)} °C — redirect or cooldown` }); }, [temp]);

  const handleSplashDone = () => setStage("welcome");
  const handleWelcomeDone = () => {
    setStage("app");
  };

  useEffect(() => {
    if (stage !== "app") return;
    const id = window.setTimeout(() => {
      layoutCtx?.requestTour();
    }, 120);
    return () => window.clearTimeout(id);
  }, [layoutCtx, stage]);

  // ====== التحكم في العرض بالتتابع (مرحلة واحدة فقط مرئية) ======
  if (stage === "splash") {
    return <SplashScreen onDone={handleSplashDone} />;
  }

  if (stage === "welcome") {
    return <WelcomeScreen onStart={handleWelcomeDone} />;
  }

  // ====== بعد الويلكم: الداشبورد ======
  return (
    <TooltipProvider delayDuration={150}>
      <div className={cn("min-h-screen p-4 md:p-6 lg:p-8", "bg-transparent")}>
        <div className="mx-auto max-w-7xl space-y-5 md:space-y-7">
          <header className="flex flex-col gap-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-[0.4em] text-soft">
                AFR Command Console
              </h1>
              <p className="text-sm text-gray-300/80">
                Augustus Firefighter Robot · Mission control, live telemetry, autonomous diagnostics
              </p>
            </div>
          </header>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
            <button
              onClick={() => setMapFocusLayout((v) => !v)}
              className="rounded border border-red-900/40 bg-black/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-red-100 transition hover:bg-red-900/30 sm:text-xs sm:py-1.5"
            >
              {mapFocusLayout ? "Default Layout" : "Map Focus Layout"}
            </button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {mapFocusLayout ? (
              <motion.section
                key="map-focus"
                className="grid gap-4 md:gap-6"
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={spring}
              >
                <motion.div
                  layout
                  className="grid gap-3 sm:gap-4 md:gap-6 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] items-stretch"
                  transition={spring}
                >
                  <motion.div layout className="h-full" transition={spring}>
                    <div data-tour="cam" className="h-full min-h-[220px] sm:min-h-[320px]">
                      <LiveCamera className="h-full" />
                    </div>
                  </motion.div>
                  <motion.div
                    layout
                    className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-rows-2"
                    transition={spring}
                  >
                    <motion.div layout data-tour="battery" transition={spring}>
                      <BatteryGauge value={battery} className="h-full min-h-[150px] sm:min-h-[180px]" />
                    </motion.div>
                    <motion.div layout data-tour="temp" transition={spring}>
                      <TemperatureCard value={temp} className="h-full min-h-[150px] sm:min-h-[180px]" />
                    </motion.div>
                    <motion.div layout data-tour="water" transition={spring}>
                      <WaterGauge value={water} className="h-full min-h-[150px] sm:min-h-[180px]" />
                    </motion.div>
                    <motion.div layout data-tour="pressure" transition={spring}>
                      <PumpPressure value={pressure} className="h-full min-h-[150px] sm:min-h-[180px]" />
                    </motion.div>
                  </motion.div>
                </motion.div>

                <motion.div layout data-tour="map" transition={spring}>
                  <Suspense
                    fallback={
                      <div className="h-[460px] md:h-[560px]">
                        <PanelSkeleton label="Loading Map" className="h-full" />
                      </div>
                    }
                  >
                    <MapPanel follow={follow} onFollowChange={setFollow} heightClass="h-[460px] md:h-[560px]" />
                  </Suspense>
                </motion.div>

                <motion.div layout data-tour="diag" transition={spring}>
                  <Suspense fallback={<PanelSkeleton label="Diagnostics" className="h-[240px]" />}>
                    <DiagnosticsPanel />
                  </Suspense>
                </motion.div>
              </motion.section>
            ) : (
              <motion.section
                key="default"
                className="grid gap-4 md:gap-6 xl:grid-cols-3"
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={spring}
              >
                <motion.div layout className="xl:col-span-2 flex flex-col gap-4 md:gap-6" transition={spring}>
                  <motion.div layout data-tour="cam" transition={spring}>
                    <LiveCamera />
                  </motion.div>

                  <motion.div
                    layout
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:gap-6"
                    transition={spring}
                  >
                    <motion.div layout className="grid gap-4 md:gap-5" transition={spring}>
                      <motion.div layout data-tour="battery" transition={spring}>
                        <BatteryGauge value={battery} />
                      </motion.div>
                      <motion.div layout data-tour="temp" transition={spring}>
                        <TemperatureCard value={temp} />
                      </motion.div>
                    </motion.div>

                    <motion.div layout className="grid gap-4 md:gap-5" transition={spring}>
                      <motion.div layout data-tour="water" transition={spring}>
                        <WaterGauge value={water} />
                      </motion.div>
                      <motion.div layout data-tour="pressure" transition={spring}>
                        <PumpPressure value={pressure} />
                      </motion.div>
                    </motion.div>
                  </motion.div>
                </motion.div>

                <motion.div layout className="space-y-4 md:space-y-6" transition={spring}>
                  <motion.div layout data-tour="map" transition={spring}>
                    <Suspense fallback={<PanelSkeleton label="Loading Map" className="h-[320px]" />}>
                      <MapPanel follow={follow} onFollowChange={setFollow} />
                    </Suspense>
                  </motion.div>

                  <motion.div layout data-tour="diag" transition={spring}>
                    <Suspense fallback={<PanelSkeleton label="Diagnostics" className="h-[220px]" />}>
                      <DiagnosticsPanel />
                    </Suspense>
                  </motion.div>
                </motion.div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
}
