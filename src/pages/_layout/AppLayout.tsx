import { Link, Outlet, useLocation } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { useAgency } from "@/components/providers/agency.tsx";
import { api } from "@/convex/_generated/api.js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { cn } from "@/lib/utils.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import NotificationBell from "@/components/notifications/NotificationBell.tsx";
import {
  LayoutDashboard,
  Building2,
  GitBranch,
  MapPin,
  Users,
  Clock,
  DollarSign,
  Wallet,
  TrendingUp,
  ArrowUpFromLine,
  Send,
  ShoppingBag,
  BarChart3,
  Settings,
  LogOut,
  BriefcaseIcon,
  ShieldCheck,
  Bell,
  Gamepad2,
} from "lucide-react";
import { useEffect } from "react";

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
  superadminOnly?: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
  { label: "Agencies", path: "/agencies", icon: <Building2 size={18} />, superadminOnly: true },
  { label: "Branches", path: "/branches", icon: <GitBranch size={18} /> },
  { label: "Sites", path: "/sites", icon: <MapPin size={18} /> },
  { label: "Workers", path: "/workers", icon: <Users size={18} /> },
  { label: "Attendance", path: "/attendance", icon: <Clock size={18} /> },
  { label: "Wages", path: "/wages", icon: <DollarSign size={18} /> },
  { label: "Wallet", path: "/wallet", icon: <Wallet size={18} /> },
  { label: "Advances", path: "/advances", icon: <TrendingUp size={18} /> },
  { label: "Withdrawals", path: "/withdrawals", icon: <ArrowUpFromLine size={18} /> },
  { label: "Remittance", path: "/remittance", icon: <Send size={18} /> },
  { label: "Marketplace", path: "/marketplace", icon: <ShoppingBag size={18} /> },
  { label: "Reports", path: "/reports", icon: <BarChart3 size={18} /> },
  { label: "iGaming", path: "/igaming", icon: <Gamepad2 size={18} /> },
  { label: "Notifications", path: "/notifications", icon: <Bell size={18} /> },
  { label: "Admin", path: "/admin", icon: <Settings size={18} /> },
];

const bottomNavItems = navItems.filter((n) => !n.superadminOnly).slice(0, 5);

// ── Role Sync ────────────────────────────────────────────────────────────────
// Reads role from backend and syncs into AgencyContext
function RoleSync() {
  const myRole = useQuery(api.userRoles.getMyRole, {});
  const { setAgencyId, setRole, isSuperadmin } = useAgency();

  useEffect(() => {
    if (myRole === undefined) return;
    if (myRole === null) {
      setRole(null);
      return;
    }
    setRole(myRole.role as Parameters<typeof setRole>[0]);
    // For non-superadmins, force agency to their assigned one
    if (myRole.role !== "superadmin" && myRole.agencyId) {
      setAgencyId(myRole.agencyId as Id<"agencies">);
    }
  }, [myRole, setAgencyId, setRole]);

  return null;
}

// ── Agency Switcher (superadmin only) ────────────────────────────────────────

