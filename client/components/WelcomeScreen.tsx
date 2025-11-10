type Props = {
  onStart: () => void;
};

export default function WelcomeScreen({ onStart }: Props) {
  return (
    <div className="fixed inset-0 z-[1200] grid place-items-center" role="dialog" aria-label="Welcome">
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_30%,rgba(255,64,64,0.12),rgba(0,0,0,0.95))] backdrop-blur-sm" />
      <div className="relative mx-4 w-full max-w-lg rounded-2xl border border-red-900/40 bg-black/70 p-8 text-center shadow-2xl max-h-[85vh] overflow-auto">
        <div className="mb-2 text-sm uppercase tracking-[0.35em] text-red-200/80">Welcome to</div>
        <h1 className="text-3xl font-black uppercase tracking-[0.4em] text-red-100">AFR Console</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-red-200/80">
          Monitor live telemetry, maps and diagnostics. Start the quick tour to learn the main controls.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={onStart}
            className="rounded-md border border-red-500/70 bg-red-600/30 px-5 py-2 font-semibold uppercase tracking-widest text-red-100 transition hover:bg-red-600/40"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}


