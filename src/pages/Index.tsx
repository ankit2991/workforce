import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Wallet, LayoutDashboard, ArrowRight, Shield, Smartphone,
  TrendingUp, Globe, ShoppingBag, Gamepad2,
} from "lucide-react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useAuth } from "@/hooks/use-auth.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";

const FEATURES = [
  { icon: <TrendingUp size={20} />, title: "Salary Advances", desc: "Instant access to earned wages" },
  { icon: <Globe size={20} />, title: "Remittance", desc: "Send money home with low fees" },
  { icon: <ShoppingBag size={20} />, title: "Marketplace", desc: "Shop using your wallet balance" },
  { icon: <Gamepad2 size={20} />, title: "iGaming", desc: "Play and win from your wallet" },
];

function PortalCard() {
  const navigate = useNavigate();
  const { signinRedirect } = useAuth();

  const handleClick = () => {
    sessionStorage.setItem("auth_redirect", "/portal");
    signinRedirect();
  };

  return (
    <Unauthenticated>
      <button onClick={handleClick} className="group text-left w-full cursor-pointer">
        <PortalCardInner />
      </button>
    </Unauthenticated>
  );
}

function PortalCardAuth() {
  return (
    <Authenticated>
      <Link to="/portal" className="group">
        <PortalCardInner />
      </Link>
    </Authenticated>
  );
}

function PortalCardInner() {
  return (
    <div className="relative rounded-2xl p-6 overflow-hidden text-white transition-transform group-hover:scale-[1.02]"
      style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0f4c75 50%, #1b6ca8 100%)" }}>
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
            <Smartphone size={22} />
          </div>
          <ArrowRight size={18} className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </div>
        <h2 className="font-bold text-xl font-serif">Worker Portal</h2>
        <p className="text-blue-200 text-sm mt-1 leading-relaxed">
          Check your balance, request advances, send money home, and shop — all from your phone.
        </p>
      </div>
    </div>
  );
}

function DashboardCard() {
  const { signinRedirect } = useAuth();

  const handleClick = () => {
    sessionStorage.setItem("auth_redirect", "/dashboard");
    signinRedirect();
  };

  return (
    <Unauthenticated>
      <button onClick={handleClick} className="group text-left w-full cursor-pointer">
        <DashboardCardInner />
      </button>
    </Unauthenticated>
  );
}

function DashboardCardAuth() {
  return (
    <Authenticated>
      <Link to="/dashboard" className="group">
        <DashboardCardInner />
      </Link>
    </Authenticated>
  );
}

function DashboardCardInner() {
  return (
    <div className="relative rounded-2xl p-6 overflow-hidden border-2 border-border bg-card transition-all group-hover:border-primary/30 group-hover:scale-[1.02]">
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-primary/5" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <LayoutDashboard size={22} className="text-primary" />
          </div>
          <ArrowRight size={18} className="text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-1 transition-all" />
        </div>
        <h2 className="font-bold text-xl font-serif text-foreground">Admin Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
          Manage agencies, workers, payroll, attendance, and operations from a single command center.
        </p>
      </div>
    </div>
  );
}

export default function Index() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
              <Wallet size={17} className="text-white" />
            </div>
            <span className="font-bold text-lg font-serif tracking-tight">WorkForce Pro</span>
          </div>
          <AuthLoading>
            <Skeleton className="h-9 w-20 rounded-lg" />
          </AuthLoading>
          <Authenticated>
            <div className="flex items-center gap-3">
              <Link
                to="/portal"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Portal
              </Link>
              <Link
                to="/dashboard"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </Authenticated>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-b from-blue-600/8 via-amber-500/5 to-transparent blur-3xl dark:from-blue-600/15 dark:via-amber-500/8" />
          </div>

          <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" as const }}
              className="text-center max-w-2xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <Shield size={13} />
                Enterprise Workforce Platform
              </div>
              <h1 className="text-4xl md:text-5xl font-bold font-serif tracking-tight leading-tight text-balance">
                Manage your workforce,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600">
                  empower your workers
                </span>
              </h1>
              <p className="text-muted-foreground text-lg mt-5 leading-relaxed max-w-lg mx-auto text-balance">
                Payroll, advances, remittance, marketplace, and more — all in one platform built for agencies and their teams.
              </p>
            </motion.div>

            {/* CTA cards */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" as const }}
              className="grid md:grid-cols-2 gap-4 mt-12 max-w-2xl mx-auto"
            >
              {/* Worker Portal Card */}
              <div>
                <PortalCard />
                <PortalCardAuth />
                <AuthLoading>
                  <Skeleton className="h-48 rounded-2xl" />
                </AuthLoading>
              </div>

              {/* Admin Dashboard Card */}
              <div>
                <DashboardCard />
                <DashboardCardAuth />
                <AuthLoading>
                  <Skeleton className="h-48 rounded-2xl" />
                </AuthLoading>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/30">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">Platform Features</p>
              <h2 className="text-2xl md:text-3xl font-bold font-serif mt-2">Everything your workforce needs</h2>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.08, ease: "easeOut" as const }}
                  className="bg-card border rounded-2xl p-5 text-center"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
                    {f.icon}
                  </div>
                  <p className="font-semibold text-sm mt-3">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-card">
          <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                <Wallet size={13} className="text-white" />
              </div>
              <span className="font-bold text-sm font-serif">WorkForce Pro</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {"\u00A9"} {new Date().getFullYear()} WorkForce Pro. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
