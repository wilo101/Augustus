import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type Props = {
	defaultUrl?: string;
	eventName?: string;
	className?: string;
};

export default function SocketIoStream({
	defaultUrl = "http://192.168.1.23:8000",
	eventName = "frame",
	className,
}: Props) {
	const imgRef = useRef<HTMLImageElement | null>(null);
	const socketRef = useRef<Socket | null>(null);
	const [url, setUrl] = useState(defaultUrl);
	const [evt, setEvt] = useState(eventName);
	const [connected, setConnected] = useState(false);
	const [error, setError] = useState("");
	const [fps, setFps] = useState(0);
	const frameTimesRef = useRef<number[]>([]);
	const [lastBytes, setLastBytes] = useState<number>(0);
	const [received, setReceived] = useState<number>(0);

	useEffect(() => {
		return () => disconnect();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function connect() {
		try {
			setError("");
			disconnect();
			const s = io(url, { transports: ["websocket"], withCredentials: false });
			s.on("connect", () => setConnected(true));
			s.on("connect_error", (e) => setError(e?.message || "connect error"));
			s.on("disconnect", () => setConnected(false));
			s.on(evt, (data: any) => {
				setReceived((c) => c + 1);
				const now = performance.now();
				frameTimesRef.current.push(now);
				while (frameTimesRef.current.length && now - frameTimesRef.current[0] > 1000) frameTimesRef.current.shift();
				setFps(frameTimesRef.current.length);

				try {
					if (typeof data === "string") {
						// if already data URL
						const s = data.trim();
						if (s.startsWith("data:image/")) {
							imgRef.current && (imgRef.current.src = s);
							setLastBytes(s.length);
						} else {
							// try JSON payloads: {frame|image|data: <base64>}
							let base64 = s;
							if (s.startsWith("{") && s.endsWith("}")) {
								try {
									const o = JSON.parse(s);
									base64 = o.frame || o.image || o.data || base64;
								} catch {}
							}
							const url = "data:image/jpeg;base64," + base64;
							imgRef.current && (imgRef.current.src = url);
							setLastBytes(base64.length);
						}
					} else if (data instanceof ArrayBuffer) {
						const blob = new Blob([data], { type: "image/jpeg" });
						const url = URL.createObjectURL(blob);
						imgRef.current && (imgRef.current.src = url);
						setLastBytes(blob.size);
					}
				} catch {}
			});
			socketRef.current = s;
		} catch (e: any) {
			setError(e?.message || String(e));
		}
	}

	function disconnect() {
		try {
			if (socketRef.current) {
				socketRef.current.removeAllListeners();
				socketRef.current.disconnect();
				socketRef.current = null;
			}
		} catch {}
		setConnected(false);
	}

	return (
		<div className={className}>
			<div className="flex items-center gap-2 mb-2">
				<input
					className="min-w-60 flex-1 rounded border bg-background px-2 py-1 text-sm"
					placeholder="http://<rpi-ip>:<port>"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
				/>
				<input
					className="w-36 rounded border bg-background px-2 py-1 text-sm"
					placeholder="event name"
					value={evt}
					onChange={(e) => setEvt(e.target.value)}
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
				<div className={`text-xs ${connected ? "text-green-400" : "text-yellow-300"}`}>{connected ? `Connected · ${fps} fps` : "Idle"}</div>
			</div>
			{error && <div className="text-xs text-yellow-400 mb-2">{error}</div>}
			<div className="relative">
				<img ref={imgRef} className="w-full aspect-video bg-black rounded-xl object-contain" alt="Socket.IO Stream" />
				<div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded bg-black/60 px-2 py-1 text-[10px] text-red-200/90">
					<span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
					Socket.IO · {connected ? `${fps} fps` : "disconnected"} · {lastBytes ? `${(lastBytes/1024).toFixed(1)} KB` : "0 KB"}
				</div>
				{connected && received === 0 && (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-red-200/80">
						No frames received — check event name (“{evt}”) and payload (base64/string or ArrayBuffer)
					</div>
				)}
			</div>
		</div>
	);
}


