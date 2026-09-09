"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useAgency } from "@/components/providers/agency.tsx";
import ProviderConfigPanel from "./_components/ProviderConfigPanel.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
} from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import {
  Gamepad2, TrendingUp, TrendingDown, DollarSign, Users, Zap,
  ArrowUpFromLine, ArrowDownToLine, Settings, BarChart3, RefreshCw,
  Trophy, Target, Coins, Shield, AlertTriangle, CheckCircle2,
  Flame, Sparkles, Dice1,
} from "lucide-react";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

type Worker = Doc<"workers">;
type IgamingAccount = Doc<"igamingAccounts">;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmt(n: number, currency = "MYR") {
  return `${currency} ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtTime(iso: string) {
  try { return format(new Date(iso), "dd MMM yyyy HH:mm"); } catch { return iso; }
}

const ACCOUNT_STATUS_BADGE: Record<string, string> = {
  active:        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  suspended:     "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  self_excluded: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const TXN_COLORS: Record<string, string> = {
  deposit:    "text-green-600",
  withdrawal: "text-blue-600",
  bet:        "text-red-500",
  win:        "text-amber-500",
  bonus:      "text-purple-500",
};

const TXN_ICONS: Record<string, React.ReactNode> = {
  deposit:    <ArrowDownToLine size={14} />,
  withdrawal: <ArrowUpFromLine size={14} />,
  bet:        <Target size={14} />,
  win:        <Trophy size={14} />,
  bonus:      <Sparkles size={14} />,
};

// ── Game catalogue (simulated) ────────────────────────────────────────────────

const GAMES = [
  { id: "g1",  name: "Golden Fortune",    category: "slots",       rtp: 96, icon: "🎰", hot: true  },
  { id: "g2",  name: "Baccarat Classic",  category: "live_casino", rtp: 98, icon: "🃏", hot: true  },
  { id: "g3",  name: "Dragon Tiger",      category: "live_casino", rtp: 97, icon: "🐉", hot: false },
  { id: "g4",  name: "Mega Jackpot",      category: "slots",       rtp: 94, icon: "💎", hot: true  },
  { id: "g5",  name: "Roulette Royale",   category: "table",       rtp: 97, icon: "🎡", hot: false },
  { id: "g6",  name: "Blackjack Pro",     category: "table",       rtp: 99, icon: "♠️", hot: false },
  { id: "g7",  name: "Soccer Goals",      category: "sports",      rtp: 95, icon: "⚽", hot: true  },
  { id: "g8",  name: "Wild Safari",       category: "slots",       rtp: 95, icon: "🦁", hot: false },
  { id: "g9",  name: "Fishing Master",    category: "fishing",     rtp: 96, icon: "🎣", hot: true  },
  { id: "g10", name: "Poker Stars",       category: "table",       rtp: 98, icon: "🃏", hot: false },
  { id: "g11", name: "Sic Bo",            category: "table",       rtp: 97, icon: "🎲", hot: false },
  { id: "g12", name: "Lucky Dice",        category: "slots",       rtp: 95, icon: "🎲", hot: false },
];

const CATEGORIES = ["all", "slots", "live_casino", "table", "sports", "fishing"];
const CATEGORY_LABELS: Record<string, string> = {
  all: "All Games", slots: "Slots", live_casino: "Live Casino",
  table: "Table Games", sports: "Sports", fishing: "Fishing",
};

// ── Stats Cards ──────────────────────────────────────────────────────────────

function StatsBar({ stats, config }: {
  stats: { totalAccounts: number; activeAccounts: number; totalDeposited: number; totalWithdrawn: number; totalWon: number; totalWagered: number; ggr: number };
  config: Doc<"igamingConfigs"> | null;
}) {
  const currency = config?.currency ?? "MYR";
  const cards = [
    { label: "Total Accounts",  value: stats.totalAccounts.toString(),         icon: <Users size={16} />,       color: "text-blue-500"   },
    { label: "Active",          value: stats.activeAccounts.toString(),         icon: <CheckCircle2 size={16} />, color: "text-green-500"  },
    { label: "Total Deposited", value: fmtAmt(stats.totalDeposited, currency),  icon: <ArrowDownToLine size={16} />, color: "text-amber-500"  },
    { label: "Total Wagered",   value: fmtAmt(stats.totalWagered, currency),    icon: <Target size={16} />,      color: "text-purple-500" },
    { label: "Total Won",       value: fmtAmt(stats.totalWon, currency),        icon: <Trophy size={16} />,      color: "text-green-500"  },
    { label: "GGR",             value: fmtAmt(stats.ggr, currency),             icon: <TrendingUp size={16} />, color: stats.ggr >= 0 ? "text-emerald-500" : "text-red-500" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="py-3">
          <CardContent className="px-4 py-0 flex flex-col gap-1">
            <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", c.color)}>
              {c.icon} {c.label}
            </div>
            <p className="font-bold text-sm text-foreground leading-tight">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Account Row ──────────────────────────────────────────────────────────────

function AccountRow({
  account,
  worker,
  config,
  onDeposit,
  onWithdraw,
  onSuspend,
}: {
  account: IgamingAccount;
  worker: Worker | null;
  config: Doc<"igamingConfigs"> | null;
  onDeposit: (acc: IgamingAccount) => void;
  onWithdraw: (acc: IgamingAccount) => void;
  onSuspend: (acc: IgamingAccount) => void;
}) {
  const currency = config?.currency ?? account.currency;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-card rounded-xl border hover:border-primary/30 transition-colors">
      {/* Worker Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
          {worker ? `${worker.firstName[0]}${worker.lastName[0]}` : "?"}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {worker ? `${worker.firstName} ${worker.lastName}` : "Unknown Worker"}
          </p>
          <p className="text-xs text-muted-foreground">@{account.username}</p>
        </div>
      </div>

      {/* Balance */}
      <div className="text-right sm:w-36 flex-shrink-0">
        <p className="font-bold text-base text-primary">{fmtAmt(account.balance, currency)}</p>
        <p className="text-[10px] text-muted-foreground">iGaming Balance</p>
      </div>

      {/* Status Badge */}
      <Badge className={cn("border-0 text-xs h-6", ACCOUNT_STATUS_BADGE[account.status])}>
        {account.status.replace("_", " ")}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={() => onDeposit(account)}
          disabled={account.status !== "active"}>
          <ArrowDownToLine size={11} /> Deposit
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={() => onWithdraw(account)}
          disabled={account.status !== "active" || account.balance <= 0}>
          <ArrowUpFromLine size={11} /> Cash Out
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => onSuspend(account)}
          title={account.status === "active" ? "Suspend account" : "Activate account"}>
          <Shield size={13} />
        </Button>
      </div>
    </div>
  );
}

// ── Game Card ────────────────────────────────────────────────────────────────

function GameCard({
  game,
  onPlay,
  playing,
  disabled,
}: {
  game: typeof GAMES[0];
  onPlay: (g: typeof GAMES[0]) => void;
  playing: boolean;
  disabled: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="relative bg-card border rounded-2xl overflow-hidden cursor-pointer group"
      onClick={() => !disabled && onPlay(game)}
    >
      {/* Hot badge */}
      {game.hot && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-red-500 text-white border-0 text-[9px] h-4 px-1.5 gap-0.5 flex items-center">
            <Flame size={8} /> HOT
          </Badge>
        </div>
      )}

      {/* Game icon area */}
      <div className="h-24 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-200">
        {game.icon}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-sm text-foreground truncate">{game.name}</p>
        <div className="flex items-center justify-between mt-1">
          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 border-0">
            {CATEGORY_LABELS[game.category] ?? game.category}
          </Badge>
          <span className="text-[10px] text-muted-foreground">RTP {game.rtp}%</span>
        </div>
      </div>

      {/* Play overlay */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-2xl",
        disabled && "cursor-not-allowed bg-muted/80",
      )}>
        {playing ? (
          <RefreshCw size={24} className="text-white animate-spin" />
        ) : disabled ? (
          <Shield size={24} className="text-muted-foreground" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Zap size={24} className="text-white" />
            <span className="text-white font-bold text-xs">Play Now</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Deposit / Withdraw Dialog ────────────────────────────────────────────────

function FundDialog({
  mode,
  account,
  config,
  onClose,
}: {
  mode: "deposit" | "withdraw";
  account: IgamingAccount | null;
  config: Doc<"igamingConfigs"> | null;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const doDeposit  = useMutation(api.igaming.deposit);
  const doWithdraw = useMutation(api.igaming.withdraw);
  const [loading, setLoading] = useState(false);

  const currency = config?.currency ?? "MYR";
  const min = mode === "deposit" ? (config?.minDeposit ?? 10) : 1;
  const max = mode === "deposit" ? (config?.maxDeposit ?? 1000) : (account?.balance ?? 0);

  const handle = async () => {
    if (!account) return;
    const a = parseFloat(amount);
    if (isNaN(a) || a <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    try {
      if (mode === "deposit") {
        await doDeposit({ workerId: account.workerId, amount: a });
        toast.success(`Deposited ${fmtAmt(a, currency)} to iGaming wallet`);
      } else {
        await doWithdraw({ workerId: account.workerId, amount: a });
        toast.success(`Cashed out ${fmtAmt(a, currency)} to main wallet`);
      }
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Operation failed");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={!!account} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            {mode === "deposit" ? <ArrowDownToLine size={16} className="text-primary" /> : <ArrowUpFromLine size={16} className="text-blue-500" />}
            {mode === "deposit" ? "Deposit to iGaming" : "Cash Out to Wallet"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {account && (
            <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account</span>
                <span className="font-medium">@{account.username}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">iGaming Balance</span>
                <span className="font-bold text-primary">{fmtAmt(account.balance, currency)}</span>
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs">Amount ({currency})</Label>
            <Input
              type="number"
              min={min}
              max={max}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min ${min} / Max ${max}`}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {mode === "deposit" ? `Min: ${currency} ${min} · Max: ${currency} ${max}` : `Max: ${fmtAmt(max, currency)}`}
            </p>
          </div>
          {/* Quick amounts */}
          <div className="flex gap-2 flex-wrap">
            {[10, 20, 50, 100].map((q) => (
              <Button key={q} variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAmount(q.toString())}>
                {q}
              </Button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handle} disabled={loading} className="gap-1.5">
            {loading && <RefreshCw size={12} className="animate-spin" />}
            {mode === "deposit" ? "Deposit" : "Cash Out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Account Dialog ─────────────────────────────────────────────────────

function CreateAccountDialog({
  open,
  workers,
  onClose,
}: {
  open: boolean;
  workers: Worker[];
  onClose: () => void;
}) {
  const [workerId, setWorkerId] = useState<string>("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const createAcc = useMutation(api.igaming.createAccount);

  const handle = async () => {
    if (!workerId) { toast.error("Select a worker"); return; }
    if (!username.trim()) { toast.error("Enter a username"); return; }
    setLoading(true);
    try {
      await createAcc({ workerId: workerId as Id<"workers">, username: username.trim() });
      toast.success("iGaming account created!");
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to create account");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Gamepad2 size={16} className="text-primary" /> New iGaming Account
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Worker</Label>
            <Select value={workerId} onValueChange={setWorkerId}>
              <SelectTrigger className="mt-1 h-9">
                <SelectValue placeholder="Select worker…" />
              </SelectTrigger>
              <SelectContent>
                {workers.map((w) => (
                  <SelectItem key={w._id} value={w._id}>
                    {w.firstName} {w.lastName} — {w.employeeId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. john_doe88"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handle} disabled={loading} className="gap-1.5">
            {loading && <RefreshCw size={12} className="animate-spin" />}
            Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Config Dialog ─────────────────────────────────────────────────────────────

function ConfigDialog({ open, onClose, existing }: {
  open: boolean;
  onClose: () => void;
  existing: Doc<"igamingConfigs"> | null | undefined;
}) {
  const upsert = useMutation(api.igaming.upsertConfig);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    enabled: existing?.enabled ?? true,
    providerName: existing?.providerName ?? "",
    providerUrl: existing?.providerUrl ?? "",
    minDeposit: existing?.minDeposit ?? 10,
    maxDeposit: existing?.maxDeposit ?? 1000,
    dailyDepositLimit: existing?.dailyDepositLimit ?? undefined,
    monthlyDepositLimit: existing?.monthlyDepositLimit ?? undefined,
    currency: existing?.currency ?? "MYR",
    bonusEnabled: existing?.bonusEnabled ?? true,
    welcomeBonus: existing?.welcomeBonus ?? 10,
    allowedCategories: existing?.allowedCategories ?? ["slots", "live_casino", "table", "sports", "fishing"],
  });

  const toggle = (cat: string) => {
    setForm((f) => ({
      ...f,
      allowedCategories: f.allowedCategories.includes(cat)
        ? f.allowedCategories.filter((c) => c !== cat)
        : [...f.allowedCategories, cat],
    }));
  };

  const handle = async () => {
    setLoading(true);
    try {
      await upsert({
        enabled: form.enabled,
        providerName: form.providerName || undefined,
        providerUrl: form.providerUrl || undefined,
        minDeposit: Number(form.minDeposit),
        maxDeposit: Number(form.maxDeposit),
        dailyDepositLimit: form.dailyDepositLimit ? Number(form.dailyDepositLimit) : undefined,
        monthlyDepositLimit: form.monthlyDepositLimit ? Number(form.monthlyDepositLimit) : undefined,
        currency: form.currency,
        allowedCategories: form.allowedCategories,
        bonusEnabled: form.bonusEnabled,
        welcomeBonus: form.bonusEnabled ? Number(form.welcomeBonus) : undefined,
      });
      toast.success("iGaming configuration saved");
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to save config");
    } finally { setLoading(false); }
  };

  const CURRENCIES = ["MYR", "USD", "SGD", "THB", "IDR", "PHP", "VND"];
  const CATS = ["slots", "live_casino", "table", "sports", "fishing"];
  const CAT_LABELS: Record<string, string> = {
    slots: "Slots", live_casino: "Live Casino", table: "Table Games", sports: "Sports", fishing: "Fishing",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Settings size={16} className="text-primary" /> iGaming Configuration
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable iGaming</p>
              <p className="text-xs text-muted-foreground">Allow workers to access iGaming features</p>
            </div>
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
          </div>
          <Separator />

          {/* Provider */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Provider Name</Label>
              <Input value={form.providerName} onChange={(e) => setForm((f) => ({ ...f, providerName: e.target.value }))}
                placeholder="e.g. Pragmatic Play" className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Lobby / Game URL (optional iframe)</Label>
            <Input value={form.providerUrl} onChange={(e) => setForm((f) => ({ ...f, providerUrl: e.target.value }))}
              placeholder="https://games.example.com/lobby" className="mt-1 h-8 text-sm" />
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Min Deposit</Label>
              <Input type="number" value={form.minDeposit} onChange={(e) => setForm((f) => ({ ...f, minDeposit: Number(e.target.value) }))} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Max Deposit</Label>
              <Input type="number" value={form.maxDeposit} onChange={(e) => setForm((f) => ({ ...f, maxDeposit: Number(e.target.value) }))} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Daily Deposit Limit</Label>
              <Input type="number" value={form.dailyDepositLimit ?? ""} onChange={(e) => setForm((f) => ({ ...f, dailyDepositLimit: e.target.value ? Number(e.target.value) : undefined }))} placeholder="No limit" className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Monthly Deposit Limit</Label>
              <Input type="number" value={form.monthlyDepositLimit ?? ""} onChange={(e) => setForm((f) => ({ ...f, monthlyDepositLimit: e.target.value ? Number(e.target.value) : undefined }))} placeholder="No limit" className="mt-1 h-8 text-sm" />
            </div>
          </div>

          {/* Categories */}
          <div>
            <Label className="text-xs mb-2 block">Allowed Game Categories</Label>
            <div className="flex flex-wrap gap-2">
              {CATS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggle(cat)}
                  className={cn(
                    "h-7 px-3 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                    form.allowedCategories.includes(cat)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50",
                  )}
                >
                  {CAT_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Bonus */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Welcome Bonus</p>
              <p className="text-xs text-muted-foreground">Credit bonus when creating new account</p>
            </div>
            <Switch checked={form.bonusEnabled} onCheckedChange={(v) => setForm((f) => ({ ...f, bonusEnabled: v }))} />
          </div>
          {form.bonusEnabled && (
            <div>
              <Label className="text-xs">Welcome Bonus Amount ({form.currency})</Label>
              <Input type="number" value={form.welcomeBonus} onChange={(e) => setForm((f) => ({ ...f, welcomeBonus: Number(e.target.value) }))} className="mt-1 h-8 text-sm" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handle} disabled={loading} className="gap-1.5">
            {loading && <RefreshCw size={12} className="animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Play Dialog ───────────────────────────────────────────────────────────────

function PlayDialog({
  open,
  game,
  account,
  config,
  onClose,
}: {
  open: boolean;
  game: typeof GAMES[0] | null;
  account: IgamingAccount | null;
  config: Doc<"igamingConfigs"> | null;
  onClose: () => void;
}) {
  const [betAmt, setBetAmt] = useState("5");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ won: boolean; winAmount: number; balanceAfter: number } | null>(null);
  const placeBet = useMutation(api.igaming.placeBet);
  const currency = config?.currency ?? "MYR";

  const spin = async () => {
    if (!account || !game) return;
    const bet = parseFloat(betAmt);
    if (isNaN(bet) || bet <= 0) { toast.error("Enter a valid bet"); return; }
    if (bet > account.balance) { toast.error("Insufficient balance"); return; }
    setSpinning(true);
    setResult(null);
    try {
      const r = await placeBet({ workerId: account.workerId, gameId: game.id, gameName: game.name, betAmount: bet });
      // Animate before showing
      await new Promise((res) => setTimeout(res, 1200));
      setResult(r);
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Bet failed");
    } finally { setSpinning(false); }
  };

  const hasProviderUrl = config?.providerUrl;

  return (
    <Dialog open={open} onOpenChange={() => { setResult(null); onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2 text-lg">
            {game?.icon} {game?.name}
          </DialogTitle>
        </DialogHeader>

        {hasProviderUrl ? (
          // Embed iframe if URL is configured
          <div className="space-y-3">
            <iframe
              src={config!.providerUrl}
              className="w-full h-64 rounded-lg border"
              title={game?.name ?? "Game"}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
            <p className="text-xs text-muted-foreground text-center">
              Playing via {config?.providerName ?? "external provider"}
            </p>
          </div>
        ) : (
          // Demo spin mode
          <div className="space-y-5 py-2">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 flex flex-col items-center gap-3 min-h-[160px] justify-center">
              <AnimatePresence mode="wait">
                {spinning ? (
                  <motion.div key="spinning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.5, repeat: Infinity, ease: "linear" as const }}>
                      <Dice1 size={48} className="text-primary" />
                    </motion.div>
                    <p className="text-sm text-muted-foreground font-medium">Spinning…</p>
                  </motion.div>
                ) : result ? (
                  <motion.div key="result" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    className="flex flex-col items-center gap-2">
                    {result.won ? (
                      <>
                        <div className="text-5xl">🎉</div>
                        <p className="font-bold text-xl text-amber-500">You Won!</p>
                        <p className="text-2xl font-bold text-foreground">{fmtAmt(result.winAmount, currency)}</p>
                        <p className="text-xs text-muted-foreground">Balance: {fmtAmt(result.balanceAfter, currency)}</p>
                      </>
                    ) : (
                      <>
                        <div className="text-5xl">😔</div>
                        <p className="font-bold text-xl text-muted-foreground">Better Luck Next Time</p>
                        <p className="text-xs text-muted-foreground">Balance: {fmtAmt(result.balanceAfter, currency)}</p>
                      </>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-2">
                    <div className="text-5xl">{game?.icon}</div>
                    <p className="text-sm text-muted-foreground">Place your bet and spin!</p>
                    {account && <p className="text-xs text-muted-foreground">Balance: {fmtAmt(account.balance, currency)}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bet controls */}
            <div className="flex items-center gap-2">
              <Label className="text-xs w-16 flex-shrink-0">Bet ({currency})</Label>
              <Input type="number" min="1" step="1" value={betAmt} onChange={(e) => setBetAmt(e.target.value)} className="h-8 text-sm" />
              {[1, 5, 10, 25].map((q) => (
                <Button key={q} variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setBetAmt(q.toString())}>{q}</Button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <AlertTriangle size={11} className="text-amber-500" />
              Demo mode — simulated outcomes. RTP ~{game?.rtp ?? 95}%.
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => { setResult(null); onClose(); }}>Close</Button>
          {!hasProviderUrl && (
            <Button onClick={spin} disabled={spinning || !account || account.balance <= 0} className="gap-1.5">
              {spinning ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
              {spinning ? "Spinning…" : "Spin"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Transaction Row ──────────────────────────────────────────────────────────

function TxnRow({ txn }: { txn: Doc<"igamingTransactions"> }) {
  const positive = txn.amount > 0;
  const col = TXN_COLORS[txn.type] ?? "text-foreground";
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
      <div className={cn("flex-shrink-0", col)}>{TXN_ICONS[txn.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{txn.description}</p>
        <p className="text-[11px] text-muted-foreground">{fmtTime(txn.createdAt)}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={cn("font-semibold text-sm", positive ? "text-green-600" : "text-red-500")}>
          {positive ? "+" : ""}{fmtAmt(Math.abs(txn.amount), txn.currency)}
        </p>
        <p className="text-[10px] text-muted-foreground">{fmtAmt(txn.balanceAfter, txn.currency)}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function IgamingContent() {
  const { agencyId, role, isSuperadmin } = useAgency();
  const isAdmin = isSuperadmin || role === "agency_admin";

  const config  = useQuery(api.igaming.getConfig, agencyId ? { agencyId } : {});
  const stats   = useQuery(api.igaming.getAgencyStats, agencyId ? { agencyId } : {});
  const accounts = useQuery(api.igaming.listAccounts, agencyId ? { agencyId } : {});
  const txns    = useQuery(api.igaming.listTransactions, agencyId ? { agencyId, limit: 100 } : { limit: 100 });
  const workers = useQuery(api.workers.list, agencyId ? { agencyId } : "skip");

  const updateStatus = useMutation(api.igaming.updateAccountStatus);

  const [tab, setTab] = useState("lobby");
  const [gameCategory, setGameCategory] = useState("all");
  const [depositAcc, setDepositAcc] = useState<IgamingAccount | null>(null);
  const [withdrawAcc, setWithdrawAcc] = useState<IgamingAccount | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [playGame, setPlayGame] = useState<typeof GAMES[0] | null>(null);
  const [playAccount, setPlayAccount] = useState<IgamingAccount | null>(null);

  // Worker lookup map
  const workerMap = new Map<string, Worker>();
  (workers ?? []).forEach((w) => workerMap.set(w._id, w));

  // Filtered games
  const filteredGames = GAMES.filter((g) =>
    (gameCategory === "all" || g.category === gameCategory) &&
    (!config || config.allowedCategories.length === 0 || config.allowedCategories.includes(g.category))
  );

  const handleSuspend = async (acc: IgamingAccount) => {
    try {
      await updateStatus({ id: acc._id, status: acc.status === "active" ? "suspended" : "active" });
      toast.success(acc.status === "active" ? "Account suspended" : "Account activated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Pick an account for playing (first active or null)
  const pickPlayAccount = (game: typeof GAMES[0]) => {
    if (!config?.enabled) { toast.error("iGaming is not enabled"); return; }
    const active = (accounts ?? []).find((a) => a.status === "active");
    if (!active) { toast.error("No active iGaming account. Create one first."); return; }
    setPlayAccount(active);
    setPlayGame(game);
  };

  if (config === undefined || stats === undefined) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-6 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isEnabled = config?.enabled ?? false;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground flex items-center gap-2">
            <Gamepad2 size={24} className="text-primary" /> iGaming
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Integrated gaming platform for workforce members
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isEnabled && (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0 gap-1">
              <AlertTriangle size={11} /> Disabled
            </Badge>
          )}
          {isEnabled && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0 gap-1">
              <CheckCircle2 size={11} /> Active
            </Badge>
          )}
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCreateOpen(true)} disabled={!isEnabled}>
                <Users size={13} /> Add Account
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setConfigOpen(true)}>
                <Settings size={13} /> Configure
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && <StatsBar stats={stats} config={config} />}

      {/* Not enabled banner */}
      {!isEnabled && isAdmin && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-amber-800 dark:text-amber-400">iGaming is disabled</p>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">Enable it in configuration to allow workers to deposit and play games.</p>
            <Button size="sm" className="mt-3 h-7 text-xs gap-1" onClick={() => setConfigOpen(true)}>
              <Settings size={11} /> Open Configuration
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9 w-full sm:w-auto">
          <TabsTrigger value="lobby"    className="text-xs gap-1.5"><Gamepad2 size={13} />  Lobby</TabsTrigger>
          <TabsTrigger value="accounts" className="text-xs gap-1.5"><Users size={13} />     Accounts</TabsTrigger>
          <TabsTrigger value="txns"     className="text-xs gap-1.5"><BarChart3 size={13} /> Transactions</TabsTrigger>
          {isAdmin && <TabsTrigger value="analytics" className="text-xs gap-1.5"><TrendingUp size={13} /> Analytics</TabsTrigger>}
          {isAdmin && <TabsTrigger value="provider"  className="text-xs gap-1.5"><Settings size={13} />   Provider API</TabsTrigger>}
        </TabsList>

        {/* ── Lobby Tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="lobby" className="mt-4 space-y-4">
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setGameCategory(cat)}
                className={cn(
                  "h-8 px-3.5 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                  gameCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50",
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {filteredGames.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Gamepad2 /></EmptyMedia>
                <EmptyTitle>No games available</EmptyTitle>
                <EmptyDescription>No games are enabled for this category.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredGames.map((g) => (
                <GameCard
                  key={g.id}
                  game={g}
                  onPlay={pickPlayAccount}
                  playing={false}
                  disabled={!isEnabled}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Accounts Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="accounts" className="mt-4 space-y-3">
          {accounts === undefined ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : accounts.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Users /></EmptyMedia>
                <EmptyTitle>No iGaming accounts</EmptyTitle>
                <EmptyDescription>Create iGaming accounts for workers to start playing.</EmptyDescription>
              </EmptyHeader>
              {isAdmin && isEnabled && (
                <EmptyContent>
                  <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
                    <Users size={13} /> Add Account
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            accounts.map((acc) => (
              <AccountRow
                key={acc._id}
                account={acc}
                worker={workerMap.get(acc.workerId) ?? null}
                config={config}
                onDeposit={(a) => setDepositAcc(a)}
                onWithdraw={(a) => setWithdrawAcc(a)}
                onSuspend={handleSuspend}
              />
            ))
          )}
        </TabsContent>

        {/* ── Transactions Tab ────────────────────────────────────────────────── */}
        <TabsContent value="txns" className="mt-4">
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <p className="font-semibold text-sm font-serif">Transaction History</p>
              <Badge variant="secondary" className="text-xs">{txns?.length ?? 0} entries</Badge>
            </div>
            {txns === undefined ? (
              <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : txns.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
                <Coins size={28} className="opacity-20" />
                <p className="text-sm">No transactions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {txns.map((t) => <TxnRow key={t._id} txn={t} />)}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Analytics Tab ───────────────────────────────────────────────────── */}
        {isAdmin && (
          <TabsContent value="analytics" className="mt-4 space-y-4">
            {stats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* GGR Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-serif">Gross Gaming Revenue (GGR)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={cn("text-3xl font-bold", stats.ggr >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {fmtAmt(stats.ggr, config?.currency ?? "MYR")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Total Wagered − Total Won</p>
                    <Separator className="my-3" />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Total Wagered</span><span className="font-medium">{fmtAmt(stats.totalWagered, config?.currency)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Total Won by Players</span><span className="font-medium text-amber-500">{fmtAmt(stats.totalWon, config?.currency)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Total Deposited</span><span className="font-medium">{fmtAmt(stats.totalDeposited, config?.currency)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Total Cashed Out</span><span className="font-medium">{fmtAmt(stats.totalWithdrawn, config?.currency)}</span></div>
                    </div>
                  </CardContent>
                </Card>

                {/* Account stats */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-serif">Account Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Users size={15} className="text-blue-500" />
                        </div>
                        <div>
                          <p className="font-bold text-lg leading-tight">{stats.totalAccounts}</p>
                          <p className="text-xs text-muted-foreground">Total Accounts</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <CheckCircle2 size={15} className="text-green-500" />
                        </div>
                        <div>
                          <p className="font-bold text-lg leading-tight">{stats.activeAccounts}</p>
                          <p className="text-xs text-muted-foreground">Active Accounts</p>
                        </div>
                      </div>
                      {stats.totalAccounts > 0 && (
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Active rate</span>
                            <span>{Math.round((stats.activeAccounts / stats.totalAccounts) * 100)}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(stats.activeAccounts / stats.totalAccounts) * 100}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Responsible Gambling Notice */}
                <Card className="md:col-span-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                  <CardContent className="flex items-start gap-3 pt-5">
                    <Shield size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-amber-800 dark:text-amber-400">Responsible Gambling</p>
                      <p className="text-xs text-amber-700 dark:text-amber-500 mt-1 leading-relaxed">
                        This iGaming module is a demo/entertainment feature. Ensure your jurisdiction allows such features. 
                        Monitor deposit limits and activate self-exclusion for workers who request it. 
                        All transactions are agency-scoped and auditable. Operators are responsible for compliance with local gambling regulations.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Skeleton className="h-64 w-full" />
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Provider API config tab (outside the Tabs component to avoid nesting issues) */}
      {tab === "provider" && agencyId && (
        <div className="mt-4">
          <ProviderConfigPanel agencyId={agencyId} />
        </div>
      )}

      {/* Dialogs */}
      <FundDialog mode="deposit" account={depositAcc} config={config} onClose={() => setDepositAcc(null)} />
      <FundDialog mode="withdraw" account={withdrawAcc} config={config} onClose={() => setWithdrawAcc(null)} />
      <CreateAccountDialog open={createOpen} workers={(workers ?? []).filter((w) => w.status === "active")} onClose={() => setCreateOpen(false)} />
      <ConfigDialog open={configOpen} onClose={() => setConfigOpen(false)} existing={config} />
      <PlayDialog open={!!playGame} game={playGame} account={playAccount} config={config} onClose={() => { setPlayGame(null); setPlayAccount(null); }} />
    </div>
  );
}

export default function IgamingPage() {
  return (
    <>
      <Authenticated><IgamingContent /></Authenticated>
      <AuthLoading>
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <Gamepad2 size={40} className="text-muted-foreground/30" />
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to access iGaming</h2>
            <p className="text-sm text-muted-foreground">Authentication required</p>
          </div>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
