import { ArrowRight } from "lucide-react";

type Props = {
  onStart: () => void;
};

export default function WelcomeScreen({ onStart }: Props) {
  return (
    <div className="fixed inset-0 z-[1200] grid place-items-center bg-zinc-950" role="dialog" aria-label="Welcome">
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

      <div className="relative mx-4 w-full max-w-md panel-base rounded-xl p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Welcome to</div>
            <h1 className="text-3xl font-bold tracking-tight text-white">AUGUSTUS OS</h1>
          </div>

          <p className="text-sm text-zinc-400 leading-relaxed">
            Advanced Fire Response Unit Control Interface. <br />
            Monitor telemetry, navigation, and diagnostics in real-time.
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center">
          <button
            onClick={onStart}
            className="group flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-all hover:bg-zinc-200 hover:shadow-lg hover:shadow-white/10"
          >
            Initialize System
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-800/50 flex justify-between text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
          <span>V.2.4.0-STABLE</span>
          <span>AUTH: ADMIN</span>
        </div>
      </div>
    </div>
  );
}


