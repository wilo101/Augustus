import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer, useMap, Tooltip as LeafletTooltip } from "react-leaflet";
import L from "leaflet";
import marker2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = { follow: boolean; onFollowChange: (v: boolean) => void; heightClass?: string };

export default function MapPanel({ follow, onFollowChange, heightClass }: Props) {
  const DEFAULT_GPS_URL = "/api/gps/stream";

  // Fix default marker icons for bundlers
  useMemo(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: marker2xUrl,
      iconUrl: markerUrl,
      shadowUrl: markerShadowUrl,
    });
  }, []);

  const defaultLatLng = useMemo(() => ({ lat: 30.0444, lng: 31.2357 }), []); // Cairo as default
  const [center, setCenter] = useState<{ lat: number; lng: number }>(defaultLatLng);
  const [pos, setPos] = useState<{ lat: number; lng: number }>(defaultLatLng);
  const [gpsActive, setGpsActive] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
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
  }, [gpsNetworkUrl, DEFAULT_GPS_URL]);

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
      }).catch(() => {});
    } catch {}

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
      } catch {}
    };
    es.onerror = () => {
      // keep UI indicating remote disabled on error
    };
    return () => es.close();
  }, [usePhoneGps, follow, gpsNetworkUrl, DEFAULT_GPS_URL]);

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
        () => {},
        () => {},
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
      } catch {}
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

  function RecenterOnChange({ center: c }: { center: { lat: number; lng: number } }) {
    const map = useMap();
    useEffect(() => {
      map.flyTo([c.lat, c.lng], map.getZoom(), { animate: true, duration: 0.8 });
    }, [c.lat, c.lng, map]);
    return null;
  }

  return (
    <div className="relative rounded-2xl border border-red-900/40 bg-[#0b1010] shadow-[0_0_24px_rgba(239,68,68,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-red-900/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold uppercase tracking-widest text-soft">Map Tracking</div>
          <div className={`indicator-dot ${gpsActive ? "bg-emerald-400" : "bg-red-500"}`} aria-hidden />
          <span className="text-xs uppercase tracking-widest text-gray-300/80">
            {gpsActive && coords ? "GPS Link Stable" : "Awaiting Fix"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300/70">
          <div className="flex items-center gap-2">
            <Switch checked={localGpsEnabled} onCheckedChange={setLocalGpsEnabled} aria-label="Toggle onboard GPS" />
            <span className="uppercase tracking-[0.25em] text-soft">GPS</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={usePhoneGps} onCheckedChange={setUsePhoneGps} aria-label="Toggle phone GPS stream" />
            <span className="uppercase tracking-[0.25em] text-soft">Phone GPS</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onFollowChange(!follow)}
                className={`rounded border px-3 py-1.5 uppercase tracking-[0.25em] transition ${
                  follow ? "border-red-500/70 bg-red-700/30 text-red-100" : "border-red-900/40 bg-black/60 text-red-100"
                }`}
              >
                {follow ? "Following" : "Follow"}
              </button>
            </TooltipTrigger>
            <TooltipContent>Automatically pan with robot motion</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setMapRefreshKey((k) => k + 1)}
                className="rounded border border-red-900/40 bg-black/60 px-3 py-1.5 uppercase tracking-[0.25em] text-red-100 transition hover:bg-red-900/30"
              >
                Refresh Tiles
              </button>
            </TooltipTrigger>
            <TooltipContent>Reload map tiles and reposition view.</TooltipContent>
          </Tooltip>
          {!gpsActive && localGpsEnabled && (
            <button
              onClick={requestPreciseFix}
              className="rounded border border-emerald-500/40 bg-emerald-900/20 px-3 py-1.5 uppercase tracking-[0.25em] text-emerald-100 transition hover:bg-emerald-900/30"
            >
              Boost Fix
            </button>
          )}
        </div>
      </div>
      <div className="border-b border-red-900/40 px-4 pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-[10px] uppercase tracking-[0.32em] text-red-200/70 sm:w-40">
            GPS Network URL
          </label>
          <div className="flex w-full gap-2">
            <input
              value={gpsNetworkUrl}
              onChange={(event) => setGpsNetworkUrl(event.target.value)}
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-red-900/40 bg-black/40 px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-red-100 outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder="http://192.168.x.x:3000/api/gps/stream"
            />
            <button
              type="button"
              onClick={() => setGpsNetworkUrl(DEFAULT_GPS_URL)}
              className="rounded-lg border border-red-900/40 bg-black/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-red-100 transition hover:bg-red-900/30"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className={`${heightClass ?? "h-[320px]"} w-full overflow-hidden rounded-xl border border-red-900/40`}>
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
            <TileLayer
              {...({
                url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
              } as any)}
            />
            <Marker {...({ position: [pos.lat, pos.lng], icon: robotIcon } as any)}>
              <LeafletTooltip>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-red-800">AFR Position</div>
                  <div className="text-[11px] text-red-900/80">
                    {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                  </div>
                </div>
              </LeafletTooltip>
            </Marker>
            <RecenterOnChange center={center} />
          </MapContainer>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] uppercase tracking-widest text-gray-300/80 md:grid-cols-4">
          <div className="rounded border border-red-900/30 bg-black/40 px-3 py-2">
            Lat <span className="text-soft">{coords ? coords.lat.toFixed(6) : "-"}</span>
          </div>
          <div className="rounded border border-red-900/30 bg-black/40 px-3 py-2">
            Lng <span className="text-soft">{coords ? coords.lng.toFixed(6) : "-"}</span>
          </div>
          <div className="rounded border border-red-900/30 bg-black/40 px-3 py-2">
            Accuracy <span className="text-soft">{accuracy ? `${Math.round(accuracy)} m` : "-"}</span>
          </div>
          <div className="rounded border border-red-900/30 bg-black/40 px-3 py-2">
            Speed <span className="text-soft">{typeof speed === "number" ? `${(speed || 0).toFixed(1)} m/s` : "-"}</span>
          </div>
          <div className="rounded border border-red-900/30 bg-black/40 px-3 py-2">
            Heading <span className="text-soft">{typeof heading === "number" ? `${Math.round(heading)}°` : "-"}</span>
          </div>
          <div className="rounded border border-red-900/30 bg-black/40 px-3 py-2">
            Permission <span className="text-soft">{permission}</span>
          </div>
          <div className="col-span-2 rounded border border-red-900/30 bg-black/40 px-3 py-2 md:col-span-4">
            Address <span className="text-soft">{address || "-"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
