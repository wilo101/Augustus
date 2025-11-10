import { useEffect, useState } from "react";

type Props = {
  onDone?: () => void;
  durationMs?: number;
};

export default function SplashScreen({ onDone, durationMs = 1200 }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs, onDone]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[1200] grid place-items-center overflow-hidden" role="dialog" aria-label="Loading">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-[#0b1010] to-black" />
      <div className="relative flex flex-col items-center">
        <div className="relative mb-4 h-24 w-24 rounded-3xl border border-red-500/30 bg-black/40 shadow-[0_0_24px_rgba(248,113,113,0.15)] backdrop-blur">
          <div className="absolute inset-0 animate-ping rounded-3xl bg-red-600/10" />
          <div className="absolute inset-2 rounded-2xl border border-red-500/30" />
          <div className="absolute inset-4 rounded-xl bg-gradient-to-br from-red-900/60 to-black/60" />
          <img
            src="/robot-logo.svg"
            alt="Robot Logo"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 object-contain select-none pointer-events-none"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.onerror = null;
              img.src = "/favicon.svg";
            }}
          />
        </div>
        <div className="text-center">
          <div className="text-2xl font-black uppercase tracking-[0.5em] text-red-100">AFR</div>
          <div className="mt-1 text-xs uppercase tracking-[0.35em] text-red-200/70">Command Console</div>
        </div>
      </div>
    </div>
  );
}


