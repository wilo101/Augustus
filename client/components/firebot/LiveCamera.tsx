import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Video, VideoOff, RefreshCw, Maximize2, Minimize2, Camera, Circle, Settings, X, Save } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

interface LiveCameraProps {
  className?: string;
}

export default function LiveCamera({ className }: LiveCameraProps) {
  const [url, setUrl] = useState("https://media.w3.org/2010/05/sintel/trailer.mp4");
  const [isError, setIsError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newUrl, setNewUrl] = useState(url);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle Fullscreen
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      toast.error("Fullscreen failed");
    }
  };

  // Mock Recording
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      toast.success("Recording saved to gallery");
    } else {
      setIsRecording(true);
      toast.info("Recording started");
    }
  };

  // Mock Screenshot
  const takeScreenshot = () => {
    toast.success("Screenshot captured");
    // In a real app, we'd draw video frame to canvas and save
  };

  const handleSaveSettings = () => {
    setUrl(newUrl);
    setShowSettings(false);
    setIsError(false);
    toast.success("Stream source updated");
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full bg-zinc-950 flex items-center justify-center overflow-hidden group",
        isFullscreen ? "fixed inset-0 z-[2000]" : "rounded-lg",
        className
      )}
    >
      {/* Video Feed */}
      {!isError ? (
        <video
          ref={videoRef}
          src={url}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setIsError(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-500",
            showSettings ? "opacity-30 blur-sm" : "opacity-90"
          )}
        />
      ) : (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <VideoOff className="w-8 h-8 opacity-50" />
          <span className="text-xs font-mono uppercase tracking-widest">Signal Lost</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsError(false)}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <Settings className="w-3 h-3" /> Config
            </button>
          </div>
        </div>
      )}

      {/* Recording Indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-full backdrop-blur-md"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-100">REC 00:04</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Overlay (Hover) */}
      <div className={cn(
        "absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-transform duration-300 flex items-center justify-between",
        !showSettings ? "translate-y-full group-hover:translate-y-0" : "translate-y-full"
      )}>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleRecording}
            className={cn(
              "p-2 rounded-full transition-all hover:scale-110",
              isRecording ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
            )}
            title={isRecording ? "Stop Recording" : "Start Recording"}
          >
            {isRecording ? <Circle className="w-4 h-4 fill-current" /> : <Circle className="w-4 h-4" />}
          </button>
          <button
            onClick={takeScreenshot}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all hover:scale-110"
            title="Take Screenshot"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all hover:scale-110"
            title="Stream Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all hover:scale-110"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          >
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Stream Config</span>
                <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-zinc-500 font-semibold">Source URL</label>
                  <input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="rtsp://..."
                  />
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crosshair Overlay (Only visible when not in settings) */}
      {!showSettings && !isError && (
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-white/30 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white/60 rounded-full" />

          <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-white/30" />
          <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-white/30" />
          <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-white/30" />
          <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-white/30" />
        </div>
      )}
    </div>
  );
}
