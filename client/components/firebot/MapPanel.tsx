import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Crosshair, Navigation, Locate, Map as MapIcon, RefreshCw, Smartphone, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Fix Leaflet icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const DEFAULT_GPS_URL = "http://192.168.4.1:8080/gps/stream";

function MapController({ center, follow }: { center: { lat: number; lng: number }; follow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (follow) {
      map.flyTo([center.lat, center.lng], map.getZoom(), { animate: true, duration: 1.5 });
    }
  }, [center, follow, map]);
  return null;
}

function RecenterOnChange({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], map.getZoom(), { animate: true, duration: 0.8 });
  }, [center, map]);
  return null;
}

interface MapPanelProps {
  follow: boolean;
  onFollowChange: (v: boolean) => void;
  heightClass?: string;
}

export default function MapPanel({ follow, onFollowChange, heightClass = "h-[400px]" }: MapPanelProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number }>({ lat: 30.0444, lng: 31.2357 }); // Cairo
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 30.0444, lng: 31.2357 });
  const [gpsActive, setGpsActive] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [permission, setPermission] = useState<"granted" | "prompt" | "denied" | "unknown">("unknown");
  const watchRef = useRef<number | null>(null);
  const [usePhoneGps, setUsePhoneGps] = useState(false);
  const [localGpsEnabled, setLocalGpsEnabled] = useState(true);
  const sseRef = useRef<EventSource | null>(null);
  const [gpsNetworkUrl, setGpsNetworkUrl] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_GPS_URL;
    return window.localStorage.getItem("augustus-gps-url") ?? DEFAULT_GPS_URL;
  });
  const [address, setAddress] = useState<string>("");
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const revTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("augustus-gps-url", gpsNetworkUrl.trim() || DEFAULT_GPS_URL);
  }, [gpsNetworkUrl]);

  const robotIcon = useMemo(
    () =>
      L.divIcon({
        className: "robot-marker-wrapper",
        html: `
          <div class="robot-marker">
            <div class="robot-marker-ring"></div>
            <div class="robot-marker-body" style="transform: rotate(${heading ?? 0}deg);">
              <div class="robot-marker-pointer"></div>
              <div class="robot-marker-core"></div>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22],
      }),
    [heading],
  );

  // GPS watcher
  useEffect(() => {
    if (!localGpsEnabled) {
      setGpsActive(false);
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      return;
    }
    if (!("geolocation" in navigator)) {
      setGpsActive(false);
      return;
    }
    // permissions api (best effort)
    try {
      navigator.permissions?.query({ name: "geolocation" as PermissionName }).then((p: any) => {
        setPermission(p.state ?? "unknown");
        p.onchange = () => setPermission(p.state ?? "unknown");
      }).catch(() => { });
    } catch { }

    const startWatch = () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      let firstFixReported = false;
      watchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy: acc, speed: spd, heading: hdg } = position.coords;
          const ll = { lat: latitude, lng: longitude };
          setCoords(ll);
          setAccuracy(Number.isFinite(acc) ? acc : null);
          setSpeed(typeof spd === "number" && Number.isFinite(spd) ? spd : null);
          setHeading(typeof hdg === "number" && Number.isFinite(hdg) ? hdg : null);
          setGpsActive(true);
          setPos(ll);
          if (follow || !firstFixReported) {
            setCenter(ll);
          }
          firstFixReported = true;
        },
        (error) => {
          setGpsActive(false);
          if (error.code === error.PERMISSION_DENIED) {
            toast.error("Location access denied", { description: "Enable location permissions to use GPS tracking." });
          } else {
            toast.warning("Location unavailable", { description: error.message || "Could not acquire GPS fix." });
          }
        },
        { enableHighAccuracy: true, maximumAge: 1_000, timeout: 15_000 },
      );
    };

    startWatch();
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, [follow, localGpsEnabled]);

  // Subscribe to phone GPS stream when enabled
  useEffect(() => {
    if (!usePhoneGps) {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      return;
    }
    const url = gpsNetworkUrl.trim() || DEFAULT_GPS_URL;
    const es = new EventSource(url);
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg?.type === "fix" && msg.fix) {
          const f = msg.fix as { lat: number; lng: number; accuracy?: number | null; speed?: number | null; heading?: number | null };
          const ll = { lat: f.lat, lng: f.lng };
          setCoords(ll);
          setAccuracy(typeof f.accuracy === "number" ? f.accuracy : null);
          setSpeed(typeof f.speed === "number" ? f.speed : null);
          setHeading(typeof f.heading === "number" ? f.heading : null);
          setGpsActive(true);
          setPos(ll);
          if (follow) setCenter(ll);
        }
      } catch { }
    };
    es.onerror = () => {
      // keep UI indicating remote disabled on error
    };
    return () => es.close();
  }, [usePhoneGps, follow, gpsNetworkUrl]);

  async function requestPreciseFix() {
    if (!("geolocation" in navigator) || !localGpsEnabled) return;
    try {
      const start = Date.now();
      const targetAcc = 25; // meters
      while (Date.now() - start < 20000) {
        const fix = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 });
        });
        const { latitude, longitude, accuracy: acc, speed: spd, heading: hdg } = fix.coords;
        const ll = { lat: latitude, lng: longitude };
        setCoords(ll);
        setAccuracy(Number.isFinite(acc) ? acc : null);
        setSpeed(typeof spd === "number" && Number.isFinite(spd) ? spd : null);
        setHeading(typeof hdg === "number" && Number.isFinite(hdg) ? hdg : null);
        setGpsActive(true);
        setPos(ll);
        setCenter(ll);
        if (acc && acc <= targetAcc) break;
      }
      // restart watch to ensure updates flow after permission grant
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      watchRef.current = navigator.geolocation.watchPosition(
        () => { },
        () => { },
        { enableHighAccuracy: true, maximumAge: 1_000, timeout: 15_000 },
      );
    } catch (e: any) {
      toast.error("Unable to get precise location", { description: e?.message || String(e) });
    }
  }

  // Reverse geocode when coordinates change (debounced)
  useEffect(() => {
    if (!coords) return;
    if (revTimerRef.current) {
      window.clearTimeout(revTimerRef.current);
      revTimerRef.current = null;
    }
    revTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/reverse?lat=${coords.lat}&lng=${coords.lng}`);
        if (res.ok) {
          const data = await res.json();
          setAddress(data?.displayName || "");
        }
      } catch { }
    }, 600);
    return () => {
      if (revTimerRef.current) {
        window.clearTimeout(revTimerRef.current);
        revTimerRef.current = null;
      }
    };
  }, [coords?.lat, coords?.lng]);

  // Fallback simulated motion when GPS inactive
  useEffect(() => {
    if (gpsActive) return;
    const id = setInterval(() => {
      setPos((p) => {
        const dLat = Math.random() * 0.0005 - 0.00025;
        const dLng = Math.random() * 0.0005 - 0.00025;
        const np = { lat: p.lat + dLat, lng: p.lng + dLng };
        if (follow) setCenter(np);
        const lat1 = (p.lat * Math.PI) / 180;
        const lat2 = (np.lat * Math.PI) / 180;
        const dLon = ((np.lng - p.lng) * Math.PI) / 180;
        if (dLat !== 0 || dLng !== 0) {
          const y = Math.sin(dLon) * Math.cos(lat2);
          const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
          const brng = (Math.atan2(y, x) * 180) / Math.PI;
          const normalized = (brng + 360) % 360;
          setHeading(normalized);
        }
        return np;
      });
    }, 900);
    return () => clearInterval(id);
  }, [follow, gpsActive]);

  return (
    <div className={cn("panel-base relative flex flex-col rounded-lg overflow-hidden", heightClass)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4 bg-zinc-900/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl border transition-colors duration-500",
            gpsActive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
          )}>
            <MapIcon className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Global Positioning System</span>
            <div className="flex items-center gap-2.5">
              <div className={cn("h-2.5 w-2.5 rounded-full shadow-[0_0_10px_currentColor]", gpsActive ? "bg-emerald-500 text-emerald-500 animate-pulse" : "bg-rose-500 text-rose-500")} />
              <span className={cn("text-lg font-black uppercase tracking-widest", gpsActive ? "text-white" : "text-rose-500")}>
                {gpsActive && coords ? "TARGET LOCKED" : "SEARCHING..."}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded bg-black/40 px-2 py-1">
            <Switch checked={localGpsEnabled} onCheckedChange={setLocalGpsEnabled} className="scale-75 data-[state=checked]:bg-emerald-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Onboard</span>
          </div>

          <div className="flex items-center gap-2 rounded bg-black/40 px-2 py-1">
            <Switch checked={usePhoneGps} onCheckedChange={setUsePhoneGps} className="scale-75 data-[state=checked]:bg-emerald-600" />
            <Smartphone className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Remote</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onFollowChange(!follow)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded transition-all",
                  follow ? "bg-primary/20 text-primary ring-1 ring-primary/50" : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"
                )}
              >
                <Crosshair className={cn("h-4 w-4", follow && "animate-spin-slow")} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Toggle Auto-Follow</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setMapRefreshKey((k) => k + 1)}
                className="flex h-8 w-8 items-center justify-center rounded bg-white/5 text-muted-foreground transition-all hover:bg-white/10 hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Refresh Map Tiles</TooltipContent>
          </Tooltip>

          {!gpsActive && localGpsEnabled && (
            <button
              onClick={requestPreciseFix}
              className="flex items-center gap-2 rounded bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500 ring-1 ring-emerald-500/20 transition-all hover:bg-emerald-500/20"
            >
              <Zap className="h-3 w-3" />
              Boost
            </button>
          )}
        </div>
      </div>

      {/* Network Config */}
      <div className="border-b border-white/5 bg-black/20 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stream Source</span>
          <input
            value={gpsNetworkUrl}
            onChange={(event) => setGpsNetworkUrl(event.target.value)}
            spellCheck={false}
            className="flex-1 bg-transparent text-[10px] font-mono text-white outline-none placeholder:text-muted-foreground/50"
            placeholder="http://..."
          />
        </div>
      </div>

      {/* Map View */}
      <div className="relative flex-1 p-1">
        <div className="w-full h-full overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
          <MapContainer
            key={mapRefreshKey}
            {...({
              center: [center.lat, center.lng],
              zoom: 15,
              style: { width: "100%", height: "100%" },
              attributionControl: false,
              scrollWheelZoom: true,
              zoomAnimation: true,
              animate: true,
            } as any)}
          >
            {/* 
              LOCKED: Esri World Imagery (Satellite) 
              This layer is permanently active to ensure visual consistency.
              No conditional logic or fallbacks allowed.
            */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
              opacity={1.0}
            />
            <Marker {...({ position: [pos.lat, pos.lng], icon: robotIcon } as any)}>
              <Popup className="custom-popup">
                <div className="space-y-1 bg-black/90 p-2 text-xs backdrop-blur-md border border-white/10 rounded">
                  <div className="font-bold text-primary uppercase tracking-wider">AFR Unit 01</div>
                  <div className="font-mono text-white/80">
                    {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                  </div>
                </div>
              </Popup>
            </Marker>
            <RecenterOnChange center={center} />
            <MapController center={center} follow={follow} />
          </MapContainer>

          {/* Map Overlay UI */}
          <div className="absolute bottom-2 left-2 z-[400] flex flex-col gap-1">
            <div className="rounded bg-black/80 px-2 py-1 font-mono text-[10px] text-white backdrop-blur-md border border-white/10">
              LAT: {coords ? coords.lat.toFixed(6) : "---.------"}
            </div>
            <div className="rounded bg-black/80 px-2 py-1 font-mono text-[10px] text-white backdrop-blur-md border border-white/10">
              LNG: {coords ? coords.lng.toFixed(6) : "---.------"}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-2 gap-px bg-white/5 md:grid-cols-4">
        <div className="bg-black/40 p-3 backdrop-blur-sm">
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Precision</div>
          <div className="mt-1 font-mono text-xs text-white">
            {accuracy ? `±${Math.round(accuracy)}m` : "N/A"}
          </div>
        </div>
        <div className="bg-black/40 p-3 backdrop-blur-sm">
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Velocity</div>
          <div className="mt-1 font-mono text-xs text-white">
            {typeof speed === "number" ? `${(speed || 0).toFixed(1)} m/s` : "0.0 m/s"}
          </div>
        </div>
        <div className="bg-black/40 p-3 backdrop-blur-sm">
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Heading</div>
          <div className="mt-1 font-mono text-xs text-white">
            {typeof heading === "number" ? `${Math.round(heading)}°` : "---"}
          </div>
        </div>
        <div className="bg-black/40 p-3 backdrop-blur-sm">
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Location</div>
          <div className="mt-1 truncate font-mono text-xs text-white" title={address}>
            {address || "Unknown Sector"}
          </div>
        </div>
      </div>
    </div>
  );
}
