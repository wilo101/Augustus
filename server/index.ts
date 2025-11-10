import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { postGps, getGps, streamGps, reverseGeocode } from "./routes/gps";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  console.log("[server] cors middleware registered");
  app.use(express.json());
  console.log("[server] json middleware registered");
  app.use(express.urlencoded({ extended: true }));
  console.log("[server] urlencoded middleware registered");

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });
  console.log("[server] GET /api/ping route registered");

  app.get("/api/demo", handleDemo);
  console.log("[server] GET /api/demo route registered");

  // GPS endpoints
  app.post("/api/gps", postGps);
  app.get("/api/gps", getGps);
  app.get("/api/gps/stream", streamGps);
  app.get("/api/reverse", reverseGeocode);
  console.log("[server] GPS routes registered");

  return app;
}
