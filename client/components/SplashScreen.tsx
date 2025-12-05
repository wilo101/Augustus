import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import afrLogo from "@/assets/afr-logo.png";

type Props = {
  onDone?: () => void;
  stepMs?: number;
  gapMs?: number;
  holdMs?: number;
  fadeMs?: number;
};

const STEPS = [
  "Initializing Core Systems...",
  "Establishing Secure Uplink...",
  "Calibrating Sensors...",
] as const;

export default function SplashScreen({
  onDone,
  stepMs = 800,
  gapMs = 150,
  holdMs = 200,
  fadeMs = 500,
}: Props) {
  const [visible, setVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [widths, setWidths] = useState<number[]>([0, 0, 0]);
  const [stepIndex, setStepIndex] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const fillStep = (i: number) => {
      setStepIndex(i);
      setWidths((w) => {
        const clone = [...w];
        clone[i] = 100;
        return clone;
      });

      const t = window.setTimeout(() => {
        if (i < 2) {
          const g = window.setTimeout(() => fillStep(i + 1), gapMs);
          return () => window.clearTimeout(g);
        } else {
          const hold = window.setTimeout(() => {
            setIsExiting(true);
            const fade = window.setTimeout(() => {
              setVisible(false);
              onDone?.();
            }, fadeMs + 50);
            return () => window.clearTimeout(fade);
          }, holdMs);
          return () => window.clearTimeout(hold);
        }
      }, stepMs);

      return () => window.clearTimeout(t);
    };

    const kick = window.setTimeout(() => fillStep(0), 50);
    return () => window.clearTimeout(kick);
  }, [fadeMs, gapMs, holdMs, onDone, stepMs]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[1200] grid place-items-center overflow-hidden bg-zinc-950 transition-opacity duration-500",
        isExiting ? "opacity-0" : "opacity-100"
      )}
      role="dialog"
      aria-label="Initializing Augustus OS"
    >
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

      <div className="relative flex w-[min(400px,90vw)] flex-col items-center gap-8 p-8 text-center">
        {/* Logo Section */}
        <div className="relative h-24 w-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-white/5 blur-xl animate-pulse" />
          <img
            src={afrLogo}
            alt="Augustus Logo"
            className="relative h-20 w-20 object-contain drop-shadow-2xl"
            onError={(e) => {
              const t = e.currentTarget;
              t.onerror = null;
              t.src = "/favicon.svg";
            }}
          />
        </div>

        {/* Text Section */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            AUGUSTUS OS
          </h1>
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            System Initialization
          </p>
        </div>

        {/* Progress Section */}
        <div className="w-full space-y-4">
          <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            <span>{STEPS[Math.min(stepIndex, STEPS.length - 1)]}</span>
            <span>{Math.round(((stepIndex + 1) / 3) * 100)}%</span>
          </div>

          <div className="flex w-full items-center gap-2">
            {widths.map((w, idx) => (
              <div
                key={idx}
                className="relative h-1 flex-1 overflow-hidden rounded-full bg-zinc-800"
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-white"
                  style={{
                    width: `${w}%`,
                    transition: `width ${stepMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
