import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
} from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import {
  Bell, CheckCheck, Trash2, Info, CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useAgency } from "@/components/providers/agency.tsx";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

// ── Severity Config ──────────────────────────────────────────────────────────

const SEV = {
  info:    { icon: <Info size={16} />,           bar: "bg-blue-500",  badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"  },
  success: { icon: <CheckCircle2 size={16} />,   bar: "bg-green-500", badge: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  warning: { icon: <AlertTriangle size={16} />,  bar: "bg-amber-500", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  error:   { icon: <XCircle size={16} />,        bar: "bg-red-500",   badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"   },
} satisfies Record<string, { icon: React.ReactNode; bar: string; badge: string }>;

const TYPE_LABEL: Record<string, string> = {
  advance_approved: "Advance",
  advance_rejected: "Advance",
  advance_disbursed: "Advance",
  withdrawal_approved: "Withdrawal",
  withdrawal_rejected: "Withdrawal",
  withdrawal_processed: "Withdrawal",
  remittance_approved: "Remittance",
  remittance_rejected: "Remittance",
  remittance_completed: "Remittance",
  remittance_failed: "Remittance",
  wage_approved: "Wages",
  wage_paid: "Wages",
  order_fulfilled: "Marketplace",
};

// ── Row ──────────────────────────────────────────────────────────────────────

function Row({
  n,
  onRead,
  onDismiss,
}: {
  n: Doc<"notifications">;
  onRead: () => void;
  onDismiss: () => void;
}) {
  const navigate = useNavigate();
  const sev = SEV[n.severity] ?? SEV.info;
  const label = TYPE_LABEL[n.type] ?? n.type;

  const time = (() => {
    try { return formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }); }
    catch { return ""; }
  })();
  const fullTime = (() => {
    try { return format(new Date(n.createdAt), "dd MMM yyyy, HH:mm"); }
    catch { return n.createdAt; }
  })();

  return (
    <div
      className={cn(
        "relative flex gap-4 p-4 rounded-xl border transition-all",
        !n.read
          ? "bg-card border-primary/20 shadow-sm"
          : "bg-muted/20 border-border",
        n.link && "cursor-pointer hover:border-primary/40",
      )}
      onClick={() => {
        if (!n.read) onRead();
        if (n.link) navigate(n.link);
      }}
    >
      {/* Left colour bar */}
      <div className={cn("absolute left-0 top-3 bottom-3 w-0.5 rounded-full", sev.bar)} />

      {/* Icon */}
      <div className={cn("flex-shrink-0 mt-0.5", n.severity === "success" ? "text-green-500" : n.severity === "error" ? "text-red-500" : n.severity === "warning" ? "text-amber-500" : "text-blue-500")}>
        {sev.icon}
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <p className={cn("text-sm font-semibold", !n.read ? "text-foreground" : "text-foreground/70")}>
            {n.title}
          </p>
          <Badge className={cn("border-0 text-[10px] px-1.5 h-4", sev.badge)}>{label}</Badge>
          {!n.read && (
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{n.body}</p>
        <p className="text-xs text-muted-foreground/60 mt-1.5" title={fullTime}>{time}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {!n.read && (
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Mark as read" onClick={onRead}>
            <CheckCircle2 size={13} />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" title="Dismiss" onClick={onDismiss}>
          <Trash2 size={13} />
        </Button>
      </div>
    </div>
  );
}

// ── Main Content ─────────────────────────────────────────────────────────────

type Filter = "all" | "unread" | "advances" | "wages" | "withdrawals" | "remittances" | "marketplace";

const FILTER_TYPES: Record<string, string[]> = {
  advances:    ["advance_approved", "advance_rejected", "advance_disbursed"],
  wages:       ["wage_approved", "wage_paid"],
  withdrawals: ["withdrawal_approved", "withdrawal_rejected", "withdrawal_processed"],
  remittances: ["remittance_approved", "remittance_rejected", "remittance_completed", "remittance_failed"],
  marketplace: ["order_fulfilled"],
};

function NotificationsContent() {
  const { agencyId } = useAgency();
  const [filter, setFilter] = useState<Filter>("all");

  const notifs = useQuery(
    api.notifications.list,
    agencyId ? { agencyId, limit: 200 } : { limit: 200 },
  );
  const unreadCount = useQuery(api.notifications.unreadCount, agencyId ? { agencyId } : {});

  const markRead    = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const dismiss     = useMutation(api.notifications.dismiss);
  const clearRead   = useMutation(api.notifications.clearRead);

  const filtered = notifs?.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter in FILTER_TYPES) return FILTER_TYPES[filter].includes(n.type);
    return true;
  }) ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground flex items-center gap-2">
            <Bell size={22} className="text-primary" /> Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Status updates for advances, wages, withdrawals, remittances, and orders
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(unreadCount ?? 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => markAllRead(agencyId ? { agencyId } : {})}
            >
              <CheckCheck size={13} /> Mark all read
            </Button>
          )}
          {agencyId && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs h-8 text-muted-foreground"
              onClick={() => clearRead({ agencyId })}
            >
              <Trash2 size={13} /> Clear read
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="overflow-x-auto">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="h-8 w-max min-w-full sm:min-w-0">
            <TabsTrigger value="all" className="text-xs h-7 flex-shrink-0 gap-1">
              All
              {notifs && <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[9px] border-0 bg-muted text-muted-foreground">{notifs.length > 99 ? "99+" : notifs.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs h-7 flex-shrink-0 gap-1">
              Unread
              {(unreadCount ?? 0) > 0 && <Badge className="h-4 px-1 text-[9px] border-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{unreadCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="advances"    className="text-xs h-7 flex-shrink-0">Advances</TabsTrigger>
            <TabsTrigger value="wages"       className="text-xs h-7 flex-shrink-0">Wages</TabsTrigger>
            <TabsTrigger value="withdrawals" className="text-xs h-7 flex-shrink-0">Withdrawals</TabsTrigger>
            <TabsTrigger value="remittances" className="text-xs h-7 flex-shrink-0">Remittances</TabsTrigger>
            <TabsTrigger value="marketplace" className="text-xs h-7 flex-shrink-0">Marketplace</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* List */}
      {notifs === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Bell /></EmptyMedia>
            <EmptyTitle>
              {filter === "unread" ? "All caught up!" : "No notifications yet"}
            </EmptyTitle>
            <EmptyDescription>
              {filter === "unread"
                ? "You have no unread notifications."
                : "Notifications appear here when advances, wages, withdrawals, remittances, and orders are updated."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <Row
              key={n._id}
              n={n}
              onRead={() => markRead({ id: n._id })}
              onDismiss={() => dismiss({ id: n._id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <>
      <Authenticated><NotificationsContent /></Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">Notifications require authentication</p>
          </div>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
