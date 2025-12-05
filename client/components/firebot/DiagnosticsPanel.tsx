import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Loader2, Play, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type DiagnosticStatus = "idle" | "running" | "ok" | "error";

interface DiagnosticItem {
  id: string;
  label: string;
  status: DiagnosticStatus;
}

export default function DiagnosticsPanel() {
  const [items, setItems] = useState<DiagnosticItem[]>([
    { id: "sys", label: "System Core", status: "ok" },
    { id: "net", label: "Network Uplink", status: "ok" },
    { id: "mot", label: "Motor Controllers", status: "idle" },
    { id: "sens", label: "Sensor Array", status: "idle" },
    { id: "cam", label: "Video Feed", status: "ok" },
    { id: "pow", label: "Power Management", status: "idle" },
  ]);

  const runDiagnostics = () => {
    setItems((prev) => prev.map((item) => ({ ...item, status: "running" })));

    items.forEach((item, index) => {
      setTimeout(() => {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: Math.random() > 0.1 ? "ok" : "error" }
              : i
          )
        );
      }, 1000 + index * 800);
    });
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950/30">
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center justify-between px-3 py-1.5 rounded border transition-colors",
              item.status === "running" ? "bg-secondary/50 border-secondary" :
                item.status === "ok" ? "bg-emerald-500/5 border-emerald-500/10" :
                  item.status === "error" ? "bg-rose-500/5 border-rose-500/10" :
                    "bg-transparent border-transparent hover:bg-white/5"
            )}
          >
            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">{item.label}</span>
            <div className="flex items-center gap-2">
              {item.status === "running" && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
              {item.status === "ok" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
              {item.status === "error" && <AlertCircle className="w-3 h-3 text-rose-500" />}
              {item.status === "idle" && <div className="w-1 h-1 rounded-full bg-zinc-800" />}

              <span className={cn(
                "text-[9px] font-mono uppercase w-10 text-right",
                item.status === "ok" ? "text-emerald-500" :
                  item.status === "error" ? "text-rose-500" :
                    "text-zinc-600"
              )}>
                {item.status === "running" ? "TEST" : item.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-2 border-t border-white/5 bg-black/20">
        <button
          onClick={runDiagnostics}
          className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors border border-white/5"
        >
          {items.some(i => i.status === "running") ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current" />
              Run Check
            </>
          )}
        </button>
      </div>
    </div>
  );
}
