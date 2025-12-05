import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Activity, Map, Settings, LayoutGrid } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { icon: LayoutGrid, label: "Dashboard", href: "/" },
    { icon: Map, label: "Map", href: "/map" },
    { icon: Activity, label: "Diagnostics", href: "/diagnostics" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/20">
      {/* Precision Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b bg-background/80 backdrop-blur-md flex items-center px-6 justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-primary rounded-sm flex items-center justify-center">
            <div className="w-3 h-3 bg-background rounded-full" />
          </div>
          <span className="font-bold tracking-tight text-sm">AUGUSTUS <span className="text-muted-foreground font-normal">OS</span></span>
        </div>

        <nav className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-white/10">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all duration-300",
                  isActive
                    ? "bg-zinc-800 text-white shadow-sm border border-white/10"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                )}
              >
                <item.icon className={cn("w-3.5 h-3.5", isActive && "text-emerald-500")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>SYSTEM ONLINE</span>
          </div>
          <span>v2.4.0</span>
        </div>
      </header>

      <main className="pt-20 pb-10 px-6 mx-auto max-w-[1600px]">
        {mounted && children}
      </main>
    </div>
  );
}
