import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { motion } from "motion/react";
import { format } from "date-fns";
import {
  Clock, CheckCircle2, XCircle, ScanLine,
  LogIn, LogOut, RefreshCw, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";

// ── Parse QR data ─────────────────────────────────────────────────────────
// Handles both URL-based and legacy JSON-based QR codes.

type QrPayload = { siteId: string; window: number };

function parseQrData(data: string): QrPayload | null {
  // Try URL format: /clock?site=SITE_ID&w=WINDOW
  try {
    const url = new URL(data);
    const siteId = url.searchParams.get("site") ?? url.searchParams.get("clockin");
    const w = url.searchParams.get("w");
    if (siteId && w) {
      return { siteId, window: Number(w) };
    }
  } catch {
    // Not a URL, try JSON
  }

  // Try JSON format: {"type":"wfp_attendance","siteId":"...","window":123}
  try {
    const parsed = JSON.parse(data);
    if (parsed.type === "wfp_attendance" && parsed.siteId && parsed.window != null) {
      return { siteId: parsed.siteId, window: parsed.window };
    }
  } catch {
    // Not valid JSON either
  }

  return null;
}

// ── QR Scanner using native getUserMedia + jsQR ──────────────────────────
// Works reliably on iOS PWA standalone mode (unlike html5-qrcode which
// leaves a black screen). Uses a plain <video> element for the camera feed
// and scans frames with jsQR on a canvas.

function QrScanner({ onResult, onClose }: { onResult: (data: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start camera and scanning loop
  useEffect(() => {
    let animFrameId = 0;
    scanningRef.current = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // iOS requires explicit play after setting srcObject in standalone mode
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.setAttribute("autoplay", "true");
          await videoRef.current.play();
          setReady(true);
        }

        // Scan loop
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d", { willReadFrequently: true });

        const scan = () => {
          if (!scanningRef.current || !videoRef.current || !canvas || !ctx) return;

          const video = videoRef.current;
          if (video.readyState >= video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (code?.data) {
              stopCamera();
              onResult(code.data);
              return;
            }
          }
          animFrameId = requestAnimationFrame(scan);
        };

        animFrameId = requestAnimationFrame(scan);
      } catch (err) {
        const msg = String(err);
        if (msg.includes("NotAllowed") || msg.includes("Permission")) {
          setError("Camera permission denied. Go to Settings > Safari > Camera and allow access.");
        } else {
          setError("Could not start camera. Make sure no other app is using it.");
        }
      }
    };

    start();

    return () => {
      scanningRef.current = false;
      cancelAnimationFrame(animFrameId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [onResult, stopCamera]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {error ? (
        <div className="text-center space-y-3 py-8">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mx-auto flex items-center justify-center">
            <XCircle size={28} className="text-red-500" />
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 max-w-xs">{error}</p>
          <Button size="sm" variant="secondary" onClick={handleClose}>Close</Button>
        </div>
      ) : (
        <>
          <div className="relative rounded-2xl overflow-hidden border-2 border-blue-500/30 w-full max-w-[300px] aspect-square bg-black">
            {/* Camera feed */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: "scaleX(1)" }}
            />
            {/* Hidden canvas for frame processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Loading state before camera is ready */}
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw size={24} className="text-blue-400 animate-spin" />
              </div>
            )}

            {/* Scanning overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <motion.div
                className="w-[220px] h-[220px] border-2 border-blue-400 rounded-xl"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" as const }}
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center">
            Point your camera at the site QR code
          </p>
          <Button size="sm" variant="secondary" onClick={handleClose} className="gap-1.5">
            <XCircle size={14} /> Cancel
          </Button>
        </>
      )}
    </div>
  );
}

// ── Today's Status Card ───────────────────────────────────────────────────

function TodayStatusCard({ attendance }: { attendance: Doc<"attendance"> | null | undefined }) {
  const fmtTime = (iso: string | undefined) => {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  if (attendance === undefined) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 p-4 animate-pulse h-24" />
    );
  }

  if (!attendance || !attendance.clockInTime) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <Clock size={20} className="text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Not clocked in</p>
            <p className="text-xs text-slate-400">Scan the QR code at your site to clock in</p>
          </div>
        </div>
      </div>
    );
  }

  const clockedOut = !!attendance.clockOutTime;

  return (
    <div className={cn(
      "rounded-2xl border p-4",
      clockedOut
        ? "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800"
        : "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800",
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            clockedOut ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-blue-100 dark:bg-blue-900/30",
          )}>
            {clockedOut
              ? <CheckCircle2 size={20} className="text-emerald-600" />
              : <Clock size={20} className="text-blue-600" />
            }
          </div>
          <div>
            <p className="text-sm font-semibold">
              {clockedOut ? "Shift Complete" : "Currently Working"}
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              <span className="flex items-center gap-1">
                <LogIn size={10} className="text-green-500" />
                In: {fmtTime(attendance.clockInTime)}
              </span>
              {attendance.clockOutTime && (
                <span className="flex items-center gap-1">
                  <LogOut size={10} className="text-red-500" />
                  Out: {fmtTime(attendance.clockOutTime)}
                </span>
              )}
            </div>
          </div>
        </div>
        {clockedOut && attendance.hoursWorked != null && (
          <div className="text-right">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{attendance.hoursWorked}h</p>
            <p className="text-[10px] text-slate-400">worked</p>
          </div>
        )}
      </div>

      {attendance.verified && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={10} /> Verified by admin
        </div>
      )}
    </div>
  );
}

// ── Main Attendance Tab ───────────────────────────────────────────────────

export default function AttendanceTab() {
  const [scanning, setScanning] = useState(false);
  const todayAttendance = useQuery(api.attendance.getMyTodayAttendance, {});
  const myAttendance = useQuery(api.workerPortal.getMyAttendance, {});
  const clockIn = useMutation(api.attendance.clockIn);
  const clockOutMut = useMutation(api.attendance.clockOut);
  const [processing, setProcessing] = useState(false);

  // Process clock-in/out with parsed QR payload
  const processClockAction = useCallback(async (payload: QrPayload) => {
    setProcessing(true);
    try {
      const siteId = payload.siteId as Id<"sites">;
      if (!todayAttendance?.clockInTime) {
        const result = await clockIn({ siteId, qrWindow: payload.window });
        toast.success(`Clocked in at ${new Date(result.clockInTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}!`);
      } else if (!todayAttendance?.clockOutTime) {
        const result = await clockOutMut({ siteId, qrWindow: payload.window });
        toast.success(`Clocked out! Worked ${result.hoursWorked} hours.`);
      } else {
        toast.info("You have already clocked in and out today.");
      }
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Failed to process attendance.");
      }
    } finally {
      setProcessing(false);
    }
  }, [todayAttendance, clockIn, clockOutMut]);

  const handleScanResult = useCallback(async (data: string) => {
    setScanning(false);
    const payload = parseQrData(data);
    if (!payload) {
      toast.error("Invalid QR code. Please scan a WorkForce Pro attendance code.");
      return;
    }
    await processClockAction(payload);
  }, [processClockAction]);

  const handleClockOut = async () => {
    setProcessing(true);
    try {
      const result = await clockOutMut({});
      toast.success(`Clocked out! Worked ${result.hoursWorked} hours.`);
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Failed to clock out.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const canClockIn = !todayAttendance?.clockInTime;
  const canClockOut = !!todayAttendance?.clockInTime && !todayAttendance?.clockOutTime;
  const done = !!todayAttendance?.clockOutTime;

  const fmtTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }); } catch { return iso; }
  };

  return (
    <div className="space-y-5">
      {/* Today's status */}
      <TodayStatusCard attendance={todayAttendance} />

      {/* Actions */}
      {scanning ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <QrScanner onResult={handleScanResult} onClose={() => setScanning(false)} />
        </motion.div>
      ) : processing ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <RefreshCw size={24} className="text-blue-500 animate-spin" />
          <p className="text-sm text-slate-400">Processing…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {canClockIn && (
            <button
              onClick={() => setScanning(true)}
              className="w-full rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4 flex items-center gap-3 hover:from-blue-700 hover:to-blue-800 transition-all cursor-pointer shadow-lg shadow-blue-600/20"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <ScanLine size={24} />
              </div>
              <div className="text-left">
                <p className="font-bold text-base">Scan to Clock In</p>
                <p className="text-xs text-blue-200">Open camera and scan the site QR code</p>
              </div>
            </button>
          )}

          {canClockOut && (
            <>
              <button
                onClick={() => setScanning(true)}
                className="w-full rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white p-4 flex items-center gap-3 hover:from-red-600 hover:to-red-700 transition-all cursor-pointer shadow-lg shadow-red-500/20"
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <ScanLine size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-base">Scan to Clock Out</p>
                  <p className="text-xs text-red-200">Scan the site QR code to end your shift</p>
                </div>
              </button>
              <button
                onClick={handleClockOut}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-card p-3 flex items-center gap-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <LogOut size={16} className="text-red-500" />
                <span className="text-sm font-medium">Clock Out Without QR</span>
              </button>
            </>
          )}

          {done && (
            <div className="text-center text-sm text-slate-400 py-4">
              You{"'"}ve completed your shift for today.
            </div>
          )}
        </div>
      )}

      {/* Recent attendance */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Calendar size={14} /> Recent Attendance
          </h3>
        </div>

        {myAttendance === undefined ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : myAttendance.length === 0 ? (
          <div className="text-center text-sm text-slate-400 py-6">No attendance records yet</div>
        ) : (
          <div className="space-y-2">
            {myAttendance.slice(0, 7).map((record) => (
              <div
                key={record._id}
                className="rounded-xl border bg-card p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    record.clockInTime
                      ? record.clockOutTime
                        ? "bg-emerald-100 dark:bg-emerald-900/20"
                        : "bg-blue-100 dark:bg-blue-900/20"
                      : "bg-slate-100 dark:bg-slate-800",
                  )}>
                    {record.clockInTime
                      ? record.clockOutTime
                        ? <CheckCircle2 size={14} className="text-emerald-600" />
                        : <Clock size={14} className="text-blue-600" />
                      : <Calendar size={14} className="text-slate-400" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {(() => { try { return format(new Date(record.date + "T00:00:00"), "EEE, d MMM"); } catch { return record.date; } })()}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      {record.clockInTime && (
                        <span>In: {fmtTime(record.clockInTime)}</span>
                      )}
                      {record.clockOutTime && (
                        <span>Out: {fmtTime(record.clockOutTime)}</span>
                      )}
                      {!record.clockInTime && (
                        <span className="capitalize">{record.status.replace(/_/g, " ")}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {record.hoursWorked != null && record.hoursWorked > 0 && (
                    <p className="text-sm font-semibold">{record.hoursWorked}h</p>
                  )}
                  {record.verified && (
                    <span className="text-[10px] text-emerald-500 flex items-center gap-0.5 justify-end">
                      <CheckCircle2 size={8} /> Verified
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
