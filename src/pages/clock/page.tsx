/**
 * /clock — Lightweight QR clock-in/out page
 * Loads fast with minimal queries. Reached when a worker scans the site QR code.
 */
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useAuth } from "@/hooks/use-auth.ts";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  CheckCircle2, XCircle, RefreshCw, Clock, LogIn, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

type ClockResult =
  | { status: "loading" }
  | { status: "success"; message: string; time: string }
  | { status: "error"; message: string }
  | { status: "already_done" };

function ClockInner() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const siteId = params.get("site") as Id<"sites"> | null;
  const qrWindow = Number(params.get("w") ?? "0");
  const clockInMut = useMutation(api.attendance.clockIn);
  const clockOutMut = useMutation(api.attendance.clockOut);
  const todayAttendance = useQuery(api.attendance.getMyTodayAttendance, {});
  const [result, setResult] = useState<ClockResult>({ status: "loading" });
  const processed = useRef(false);

  useEffect(() => {
    if (!siteId || !qrWindow || todayAttendance === undefined || processed.current) return;
    processed.current = true;

    const run = async () => {
      try {
        if (!todayAttendance?.clockInTime) {
          const res = await clockInMut({ siteId, qrWindow });
          const time = new Date(res.clockInTime).toLocaleTimeString(undefined, {
            hour: "2-digit", minute: "2-digit",
          });
          setResult({ status: "success", message: "Clocked In!", time });
        } else if (!todayAttendance?.clockOutTime) {
          const res = await clockOutMut({ siteId, qrWindow });
          setResult({
            status: "success",
            message: `Clocked Out — ${res.hoursWorked}h worked`,
            time: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
          });
        } else {
          setResult({ status: "already_done" });
        }
      } catch (err) {
        const msg = err instanceof ConvexError
          ? (err.data as { message: string }).message
          : "Failed to process. Please try again.";
        setResult({ status: "error", message: msg });
      }
    };

    run();
  }, [siteId, qrWindow, todayAttendance, clockInMut, clockOutMut]);

  if (!siteId || !qrWindow) {
    return (
      <StatusCard
        icon={<XCircle size={32} className="text-red-500" />}
        bg="from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-950/20"
        title="Invalid QR Code"
        subtitle="This link is missing clock-in data."
        action={<Button size="sm" onClick={() => navigate("/")}>Open WorkForce Pro</Button>}
      />
    );
  }

  if (result.status === "loading") {
    return (
      <StatusCard
        icon={<RefreshCw size={32} className="text-blue-500 animate-spin" />}
        bg="from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
        title="Processing…"
        subtitle="Recording your attendance"
      />
    );
  }

  if (result.status === "success") {
    return (
      <StatusCard
        icon={<CheckCircle2 size={32} className="text-emerald-500" />}
        bg="from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20"
        title={result.message}
        subtitle={result.time}
        action={<Button size="sm" onClick={() => navigate("/")}>Open Portal</Button>}
      />
    );
  }

  if (result.status === "already_done") {
    return (
      <StatusCard
        icon={<Clock size={32} className="text-amber-500" />}
        bg="from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20"
        title="Already Done"
        subtitle="You've already clocked in and out today."
        action={<Button size="sm" onClick={() => navigate("/")}>Open Portal</Button>}
      />
    );
  }

  return (
    <StatusCard
      icon={<XCircle size={32} className="text-red-500" />}
      bg="from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-950/20"
      title="Error"
      subtitle={result.message}
      action={<Button size="sm" onClick={() => navigate("/")}>Open Portal</Button>}
    />
  );
}

function StatusCard({
  icon, bg, title, subtitle, action,
}: {
  icon: React.ReactNode;
  bg: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`rounded-3xl bg-gradient-to-br ${bg} border p-8 text-center space-y-4 mx-4`}>
      <div className="flex justify-center">{icon}</div>
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function SignInPrompt() {
  const { signinRedirect } = useAuth();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
        <Wallet size={28} className="text-white" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold">Sign in to Clock In</h1>
        <p className="text-sm text-muted-foreground">You need to be logged in to record attendance</p>
      </div>
      <Button
        className="w-full max-w-xs h-12 rounded-2xl"
        onClick={() => {
          // Save the current clock URL so we return here after sign-in
          sessionStorage.setItem("auth_redirect", window.location.pathname + window.location.search);
          signinRedirect();
        }}
      >
        <LogIn size={16} className="mr-2" /> Log In / Sign Up
      </Button>
    </div>
  );
}

export default function ClockPage() {
  return (
    <div className="h-dvh bg-background flex flex-col items-center justify-center max-w-lg mx-auto">
      <AuthLoading>
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={24} className="text-blue-500 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <SignInPrompt />
      </Unauthenticated>
      <Authenticated>
        <ClockInner />
      </Authenticated>
    </div>
  );
}
