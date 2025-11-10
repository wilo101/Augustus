import path from "path";
import { createServer } from "./index";
import * as express from "express";
import http from "http";

const app = createServer();
const preferredPort = Number(process.env.PORT) || 8080;
const host = process.env.HOST || "0.0.0.0";

// In production, serve the built SPA files
const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");

// Serve static files
app.use(express.static(distPath));
console.log("[server] static files served from", distPath);

// Handle React Router - serve index.html for any non-matched route (fallback)
// Using a no-path middleware avoids path-to-regexp '*' issues in Express v5.
app.use((_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});
console.log("[server] SPA fallback handler registered");

async function listenWithRetry(startPort: number): Promise<void> {
  let portToTry = startPort;
  // Try a small range to find a free port locally
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await new Promise<void>((resolve, reject) => {
        const server = app.listen(portToTry, host, () => resolve());
        server.on("error", (err: any) => {
          if (err && (err as any).code === "EADDRINUSE") {
            console.warn(`[server] Port ${portToTry} in use, trying ${portToTry + 1}...`);
            portToTry += 1;
            // Close just in case
            try {
              (server as unknown as http.Server).close();
            } catch {}
            reject(err);
          } else {
            console.error("[server] Unexpected listen error:", err);
            reject(err);
          }
        });
      });
      console.log(`🚀 Fusion Starter server running on ${host}:${portToTry}`);
      console.log(`📱 Frontend: http://localhost:${portToTry}`);
      console.log(`🔧 API: http://localhost:${portToTry}/api`);
      return;
    } catch (err: any) {
      if (!(err && err.code === "EADDRINUSE")) {
        // Non-port-in-use error: abort
        process.exit(1);
      }
      // Otherwise loop to next port
    }
  }
  console.error(`[server] Could not bind to any port starting from ${startPort} after ${maxAttempts} attempts.`);
  process.exit(1);
}

listenWithRetry(preferredPort);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
