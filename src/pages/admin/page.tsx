import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
} from "@/components/ui/empty.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  ShieldCheck, Users, Settings2, AlertTriangle, ClipboardList,
  CheckCircle2, XCircle, MoreHorizontal, Clock, ArrowUpRight,
  ArrowDownRight, Receipt, Send, ShoppingBag, DollarSign, Activity,
  ScrollText, Wallet, Search, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useAgency } from "@/components/providers/agency.tsx";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

type RoleType = "superadmin" | "agency_admin" | "branch_admin" | "site_admin" | "worker";

const ROLE_LABELS: Record<RoleType, string> = {
  superadmin: "Superadmin",
  agency_admin: "Agency Admin",
  branch_admin: "Branch Admin",
  site_admin: "Site Admin",
  worker: "Worker",
};

const ROLE_COLORS: Record<RoleType, string> = {
  superadmin: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  agency_admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  branch_admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  site_admin: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  worker: "bg-muted text-muted-foreground",
};

type UserRow = {
  userId: Id<"users">;
  name: string;
  email: string;
  role: RoleType | null;
  agencyId: Id<"agencies"> | null;
};

const ENTRY_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  wage_credit:       { label: "Wage Credit",       icon: <DollarSign size={12} />,      color: "text-green-600 dark:text-green-400" },
  advance_credit:    { label: "Advance Credit",     icon: <ArrowDownRight size={12} />,  color: "text-blue-600 dark:text-blue-400" },
  advance_repayment: { label: "Advance Repayment",  icon: <ArrowUpRight size={12} />,    color: "text-purple-600 dark:text-purple-400" },
  withdrawal:        { label: "Withdrawal",         icon: <ArrowUpRight size={12} />,    color: "text-red-600 dark:text-red-400" },
  marketplace_debit: { label: "Marketplace",        icon: <ShoppingBag size={12} />,     color: "text-orange-600 dark:text-orange-400" },
  adjustment:        { label: "Adjustment",         icon: <Settings2 size={12} />,       color: "text-amber-600 dark:text-amber-400" },
  remittance:        { label: "Remittance",         icon: <Send size={12} />,            color: "text-indigo-600 dark:text-indigo-400" },
};

const fmt = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);

// ── Assign Role Dialog ────────────────────────────────────────────────────────

