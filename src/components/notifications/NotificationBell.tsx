import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "@/convex/_generated/api.js";
import { useAgency } from "@/components/providers/agency.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { cn } from "@/lib/utils.ts";
import { Bell, CheckCheck, X, Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { motion, AnimatePresence } from "motion/react";

// ── Severity styling ─────────────────────────────────────────────────────────

const SEV_STYLES = {
  info:    { icon: <Info size={14} />,            dot: "bg-blue-500",  ring: "text-blue-500"  },
  success: { icon: <CheckCircle2 size={14} />,    dot: "bg-green-500", ring: "text-green-500" },
  warning: { icon: <AlertTriangle size={14} />,   dot: "bg-amber-500", ring: "text-amber-500" },
  error:   { icon: <XCircle size={14} />,         dot: "bg-red-500",   ring: "text-red-500"   },
} satisfies Record<string, { icon: React.ReactNode; dot: string; ring: string }>;

// ── Single notification row ──────────────────────────────────────────────────

function NotifRow({
  n,
  onRead,
  onDismiss,
  onNavigate,
}: {
  n: Doc<"notifications">;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onNavigate: (link: string) => void;
}) {
  const sev = SEV_STYLES[n.severity] ?? SEV_STYLES.info;
  const time = (() => {
    try { return formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }); }
    catch { return ""; }
  })();

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-3 transition-colors",
        !n.read ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-muted/50",
        n.link && "cursor-pointer",
      )}
      onClick={() => {
        if (!n.read) onRead(n._id);
        if (n.link) onNavigate(n.link);
      }}
    >
      {/* Severity icon */}
      <div className={cn("mt-0.5 flex-shrink-0", sev.ring)}>{sev.icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm leading-snug", !n.read ? "font-semibold text-foreground" : "text-foreground/80")}>
            {n.title}
          </p>
          {/* Unread dot */}
          {!n.read && (
            <span className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1", sev.dot)} />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">{time}</p>
      </div>

      {/* Dismiss button */}
      <button
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-muted-foreground hover:text-foreground"
        onClick={(e) => { e.stopPropagation(); onDismiss(n._id); }}
        title="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ── Main Bell Component ──────────────────────────────────────────────────────

export default function NotificationBell() {
  const { agencyId } = useAgency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const count = useQuery(api.notifications.unreadCount, agencyId ? { agencyId } : {});
  const notifs = useQuery(
    api.notifications.list,
    open ? (agencyId ? { agencyId, limit: 50 } : { limit: 50 }) : "skip",
  );

  const markRead    = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const dismiss     = useMutation(api.notifications.dismiss);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const unread = count ?? 0;

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors cursor-pointer",
          "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
          open && "bg-sidebar-accent text-sidebar-foreground",
        )}
        title="Notifications"
      >
        <Bell size={16} />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none"
            >
              {unread > 99 ? "99" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="popover"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" as const }}
            className="absolute right-0 top-10 w-[380px] max-w-[95vw] bg-card border shadow-xl rounded-xl z-[200] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-primary" />
                <span className="font-semibold text-sm font-serif">Notifications</span>
                {unread > 0 && (
                  <Badge className="h-5 px-1.5 text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
                    {unread} new
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => markAllRead(agencyId ? { agencyId } : {})}
                    title="Mark all as read"
                  >
                    <CheckCheck size={12} /> Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => { setOpen(false); navigate("/notifications"); }}
                  title="View all notifications"
                >
                  <span className="text-[10px]">All</span>
                </Button>
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-[440px] overflow-y-auto divide-y divide-border/50">
              {!notifs ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  Loading…
                </div>
              ) : notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Bell size={28} className="opacity-20" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifs.map((n) => (
                  <NotifRow
                    key={n._id}
                    n={n}
                    onRead={(id) => markRead({ id: id as Parameters<typeof markRead>[0]["id"] })}
                    onDismiss={(id) => dismiss({ id: id as Parameters<typeof dismiss>[0]["id"] })}
                    onNavigate={(link) => { setOpen(false); navigate(link); }}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            {notifs && notifs.length > 0 && (
              <>
                <Separator />
                <div className="px-4 py-2 flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-muted-foreground"
                    onClick={() => { setOpen(false); navigate("/notifications"); }}
                  >
                    View all notifications →
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
