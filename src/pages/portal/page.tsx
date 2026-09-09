/**
 * Worker Self-Service Portal — /portal
 * A standalone consumer-facing personal finance app.
 * Completely separate from the admin dashboard.
 * Any signed-in user can access it to see their own wages, wallet, and requests.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import GameLobby from "./_components/GameLobby.tsx";
import AttendanceTab from "./_components/AttendanceTab.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useAuth } from "@/hooks/use-auth.ts";
import { usePwaInstall } from "@/hooks/use-pwa-install.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { motion, AnimatePresence } from "motion/react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Home, Wallet, ShoppingBag, Bell, User, TrendingUp, ArrowUpFromLine,
  Send, Eye, EyeOff, RefreshCw, ChevronRight, ArrowLeft, LogOut,
  CheckCircle2, XCircle, AlertTriangle, Info, Package, Globe,
  DollarSign, Clock, BadgeCheck, ArrowDownToLine, Banknote, Gamepad2,
  BarChart3, ExternalLink, Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtMoney(n: number, currency = "MYR") {
  return new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d: string) {
  try { return format(new Date(d), "d MMM yyyy"); } catch { return d; }
}

function ago(d: string) {
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return d; }
}

const STATUS_COLOR: Record<string, string> = {
  pending:   "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
  approved:  "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
  rejected:  "text-red-600 bg-red-50 dark:bg-red-900/20",
  disbursed: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
  repaid:    "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
  processed: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
  completed: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
  paid:      "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
  active:    "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
  failed:    "text-red-600 bg-red-50 dark:bg-red-900/20",
  cancelled: "text-slate-500 bg-slate-100 dark:bg-slate-800",
  pending_approval: "text-amber-600 bg-amber-50",
  processing: "text-blue-600 bg-blue-50",
};

function Pill({ status }: { status: string }) {
  return (
    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize", STATUS_COLOR[status] ?? "text-slate-500 bg-slate-100")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Not Linked State — multi-step registration form
// ─────────────────────────────────────────────────────────────────────────────

type RegistrationForm = {
  // Personal
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  phone: string;
  // Employment
  agencyId: string;
  jobTitle: string;
  department: string;
  employmentType: string;
  // Bank / Salary
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

const INITIAL_FORM: RegistrationForm = {
  firstName: "", lastName: "", dateOfBirth: "", gender: "", nationality: "", phone: "",
  agencyId: "", jobTitle: "", department: "", employmentType: "full_time",
  bankName: "", bankAccountNumber: "", bankAccountName: "",
};

const STEPS = ["Personal", "Employment", "Salary & Bank"] as const;

function NotLinked({ name }: { name: string }) {
  const autoRegister = useMutation(api.workerPortal.autoRegisterWorker);
  const agencies = useQuery(api.workerPortal.getActiveAgencies, {});
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RegistrationForm>(() => ({
    ...INITIAL_FORM,
    firstName: name,
  }));
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof RegistrationForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Validation per step
  const canNext = (() => {
    if (step === 0) return form.firstName.trim() !== "" && form.lastName.trim() !== "";
    if (step === 1) return form.agencyId !== "";
    return true; // bank details are optional
  })();

  const handleSubmit = async () => {
    if (!form.agencyId) return;
    setRegistering(true);
    setError(null);
    try {
      await autoRegister({
        agencyId: form.agencyId as Id<"agencies">,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        gender: (form.gender || undefined) as "male" | "female" | "other" | undefined,
        nationality: form.nationality || undefined,
        phone: form.phone || undefined,
        jobTitle: form.jobTitle || undefined,
        department: form.department || undefined,
        employmentType: (form.employmentType || undefined) as "full_time" | "part_time" | "contract" | "piece_work" | undefined,
        bankName: form.bankName || undefined,
        bankAccountNumber: form.bankAccountNumber || undefined,
        bankAccountName: form.bankAccountName || undefined,
      });
    } catch (err) {
      if (err instanceof ConvexError) {
        setError((err.data as { message: string }).message);
      } else {
        setError("Failed to set up your account. Please try again.");
      }
    } finally {
      setRegistering(false);
    }
  };

  if (registering) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-4">
        <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <RefreshCw size={36} className="text-blue-500 animate-spin" />
        </div>
        <div>
          <p className="font-bold text-lg">Setting up your account…</p>
          <p className="text-sm text-slate-500 mt-1">Just a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto px-5 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Wallet size={24} className="text-white" />
        </div>
        <h1 className="text-xl font-bold">Create Your Account</h1>
        <p className="text-sm text-slate-500 mt-1">Fill in your details to get started</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full h-1.5 rounded-full overflow-hidden bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-300", i <= step ? "bg-blue-600" : "bg-transparent")}
                style={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }}
              />
            </div>
            <span className={cn("text-[10px] font-medium", i <= step ? "text-blue-600" : "text-slate-400")}>{label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400 mb-4">
          {error}
        </div>
      )}

      {/* Step 0 — Personal */}
      {step === 0 && (
        <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <p className="font-semibold text-sm text-slate-500 uppercase tracking-wider">Personal Information</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">First Name <span className="text-red-500">*</span></Label>
              <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="John" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Last Name <span className="text-red-500">*</span></Label>
              <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Smith" className="rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Date of Birth</Label>
            <Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Gender</Label>
            <Select value={form.gender || "none"} onValueChange={(v) => set("gender", v === "none" ? "" : v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Prefer not to say</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nationality</Label>
            <Input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} placeholder="e.g. Malaysian" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Phone Number</Label>
            <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+60 12-345 6789" className="rounded-xl" />
          </div>
        </motion.div>
      )}

      {/* Step 1 — Employment */}
      {step === 1 && (
        <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <p className="font-semibold text-sm text-slate-500 uppercase tracking-wider">Employment Details</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Agency <span className="text-red-500">*</span></Label>
            {agencies === undefined ? (
              <div className="h-10 rounded-xl bg-muted animate-pulse" />
            ) : agencies.length === 0 ? (
              <p className="text-sm text-red-500">No agencies available. Contact your administrator.</p>
            ) : (
              <Select value={form.agencyId || "none"} onValueChange={(v) => set("agencyId", v === "none" ? "" : v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select your agency…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select your agency…</SelectItem>
                  {agencies.map((a) => (
                    <SelectItem key={a._id} value={a._id}>{a.name} ({a.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Job Title</Label>
            <Input value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} placeholder="e.g. Technician, Operator" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Department</Label>
            <Input value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="e.g. Production, IT" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Employment Type</Label>
            <Select value={form.employmentType} onValueChange={(v) => set("employmentType", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time">Full Time</SelectItem>
                <SelectItem value="part_time">Part Time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="piece_work">Piece Work</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      )}

      {/* Step 2 — Bank & Salary */}
      {step === 2 && (
        <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <p className="font-semibold text-sm text-slate-500 uppercase tracking-wider">Salary Bank Account</p>
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <span>This is where your salary and withdrawals will be sent. You can update this later in your profile.</span>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bank Name</Label>
            <Input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} placeholder="e.g. Maybank, CIMB, Public Bank" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Account Number</Label>
            <Input value={form.bankAccountNumber} onChange={(e) => set("bankAccountNumber", e.target.value)} placeholder="e.g. 1234567890" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Account Holder Name</Label>
            <Input value={form.bankAccountName} onChange={(e) => set("bankAccountName", e.target.value)} placeholder="e.g. John Smith" className="rounded-xl" />
          </div>
        </motion.div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 h-11 rounded-xl border border-input text-sm font-medium cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
            className={cn(
              "flex-1 h-11 rounded-xl text-sm font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5",
              canNext
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            Next <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={registering}
            className="flex-1 h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold cursor-pointer hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
          >
            {registering ? <RefreshCw size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
            {registering ? "Creating…" : "Complete Sign Up"}
          </button>
        )}
      </div>
    </div>
  );
}

// Estimate monthly salary from wage config
// Daily: rate × 26 working days, Hourly: rate × 8h × 26 days, Piece: rate × 26 days
const WORKING_DAYS_PER_MONTH = 26;
const HOURS_PER_DAY = 8;

type WageConfig = {
  rateType: "daily" | "hourly" | "piece" | "monthly";
  baseRate: number;
  currency: string;
  allowances: Array<{ name: string; amount: number }>;
  deductions: Array<{ name: string; amount: number }>;
};

function estimateMonthlySalary(config: WageConfig): number {
  let base = 0;
  if (config.rateType === "monthly") {
    base = config.baseRate;
  } else if (config.rateType === "daily") {
    base = config.baseRate * WORKING_DAYS_PER_MONTH;
  } else if (config.rateType === "hourly") {
    base = config.baseRate * HOURS_PER_DAY * WORKING_DAYS_PER_MONTH;
  } else {
    // piece rate — rough estimate
    base = config.baseRate * WORKING_DAYS_PER_MONTH;
  }
  const totalAllowances = config.allowances.reduce((sum, a) => sum + a.amount, 0);
  const totalDeductions = config.deductions.reduce((sum, d) => sum + d.amount, 0);
  return base + totalAllowances - totalDeductions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Balance Card
// ─────────────────────────────────────────────────────────────────────────────

function BalanceCard({
  wallet, profile, onNav, estimatedSalary,
}: {
  wallet: (Doc<"wallets"> & { available: number }) | null;
  profile: WorkerProfile;
  onNav: (t: Tab) => void;
  estimatedSalary?: { amount: number; currency: string; rateLabel: string } | null;
}) {
  const [hidden, setHidden] = useState(false);
  const currency = wallet?.currency ?? "MYR";
  const available = wallet?.available ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl overflow-hidden p-5 shadow-lg"
      style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #0f4c75 50%, #1b6ca8 100%)",
      }}
    >
      {/* decorative circles */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">Available Balance</p>
            <div className="flex items-baseline gap-2 mt-1">
              {hidden ? (
                <p className="text-3xl font-bold text-white tracking-tight">•••••••</p>
              ) : (
                <p className="text-3xl font-bold text-white tracking-tight">
                  <span className="text-lg text-blue-200 mr-1">{currency}</span>
                  {fmtMoney(available)}
                </p>
              )}
              <button onClick={() => setHidden(v => !v)} className="text-blue-300 hover:text-white cursor-pointer transition-colors">
                {hidden ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs">{profile.employeeId}</p>
            <p className="text-white text-sm font-semibold">{profile.firstName} {profile.lastName}</p>
          </div>
        </div>

        {wallet && (
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
            {[
              { label: "Earned", value: wallet.earned },
              { label: "Advances", value: wallet.advances },
              { label: "Withdrawn", value: wallet.withdrawn },
            ].map(item => (
              <div key={item.label} className="text-center">
                <p className="text-blue-200 text-[10px] uppercase tracking-wide">{item.label}</p>
                <p className="text-white text-sm font-semibold mt-0.5">{fmtMoney(item.value)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Expected monthly salary from wage config */}
        {estimatedSalary && estimatedSalary.amount > 0 && (
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/10">
            <div>
              <span className="text-blue-200 text-[10px] uppercase tracking-wide">Expected Monthly Salary</span>
              <span className="text-blue-300 text-[9px] ml-1">({estimatedSalary.rateLabel})</span>
            </div>
            <span className="text-white text-sm font-semibold">
              {estimatedSalary.currency} {fmtMoney(estimatedSalary.amount)}
            </span>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { icon: <TrendingUp size={18} />, label: "Advance", tab: "advances" as const },
            { icon: <ArrowUpFromLine size={18} />, label: "Withdraw", tab: "withdrawals" as const },
            { icon: <Send size={18} />, label: "Remit", tab: "remittance" as const },
          ].map(a => (
            <button
              key={a.tab}
              onClick={() => onNav(a.tab)}
              className="flex flex-col items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-2xl py-3 px-2 cursor-pointer transition-colors"
            >
              <div className="text-white">{a.icon}</div>
              <span className="text-white text-[11px] font-medium">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ad Banner (rotating promotional banners)
// ─────────────────────────────────────────────────────────────────────────────

const ADS = [
  {
    title: "Play & Win Big",
    body: "Top up your iGaming wallet and get 20% bonus on your first deposit!",
    cta: "Play Now",
    tab: "igaming" as const,
    image: "https://hercules-cdn.com/file_Oe7Db4SH6ZRyuqoG3CeM3F06",
    flash: true,
  },
  {
    title: "Send Money Home",
    body: "Zero fee on your first overseas remittance this month. Limited offer!",
    cta: "Send Now",
    tab: "remittance" as const,
    image: "https://hercules-cdn.com/file_LNTvSyLvwCLWPHUdgWeacLH1",
    flash: false,
  },
  {
    title: "Instant Salary Advance",
    body: "Need cash before payday? Get up to 40% of your salary instantly.",
    cta: "Apply Now",
    tab: "advances" as const,
    image: "https://hercules-cdn.com/file_RNk3sd3OG3USLQT2nD2A2rUd",
    flash: false,
  },
];

function AdBanner({ onNav }: { onNav: (t: Tab) => void }) {
  const [idx, setIdx] = useState(0);
  const ad = ADS[idx];

  // Auto-rotate every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => setIdx((prev) => (prev + 1) % ADS.length), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative">
      <motion.div
        key={idx}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" as const }}
        className="rounded-3xl text-white overflow-hidden relative min-h-[140px]"
      >
        {/* Background image */}
        <img
          src={ad.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20" />

        {/* Animated sparkles for iGaming banner */}
        {ad.flash && (
          <>
            <motion.div
              className="absolute top-5 right-10 w-2.5 h-2.5 rounded-full bg-yellow-300 shadow-[0_0_10px_3px_rgba(253,224,71,0.7)]"
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.3, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
            />
            <motion.div
              className="absolute top-12 right-24 w-2 h-2 rounded-full bg-pink-300 shadow-[0_0_8px_2px_rgba(249,168,212,0.6)]"
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8, delay: 0.3 }}
            />
            <motion.div
              className="absolute bottom-10 right-16 w-2 h-2 rounded-full bg-yellow-200 shadow-[0_0_8px_2px_rgba(254,240,138,0.6)]"
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.3, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.4, delay: 0.6 }}
            />
            <motion.div
              className="absolute top-16 left-[60%] w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_2px_rgba(255,255,255,0.7)]"
              animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1.5, 0.5] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 1, delay: 0.9 }}
            />
          </>
        )}

        {/* Content area */}
        <div className="relative z-10 p-5 flex flex-col justify-end min-h-[140px]">
          {ad.flash && (
            <motion.span
              className="bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg w-fit mb-3"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              Hot
            </motion.span>
          )}

          <p className="font-extrabold text-lg leading-tight tracking-tight drop-shadow-md">{ad.title}</p>
          <p className="text-white/80 text-xs mt-1 leading-relaxed max-w-[80%] drop-shadow-sm">{ad.body}</p>

          <motion.button
            onClick={() => onNav(ad.tab)}
            whileTap={{ scale: 0.95 }}
            className="mt-3 bg-white text-slate-900 text-xs font-bold px-5 py-2.5 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-shadow w-fit"
          >
            {ad.cta} →
          </motion.button>
        </div>
      </motion.div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-3">
        {ADS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={cn(
              "h-2 rounded-full transition-all cursor-pointer",
              i === idx ? "bg-foreground w-6" : "bg-muted-foreground/30 w-2",
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Monthly Wages Chart
// ─────────────────────────────────────────────────────────────────────────────

function MonthlyWages({ wages, currency }: {
  wages: Array<{ periodStart: string; netPay: number; status: string; currency: string }>;
  currency: string;
}) {
  // Build last 6 months from paid/approved wages
  const monthly = wages
    .filter(w => w.status === "paid" || w.status === "approved")
    .reduce<Record<string, number>>((acc, w) => {
      const month = w.periodStart.slice(0, 7); // "YYYY-MM"
      acc[month] = (acc[month] ?? 0) + w.netPay;
      return acc;
    }, {});

  const months = Object.keys(monthly).sort().slice(-6);
  if (months.length === 0) return null;

  const values = months.map(m => monthly[m]);
  const max = Math.max(...values);
  const total = values.reduce((a, b) => a + b, 0);
  const thisMonth = values[values.length - 1] ?? 0;

  const monthLabel = (m: string) => {
    const [, mm] = m.split("-");
    return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(mm) - 1] ?? mm;
  };

  return (
    <div className="bg-card border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">Monthly Wages</p>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">This month</p>
          <p className="text-sm font-bold text-emerald-600">{currency} {fmtMoney(thisMonth)}</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-2 h-20">
        {months.map((m, i) => {
          const pct = max > 0 ? (values[i] / max) * 100 : 0;
          const isLatest = i === months.length - 1;
          return (
            <div key={m} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: 56 }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(pct, 4)}%` }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: "easeOut" as const }}
                  className={cn("w-full rounded-t-lg", isLatest ? "bg-emerald-500" : "bg-emerald-200 dark:bg-emerald-900/40")}
                  style={{ height: `${Math.max(pct, 4)}%` }}
                />
              </div>
              <p className="text-[9px] text-slate-400">{monthLabel(m)}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1 border-t text-xs text-slate-400">
        <span>{months.length} months tracked</span>
        <span>Total: <strong className="text-foreground">{currency} {fmtMoney(total)}</strong></span>
      </div>
    </div>
  );
}


type WorkerProfile = {
  _id: Id<"workers">; _creationTime: number;
  employeeId: string; firstName: string; lastName: string;
  agencyId: Id<"agencies">; startDate: string;
  status: "active" | "inactive" | "suspended" | "terminated";
  employmentType: "full_time" | "part_time" | "contract" | "piece_work";
  createdBy: Id<"users">;
  dateOfBirth?: string; gender?: "male" | "female" | "other";
  nationality?: string; phone?: string; email?: string;
  branchId?: Id<"branches">; siteId?: Id<"sites">;
  jobTitle?: string; department?: string; endDate?: string;
  bankName?: string; bankAccountNumber?: string; bankAccountName?: string;
  expectedMonthlySalary?: number; salaryCurrency?: string;
  withdrawalFrequency?: "weekly" | "monthly";
  documents?: Array<{ type: string; name: string; storageId: string; uploadedAt: string }>;
  agencyName?: string; branchName?: string; siteName?: string;
};

function HomeTab({
  profile, wallet, onNav, estimatedSalary,
}: {
  profile: WorkerProfile;
  wallet: (Doc<"wallets"> & { available: number }) | null;
  onNav: (t: Tab) => void;
  estimatedSalary?: { amount: number; currency: string; rateLabel: string } | null;
}) {
  const ledger = useQuery(api.workerPortal.getMyLedger, { limit: 2 });
  const { canInstall, showSafariGuide, triggerInstall, dismiss } = usePwaInstall();

  return (
    <div className="space-y-3">
      <BalanceCard wallet={wallet} profile={profile} onNav={onNav} estimatedSalary={estimatedSalary} />

      {/* Ad Banner */}
      <AdBanner onNav={onNav} />

      {/* Install App prompt — Chrome/Edge native */}
      {canInstall && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <button
            onClick={triggerInstall}
            className="w-full flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-4 py-3 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Smartphone size={18} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">Install App</p>
              <p className="text-[11px] text-slate-500">Add to home screen for quick access</p>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>
          <button onClick={dismiss} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <XCircle size={14} />
          </button>
        </motion.div>
      )}

      {/* Install App guide — Safari/iOS (no native prompt) */}
      {showSafariGuide && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-4 py-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Smartphone size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Install App</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Tap the <span className="inline-flex items-center"><ExternalLink size={11} className="mx-0.5" /></span> <strong>Share</strong> button below, then tap <strong>{"Add to Home Screen"}</strong>
              </p>
            </div>
          </div>
          <button onClick={dismiss} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <XCircle size={14} />
          </button>
        </motion.div>
      )}

      {/* Recent transactions — capped at 2 with See All */}
      <Section title="Recent Transactions" action={{ label: "See all", onClick: () => onNav("history") }}>
        {ledger === undefined ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-2xl" />)}</div>
        ) : ledger.length === 0 ? (
          <p className="text-xs text-slate-400 py-2 text-center">No transactions yet</p>
        ) : (
          <div className="space-y-1.5">
            {ledger.slice(0, 2).map(e => (
              <TxRow key={e._id} entry={e} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction History Tab (full ledger)
// ─────────────────────────────────────────────────────────────────────────────

function HistoryTab() {
  const ledger = useQuery(api.workerPortal.getMyLedger, { limit: 100 });

  if (ledger === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (ledger.length === 0) {
    return <p className="text-sm text-slate-400 py-8 text-center">No transactions yet</p>;
  }

  return (
    <div className="space-y-2">
      {ledger.map(e => (
        <TxRow key={e._id} entry={e} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Section component
// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, action, children }: {
  title: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-foreground">{title}</p>
        {action && (
          <button onClick={action.onClick} className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer flex items-center gap-0.5">
            {action.label} <ChevronRight size={12} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction Row
// ─────────────────────────────────────────────────────────────────────────────

type LedgerEntry = {
  _id: Id<"ledgerEntries">; entryType: string; description: string;
  date: string; amount: number; balanceAfter: number; currency: string;
};

const TX_META: Record<string, { icon: React.ReactNode; color: string }> = {
  wage_credit:       { icon: <ArrowDownToLine size={14} />, color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" },
  advance_credit:    { icon: <TrendingUp size={14} />,      color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600" },
  advance_repayment: { icon: <RefreshCw size={14} />,       color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600" },
  withdrawal:        { icon: <ArrowUpFromLine size={14} />, color: "bg-red-100 dark:bg-red-900/30 text-red-500" },
  marketplace_debit: { icon: <ShoppingBag size={14} />,     color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600" },
  remittance:        { icon: <Send size={14} />,            color: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600" },
  adjustment:        { icon: <DollarSign size={14} />,      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600" },
  wallet_fund:       { icon: <Banknote size={14} />,        color: "bg-teal-100 dark:bg-teal-900/30 text-teal-600" },
};

function TxRow({ entry }: { entry: LedgerEntry }) {
  const meta = TX_META[entry.entryType] ?? { icon: <DollarSign size={14} />, color: "bg-slate-100 text-slate-500" };
  const isCredit = entry.amount > 0;
  return (
    <div className="flex items-center gap-3 bg-card border rounded-2xl px-4 py-3">
      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", meta.color)}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{entry.description}</p>
        <p className="text-[11px] text-slate-400">{fmtDate(entry.date)}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={cn("font-bold text-sm", isCredit ? "text-emerald-600" : "text-red-500")}>
          {isCredit ? "+" : ""}{entry.currency} {fmtMoney(Math.abs(entry.amount))}
        </p>
        <p className="text-[10px] text-slate-400">{entry.currency} {fmtMoney(entry.balanceAfter)}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wallet Tab
// ─────────────────────────────────────────────────────────────────────────────

function WalletTab({ wallet }: { wallet: (Doc<"wallets"> & { available: number }) | null }) {
  const ledger = useQuery(api.workerPortal.getMyLedger, { limit: 100 });
  const currency = wallet?.currency ?? "MYR";

  return (
    <div className="space-y-4">
      {/* Summary pills */}
      {wallet && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Available", value: wallet.available, color: "text-blue-600" },
            { label: "Total Earned", value: wallet.earned, color: "text-emerald-600" },
            { label: "Advances", value: wallet.advances, color: "text-amber-600" },
            { label: "Spent", value: wallet.spent + wallet.withdrawn, color: "text-red-500" },
          ].map(item => (
            <div key={item.label} className="bg-card border rounded-2xl px-4 py-3">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">{item.label}</p>
              <p className={cn("font-bold text-base mt-0.5", item.color)}>{currency} {fmtMoney(item.value)}</p>
            </div>
          ))}
        </div>
      )}

      <Section title="All Transactions">
        {ledger === undefined ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
        ) : ledger.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No transactions yet</div>
        ) : (
          <div className="space-y-2">
            {ledger.map(e => <TxRow key={e._id} entry={e} />)}
          </div>
        )}
      </Section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Advances Tab
// ─────────────────────────────────────────────────────────────────────────────

function AdvancesTab({ wallet, estimatedSalary }: {
  wallet: (Doc<"wallets"> & { available: number }) | null;
  estimatedSalary?: { amount: number; currency: string; rateLabel: string } | null;
}) {
  const advances = useQuery(api.workerPortal.getMyAdvances, {});
  const requestAdvance = useMutation(api.workerPortal.requestAdvance);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const currency = wallet?.currency ?? "MYR";
  const hasPending = advances?.some(a => a.status === "pending");

  // 40% advance limit based on estimated monthly salary minus outstanding advances
  const advanceCap = estimatedSalary && estimatedSalary.amount > 0
    ? estimatedSalary.amount * 0.4
    : null;

  // Sum outstanding (non-rejected) advances minus repaid amounts
  const outstandingTotal = advances
    ? advances
        .filter(a => a.status !== "rejected")
        .reduce((sum, a) => {
          const repaid = "repaidAmount" in a && typeof a.repaidAmount === "number" ? a.repaidAmount : 0;
          return sum + (a.amount - repaid);
        }, 0)
    : 0;

  const advanceLimit = advanceCap !== null ? Math.max(0, advanceCap - outstandingTotal) : null;

  const currentAmt = parseFloat(amount) || 0;
  const exceedsLimit = advanceLimit !== null && currentAmt > advanceLimit;

  const submit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (advanceLimit !== null && amt > advanceLimit) {
      toast.error(`You have exceeded the advance limit. Remaining: ${currency} ${advanceLimit.toFixed(2)}`);
      return;
    }
    setLoading(true);
    try {
      await requestAdvance({ amount: amt, currency, reason: reason || undefined });
      toast.success("Advance request submitted");
      setOpen(false); setAmount(""); setReason("");
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Request failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {hasPending && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>You have a pending advance request. Wait for it to be processed before submitting a new one.</span>
        </div>
      )}

      {/* Big request button */}
      <button
        onClick={() => setOpen(true)}
        disabled={hasPending}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl py-4 flex items-center justify-center gap-2 font-semibold shadow-md cursor-pointer hover:opacity-90 transition-opacity"
      >
        <TrendingUp size={18} />
        Request Salary Advance
      </button>

      {wallet && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-slate-500">Available to advance</span>
          <span className="font-bold text-blue-700 dark:text-blue-400">{currency} {fmtMoney(wallet.available)}</span>
        </div>
      )}

      <Section title="Advance History">
        {advances === undefined ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
        ) : advances.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">No advances yet</div>
        ) : (
          <div className="space-y-2">
            {advances.map(a => (
              <div key={a._id} className="bg-card border rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={16} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{a.currency} {fmtMoney(a.amount)}</p>
                  {a.processingFee ? (
                    <p className="text-[11px] text-slate-400 truncate">Fee: {a.currency} {fmtMoney(a.processingFee)} · {fmtDate(a.requestedDate)}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 truncate">{a.reason ?? "No reason"} · {fmtDate(a.requestedDate)}</p>
                  )}
                </div>
                <Pill status={a.status} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-semibold">
              <TrendingUp size={18} className="text-amber-500" /> Salary Advance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-slate-500">Amount ({currency})</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" className={cn("mt-1 text-lg font-semibold h-12 rounded-xl", exceedsLimit && "border-red-500 focus-visible:ring-red-500")} />
              {exceedsLimit && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">You have exceeded the advance limit</p>
              )}
              {advanceLimit !== null && !exceedsLimit && (
                <p className="text-xs text-slate-400 mt-1">Remaining limit: {currency} {fmtMoney(advanceLimit)} (40% of salary minus advances)</p>
              )}
              {advanceLimit === null && wallet && (
                <p className="text-xs text-slate-400 mt-1">Max available: {currency} {fmtMoney(wallet.available)}</p>
              )}
            </div>

            {/* Processing fee breakdown */}
            {currentAmt > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Requested amount</span>
                  <span>{currency} {fmtMoney(currentAmt)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Processing fee (10%)</span>
                  <span className="text-red-500">- {currency} {fmtMoney(currentAmt * 0.1)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-foreground">
                  <span>You receive</span>
                  <span className="text-emerald-600">{currency} {fmtMoney(currentAmt * 0.9)}</span>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs text-slate-500">Reason (optional)</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Medical, family emergency…" className="mt-1 resize-none h-20 text-sm rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading} className="rounded-xl">Cancel</Button>
            <Button onClick={submit} disabled={loading || exceedsLimit} className="rounded-xl gap-1.5 bg-amber-500 hover:bg-amber-600 text-white">
              {loading && <RefreshCw size={12} className="animate-spin" />} Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Withdrawals Tab
// ─────────────────────────────────────────────────────────────────────────────

function WithdrawalsTab({
  wallet, profile,
}: {
  wallet: (Doc<"wallets"> & { available: number }) | null;
  profile: WorkerProfile;
}) {
  const withdrawals = useQuery(api.workerPortal.getMyWithdrawals, {});
  const requestWithdrawal = useMutation(api.workerPortal.requestWithdrawal);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const currency = wallet?.currency ?? "MYR";
  const freq = profile.withdrawalFrequency;
  const [form, setForm] = useState({
    amount: "",
    bankName: profile.bankName ?? "",
    bankAccountNumber: profile.bankAccountNumber ?? "",
    bankAccountName: profile.bankAccountName ?? "",
  });

  // Determine if withdrawal is allowed based on frequency
  const lastProcessedDate = withdrawals?.find(w => w.status !== "rejected")?.requestedDate;
  const canWithdraw = (() => {
    if (!freq || !lastProcessedDate) return true;
    const last = new Date(lastProcessedDate);
    const now = new Date();
    if (freq === "weekly") {
      const diff = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 7;
    }
    // monthly
    return now.getMonth() !== last.getMonth() || now.getFullYear() !== last.getFullYear();
  })();

  const nextDate = (() => {
    if (!freq || !lastProcessedDate || canWithdraw) return null;
    const last = new Date(lastProcessedDate);
    if (freq === "weekly") {
      const next = new Date(last.getTime() + 7 * 24 * 60 * 60 * 1000);
      return fmtDate(next.toISOString().split("T")[0]);
    }
    // monthly — next month 1st
    const next = new Date(last.getFullYear(), last.getMonth() + 1, 1);
    return fmtDate(next.toISOString().split("T")[0]);
  })();

  const submit = async () => {
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!form.bankName || !form.bankAccountNumber || !form.bankAccountName) { toast.error("Fill in all bank details"); return; }
    setLoading(true);
    try {
      await requestWithdrawal({ amount: amt, currency, bankName: form.bankName, bankAccountNumber: form.bankAccountNumber, bankAccountName: form.bankAccountName });
      toast.success("Withdrawal request submitted");
      setOpen(false);
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Request failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Withdrawal frequency badge */}
      {freq && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 rounded-2xl px-4 py-3 flex items-center gap-3">
          <Clock size={16} className="text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400 capitalize">{freq} Withdrawal</p>
            <p className="text-[11px] text-slate-500">
              {canWithdraw
                ? "You can request a withdrawal now"
                : `Next withdrawal available ${nextDate ?? "soon"}`}
            </p>
          </div>
        </div>
      )}

      {!canWithdraw && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>You've already made a withdrawal this {freq === "weekly" ? "week" : "month"}. Next available: {nextDate}.</span>
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        disabled={!canWithdraw}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl py-4 flex items-center justify-center gap-2 font-semibold shadow-md cursor-pointer hover:opacity-90 transition-opacity"
      >
        <ArrowUpFromLine size={18} />
        Request Withdrawal
      </button>

      {wallet && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-slate-500">Available to withdraw</span>
          <span className="font-bold text-blue-700 dark:text-blue-400">{currency} {fmtMoney(wallet.available)}</span>
        </div>
      )}

      <Section title="Withdrawal History">
        {withdrawals === undefined ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
        ) : withdrawals.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">No withdrawals yet</div>
        ) : (
          <div className="space-y-2">
            {withdrawals.map(w => (
              <div key={w._id} className="bg-card border rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <ArrowUpFromLine size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{w.currency} {fmtMoney(w.amount)}</p>
                  <p className="text-[11px] text-slate-400">{w.bankName} · {fmtDate(w.requestedDate)}</p>
                </div>
                <Pill status={w.status} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-semibold">
              <ArrowUpFromLine size={18} className="text-blue-600" /> Withdraw Funds
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {wallet && (
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl px-3 py-2 flex justify-between text-sm">
                <span className="text-slate-500">Available</span>
                <span className="font-bold text-blue-700">{currency} {fmtMoney(wallet.available)}</span>
              </div>
            )}
            <div>
              <Label className="text-xs text-slate-500">Amount ({currency})</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00" className="mt-1 text-lg font-semibold h-12 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Bank Name</Label>
              <Input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                placeholder="e.g. Maybank" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Account Number</Label>
              <Input value={form.bankAccountNumber} onChange={e => setForm(f => ({ ...f, bankAccountNumber: e.target.value }))}
                placeholder="e.g. 1234567890" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Account Holder Name</Label>
              <Input value={form.bankAccountName} onChange={e => setForm(f => ({ ...f, bankAccountName: e.target.value }))}
                placeholder="e.g. John Smith" className="mt-1 rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading} className="rounded-xl">Cancel</Button>
            <Button onClick={submit} disabled={loading} className="rounded-xl gap-1.5">
              {loading && <RefreshCw size={12} className="animate-spin" />} Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Remittance Tab
// ─────────────────────────────────────────────────────────────────────────────

const FX: Record<string, { rate: number; country: string }> = {
  PHP: { rate: 11.2,   country: "Philippines" },
  IDR: { rate: 3640,   country: "Indonesia" },
  VND: { rate: 8500,   country: "Vietnam" },
  BDT: { rate: 28.5,   country: "Bangladesh" },
  INR: { rate: 19.5,   country: "India" },
  PKR: { rate: 91.2,   country: "Pakistan" },
  LKR: { rate: 105.0,  country: "Sri Lanka" },
  MMK: { rate: 680,    country: "Myanmar" },
  NPR: { rate: 44.2,   country: "Nepal" },
  KHR: { rate: 1310,   country: "Cambodia" },
  SGD: { rate: 0.306,  country: "Singapore" },
  USD: { rate: 0.213,  country: "United States" },
  THB: { rate: 7.52,   country: "Thailand" },
};

function RemittanceTab({ wallet }: { wallet: (Doc<"wallets"> & { available: number }) | null }) {
  const remittances = useQuery(api.workerPortal.getMyRemittances, {});
  const requestRemittance = useMutation(api.workerPortal.requestRemittance);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const currency = wallet?.currency ?? "MYR";
  const [form, setForm] = useState({
    sendAmount: "", receiveCurrency: "PHP",
    recipientName: "", recipientPhone: "",
    transferMethod: "bank_transfer" as "bank_transfer" | "mobile_wallet" | "cash_pickup",
    bankName: "", accountNumber: "", accountName: "",
    purpose: "",
  });

  const fx = FX[form.receiveCurrency];
  const send = parseFloat(form.sendAmount) || 0;
  const fee = send > 0 ? Math.max(5, send * 0.02) : 0;
  const receive = send * (fx?.rate ?? 1);
  const total = send + fee;

  const submit = async () => {
    if (send <= 0) { toast.error("Enter a valid amount"); return; }
    if (!form.recipientName) { toast.error("Enter recipient name"); return; }
    setLoading(true);
    try {
      await requestRemittance({
        sendAmount: send, sendCurrency: currency,
        receiveAmount: receive, receiveCurrency: form.receiveCurrency,
        exchangeRate: fx?.rate ?? 1, transferFee: fee, totalDebit: total,
        recipientName: form.recipientName, recipientCountry: fx?.country ?? "",
        recipientPhone: form.recipientPhone || undefined,
        transferMethod: form.transferMethod,
        recipientBankName: form.bankName || undefined,
        recipientAccountNumber: form.accountNumber || undefined,
        recipientAccountName: form.accountName || undefined,
        purpose: form.purpose || undefined,
      });
      toast.success("Remittance request submitted");
      setOpen(false);
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Request failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl py-4 flex items-center justify-center gap-2 font-semibold shadow-md cursor-pointer hover:opacity-90 transition-opacity"
      >
        <Send size={18} /> Send Money Home
      </button>

      {wallet && (
        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900 rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-slate-500">Available to send</span>
          <span className="font-bold text-purple-700 dark:text-purple-400">{currency} {fmtMoney(wallet.available)}</span>
        </div>
      )}

      <Section title="Transfer History">
        {remittances === undefined ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
        ) : remittances.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">No transfers yet</div>
        ) : (
          <div className="space-y-2">
            {remittances.map(r => (
              <div key={r._id} className="bg-card border rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <Globe size={16} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">To {r.recipientName}</p>
                  <p className="text-[11px] text-slate-400">{r.sendCurrency} {fmtMoney(r.sendAmount)} → {r.receiveCurrency} {fmtMoney(r.receiveAmount)} · {fmtDate(r.requestedDate)}</p>
                </div>
                <Pill status={r.status} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-semibold">
              <Send size={18} className="text-purple-600" /> Send Remittance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Send ({currency})</Label>
                <Input type="number" value={form.sendAmount} onChange={e => setForm(f => ({ ...f, sendAmount: e.target.value }))}
                  placeholder="0.00" className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">To</Label>
                <Select value={form.receiveCurrency} onValueChange={v => setForm(f => ({ ...f, receiveCurrency: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FX).map(([code, { country }]) => (
                      <SelectItem key={code} value={code}>{code} — {country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {send > 0 && (
              <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between font-bold text-purple-700 dark:text-purple-400">
                  <span>Recipient gets</span>
                  <span>{form.receiveCurrency} {fmtMoney(receive)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Rate: 1 {currency} = {fx?.rate} {form.receiveCurrency}</span>
                  <span>Fee: {currency} {fmtMoney(fee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total deducted</span>
                  <span>{currency} {fmtMoney(total)}</span>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs text-slate-500">Recipient Name</Label>
              <Input value={form.recipientName} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))}
                placeholder="e.g. Maria Santos" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Phone (optional)</Label>
              <Input value={form.recipientPhone} onChange={e => setForm(f => ({ ...f, recipientPhone: e.target.value }))}
                placeholder="+63 9XX XXX XXXX" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Transfer Method</Label>
              <Select value={form.transferMethod} onValueChange={v => setForm(f => ({ ...f, transferMethod: v as typeof f.transferMethod }))}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_wallet">Mobile Wallet</SelectItem>
                  <SelectItem value="cash_pickup">Cash Pickup</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.transferMethod === "bank_transfer" && (
              <div className="space-y-2">
                <Input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="Bank name" className="rounded-xl text-sm" />
                <Input value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="Account number" className="rounded-xl text-sm" />
                <Input value={form.accountName} onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))} placeholder="Account holder name" className="rounded-xl text-sm" />
              </div>
            )}
            <div>
              <Label className="text-xs text-slate-500">Purpose (optional)</Label>
              <Input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                placeholder="Family support, education…" className="mt-1 rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading} className="rounded-xl">Cancel</Button>
            <Button onClick={submit} disabled={loading} className="rounded-xl gap-1.5 bg-purple-600 hover:bg-purple-700 text-white">
              {loading && <RefreshCw size={12} className="animate-spin" />} Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shop Tab
// ─────────────────────────────────────────────────────────────────────────────

function ShopTab({ wallet }: { wallet: (Doc<"wallets"> & { available: number }) | null }) {
  const products = useQuery(api.workerPortal.getMarketplaceProducts, {});
  const orders   = useQuery(api.workerPortal.getMyOrders, {});
  const placeOrder = useMutation(api.workerPortal.placeOrder);
  const [view, setView] = useState<"shop" | "orders">("shop");
  const [buying, setBuying] = useState<Doc<"marketplaceProducts"> | null>(null);
  const [qty, setQty] = useState("1");
  const [loading, setLoading] = useState(false);
  const currency = wallet?.currency ?? "MYR";

  const total = buying ? buying.price * (parseInt(qty) || 1) : 0;

  const submit = async () => {
    if (!buying) return;
    setLoading(true);
    try {
      await placeOrder({ productId: buying._id, quantity: parseInt(qty) || 1 });
      toast.success(`Order placed!`);
      setBuying(null);
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Order failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex bg-muted rounded-xl p-1">
        {(["shop", "orders"] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={cn("flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer capitalize", v === view ? "bg-background shadow-sm text-foreground" : "text-slate-400")}>
            {v === "shop" ? "Browse" : "My Orders"}
          </button>
        ))}
      </div>

      {view === "shop" ? (
        <>
          {wallet && (
            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900 rounded-2xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">Balance to spend</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">{currency} {fmtMoney(wallet.available)}</span>
            </div>
          )}
          {products === undefined ? (
            <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No products available</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {products.map(p => (
                <motion.div key={p._id} whileTap={{ scale: 0.97 }}
                  onClick={() => { setBuying(p); setQty("1"); }}
                  className="bg-card border rounded-2xl overflow-hidden cursor-pointer hover:border-primary/40 transition-colors">
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt={p.name} className="w-full h-28 object-cover" />
                    : <div className="w-full h-28 bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Package size={28} className="text-slate-300" /></div>}
                  <div className="p-3">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-sm font-bold text-emerald-600 mt-0.5">{p.currency} {fmtMoney(p.price)}</p>
                    {p.stock !== undefined && <p className="text-[10px] text-slate-400">{p.stock} left</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {orders === undefined ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No orders yet</div>
          ) : (
            <div className="space-y-2">
              {orders.map(o => (
                <div key={o._id} className="bg-card border rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag size={16} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{o.productName} ×{o.quantity}</p>
                    <p className="text-[11px] text-slate-400">{o.currency} {fmtMoney(o.totalAmount)} · {fmtDate(o.orderedDate)}</p>
                  </div>
                  <Pill status={o.status} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={!!buying} onOpenChange={() => setBuying(null)}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-semibold">
              <ShoppingBag size={18} className="text-emerald-600" /> Place Order
            </DialogTitle>
          </DialogHeader>
          {buying && (
            <div className="space-y-4 py-2">
              <div className="flex gap-3 items-center bg-slate-50 dark:bg-slate-800 rounded-2xl p-3">
                {buying.imageUrl
                  ? <img src={buying.imageUrl} className="w-14 h-14 rounded-xl object-cover" alt={buying.name} />
                  : <div className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center"><Package size={20} className="text-slate-400" /></div>}
                <div>
                  <p className="font-semibold">{buying.name}</p>
                  <p className="text-emerald-600 font-bold">{buying.currency} {fmtMoney(buying.price)}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Quantity</Label>
                <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className="mt-1 w-24 rounded-xl" />
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl px-3 py-2 flex justify-between text-sm">
                <span className="text-slate-500">Total</span>
                <span className="font-bold text-emerald-700">{buying.currency} {fmtMoney(total)}</span>
              </div>
              {wallet && wallet.available < total && (
                <p className="text-xs text-red-500 flex items-center gap-1"><XCircle size={12} /> Insufficient balance</p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setBuying(null)} disabled={loading} className="rounded-xl">Cancel</Button>
            <Button onClick={submit} disabled={loading || !buying || (wallet ? wallet.available < total : false)}
              className="rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading && <RefreshCw size={12} className="animate-spin" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications Tab
// ─────────────────────────────────────────────────────────────────────────────

function NotificationsTab() {
  const notifs = useQuery(api.workerPortal.getMyNotifications, {});
  const markRead = useMutation(api.notifications.markRead);

  const SEV: Record<string, React.ReactNode> = {
    info:    <Info size={14} className="text-blue-500" />,
    success: <CheckCircle2 size={14} className="text-emerald-500" />,
    warning: <AlertTriangle size={14} className="text-amber-500" />,
    error:   <XCircle size={14} className="text-red-500" />,
  };

  return (
    <div className="space-y-3">
      {notifs === undefined ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : notifs.length === 0 ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
          <Bell size={32} className="opacity-20" />
          <p className="text-sm">No notifications yet</p>
        </div>
      ) : (
        notifs.map(n => (
          <div key={n._id} onClick={() => { if (!n.read) markRead({ id: n._id }); }}
            className={cn("bg-card border rounded-2xl px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors hover:border-primary/30",
              !n.read && "border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/5")}>
            <div className="mt-0.5 flex-shrink-0">{SEV[n.severity] ?? SEV.info}</div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm leading-snug", !n.read ? "font-semibold" : "text-slate-600 dark:text-slate-400")}>{n.title}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.body}</p>
              <p className="text-[10px] text-slate-300 mt-1">{ago(n.createdAt)}</p>
            </div>
            {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
          </div>
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Tab
// ─────────────────────────────────────────────────────────────────────────────

function ProfileTab({ profile, estimatedSalary }: {
  profile: WorkerProfile;
  estimatedSalary?: { amount: number; currency: string; rateLabel: string } | null;
}) {
  const { signout } = useAuth();
  const wages = useQuery(api.workerPortal.getMyWages, {});

  const rows = [
    ["Employee ID",    profile.employeeId],
    ["Agency",         profile.agencyName ?? "—"],
    ["Branch",         profile.branchName ?? "—"],
    ["Job Title",      profile.jobTitle ?? "—"],
    ["Employment",     profile.employmentType.replace(/_/g, " ")],
    ["Start Date",     fmtDate(profile.startDate)],
    ["Expected Salary", estimatedSalary && estimatedSalary.amount > 0
      ? `${estimatedSalary.currency} ${fmtMoney(estimatedSalary.amount)}/mo`
      : "—"],
    ["Withdrawal",     profile.withdrawalFrequency ? `${profile.withdrawalFrequency.charAt(0).toUpperCase()}${profile.withdrawalFrequency.slice(1)}` : "—"],
    ["Nationality",    profile.nationality ?? "—"],
    ["Phone",          profile.phone ?? "—"],
    ["Email",          profile.email ?? "—"],
    ["Bank",           profile.bankName ? `${profile.bankName} ····${(profile.bankAccountNumber ?? "").slice(-4)}` : "—"],
  ];

  return (
    <div className="space-y-5">
      {/* Avatar header */}
      <div className="flex items-center gap-4 bg-card border rounded-2xl p-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {profile.firstName[0]}{profile.lastName[0]}
        </div>
        <div>
          <p className="font-bold text-lg">{profile.firstName} {profile.lastName}</p>
          <p className="text-sm text-slate-500">{profile.jobTitle ?? "Worker"}</p>
          <Pill status={profile.status} />
        </div>
      </div>

      {/* Details */}
      <div className="bg-card border rounded-2xl divide-y">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-slate-400">{label}</span>
            <span className="font-medium text-right max-w-[55%] truncate capitalize">{value}</span>
          </div>
        ))}
      </div>

      {/* Pay records */}
      {wages && wages.length > 0 && (
        <Section title="Pay Records">
          <div className="bg-card border rounded-2xl divide-y">
            {wages.slice(0, 6).map(w => (
              <div key={w._id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-slate-400">{w.periodStart} – {w.periodEnd}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{w.currency} {fmtMoney(w.netPay)}</span>
                  <Pill status={w.status} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Sign out */}
      <button
        onClick={() => signout()}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-200 dark:border-red-900 text-red-500 text-sm font-medium cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
      >
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// iGaming Tab (portal-embedded)
// ─────────────────────────────────────────────────────────────────────────────

function IgamingTab({ wallet }: { wallet: (Doc<"wallets"> & { available: number }) | null }) {
  const account      = useQuery(api.workerPortal.getMyIgamingAccount, {});
  const transactions = useQuery(api.workerPortal.getMyIgamingTransactions, { limit: 20 });
  const deposit      = useMutation(api.workerPortal.portalDeposit);
  const withdraw     = useMutation(api.workerPortal.portalWithdraw);

  const [depositOpen,  setDepositOpen]  = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [depAmt,       setDepAmt]       = useState("");
  const [witAmt,       setWitAmt]       = useState("");
  const [loading,      setLoading]      = useState(false);
  const [showHistory,  setShowHistory]  = useState(false);

  const currency  = wallet?.currency ?? "MYR";
  const igBalance = account?.balance ?? 0;

  const handleDeposit = async () => {
    const amt = parseFloat(depAmt);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    try {
      await deposit({ amount: amt, currency });
      toast.success(`Deposited ${currency} ${fmtMoney(amt)} to iGaming wallet`);
      setDepositOpen(false); setDepAmt("");
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Deposit failed");
    } finally { setLoading(false); }
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(witAmt);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    try {
      await withdraw({ amount: amt, currency });
      toast.success(`Withdrew ${currency} ${fmtMoney(amt)} to main wallet`);
      setWithdrawOpen(false); setWitAmt("");
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Withdrawal failed");
    } finally { setLoading(false); }
  };

  const TX_TYPE: Record<string, { label: string; color: string }> = {
    deposit:    { label: "Deposit",    color: "text-emerald-600" },
    withdrawal: { label: "Withdrawal", color: "text-red-500" },
    bet:        { label: "Bet",        color: "text-orange-500" },
    win:        { label: "Win",        color: "text-violet-600" },
    bonus:      { label: "Bonus",      color: "text-blue-600" },
  };

  return (
    <div className="space-y-4">
      {/* iGaming balance card */}
      <div className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 60%, #a855f7 100%)" }}>
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5" />
        <div className="relative z-10">
          <p className="text-purple-200 text-xs uppercase tracking-wider">iGaming Balance</p>
          <p className="text-3xl font-bold mt-1">{currency} {fmtMoney(igBalance)}</p>
          {account && (
            <div className="flex gap-4 mt-2 text-xs text-purple-200">
              <span>Won: {fmtMoney(account.totalWon)}</span>
              <span>·</span>
              <span>Wagered: {fmtMoney(account.totalWagered)}</span>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button onClick={() => setDepositOpen(true)}
              className="flex-1 bg-white/15 hover:bg-white/25 rounded-xl py-2 text-sm font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5">
              <ArrowDownToLine size={14} /> Top Up
            </button>
            <button onClick={() => setWithdrawOpen(true)}
              className="flex-1 bg-white/15 hover:bg-white/25 rounded-xl py-2 text-sm font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5">
              <ArrowUpFromLine size={14} /> Cash Out
            </button>
          </div>
        </div>
      </div>

      {/* Game lobby or transaction history */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowHistory(false)}
          className={cn("flex-1 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer",
            !showHistory ? "bg-violet-600 text-white" : "bg-muted text-slate-400 hover:bg-muted/80")}
        >
          Games
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className={cn("flex-1 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer",
            showHistory ? "bg-violet-600 text-white" : "bg-muted text-slate-400 hover:bg-muted/80")}
        >
          History
        </button>
      </div>

      {!showHistory ? (
        /* Game lobby */
        <GameLobby currency={currency} />
      ) : (
        /* Transaction history */
        <Section title="iGaming History">
          {transactions === undefined ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-2xl" />)}</div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">No transactions yet.<br/>Top up and launch a game to get started.</div>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => {
                const meta = TX_TYPE[t.type] ?? { label: t.type, color: "text-slate-500" };
                const isPositive = t.type === "win" || t.type === "deposit" || t.type === "bonus";
                return (
                  <div key={t._id} className="bg-card border rounded-2xl px-4 py-2.5 flex items-center gap-3">
                    <div className={cn("text-sm font-bold w-16 flex-shrink-0", meta.color)}>{meta.label}</div>
                    <div className="flex-1 text-xs text-slate-400 truncate">
                      {t.gameName ?? t.type} · {fmtDate(t.createdAt)}
                    </div>
                    <p className={cn("font-bold text-sm flex-shrink-0", isPositive ? "text-emerald-600" : "text-red-500")}>
                      {isPositive ? "+" : "-"}{currency} {fmtMoney(Math.abs(t.amount))}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {/* Deposit dialog */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="sm:max-w-xs rounded-3xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowDownToLine size={16} className="text-violet-600" /> Top Up iGaming</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {wallet && <div className="bg-muted/50 rounded-xl px-3 py-2 flex justify-between text-sm"><span className="text-slate-400">Main wallet</span><span className="font-bold">{currency} {fmtMoney(wallet.available)}</span></div>}
            <div>
              <Label className="text-xs text-slate-500">Amount ({currency})</Label>
              <Input type="number" value={depAmt} onChange={e => setDepAmt(e.target.value)} placeholder="0.00" className="mt-1 rounded-xl h-12 text-lg font-semibold" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDepositOpen(false)} disabled={loading} className="rounded-xl">Cancel</Button>
            <Button onClick={handleDeposit} disabled={loading} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
              {loading && <RefreshCw size={12} className="animate-spin" />} Deposit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-xs rounded-3xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowUpFromLine size={16} className="text-violet-600" /> Cash Out</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-muted/50 rounded-xl px-3 py-2 flex justify-between text-sm"><span className="text-slate-400">iGaming balance</span><span className="font-bold text-violet-700">{currency} {fmtMoney(igBalance)}</span></div>
            <div>
              <Label className="text-xs text-slate-500">Amount ({currency})</Label>
              <Input type="number" value={witAmt} onChange={e => setWitAmt(e.target.value)} placeholder="0.00" className="mt-1 rounded-xl h-12 text-lg font-semibold" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setWithdrawOpen(false)} disabled={loading} className="rounded-xl">Cancel</Button>
            <Button onClick={handleWithdraw} disabled={loading} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
              {loading && <RefreshCw size={12} className="animate-spin" />} Cash Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab definitions
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "home" | "attendance" | "igaming" | "advances" | "withdrawals" | "remittance" | "shop" | "notifications" | "profile" | "history";

const BOTTOM_NAV: { tab: Tab; icon: React.ReactNode; label: string }[] = [
  { tab: "home",          icon: <Home size={22} />,         label: "Home"       },
  { tab: "attendance",    icon: <Clock size={22} />,        label: "Attendance" },
  { tab: "advances",      icon: <TrendingUp size={22} />,   label: "Advance"    },
  { tab: "igaming",       icon: <Gamepad2 size={22} />,     label: "iGaming"    },
  { tab: "profile",       icon: <User size={22} />,         label: "Profile"    },
];

const SUB_TABS = new Set<Tab>([] as Tab[]);

const TAB_TITLE: Record<Tab, string> = {
  home:          "",
  attendance:    "Attendance",
  igaming:       "iGaming",
  advances:      "Salary Advance",
  withdrawals:   "Withdraw",
  remittance:    "Send Money",
  shop:          "Shop",
  notifications: "Notifications",
  profile:       "My Profile",
  history:       "Transaction History",
};

// ─────────────────────────────────────────────────────────────────────────────
// Main portal (authenticated + worker role)
// ─────────────────────────────────────────────────────────────────────────────

function PortalContent() {
  const profile    = useQuery(api.workerPortal.getMyProfile, {});
  const wallet     = useQuery(api.workerPortal.getMyWallet,  {});
  const role       = useQuery(api.userRoles.getMyRole, {});
  const wageConfig = useQuery(api.workerPortal.getMyWageConfig, {});
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("home");

  // Loading
  if (profile === undefined || wallet === undefined || role === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <RefreshCw size={20} className="text-blue-600 animate-spin" />
          </div>
          <p className="text-sm text-slate-400">Loading your portal…</p>
        </div>
      </div>
    );
  }

  // No worker record linked — show NotLinked screen
  if (!profile) {
    const name = user?.profile.name?.split(" ")[0] ?? "there";
    return (
      <div className="flex-1 overflow-auto">
        <NotLinked name={name} />
      </div>
    );
  }

  const name = profile.firstName;
  const isSubTab = SUB_TABS.has(tab);

  // Compute estimated monthly salary from wage config
  const RATE_LABELS: Record<string, string> = { daily: "daily rate", hourly: "hourly rate", piece: "piece rate", monthly: "monthly salary" };
  const estimatedSalary = wageConfig
    ? { amount: estimateMonthlySalary(wageConfig), currency: wageConfig.currency, rateLabel: RATE_LABELS[wageConfig.rateType] ?? wageConfig.rateType }
    : null;

  const content: Record<Tab, React.ReactNode> = {
    home:          <HomeTab profile={profile} wallet={wallet} onNav={setTab} estimatedSalary={estimatedSalary} />,
    attendance:    <AttendanceTab />,
    igaming:       <IgamingTab wallet={wallet} />,
    advances:      <AdvancesTab wallet={wallet} estimatedSalary={estimatedSalary} />,
    withdrawals:   <WithdrawalsTab wallet={wallet} profile={profile} />,
    remittance:    <RemittanceTab wallet={wallet} />,
    shop:          <ShopTab wallet={wallet} />,
    notifications: <NotificationsTab />,
    profile:       <ProfileTab profile={profile} estimatedSalary={estimatedSalary} />,
    history:       <HistoryTab />,
  };

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/60 px-4 py-3 flex items-center justify-between">
        {isSubTab ? (
          <button onClick={() => setTab("home")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-foreground cursor-pointer">
            <ArrowLeft size={16} /> Back
          </button>
        ) : (
          <>
            {/* Left: logo + greeting */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                <Wallet size={15} className="text-white" />
              </div>
              <span className="font-bold text-sm">
                {tab === "home" ? `Hi, ${name} 👋` : TAB_TITLE[tab]}
              </span>
            </div>

            {/* Right: quick nav icons */}
            <div className="flex items-center gap-1">
              {[
                { t: "shop" as const, icon: <ShoppingBag size={18} /> },
                { t: "igaming" as const, icon: <Gamepad2 size={18} /> },
                { t: "profile" as const, icon: <User size={18} /> },
                { t: "notifications" as const, icon: <Bell size={18} /> },
              ].map(item => (
                <button
                  key={item.t}
                  onClick={() => setTab(item.t)}
                  className={cn(
                    "p-2 rounded-xl cursor-pointer transition-colors",
                    tab === item.t
                      ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                      : "text-slate-400 hover:text-foreground",
                  )}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          </>
        )}

        {isSubTab && (
          <>
            <p className="text-sm font-semibold">{TAB_TITLE[tab]}</p>
            <button onClick={() => setTab("notifications")} className="relative text-slate-400 hover:text-foreground cursor-pointer">
              <Bell size={20} />
            </button>
          </>
        )}
      </header>

      {/* Content */}
      <main className={cn("flex-1 px-4 py-4 pb-24", tab === "home" ? "overflow-hidden" : "overflow-auto")}>
        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" as const }}>
            {content[tab]}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom nav */}
      {!isSubTab && (
        <nav className="fixed bottom-0 inset-x-0 max-w-lg mx-auto bg-background/95 backdrop-blur-sm border-t border-border/60 flex justify-around px-2 py-2 z-20">
          {BOTTOM_NAV.map(item => (
            <button key={item.tab} onClick={() => setTab(item.tab)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl cursor-pointer transition-colors",
                tab === item.tab ? "text-blue-600 dark:text-blue-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
              )}>
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sign-in screen
// ─────────────────────────────────────────────────────────────────────────────

function SignInScreen() {
  const [loading, setLoading] = useState(false);
  const { signinRedirect } = useAuth();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg">
        <Wallet size={36} className="text-white" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">WorkForce Pro</h1>
        <p className="text-sm text-slate-400 max-w-xs">Your wages, advances, and payments — all in one place. Log in or sign up to get started.</p>
      </div>
      <Button className="w-full max-w-xs h-12 rounded-2xl text-base gap-2 bg-blue-600 hover:bg-blue-700"
        disabled={loading}
        onClick={() => {
          setLoading(true);
          sessionStorage.setItem("auth_redirect", "/");
          signinRedirect();
        }}>
        {loading ? <RefreshCw size={16} className="animate-spin" /> : null}
        Log In / Sign Up
      </Button>
      <p className="text-xs text-slate-400 text-center">
        Admin?{" "}
        <a href="/dashboard" className="text-blue-600 underline cursor-pointer">Go to dashboard</a>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root export
// ─────────────────────────────────────────────────────────────────────────────

export default function WorkerPortalPage() {
  // Lock body scroll so only the inner content area scrolls
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="h-dvh bg-background flex flex-col max-w-lg mx-auto overflow-hidden fixed inset-0 sm:relative sm:inset-auto">
      <AuthLoading>
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw size={24} className="text-blue-500 animate-spin" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <SignInScreen />
      </Unauthenticated>
      <Authenticated>
        <PortalContent />
      </Authenticated>
    </div>
  );
}
