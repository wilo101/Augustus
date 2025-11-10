import { ReactNode, Suspense, lazy, useCallback, useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { Link } from "react-router-dom";
import SplashScreen from "./SplashScreen";
import WelcomeScreen from "./WelcomeScreen";

const GuidedTour = lazy(() => import("./GuidedTour"));

export default function Layout({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    const root = document.documentElement;
    if (!stored) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else if (stored === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setShowSplash(true);
    const t = window.setTimeout(() => {
      setShowSplash(false);
      setShowWelcome(true);
    }, 1200);
    return () => window.clearTimeout(t);
  }, [mounted]);

  const closeTour = useCallback(() => {
    localStorage.setItem("afr-tour-complete", "1");
    setTourOpen(false);
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  }, []);

  const startAfterWelcome = useCallback(() => {
    setShowWelcome(false);
    setTourOpen(true);
  }, []);

  // Always start at top on mount and disable browser scroll restoration
  useEffect(() => {
    if (!mounted) return;
    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
    } catch {}
    // Scroll to the middle of the page on load
    const scrollToMiddle = () => {
      const doc = document.documentElement;
      const body = document.body;
      const fullHeight = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        doc.clientHeight,
        doc.scrollHeight,
        doc.offsetHeight,
      );
      const maxScrollable = Math.max(0, fullHeight - window.innerHeight);
      const mid = Math.floor(maxScrollable / 2);
      window.scrollTo(0, mid);
    };
    // First attempt immediately, then once more after layout settles
    scrollToMiddle();
    const t = window.setTimeout(scrollToMiddle, 50);
    return () => window.clearTimeout(t);
  }, [mounted]);

  const toggleTour = useCallback(() => {
    setTourOpen((prev) => {
      if (prev) {
        localStorage.setItem("afr-tour-complete", "1");
        return false;
      }
      localStorage.removeItem("afr-tour-complete");
      return true;
    });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-40 border-b border-red-900/30 bg-gradient-to-r from-black/60 via-[#130a0a]/70 to-black/60 backdrop-blur supports-[backdrop-filter]:bg-black/40">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="text-sm font-semibold tracking-widest uppercase text-primary">AFR</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTour}
              aria-pressed={tourOpen}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                tourOpen
                  ? "border-red-500/70 bg-red-600/20 text-red-100 hover:bg-red-600/30"
                  : "border-red-900/40 bg-black/40 text-red-100 hover:bg-black/60"
              }`}
            >
              {tourOpen ? "Close Tour" : "Launch Tour"}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </nav>
      <main className="pb-10">{mounted && children}</main>
      <footer className="border-t border-red-900/20 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} FireBot — Imperial Operations Console
      </footer>
      {showSplash && <SplashScreen onDone={() => { /* handled by timer */ }} />}
      {showWelcome && <WelcomeScreen onStart={startAfterWelcome} />}
      <Suspense fallback={null}>
        <GuidedTour
          steps={[
            {
              selector: "[data-tour=cam]",
              title: "Robot IP Camera",
              description: "Live feed with snapshot, recording and fullscreen controls.",
            },
            {
              selector: "[data-tour=battery]",
              title: "Power Levels",
              description: "Battery gauge and autonomy estimate for the robot.",
            },
            {
              selector: "[data-tour=temp]",
              title: "Thermal Status",
              description: "Current operating temperature with high-temp alerts.",
            },
            {
              selector: "[data-tour=water]",
              title: "Water Tank",
              description: "Monitor remaining water capacity and refill thresholds.",
            },
            {
              selector: "[data-tour=pressure]",
              title: "Pump Pressure",
              description: "Real-time delivery pressure. Keep this within the nominal band.",
            },
            {
              selector: "[data-tour=map]",
              title: "Map Tracking",
              description: "Clean live map view with GPS toggles and centering controls.",
            },
            {
              selector: "[data-tour=diag]",
              title: "Self Diagnostics",
              description: "Run system checks and review component health at a glance.",
            },
          ]}
          open={tourOpen}
          onClose={closeTour}
        />
      </Suspense>
    </div>
  );
}
