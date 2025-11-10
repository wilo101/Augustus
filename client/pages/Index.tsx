import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
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

const MapPanel = lazy(() => import("@/components/firebot/MapPanel"));
const DiagnosticsPanel = lazy(() => import("@/components/firebot/DiagnosticsPanel"));

const METRIC_KEYS = ["battery", "water", "pressure", "temp"] as const;
type MetricKey = (typeof METRIC_KEYS)[number];

const RESTORE_RANGES: Record<MetricKey, [number, number]> = {
  battery: [72, 90],
  water: [55, 80],
  pressure: [0.95, 1.25],
  temp: [42, 55],
};

const CRITICAL_GENERATORS: Record<MetricKey, () => number> = {
  battery: () => 8 + Math.random() * 6,
  water: () => 10 + Math.random() * 8,
  pressure: () => 0.48 + Math.random() * 0.07,
  temp: () => 78 + Math.random() * 6,
};

const BASE_LEVELS: Record<MetricKey, number> = {
  battery: 82,
  water: 64,
  pressure: 1.08,
  temp: 48,
};

const METRIC_META: Record<MetricKey, { title: string; buildMessage: (value: number) => string }> = {
  battery: {
    title: "Battery Critical",
    buildMessage: (value: number) => `Charge dropped to ${value.toFixed(0)}% — deploy recharge support immediately.`,
  },
  water: {
    title: "Water Reserve Critical",
    buildMessage: (value: number) => `Remaining capacity ${value.toFixed(0)}% — initiate refill crew response.`,
  },
  pressure: {
    title: "Pump Pressure Drop",
    buildMessage: (value: number) => `Pressure fell to ${value.toFixed(2)} bar — check pump status now.`,
  },
  temp: {
    title: "Thermal Overheat",
    buildMessage: (value: number) => `Core temperature spiked to ${value.toFixed(0)} °C — divert or cool the robot.`,
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

const PanelSkeleton = ({ label, className }: { label: string; className?: string }) => (
  <div
    className={cn(
      "flex items-center justify-center rounded-2xl border border-red-900/40 bg-black/40 text-[11px] font-semibold uppercase tracking-[0.35em] text-red-200/70",
      className,
    )}
    aria-label={`${label} loading`}
  >
    {label}
  </div>
);

export default function Index() {
  const [battery, setBattery] = useState(82);
  const [water, setWater] = useState(64);
  const [pressure, setPressure] = useState(1.1);
  const [temp, setTemp] = useState(48);
  const [follow, setFollow] = useState(true);
  const [systemState, setSystemState] = useState<"operational" | "standby" | "emergency">("operational");
  const [mapFocusLayout, setMapFocusLayout] = useState(false);
  const restoreTimersRef = useRef<Record<MetricKey, number | null>>({
    battery: null,
    water: null,
    pressure: null,
    temp: null,
  });
  const criticalLockRef = useRef<Record<MetricKey, boolean>>({
    battery: false,
    water: false,
    pressure: false,
    temp: false,
  });
  const metricSetters = useMemo<Record<MetricKey, Dispatch<SetStateAction<number>>>>(
    () => ({
      battery: setBattery,
      water: setWater,
      pressure: setPressure,
      temp: setTemp,
    }),
    [setBattery, setWater, setPressure, setTemp],
  );
  const playAlarm = useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as
        | typeof AudioContext
        | undefined;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1.2);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 1.2);
      oscillator.onended = () => {
        gain.disconnect();
        ctx.close();
      };
    } catch {
      // ignore audio errors (browser restrictions / user gesture requirements)
    }
  }, []);
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

  const scheduleRestore = useCallback(
    (metric: MetricKey) => {
      if (typeof window === "undefined") return;
      const setter = metricSetters[metric];
      const [min, max] = RESTORE_RANGES[metric];

      const existing = restoreTimersRef.current[metric];
      if (existing !== null) {
        window.clearTimeout(existing);
      }

      const timeoutId = window.setTimeout(() => {
        setter(() => {
          const next = randomBetween(min, max);
          switch (metric) {
            case "battery":
            case "water":
              return clamp(next, 0, 100);
            case "pressure":
              return clamp(next, 0.4, 1.6);
            case "temp":
              return clamp(next, 30, 65);
            default:
              return next;
          }
        });
        criticalLockRef.current[metric] = false;
        restoreTimersRef.current[metric] = null;
      }, 8000);

      restoreTimersRef.current[metric] = timeoutId;
    },
    [metricSetters],
  );

  const triggerCriticalEvent = useCallback(
    (metric: MetricKey, value: number) => {
      const meta = METRIC_META[metric];
      lastAlertRef.current[metric] = Date.now();
      playAlarm();
      toast.custom(
        (id) => (
          <div className="pointer-events-none fixed inset-0 z-[1200] flex items-center justify-center px-4">
            <div
              role="alertdialog"
              aria-label={meta.title}
              className="pointer-events-auto w-[min(600px,92vw)] max-w-full rounded-2xl border border-red-500/50 bg-[#120606]/95 px-7 py-6 text-red-100 shadow-[0_25px_60px_rgba(239,68,68,0.35)] backdrop-blur-md"
            >
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-red-400/70 bg-red-900/35 text-2xl sm:shrink-0">
                  ⚠️
                </div>
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <span className="inline-flex items-center justify-center rounded-full border border-red-400/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-red-200/90">
                    Critical Alert
                  </span>
                  <h3 className="text-lg font-semibold uppercase tracking-[0.18em] text-red-100">
                    {meta.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-red-100/85">
                    Warning: {meta.buildMessage(value)}
                  </p>
                </div>
                <button
                  onClick={() => toast.dismiss(id)}
                  className="inline-flex items-center justify-center rounded-full border border-red-500/60 px-6 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-red-100 transition hover:bg-red-600/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        ),
        {
          duration: 6000,
          position: "top-center",
        },
      );
    },
    [playAlarm],
  );
  const spring: Transition = { duration: 0.35, ease: [0.22, 1, 0.36, 1] };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setInterval(() => {
      if (!criticalLockRef.current.battery) {
        setBattery((prev) =>
          clamp(
            prev + (BASE_LEVELS.battery + (Math.random() * 4 - 2) - prev) * 0.05,
            55,
            96,
          ),
        );
      }
      if (!criticalLockRef.current.water) {
        setWater((prev) =>
          clamp(prev + (BASE_LEVELS.water + (Math.random() * 4 - 2) - prev) * 0.05, 45, 95),
        );
      }
      if (!criticalLockRef.current.pressure) {
        setPressure((prev) =>
          clamp(
            prev + (BASE_LEVELS.pressure + (Math.random() * 0.1 - 0.05) - prev) * 0.06,
            0.75,
            1.4,
          ),
        );
      }
      if (!criticalLockRef.current.temp) {
        setTemp((prev) =>
          clamp(prev + (BASE_LEVELS.temp + (Math.random() * 3 - 1.5) - prev) * 0.06, 32, 60),
        );
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const intervalId = window.setInterval(() => {
      const metric = METRIC_KEYS[Math.floor(Math.random() * METRIC_KEYS.length)];
      const rawValue = CRITICAL_GENERATORS[metric]();
      const appliedValue =
        metric === "battery" || metric === "water"
          ? clamp(rawValue, 0, 100)
          : metric === "pressure"
            ? clamp(rawValue, 0.4, 1.6)
            : clamp(rawValue, 70, 95);

      criticalLockRef.current[metric] = true;
      metricSetters[metric](() => appliedValue);
      triggerCriticalEvent(metric, appliedValue);
      scheduleRestore(metric);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
      METRIC_KEYS.forEach((metric) => {
        const pending = restoreTimersRef.current[metric];
        if (pending !== null) {
          window.clearTimeout(pending);
          restoreTimersRef.current[metric] = null;
        }
        criticalLockRef.current[metric] = false;
      });
    };
  }, [metricSetters, scheduleRestore, triggerCriticalEvent]);

  useEffect(() => {
    if (battery <= 20 && shouldNotify("battery")) {
      toast.warning("Battery low", { description: `${battery.toFixed(0)}% remaining — plan recharge`, });
    }
  }, [battery]);
  useEffect(() => {
    if (water <= 15 && shouldNotify("water")) {
      toast.error("Water level critical", { description: `${water.toFixed(0)}% — refill tank`, });
    }
  }, [water]);
  useEffect(() => {
    if (pressure < 0.8 && shouldNotify("pressure")) {
      toast.warning("Pump pressure below nominal", { description: `${pressure.toFixed(2)} bar — check pump`, });
    }
  }, [pressure]);
  useEffect(() => {
    if (temp >= 65 && shouldNotify("temp")) {
      toast.error("High temperature detected", { description: `${temp.toFixed(0)} °C — redirect or cooldown`, });
    }
  }, [temp]);

  useEffect(() => {
    if (battery <= 15 || water <= 10 || temp >= 75 || pressure < 0.6) {
      setSystemState("emergency");
    } else if (battery < 35 || water < 25 || temp >= 65 || pressure < 0.85) {
      setSystemState("standby");
    } else {
      setSystemState("operational");
    }
  }, [battery, water, pressure, temp]);

  const stateMeta: Record<typeof systemState, { icon: string; label: string; description: string; tone: string }> = {
    emergency: {
      icon: "🔴",
      label: "Emergency",
      description: "Critical thresholds exceeded — immediate response required.",
      tone: "border-red-500/60 bg-red-900/30 text-red-100",
    },
    standby: {
      icon: "🟡",
      label: "Standby",
      description: "Systems active — watch potential issues.",
      tone: "border-amber-500/60 bg-amber-900/20 text-amber-100",
    },
    operational: {
      icon: "🟢",
      label: "Operational",
      description: "All vitals within nominal ranges.",
      tone: "border-emerald-500/60 bg-emerald-900/20 text-emerald-100",
    },
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          "min-h-screen p-4 md:p-6 lg:p-8",
          "bg-transparent",
        )}
      >
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

          <div className="flex items-center justify-end">
            <button
              onClick={() => setMapFocusLayout((v) => !v)}
              className="rounded border border-red-900/40 bg-black/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-red-100 transition hover:bg-red-900/30"
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
                  className="grid gap-4 md:gap-6 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] items-stretch"
                  transition={spring}
                >
                  <motion.div layout className="h-full" transition={spring}>
                    <div data-tour="cam" className="h-full">
                      <LiveCamera className="h-full" />
                    </div>
                  </motion.div>
                  <motion.div
                    layout
                    className="grid grid-cols-1 gap-4 md:gap-5 auto-rows-fr sm:grid-cols-2 md:grid-rows-2 h-full"
                    transition={spring}
                  >
                    <motion.div layout data-tour="battery" className="h-full" transition={spring}>
                      <BatteryGauge value={battery} className="h-full" />
                    </motion.div>
                    <motion.div layout data-tour="temp" className="h-full" transition={spring}>
                      <TemperatureCard value={temp} className="h-full" />
                    </motion.div>
                    <motion.div layout data-tour="water" className="h-full" transition={spring}>
                      <WaterGauge value={water} className="h-full" />
                    </motion.div>
                    <motion.div layout data-tour="pressure" className="h-full" transition={spring}>
                      <PumpPressure value={pressure} className="h-full" />
                    </motion.div>
                  </motion.div>
                </motion.div>
                <motion.div layout data-tour="map" transition={spring}>
                  <Suspense
                    fallback={
                      <PanelSkeleton label="Loading Map" className="h-[460px] md:h-[560px]" />
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
                  <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:gap-6" transition={spring}>
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
                    <Suspense
                      fallback={<PanelSkeleton label="Loading Map" className="h-[320px]" />}
                    >
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
