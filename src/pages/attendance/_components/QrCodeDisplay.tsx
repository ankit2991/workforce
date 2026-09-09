import { useState, useEffect, useRef, useCallback } from "react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import QRCode from "qrcode";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import { QrCode, RefreshCw, MapPin, Timer, Maximize2 } from "lucide-react";

const WINDOW_SECONDS = 30;
const WINDOW_MS = WINDOW_SECONDS * 1000;

/** Get the current 30-second window number (matches server logic). */
function currentWindow(): number {
  return Math.floor(Date.now() / WINDOW_MS);
}

/** Milliseconds until the current window expires. */
function msUntilExpiry(): number {
  return (currentWindow() + 1) * WINDOW_MS - Date.now();
}

/** Build the clock-in URL that the QR encodes. */
function buildQrUrl(origin: string, siteId: string, w: number): string {
  return `${origin}/clock?site=${encodeURIComponent(siteId)}&w=${w}`;
}

/**
 * Displays an auto-refreshing QR code for a given site.
 * The window rotates every 30 seconds, computed client-side so the
 * QR always stays fresh without depending on a reactive server query.
 */
export default function QrCodeDisplay({ siteId, siteName }: { siteId: Id<"sites">; siteName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [window, setWindow] = useState(currentWindow);
  const [countdown, setCountdown] = useState(() => Math.ceil(msUntilExpiry() / 1000));
  const [fullscreen, setFullscreen] = useState(false);

  // Tick every second: update countdown and rotate window when it expires
  useEffect(() => {
    const interval = setInterval(() => {
      const now = currentWindow();
      const secs = Math.max(0, Math.ceil(msUntilExpiry() / 1000));
      setCountdown(secs);
      setWindow((prev) => (now !== prev ? now : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Render QR on canvas whenever window or fullscreen changes
  const renderQr = useCallback(() => {
    if (!canvasRef.current) return;
    const origin = globalThis.location?.origin ?? "";
    const url = buildQrUrl(origin, siteId, window);
    QRCode.toCanvas(canvasRef.current, url, {
      width: fullscreen ? 400 : 280,
      margin: 2,
      color: { dark: "#1a1a2e", light: "#ffffff" },
      errorCorrectionLevel: "H",
    });
  }, [siteId, window, fullscreen]);

  useEffect(() => {
    renderQr();
  }, [renderQr]);

  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-6 cursor-pointer"
        onClick={() => setFullscreen(false)}
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">{siteName}</h2>
          <p className="text-sm text-slate-500 mt-1">Scan to clock in</p>
        </div>
        <div className="rounded-3xl border-4 border-slate-200 p-4 bg-white shadow-2xl">
          <canvas ref={canvasRef} />
        </div>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
            countdown <= 5 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700",
          )}>
            <Timer size={14} />
            Refreshes in {countdown}s
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
            <RefreshCw size={14} className="animate-spin" style={{ animationDuration: "3s" }} />
            Auto-rotating
          </div>
        </div>
        <p className="text-xs text-slate-400">Tap anywhere to exit fullscreen</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <QrCode size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{siteName}</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={10} /> Site QR Code
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn(
            "border-0 text-[10px]",
            countdown <= 5
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
          )}>
            <Timer size={10} className="mr-1" />
            {countdown}s
          </Badge>
          <button
            onClick={() => setFullscreen(true)}
            className="w-7 h-7 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
            title="Fullscreen"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="rounded-2xl border-2 border-dashed border-muted p-3 bg-white">
          <canvas ref={canvasRef} />
        </div>
      </div>

      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground">
          Workers scan this code to clock in/out
        </p>
        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground/70">
          <RefreshCw size={10} className="animate-spin" style={{ animationDuration: "3s" }} />
          Auto-refreshes every 30 seconds for security
        </div>
      </div>
    </div>
  );
}