function AssignRoleDialog({ open, onClose, user }: { open: boolean; onClose: () => void; user: UserRow | null }) {
  const [role, setRole] = useState<RoleType | "">(user?.role ?? "");
  const [agencyId, setAgencyId] = useState<string>(user?.agencyId ?? "");
  const [workerId, setWorkerId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const agencies = useQuery(api.agencies.list, {});
  const workers  = useQuery(api.workers.list, agencyId ? { agencyId: agencyId as Id<"agencies"> } : "skip");
  const setRoleMutation = useMutation(api.userRoles.setRole);

  const needsAgency = role === "agency_admin" || role === "branch_admin" || role === "site_admin" || role === "worker";
  const needsWorker = role === "worker";

  const handleSave = async () => {
    if (!user || !role) return;
    setSaving(true);
    try {
      await setRoleMutation({
        userId: user.userId,
        role,
        agencyId: (needsAgency && agencyId) ? (agencyId as Id<"agencies">) : undefined,
        workerId: (needsWorker && workerId) ? (workerId as Id<"workers">) : undefined,
      });
      toast.success(`Role assigned: ${ROLE_LABELS[role]}`);
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to assign role");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">Assign Role</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm font-medium">{user?.name || user?.email || "Unknown user"}</p>
            {user?.email && user.name && <p className="text-xs text-muted-foreground">{user.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as RoleType)}>
              <SelectTrigger><SelectValue placeholder="Select a role…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="superadmin">Superadmin</SelectItem>
                <SelectItem value="agency_admin">Agency Admin</SelectItem>
                <SelectItem value="branch_admin">Branch Admin</SelectItem>
                <SelectItem value="site_admin">Site Admin</SelectItem>
                <SelectItem value="worker">Worker</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {needsAgency && (
            <div className="space-y-1.5">
              <Label>Agency</Label>
              <Select value={agencyId} onValueChange={(v) => { setAgencyId(v); setWorkerId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select agency…" /></SelectTrigger>
                <SelectContent>
                  {(agencies ?? []).map((a) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.name} <span className="text-muted-foreground font-mono text-xs ml-1">{a.code}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">User will only see data for this agency.</p>
            </div>
          )}
          {needsWorker && agencyId && (
            <div className="space-y-1.5">
              <Label>Link to Worker Record</Label>
              <Select value={workerId} onValueChange={setWorkerId}>
                <SelectTrigger><SelectValue placeholder="Select worker…" /></SelectTrigger>
                <SelectContent>
                  {(workers ?? []).map((w) => (
                    <SelectItem key={w._id} value={w._id}>
                      {w.firstName} {w.lastName} — {w.employeeId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Links this user to a worker profile so they can use the self-service portal at <strong>/portal</strong>.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !role || (needsAgency && !agencyId)}>
            {saving ? "Saving…" : "Save Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bootstrap Card ────────────────────────────────────────────────────────────

function BootstrapCard() {
  const [loading, setLoading] = useState(false);
  const bootstrap = useMutation(api.userRoles.bootstrapSuperadmin);

  const handleBootstrap = async () => {
    setLoading(true);
    try {
      await bootstrap({});
      toast.success("You are now a Superadmin! Refreshing…");
      window.location.reload();
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to bootstrap");
    } finally { setLoading(false); }
  };

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-6 max-w-lg mx-auto">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={20} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold font-serif text-base">First-time Setup</h3>
          <p className="text-sm text-muted-foreground mt-1">
            No superadmin exists yet. Claim the superadmin role to start managing agencies and users.
            Only the first person to claim it gets this option.
          </p>
          <Button className="mt-4" onClick={handleBootstrap} disabled={loading}>
            {loading ? "Claiming…" : "Claim Superadmin Role"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Users & Roles Tab ─────────────────────────────────────────────────────────

function UsersTab() {
  const users = useQuery(api.userRoles.listUsersWithRoles, {});
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deleteUser = useMutation(api.userRoles.deleteUser);

  const filtered = (users ?? []).filter((u) => {
    const q = search.toLowerCase();
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser({ userId: deleteTarget.userId });
      toast.success(`User "${deleteTarget.name || deleteTarget.email}" deleted`);
      setDeleteTarget(null);
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/40 p-4 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-muted-foreground">
          <strong className="text-foreground">How roles work:</strong> Agency roles restrict users to a single agency.
          Superadmins can access all data across all agencies.
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {users === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Users /></EmptyMedia>
            <EmptyTitle>{search ? "No users match" : "No users yet"}</EmptyTitle>
            <EmptyDescription>Users appear here once they log in</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">User</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">Email</TableHead>
                <TableHead className="font-semibold">Role</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Agency</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.userId} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {(u.name || u.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{u.name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{u.email || "—"}</TableCell>
                  <TableCell>
                    {u.role ? (
                      <Badge className={cn("border-0 text-xs", ROLE_COLORS[u.role])}>{ROLE_LABELS[u.role]}</Badge>
                    ) : (
                      <Badge className="border-0 text-xs bg-muted text-muted-foreground">No role</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    <AgencyNameCell agencyId={u.agencyId} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="sm" className="h-7 gap-1.5 text-xs cursor-pointer"
                        onClick={() => { setEditUser(u as UserRow); setDialogOpen(true); }}
                      >
                        <Settings2 size={12} /> Assign Role
                      </Button>
                      <Button
                        variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive cursor-pointer"
                        onClick={() => setDeleteTarget(u as UserRow)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AssignRoleDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditUser(null); }}
        user={editUser}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-destructive flex items-center gap-2">
              <Trash2 size={16} /> Delete User
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm">
              Are you sure you want to delete <strong>{deleteTarget?.name || deleteTarget?.email || "this user"}</strong>?
            </p>
            <div className="rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-400 space-y-1">
              <p className="font-semibold">This will permanently:</p>
              <p>- Remove their login account</p>
              <p>- Remove their role assignment</p>
              <p>- They will no longer be able to access the platform</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AgencyNameCell({ agencyId }: { agencyId: Id<"agencies"> | null }) {
  const agencies = useQuery(api.agencies.list, {});
  if (!agencyId) return <span>—</span>;
  const agency = agencies?.find((a) => a._id === agencyId);
  return <span>{agency?.name ?? <Skeleton className="h-4 w-24 inline-block" />}</span>;
}

// ── Approval Queue Tab ────────────────────────────────────────────────────────

type ApprovalCategory = "advances" | "withdrawals" | "remittances";

const APPROVAL_COLORS: Record<string, string> = {
  pending:    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  approved:   "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  rejected:   "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  disbursed:  "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  repaid:     "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  processed:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  completed:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  failed:     "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function ApprovalNotesDialog({
  open, onClose, title, onConfirm, notesLabel, placeholder, confirmLabel, confirmClass,
}: {
  open: boolean; onClose: () => void; title: string;
  onConfirm: (notes: string) => Promise<void>;
  notesLabel?: string; placeholder?: string; confirmLabel: string; confirmClass?: string;
}) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try { await onConfirm(notes); onClose(); setNotes(""); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-serif">{title}</DialogTitle></DialogHeader>
        <div className="py-2 space-y-3">
          <div className="space-y-1.5">
            <Label>{notesLabel ?? "Notes"} <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              rows={3} placeholder={placeholder ?? "Add a note…"}
              value={notes} onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button className={confirmClass} onClick={handleConfirm} disabled={loading}>
            {loading ? "Processing…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdvancesQueue({ agencyId }: { agencyId: Id<"agencies"> | null }) {
  const items = useQuery(api.advances.listByAgency, agencyId ? { agencyId, status: "pending" } : { status: "pending" });
  const approve   = useMutation(api.advances.approve);
  const reject    = useMutation(api.advances.reject);
  const disburse  = useMutation(api.advances.disburse);

  const [actionItem, setActionItem] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "disburse" | null>(null);

  const handle = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.success(msg); }
    catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Action failed");
    }
  };

  if (items === undefined) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;

  if (items.length === 0) return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon"><CheckCircle2 /></EmptyMedia>
        <EmptyTitle>No pending advances</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold">Worker</TableHead>
              <TableHead className="font-semibold hidden sm:table-cell">Date</TableHead>
              <TableHead className="font-semibold">Amount</TableHead>
              <TableHead className="font-semibold hidden md:table-cell">Reason</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item._id} className="hover:bg-muted/30">
                <TableCell>
                  <p className="font-medium text-sm">{item.workerName}</p>
                  <code className="text-xs text-muted-foreground">{item.workerEmployeeId}</code>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm font-mono">{item.requestedDate}</TableCell>
                <TableCell className="font-semibold text-sm">{fmt(item.amount, item.currency)}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground line-clamp-1 max-w-[150px]">
                  {item.reason ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => { setActionItem(item._id); setActionType("approve"); }}>
                      <CheckCircle2 size={11} /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 px-2 text-destructive hover:text-destructive" onClick={() => { setActionItem(item._id); setActionType("reject"); }}>
                      <XCircle size={11} /> Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ApprovalNotesDialog
        open={actionType === "approve" && !!actionItem}
        onClose={() => { setActionItem(null); setActionType(null); }}
        title="Approve Advance"
        confirmLabel="Approve"
        onConfirm={async (notes) => handle(() => approve({ id: actionItem as Id<"advances">, notes: notes || undefined }), "Advance approved")}
      />
      <ApprovalNotesDialog
        open={actionType === "reject" && !!actionItem}
        onClose={() => { setActionItem(null); setActionType(null); }}
        title="Reject Advance"
        confirmLabel="Reject"
        notesLabel="Rejection reason"
        confirmClass="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onConfirm={async (notes) => handle(() => reject({ id: actionItem as Id<"advances">, notes: notes || undefined }), "Advance rejected")}
      />
    </>
  );
}

function WithdrawalsQueue({ agencyId }: { agencyId: Id<"agencies"> | null }) {
  const items = useQuery(api.withdrawals.listByAgency, agencyId ? { agencyId, status: "pending" } : { status: "pending" });
  const approve = useMutation(api.withdrawals.approve);
  const reject  = useMutation(api.withdrawals.reject);
  const process_ = useMutation(api.withdrawals.process);

  const [actionItem, setActionItem] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "process" | null>(null);
  const [txRef, setTxRef] = useState("");

  const handle = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.success(msg); }
    catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Action failed");
    }
  };

  if (items === undefined) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  if (items.length === 0) return (
    <Empty><EmptyHeader><EmptyMedia variant="icon"><CheckCircle2 /></EmptyMedia><EmptyTitle>No pending withdrawals</EmptyTitle></EmptyHeader></Empty>
  );

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold">Worker</TableHead>
              <TableHead className="font-semibold hidden sm:table-cell">Date</TableHead>
              <TableHead className="font-semibold">Amount</TableHead>
              <TableHead className="font-semibold hidden md:table-cell">Bank</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item._id} className="hover:bg-muted/30">
                <TableCell>
                  <p className="font-medium text-sm">{item.workerName}</p>
                  <code className="text-xs text-muted-foreground">{item.workerEmployeeId}</code>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm font-mono">{item.requestedDate}</TableCell>
                <TableCell className="font-semibold text-sm">{fmt(item.amount, item.currency)}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{item.bankName}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => { setActionItem(item._id); setActionType("approve"); }}>
                      <CheckCircle2 size={11} /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 px-2 text-destructive hover:text-destructive" onClick={() => { setActionItem(item._id); setActionType("reject"); }}>
                      <XCircle size={11} /> Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ApprovalNotesDialog
        open={actionType === "approve" && !!actionItem}
        onClose={() => { setActionItem(null); setActionType(null); }}
        title="Approve Withdrawal"
        confirmLabel="Approve"
        onConfirm={async (notes) => handle(() => approve({ id: actionItem as Id<"withdrawals">, notes: notes || undefined }), "Withdrawal approved")}
      />
      <ApprovalNotesDialog
        open={actionType === "reject" && !!actionItem}
        onClose={() => { setActionItem(null); setActionType(null); }}
        title="Reject Withdrawal"
        notesLabel="Rejection reason" confirmLabel="Reject"
        confirmClass="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onConfirm={async (notes) => handle(() => reject({ id: actionItem as Id<"withdrawals">, rejectionReason: notes || undefined }), "Withdrawal rejected")}
      />

      {/* Process with tx ref */}
      <Dialog open={actionType === "process" && !!actionItem} onOpenChange={(o) => { if (!o) { setActionItem(null); setActionType(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-serif">Process Withdrawal</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <div className="space-y-1.5">
              <Label>Transaction Reference <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input placeholder="Bank ref / receipt no." value={txRef} onChange={(e) => setTxRef(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setActionItem(null); setActionType(null); }}>Cancel</Button>
            <Button onClick={() => handle(() => process_({ id: actionItem as Id<"withdrawals">, transactionRef: txRef || undefined }), "Withdrawal processed")}>Process</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RemittancesQueue({ agencyId }: { agencyId: Id<"agencies"> | null }) {
  const items = useQuery(api.remittances.listByAgency, agencyId ? { agencyId, status: "pending" } : { status: "pending" });
  const approve = useMutation(api.remittances.approve);
  const reject  = useMutation(api.remittances.reject);

  const [actionItem, setActionItem] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);

  const handle = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.success(msg); }
    catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Action failed");
    }
  };

  if (items === undefined) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  if (items.length === 0) return (
    <Empty><EmptyHeader><EmptyMedia variant="icon"><CheckCircle2 /></EmptyMedia><EmptyTitle>No pending remittances</EmptyTitle></EmptyHeader></Empty>
  );

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold">Worker</TableHead>
              <TableHead className="font-semibold hidden sm:table-cell">Date</TableHead>
              <TableHead className="font-semibold">Send</TableHead>
              <TableHead className="font-semibold hidden md:table-cell">Recipient</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item._id} className="hover:bg-muted/30">
                <TableCell>
                  <p className="font-medium text-sm">{item.workerName}</p>
                  <code className="text-xs text-muted-foreground">{item.workerEmployeeId}</code>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm font-mono">{item.requestedDate}</TableCell>
                <TableCell>
                  <p className="font-semibold text-sm">{fmt(item.totalDebit, item.sendCurrency)}</p>
                  <p className="text-xs text-muted-foreground">→ {fmt(item.receiveAmount, item.receiveCurrency)}</p>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  <p>{item.recipientName}</p>
                  <p className="text-xs">{item.recipientCountry}</p>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => { setActionItem(item._id); setActionType("approve"); }}>
                      <CheckCircle2 size={11} /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 px-2 text-destructive hover:text-destructive" onClick={() => { setActionItem(item._id); setActionType("reject"); }}>
                      <XCircle size={11} /> Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ApprovalNotesDialog
        open={actionType === "approve" && !!actionItem}
        onClose={() => { setActionItem(null); setActionType(null); }}
        title="Approve Remittance" confirmLabel="Approve"
        onConfirm={async (notes) => handle(() => approve({ id: actionItem as Id<"remittances">, notes: notes || undefined }), "Remittance approved")}
      />
      <ApprovalNotesDialog
        open={actionType === "reject" && !!actionItem}
        onClose={() => { setActionItem(null); setActionType(null); }}
        title="Reject Remittance" notesLabel="Rejection reason" confirmLabel="Reject"
        confirmClass="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onConfirm={async (notes) => handle(() => reject({ id: actionItem as Id<"remittances">, rejectionReason: notes || undefined }), "Remittance rejected")}
      />
    </>
  );
}

function ApprovalTab({ agencyId }: { agencyId: Id<"agencies"> | null }) {
  const counts = useQuery(api.admin.getPendingCounts, agencyId ? { agencyId } : {});
  const [sub, setSub] = useState<ApprovalCategory>("advances");

  return (
    <div className="space-y-4">
      {/* Pending count banner */}
      {counts && counts.total > 0 && (
        <div className="flex gap-3 flex-wrap">
          {[
            { key: "advances" as const, label: "Advances", count: counts.advances, icon: <ArrowDownRight size={14} /> },
            { key: "withdrawals" as const, label: "Withdrawals", count: counts.withdrawals, icon: <Wallet size={14} /> },
            { key: "remittances" as const, label: "Remittances", count: counts.remittances, icon: <Send size={14} /> },
          ].map((c) => c.count > 0 && (
            <button
              key={c.key}
              onClick={() => setSub(c.key)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors",
                sub === c.key ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted/50",
              )}
            >
              {c.icon}
              <span className="font-semibold">{c.count}</span>
              <span className="text-xs opacity-80">{c.label}</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium">
                <Clock size={10} /> Pending
              </span>
            </button>
          ))}
        </div>
      )}

      <Tabs value={sub} onValueChange={(v) => setSub(v as ApprovalCategory)}>
        <TabsList className="h-8">
          <TabsTrigger value="advances" className="text-xs h-7 gap-1">
            <ArrowDownRight size={12} /> Advances
            {counts?.advances ? <span className="ml-1 bg-amber-500 text-white rounded-full text-[10px] px-1.5 leading-4">{counts.advances}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="text-xs h-7 gap-1">
            <Wallet size={12} /> Withdrawals
            {counts?.withdrawals ? <span className="ml-1 bg-amber-500 text-white rounded-full text-[10px] px-1.5 leading-4">{counts.withdrawals}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="remittances" className="text-xs h-7 gap-1">
            <Send size={12} /> Remittances
            {counts?.remittances ? <span className="ml-1 bg-amber-500 text-white rounded-full text-[10px] px-1.5 leading-4">{counts.remittances}</span> : null}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="advances" className="mt-3"><AdvancesQueue agencyId={agencyId} /></TabsContent>
        <TabsContent value="withdrawals" className="mt-3"><WithdrawalsQueue agencyId={agencyId} /></TabsContent>
        <TabsContent value="remittances" className="mt-3"><RemittancesQueue agencyId={agencyId} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ── Audit Log Tab ─────────────────────────────────────────────────────────────

function AuditLogTab({ agencyId }: { agencyId: Id<"agencies"> | null }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  type EntryType = "wage_credit" | "advance_credit" | "advance_repayment" | "withdrawal" | "marketplace_debit" | "adjustment" | "remittance";
  const resolvedType: EntryType | undefined = typeFilter !== "all" ? (typeFilter as EntryType) : undefined;
  const entries = useQuery(
    api.admin.getAuditLog,
    agencyId
      ? { agencyId, entryType: resolvedType, limit: 200 }
      : { entryType: resolvedType, limit: 200 },
  );

  const filtered = (entries ?? []).filter((e) => {
    const q = search.toLowerCase();
    return !q || e.workerName.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.workerEmployeeId.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8 h-8 text-sm" placeholder="Search entries…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(ENTRY_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {entries === undefined ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ScrollText /></EmptyMedia>
            <EmptyTitle>No audit log entries</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Worker</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">Description</TableHead>
                <TableHead className="font-semibold">Amount</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Balance After</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Date</TableHead>
                <TableHead className="font-semibold hidden xl:table-cell">By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => {
                const meta = ENTRY_TYPE_LABELS[e.entryType] ?? { label: e.entryType, icon: <Receipt size={12} />, color: "text-muted-foreground" };
                const isCredit = e.amount > 0;
                return (
                  <TableRow key={e._id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className={cn("flex items-center gap-1.5 text-xs font-medium", meta.color)}>
                        {meta.icon} <span className="hidden sm:inline">{meta.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{e.workerName}</p>
                      <code className="text-xs text-muted-foreground">{e.workerEmployeeId}</code>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <p className="text-sm text-muted-foreground line-clamp-1 max-w-[220px]">{e.description}</p>
                    </TableCell>
                    <TableCell>
                      <span className={cn("font-semibold text-sm", isCredit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                        {isCredit ? "+" : ""}{fmt(e.amount, e.currency)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm font-mono text-muted-foreground">
                      {fmt(e.balanceAfter, e.currency)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm font-mono">{e.date}</TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">{e.createdByName}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Wallet Adjustments Tab ────────────────────────────────────────────────────

function WalletAdjustmentsTab({ agencyId }: { agencyId: Id<"agencies"> | null }) {
  const workers = useQuery(api.workers.list, { agencyId: agencyId ?? undefined, status: "active" });
  const addAdjustment = useMutation(api.wallet.addAdjustment);

  const [workerId, setWorkerId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const wallet = useQuery(
    api.wallet.getWallet,
    workerId ? { workerId: workerId as Id<"workers"> } : "skip",
  );
  const available = wallet ? wallet.earned - wallet.advances - wallet.spent - wallet.withdrawn : 0;

  const handleSubmit = async () => {
    if (!workerId || !amount || !description || !agencyId) { toast.error("Fill in all fields"); return; }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum === 0) { toast.error("Enter a non-zero amount"); return; }
    setSaving(true);
    try {
      await addAdjustment({
        workerId: workerId as Id<"workers">,
        agencyId,
        amount: amountNum,
        currency: wallet?.currency ?? "MYR",
        description,
        date: new Date().toISOString().split("T")[0],
      });
      toast.success("Adjustment recorded");
      setWorkerId(""); setAmount(""); setDescription("");
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to add adjustment");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="rounded-lg border bg-muted/40 p-4 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-muted-foreground">
          <strong className="text-foreground">Manual wallet adjustment.</strong> Use this to correct wallet
          balances due to errors, bonuses, or special deductions. Positive amounts credit the wallet;
          negative amounts debit it. All adjustments are recorded in the audit log.
        </div>
      </div>

      {!agencyId ? (
        <p className="text-sm text-muted-foreground text-center py-8">Select an agency to make adjustments</p>
      ) : (
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <h3 className="font-semibold font-serif text-base">New Adjustment</h3>

          <div className="space-y-1.5">
            <Label>Worker <span className="text-destructive">*</span></Label>
            <Select value={workerId} onValueChange={setWorkerId}>
              <SelectTrigger><SelectValue placeholder="Select worker…" /></SelectTrigger>
              <SelectContent>
                {(workers ?? []).map((w) => (
                  <SelectItem key={w._id} value={w._id}>
                    {w.firstName} {w.lastName}
                    <span className="text-muted-foreground font-mono text-xs ml-2">{w.employeeId}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {workerId && wallet !== undefined && (
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm flex justify-between">
              <span className="text-muted-foreground">Available Balance</span>
              <span className="font-bold">{fmt(available, wallet?.currency ?? "MYR")}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Amount <span className="text-destructive">*</span></Label>
            <Input
              type="number" step="0.01" placeholder="+100 (credit) or -50 (debit)"
              value={amount} onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Use positive numbers to add to wallet, negative to deduct.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Reason / Description <span className="text-destructive">*</span></Label>
            <Textarea
              rows={2} placeholder="e.g. Bonus payment, Error correction…"
              value={description} onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Button onClick={handleSubmit} disabled={saving || !workerId || !amount || !description} className="w-full">
            {saving ? "Recording…" : "Record Adjustment"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Platform Stats ────────────────────────────────────────────────────────────

function PlatformStats({ agencyId }: { agencyId: Id<"agencies"> | null }) {
  const stats = useQuery(api.admin.getPlatformStats, agencyId ? { agencyId } : {});
  const counts = useQuery(api.admin.getPendingCounts, agencyId ? { agencyId } : {});

  const cards = [
    { label: "Active Workers",    value: stats?.workers ?? "—",    icon: <Users size={15} />,       color: "text-blue-500" },
    { label: "Total Advances",    value: stats?.advances ?? "—",   icon: <ArrowDownRight size={15} />, color: "text-purple-500" },
    { label: "Withdrawals",       value: stats?.withdrawals ?? "—", icon: <Wallet size={15} />,      color: "text-amber-500" },
    { label: "Remittances",       value: stats?.remittances ?? "—", icon: <Send size={15} />,        color: "text-indigo-500" },
    { label: "Orders",            value: stats?.orders ?? "—",     icon: <ShoppingBag size={15} />, color: "text-orange-500" },
    {
      label: "Pending Actions",
      value: counts?.total !== undefined ? String(counts.total) : "—",
      icon: <Clock size={15} />,
      color: counts?.total ? "text-red-500" : "text-green-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border bg-card p-3">
          <div className={cn("mb-1.5", c.color)}>{c.icon}</div>
          <p className="text-xl font-bold font-serif">{c.value}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Admin Content ────────────────────────────────────────────────────────

function AdminContent() {
  const { isSuperadmin } = useAgency();
  const { agencyId } = useAgency();
  const myRole = useQuery(api.userRoles.getMyRole, {});
  const [tab, setTab] = useState("users");

  if (myRole === undefined) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!myRole?.role) {
    return (
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold font-serif">Admin</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform administration</p>
        </div>
        <BootstrapCard />
      </div>
    );
  }

  // Agency admins get Approval + Audit tabs (but not Users/Adjustments which are superadmin-only)
  const isAgencyAdmin = myRole.role === "agency_admin";
  const canManageUsers = isSuperadmin;
  const canApprove = isSuperadmin || isAgencyAdmin;
  const canAudit   = isSuperadmin || isAgencyAdmin;

  if (!canApprove && !canAudit) {
    return (
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold font-serif">Admin</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform administration</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <ShieldCheck size={24} className="text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg font-serif">Restricted Access</h3>
          <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs">
            Only admins can access this section. Contact your administrator.
          </p>
          <div className="mt-4 px-4 py-2 rounded-lg bg-muted text-sm">
            Your role: <span className="font-semibold capitalize">{myRole.role?.replace(/_/g, " ")}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground">Admin</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isSuperadmin ? "Platform administration — user management, approvals and audit" : "Agency administration — approvals and audit log"}
          </p>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0",
          isSuperadmin
            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
            : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
        )}>
          <ShieldCheck size={13} />
          {isSuperadmin ? "Superadmin" : "Agency Admin"}
        </div>
      </div>

      {/* Platform stats */}
      <PlatformStats agencyId={agencyId} />

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8">
          {canManageUsers && (
            <TabsTrigger value="users" className="text-xs h-7 gap-1">
              <Users size={12} /> Users & Roles
            </TabsTrigger>
          )}
          {canApprove && (
            <TabsTrigger value="approvals" className="text-xs h-7 gap-1">
              <ClipboardList size={12} /> Approval Queue
            </TabsTrigger>
          )}
          {canAudit && (
            <TabsTrigger value="audit" className="text-xs h-7 gap-1">
              <ScrollText size={12} /> Audit Log
            </TabsTrigger>
          )}
          {canManageUsers && (
            <TabsTrigger value="adjustments" className="text-xs h-7 gap-1">
              <Activity size={12} /> Wallet Adjustments
            </TabsTrigger>
          )}
        </TabsList>

        {canManageUsers && (
          <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        )}
        {canApprove && (
          <TabsContent value="approvals" className="mt-4"><ApprovalTab agencyId={agencyId} /></TabsContent>
        )}
        {canAudit && (
          <TabsContent value="audit" className="mt-4"><AuditLogTab agencyId={agencyId} /></TabsContent>
        )}
        {canManageUsers && (
          <TabsContent value="adjustments" className="mt-4"><WalletAdjustmentsTab agencyId={agencyId} /></TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default function AdminPage() {
  return (
    <>
      <Authenticated><AdminContent /></Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">Admin access requires authentication</p>
          </div>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