function AgencySwitcher() {
  const agencies = useQuery(api.agencies.list, {});
  const { agencyId, setAgencyId, isSuperadmin } = useAgency();

  if (!isSuperadmin) return null;

  if (!agencies) {
    return <Skeleton className="h-9 w-full rounded-lg" />;
  }

  if (agencies.length === 0) {
    return (
      <Link
        to="/agencies"
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-sidebar-border/60 text-sidebar-foreground/50 hover:text-sidebar-foreground text-xs transition-colors"
      >
        <Building2 size={13} />
        <span>Create an agency first</span>
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-1">
        Viewing Agency
      </p>
      <Select
        value={agencyId ?? "all"}
        onValueChange={(v) => setAgencyId(v === "all" ? null : (v as Id<"agencies">))}
      >
        <SelectTrigger className="w-full h-9 bg-sidebar-accent/40 border-sidebar-border/40 text-sidebar-foreground text-sm [&>svg]:text-sidebar-foreground/50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0">
              <Building2 size={10} className="text-sidebar-primary" />
            </div>
            <SelectValue placeholder="All agencies" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <span className="text-muted-foreground">All Agencies</span>
          </SelectItem>
          {agencies.map((a) => (
            <SelectItem key={a._id} value={a._id}>
              <div className="flex items-center gap-2">
                <span>{a.name}</span>
                <span className="text-xs text-muted-foreground font-mono">{a.code}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Agency Badge (for non-superadmin users) ───────────────────────────────────

function AgencyBadge() {
  const { isSuperadmin, agencyId } = useAgency();
  const agencies = useQuery(api.agencies.list, {});
  if (isSuperadmin) return null;

  const current = agencies?.find((a) => a._id === agencyId);
  if (!current && agencies === undefined) {
    return <Skeleton className="h-9 w-full rounded-lg" />;
  }

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-1">
        Your Agency
      </p>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/40 border border-sidebar-border/40">
        <div className="w-5 h-5 rounded bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0">
          <Building2 size={10} className="text-sidebar-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-sidebar-foreground truncate">
            {current?.name ?? "Loading…"}
          </p>
          {current && (
            <p className="text-[10px] text-sidebar-foreground/50 font-mono">{current.code}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sidebar Content ──────────────────────────────────────────────────────────

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { user, signout } = useAuth();
  const { isSuperadmin, role } = useAgency();
  const myRole = useQuery(api.userRoles.getMyRole, {});
  const { agencyId } = useAgency();
  const unreadCount = useQuery(api.notifications.unreadCount, agencyId ? { agencyId } : {});

  const visibleNav = navItems.filter((item) => {
    if (item.superadminOnly && !isSuperadmin) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <BriefcaseIcon size={16} className="text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-sm text-sidebar-foreground font-serif tracking-tight">WorkForce Pro</p>
            <p className="text-xs text-sidebar-foreground/50">Enterprise Platform</p>
          </div>
        </div>
      </div>

      {/* Agency section */}
      <Authenticated>
        <div className="px-3 pt-3 pb-2 border-b border-sidebar-border">
          <AgencySwitcher />
          <AgencyBadge />
          {isSuperadmin && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-500 dark:text-amber-400">
              <ShieldCheck size={11} />
              <span className="font-semibold">Superadmin</span>
            </div>
          )}
        </div>
      </Authenticated>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="space-y-0.5">
          {visibleNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {item.icon}
                {item.label}
                {item.path === "/notifications" && (unreadCount ?? 0) > 0 && (
                  <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
                    {(unreadCount ?? 0) > 99 ? "99" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User section */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <Authenticated>
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarFallback className="text-xs bg-sidebar-accent text-sidebar-accent-foreground">
                {user?.profile.name?.charAt(0)?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.profile.name ?? "User"}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">
                {myRole?.role ? (
                  <span className="capitalize">{myRole.role.replace("_", " ")}</span>
                ) : (
                  user?.profile.email ?? ""
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0"
              onClick={() => signout()}
            >
              <LogOut size={14} />
            </Button>
          </div>
        </Authenticated>
        <Unauthenticated>
          <div className="px-2">
            <SignInButton className="w-full text-sm h-8" />
          </div>
        </Unauthenticated>
      </div>
    </div>
  );
}

// ── Page Header ──────────────────────────────────────────────────────────────

function PageHeader() {
  const location = useLocation();
  const { agencyId, isSuperadmin } = useAgency();
  const agencies = useQuery(api.agencies.list, {});
  const currentAgency = agencies?.find((a) => a._id === agencyId);
  const pageLabel = navItems.find((n) => n.path === location.pathname)?.label ?? "WorkForce Pro";

  return (
    <header className="hidden md:flex items-center justify-between px-6 h-14 border-b bg-card flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-foreground font-serif">{pageLabel}</h1>
        {currentAgency && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            <Building2 size={10} />
            {currentAgency.name}
          </span>
        )}
        {isSuperadmin && !agencyId && (
          <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
            All agencies
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <AuthLoading><Skeleton className="h-8 w-8 rounded-full" /></AuthLoading>
        <Authenticated>
          <NotificationBell />
          <UserAvatarDesktop />
        </Authenticated>
        <Unauthenticated><SignInButton className="h-8 text-sm" /></Unauthenticated>
      </div>
    </header>
  );
}

// ── Main Layout ──────────────────────────────────────────────────────────────

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Role sync — reads backend role and pushes into context */}
      <Authenticated>
        <RoleSync />
      </Authenticated>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-sidebar flex-shrink-0 border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top header */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b bg-sidebar flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-sidebar-primary flex items-center justify-center">
              <BriefcaseIcon size={14} className="text-sidebar-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-sidebar-foreground font-serif">WorkForce Pro</span>
          </div>
          <AuthLoading><Skeleton className="h-7 w-7 rounded-full" /></AuthLoading>
          <Authenticated><MobileAgencyBadge /></Authenticated>
          <Unauthenticated><SignInButton className="h-8 text-xs" /></Unauthenticated>
        </header>

        {/* Desktop header */}
        <PageHeader />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t bg-sidebar md:hidden z-50 h-16">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 text-xs cursor-pointer py-2",
                isActive
                  ? "text-sidebar-primary"
                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
              )}
            >
              {item.icon}
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function UserAvatarDesktop() {
  const { user, signout } = useAuth();
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {user?.profile.name?.charAt(0)?.toUpperCase() ?? "U"}
        </AvatarFallback>
      </Avatar>
      <div className="hidden lg:block text-right">
        <p className="text-xs font-medium text-foreground">{user?.profile.name ?? "User"}</p>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => signout()}>
        <LogOut size={14} />
      </Button>
    </div>
  );
}

function MobileAgencyBadge() {
  const { agencyId } = useAgency();
  const agencies = useQuery(api.agencies.list, {});
  const current = agencies?.find((a) => a._id === agencyId);
  const { user } = useAuth();

  return (
    <div className="flex items-center gap-2">
      {current && (
        <span className="text-xs text-sidebar-primary bg-sidebar-primary/10 px-2 py-0.5 rounded-full font-medium">
          {current.code}
        </span>
      )}
      <Avatar className="h-7 w-7">
        <AvatarFallback className="text-xs bg-sidebar-accent text-sidebar-accent-foreground">
          {user?.profile.name?.charAt(0)?.toUpperCase() ?? "U"}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
