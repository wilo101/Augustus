import type { Request, Response, RequestHandler } from "express";

type Fix = {
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  ts: number;
};

let lastFix: Fix | null = null;

type Client = { id: number; res: Response; heartbeat: NodeJS.Timeout };
const clients = new Map<number, Client>();
let nextId = 1;

const isNumber = (v: unknown) => typeof v === "number" && Number.isFinite(v);

export const postGps: RequestHandler = (req, res) => {
  const { lat, lng, accuracy, speed, heading, ts } = req.body ?? {};
  if (!isNumber(lat) || !isNumber(lng)) {
    return res.status(400).json({ error: "lat,lng required" });
  }
  const fix: Fix = {
    lat,
    lng,
    accuracy: isNumber(accuracy) ? accuracy : null,
    speed: isNumber(speed) ? speed : null,
    heading: isNumber(heading) ? heading : null,
    ts: isNumber(ts) ? ts : Date.now(),
  };
  lastFix = fix;
  const payload = `data: ${JSON.stringify({ type: "fix", fix })}\n\n`;
  for (const c of clients.values()) {
    c.res.write(payload);
  }
  return res.json({ ok: true });
};

export const getGps: RequestHandler = (_req, res) => {
  res.json({ fix: lastFix });
};

export const streamGps = (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const id = nextId++;
  const heartbeat = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, 15000);
  clients.set(id, { id, res, heartbeat });

  if (lastFix) {
    res.write(`data: ${JSON.stringify({ type: "fix", fix: lastFix })}\n\n`);
  }

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(id);
  });
};

export const reverseGeocode: RequestHandler = async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: "lat,lng required" });
  }
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat,
    )}&lon=${encodeURIComponent(lng)}&addressdetails=1`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "FireBotDashboard/1.0 (+localhost)",
        "Accept": "application/json",
      },
    });
    if (!r.ok) {
      return res.status(502).json({ error: "reverse geocoding upstream error" });
    }
    const data = await r.json();
    return res.json({
      displayName: data.display_name,
      address: data.address ?? null,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};


