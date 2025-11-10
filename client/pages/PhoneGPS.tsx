import { useEffect, useRef, useState } from "react";

export default function PhoneGPS() {
  const [status, setStatus] = useState<"idle" | "tracking" | "error">("idle");
  const [err, setErr] = useState<string>("");
  const [fix, setFix] = useState<{ lat: number; lng: number; accuracy?: number | null } | null>(null);
  const watchRef = useRef<number | null>(null);

  async function postFix(body: any) {
    try {
      await fetch("/api/gps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } catch {}
  }

  function start() {
    setErr("");
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setErr("Geolocation not supported");
      return;
    }
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        const payload = { lat: latitude, lng: longitude, accuracy, speed, heading, ts: Date.now() };
        setFix(payload);
        setStatus("tracking");
        postFix(payload);
      },
      (e) => {
        setStatus("error");
        setErr(e.message || String(e));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }

  function stop() {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setStatus("idle");
  }

  useEffect(() => {
    return () => stop();
  }, []);

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-[#0b0b0d] via-[#0d0d10] to-[#140a0a] text-red-100">
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-bold">Phone GPS Uplink</h1>
        <p className="text-sm text-red-200/80">اسمح باللوكيشن، وخليك فاتح الصفحة ديه عشان تبعت إحداثياتك للدashboard.</p>
        <div className="flex gap-2">
          <button onClick={start} className="rounded bg-red-600/80 px-3 py-1.5">Start</button>
          <button onClick={stop} className="rounded bg-black/40 border border-red-900/40 px-3 py-1.5">Stop</button>
          <span className="text-xs opacity-80">{status === "tracking" ? "Tracking..." : status === "error" ? "Error" : "Idle"}</span>
        </div>
        {err && <div className="text-xs text-yellow-300">{err}</div>}
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded border border-red-900/30 bg-black/40 px-2 py-1">Lat: <span className="text-red-100">{fix ? fix.lat.toFixed(6) : "-"}</span></div>
          <div className="rounded border border-red-900/30 bg-black/40 px-2 py-1">Lng: <span className="text-red-100">{fix ? fix.lng.toFixed(6) : "-"}</span></div>
          <div className="rounded border border-red-900/30 bg-black/40 px-2 py-1">Accuracy: <span className="text-red-100">{fix?.accuracy ? `${Math.round(fix.accuracy)} m` : "-"}</span></div>
        </div>
        <div className="text-xs opacity-70">Tip: افتح العنوان ده على الموبايل: <code className="bg-black/40 px-1 rounded">/phone-gps</code></div>
      </div>
    </div>
  );
}


