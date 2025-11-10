import React, { useEffect, useRef, useState } from "react";

type Props = {
	defaultUrl?: string;
	className?: string;
};

export default function RpiWsStream({ defaultUrl = "ws://raspberrypi.local:8765", className }: Props) {
	const imgRef = useRef<HTMLImageElement | null>(null);
	const wsRef = useRef<WebSocket | null>(null);
	const [url, setUrl] = useState<string>(defaultUrl);
	const [connected, setConnected] = useState(false);
	const [mode, setMode] = useState<"idle" | "ws" | "http">("idle");
	const [error, setError] = useState<string>("");
	const lastUrlRef = useRef<string | null>(null);
	const [fps, setFps] = useState<number>(0);
	const frameTimesRef = useRef<number[]>([]);

	useEffect(() => {
		return () => disconnect();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function connect() {
		try {
			setError("");
			disconnect();
			// HTTP MJPEG fallback: if user enters http/https URL, treat as <img src="...">
			if (/^https?:\/\//i.test(url)) {
				setMode("http");
				const el = imgRef.current;
				if (el) {
					el.src = url; // MJPEG endpoints will stream frames
					revokePrevObjectUrl();
				}
				setConnected(true);
				return;
			}

			const ws = new WebSocket(url.startsWith("ws://") || url.startsWith("wss://") ? url : url.replace(/^http/i, "ws"));
			setMode("ws");
			ws.binaryType = "arraybuffer";
			ws.onopen = () => setConnected(true);
			ws.onerror = () => setError("WebSocket error — check URL/origin");
			ws.onclose = () => {
				setConnected(false);
				setMode("idle");
			};
			ws.onmessage = (e) => {
				handleFrame(e.data);
			};
			wsRef.current = ws;
		} catch (e: any) {
			setError(e?.message || String(e));
		}
	}

	function disconnect() {
		try {
			if (wsRef.current) {
				wsRef.current.onopen = null;
				wsRef.current.onmessage = null as any;
				wsRef.current.onerror = null;
				wsRef.current.onclose = null as any;
				wsRef.current.close();
				wsRef.current = null;
			}
		} catch {}
		setConnected(false);
		setMode("idle");
		if (imgRef.current) {
			imgRef.current.src = "";
		}
	}

	function handleFrame(data: any) {
		if (mode !== "ws") return;
		const now = performance.now();
		frameTimesRef.current.push(now);
		// keep last 1s window
		while (frameTimesRef.current.length && now - frameTimesRef.current[0] > 1000) frameTimesRef.current.shift();
		setFps(frameTimesRef.current.length);

		const el = imgRef.current;
		if (!el) return;

		// String payload: base64 or data URL
		if (typeof data === "string") {
			const s = data.trim();
			if (s.startsWith("data:image/")) {
				el.src = s;
				revokePrevObjectUrl();
				return;
			}
			// Assume base64 (jpeg)
			el.src = "data:image/jpeg;base64," + s;
			revokePrevObjectUrl();
			return;
		}

		// Binary payload (ArrayBuffer / Blob) -> object URL
		try {
			const blob = data instanceof Blob ? data : new Blob([data], { type: "image/jpeg" });
			const objectUrl = URL.createObjectURL(blob);
			revokePrevObjectUrl();
			lastUrlRef.current = objectUrl;
			el.src = objectUrl;
			// Revoke when image swaps
			el.onload = () => {
				if (lastUrlRef.current && lastUrlRef.current !== objectUrl) {
					URL.revokeObjectURL(lastUrlRef.current);
				}
			};
		} catch {
			// ignore
		}
	}

	function revokePrevObjectUrl() {
		if (lastUrlRef.current) {
			URL.revokeObjectURL(lastUrlRef.current);
			lastUrlRef.current = null;
		}
	}

	return (
		<div className={className}>
			<div className="flex items-center gap-2 mb-2">
				<input
					className="min-w-60 flex-1 rounded border bg-background px-2 py-1 text-sm"
					placeholder="ws://<raspberry-ip>:<port>"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
				/>
				{connected ? (
					<button className="rounded bg-muted px-3 py-1 text-sm" onClick={disconnect}>
						Disconnect
					</button>
				) : (
					<button className="rounded bg-primary px-3 py-1 text-primary-foreground text-sm" onClick={connect}>
						Connect
					</button>
				)}
				<div className={`text-xs ${connected ? "text-green-400" : "text-yellow-300"}`}>
					{connected ? `Connected • ${fps} fps` : "Idle"}
				</div>
			</div>
			{error && <div className="text-xs text-yellow-400 mb-2">{error}</div>}
			<div className="relative">
				<img ref={imgRef} className="w-full aspect-video bg-black rounded-xl object-contain" alt="Raspberry Pi Stream" />
				<div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded bg-black/60 px-2 py-1 text-[10px] text-red-200/90">
					<span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
					{mode === "http" ? "RPi HTTP MJPEG" : "RPi WS"}
					{mode === "ws" ? ` · ${fps}fps` : ""}
				</div>
			</div>
		</div>
	);
}


