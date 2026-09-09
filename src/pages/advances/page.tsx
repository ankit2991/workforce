import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  TrendingUp,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Banknote,
  RefreshCw,
  Trash2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useAgency } from "@/components/providers/agency.tsx";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

type AdvanceRow = {
  _id: Id<"advances">;
  _creationTime: number;
  workerId: Id<"workers">;
  agencyId: Id<"agencies">;
  amount: number;
  currency: string;
  reason?: string;
  status: "pending" | "approved" | "rejected" | "disbursed" | "repaid";
  requestedDate: string;
  approvedDate?: string;
  disbursedDate?: string;
  repaidAmount: number;
  repaymentSchedule?: string;
  notes?: string;
  createdBy: Id<"users">;
  workerName: string;
  workerEmployeeId: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<AdvanceRow["status"], string> = {
  pending:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  approved:  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  rejected:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  disbursed: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  repaid:    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const STATUS_LABELS: Record<AdvanceRow["status"], string> = {
  pending:   "Pending",
  approved:  "Approved",
  rejected:  "Rejected",
  disbursed: "Disbursed",
  repaid:    "Repaid",
};

const fmt = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);

// ── Create Advance Dialog ─────────────────────────────────────────────────────

function CreateAdvanceDialog({
  open,
  onClose,
  agencyId,
}: {
  open: boolean;
  onClose: () => void;
  agencyId: Id<"agencies"> | null;
}) {
  const [workerId, setWorkerId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("MYR");
  const [reason, setReason] = useState("");
  const [requestedDate, setRequestedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [repaymentSchedule, setRepaymentSchedule] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const workers = useQuery(api.workers.list, { agencyId: agencyId ?? undefined, status: "active" });
  const create = useMutation(api.advances.create);

  const reset = () => {
    setWorkerId(""); setAmount(""); setCurrency("MYR"); setReason("");
    setRequestedDate(format(new Date(), "yyyy-MM-dd")); setRepaymentSchedule(""); setNotes("");
  };

  const handleSubmit = async () => {
    if (!workerId || !amount || !agencyId) return;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      await create({
        workerId: workerId as Id<"workers">,
        agencyId,
        amount: parsed,
        currency,
        reason: reason || undefined,
        requestedDate,
        repaymentSchedule: repaymentSchedule || undefined,
        notes: notes || undefined,
      });
      toast.success("Advance request created");
      reset();
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const d = err.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Failed to create advance");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">New Salary Advance</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Worker */}
          <div className="space-y-1.5">
            <Label>Worker <span className="text-destructive">*</span></Label>
            <Select value={workerId} onValueChange={setWorkerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select worker…" />
              </SelectTrigger>
              <SelectContent>
                {(workers ?? []).map((w) => (
                  <SelectItem key={w._id} value={w._id}>
                    <span>{w.firstName} {w.lastName}</span>
                    <span className="text-muted-foreground font-mono text-xs ml-2">{w.employeeId}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["MYR", "USD", "SGD", "IDR", "PHP", "THB", "VND"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Request Date</Label>
            <Input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input
              placeholder="e.g. Medical emergency, home repair…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Repayment schedule */}
          <div className="space-y-1.5">
            <Label>Repayment Schedule</Label>
            <Input
              placeholder="e.g. Deduct 200/month for 3 months"
              value={repaymentSchedule}
              onChange={(e) => setRepaymentSchedule(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              placeholder="Optional internal notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !workerId || !amount}>
            {saving ? "Creating…" : "Create Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Record Repayment Dialog ───────────────────────────────────────────────────

function RepaymentDialog({
  open,
  onClose,
  advance,
}: {
  open: boolean;
  onClose: () => void;
  advance: AdvanceRow | null;
}) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const recordRepayment = useMutation(api.advances.recordRepayment);

  if (!advance) return null;
  const outstanding = advance.amount - advance.repaidAmount;

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      await recordRepayment({ id: advance._id, amount: parsed, notes: notes || undefined });
      toast.success("Repayment recorded");
      setAmount(""); setNotes("");
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const d = err.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Failed to record repayment");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">Record Repayment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Worker</span>
              <span className="font-medium">{advance.workerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Advance</span>
              <span className="font-medium">{fmt(advance.amount, advance.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Repaid</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {fmt(advance.repaidAmount, advance.currency)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-1.5 font-semibold">
              <span>Outstanding</span>
              <span className="text-amber-600 dark:text-amber-400">{fmt(outstanding, advance.currency)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Repayment Amount <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              max={outstanding}
              placeholder={`Max ${fmt(outstanding, advance.currency)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input
              placeholder="e.g. Salary deduction Jan 2026"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !amount}>
            {saving ? "Recording…" : "Record Repayment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Advance Detail Sheet ──────────────────────────────────────────────────────

function AdvanceDetailSheet({
  open,
  onClose,
  advance,
}: {
  open: boolean;
  onClose: () => void;
  advance: AdvanceRow | null;
}) {
  if (!advance) return null;
  const outstanding = advance.amount - advance.repaidAmount;
  const progressPct = advance.amount > 0 ? Math.round((advance.repaidAmount / advance.amount) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-sm overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="font-serif">Salary Advance</SheetTitle>
          <p className="text-sm font-medium">{advance.workerName}</p>
          <p className="text-xs text-muted-foreground font-mono">{advance.workerEmployeeId}</p>
          <Badge className={cn("w-fit border-0 text-xs", STATUS_COLORS[advance.status])}>
            {STATUS_LABELS[advance.status]}
          </Badge>
        </SheetHeader>

        <div className="py-4 space-y-4 text-sm">
          {/* Amount summary */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Amount</p>
            <div className="grid grid-cols-2 gap-1.5 bg-muted/30 rounded-lg p-3">
              <span className="text-muted-foreground">Total</span>
              <span className="text-right font-semibold">{fmt(advance.amount, advance.currency)}</span>
              <span className="text-muted-foreground">Repaid</span>
              <span className="text-right text-green-600 dark:text-green-400">{fmt(advance.repaidAmount, advance.currency)}</span>
              <span className="text-muted-foreground">Outstanding</span>
              <span className="text-right text-amber-600 dark:text-amber-400 font-semibold">{fmt(outstanding, advance.currency)}</span>
            </div>
            {/* Progress bar */}
            {advance.status === "disbursed" && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Repayment progress</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Dates */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Timeline</p>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requested</span>
                <span>{advance.requestedDate}</span>
              </div>
              {advance.approvedDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved</span>
                  <span>{advance.approvedDate}</span>
                </div>
              )}
              {advance.disbursedDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Disbursed</span>
                  <span>{advance.disbursedDate}</span>
                </div>
              )}
            </div>
          </div>

          {advance.reason && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Reason</p>
                <p>{advance.reason}</p>
              </div>
            </>
          )}

          {advance.repaymentSchedule && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Repayment Schedule</p>
                <p>{advance.repaymentSchedule}</p>
              </div>
            </>
          )}

          {advance.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                <p className="text-muted-foreground">{advance.notes}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Advances Table ────────────────────────────────────────────────────────────

function AdvancesTable({
  advances,
  onView,
  onRepay,
}: {
  advances: AdvanceRow[];
  onView: (a: AdvanceRow) => void;
  onRepay: (a: AdvanceRow) => void;
}) {
  const approveMutation = useMutation(api.advances.approve);
  const rejectMutation = useMutation(api.advances.reject);
  const disburseMutation = useMutation(api.advances.disburse);
  const removeMutation = useMutation(api.advances.remove);

  const handle = async (fn: () => Promise<unknown>, successMsg: string) => {
    try {
      await fn();
      toast.success(successMsg);
    } catch (err) {
      if (err instanceof ConvexError) {
        const d = err.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Action failed");
      }
    }
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="font-semibold">Worker</TableHead>
            <TableHead className="font-semibold hidden sm:table-cell">Date</TableHead>
            <TableHead className="font-semibold">Amount</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Outstanding</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {advances.map((a) => {
            const outstanding = a.amount - a.repaidAmount;
            return (
              <TableRow
                key={a._id}
                className="hover:bg-muted/30 cursor-pointer"
                onClick={() => onView(a)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      {a.workerName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{a.workerName}</p>
                      <code className="text-xs text-muted-foreground">{a.workerEmployeeId}</code>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm font-mono">
                  {a.requestedDate}
                </TableCell>
                <TableCell className="font-semibold text-sm">
                  {fmt(a.amount, a.currency)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  {a.status === "disbursed" ? (
                    <span className="text-amber-600 dark:text-amber-400">{fmt(outstanding, a.currency)}</span>
                  ) : a.status === "repaid" ? (
                    <span className="text-green-600 dark:text-green-400">Fully repaid</span>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  <Badge className={cn("border-0 text-xs", STATUS_COLORS[a.status])}>
                    {STATUS_LABELS[a.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal size={13} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(a)}>
                        View details
                      </DropdownMenuItem>
                      {a.status === "pending" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handle(() => approveMutation({ id: a._id }), "Advance approved")}>
                            <CheckCircle2 size={13} className="mr-2 text-blue-500" /> Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handle(() => rejectMutation({ id: a._id }), "Advance rejected")} className="text-destructive">
                            <XCircle size={13} className="mr-2" /> Reject
                          </DropdownMenuItem>
                        </>
                      )}
                      {a.status === "approved" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handle(() => disburseMutation({ id: a._id }), "Advance disbursed to wallet")}>
                            <Banknote size={13} className="mr-2 text-purple-500" /> Disburse to Wallet
                          </DropdownMenuItem>
                        </>
                      )}
                      {a.status === "disbursed" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onRepay(a)}>
                            <RefreshCw size={13} className="mr-2 text-green-500" /> Record Repayment
                          </DropdownMenuItem>
                        </>
                      )}
                      {(a.status === "pending" || a.status === "rejected") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handle(() => removeMutation({ id: a._id }), "Deleted")}
                          >
                            <Trash2 size={13} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ advances }: { advances: AdvanceRow[] }) {
  const pending   = advances.filter((a) => a.status === "pending").length;
  const approved  = advances.filter((a) => a.status === "approved").length;
  const disbursed = advances.filter((a) => a.status === "disbursed");
  const totalOutstanding = disbursed.reduce((s, a) => s + (a.amount - a.repaidAmount), 0);
  const currency = disbursed[0]?.currency ?? "MYR";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        { label: "Pending Approval", value: pending, icon: <Clock size={16} />, color: "text-amber-500" },
        { label: "Approved", value: approved, icon: <CheckCircle2 size={16} />, color: "text-blue-500" },
        { label: "Active Disbursed", value: disbursed.length, icon: <Banknote size={16} />, color: "text-purple-500" },
        { label: "Total Outstanding", value: fmt(totalOutstanding, currency), icon: <AlertCircle size={16} />, color: "text-orange-500" },
      ].map((card) => (
        <div key={card.label} className="rounded-xl border bg-card p-4">
          <div className={cn("mb-2", card.color)}>{card.icon}</div>
          <p className="text-xl font-bold font-serif">{card.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Content ──────────────────────────────────────────────────────────────

function AdvancesContent() {
  const { agencyId } = useAgency();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailAdvance, setDetailAdvance] = useState<AdvanceRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [repayAdvance, setRepayAdvance] = useState<AdvanceRow | null>(null);
  const [repayOpen, setRepayOpen] = useState(false);

  const advances = useQuery(
    api.advances.listByAgency,
    agencyId
      ? { agencyId, status: statusFilter !== "all" ? (statusFilter as AdvanceRow["status"]) : undefined }
      : "skip",
  ) as AdvanceRow[] | undefined;

  const openDetail = (a: AdvanceRow) => { setDetailAdvance(a); setDetailOpen(true); };
  const openRepay  = (a: AdvanceRow) => { setRepayAdvance(a); setRepayOpen(true); };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground">Salary Advances</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Request, approve, disburse, and track repayment of salary advances
          </p>
        </div>
        {agencyId && (
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5 flex-shrink-0">
            <Plus size={15} /> New Advance
          </Button>
        )}
      </div>

      {!agencyId ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <TrendingUp size={36} className="mb-3 opacity-30" />
          <p className="text-sm">Select an agency in the sidebar to manage advances</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          {advances && advances.length > 0 && <SummaryCards advances={advances} />}

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs h-7">All</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs h-7">Pending</TabsTrigger>
                <TabsTrigger value="approved" className="text-xs h-7">Approved</TabsTrigger>
                <TabsTrigger value="disbursed" className="text-xs h-7">Disbursed</TabsTrigger>
                <TabsTrigger value="repaid" className="text-xs h-7">Repaid</TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs h-7">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Table */}
          {advances === undefined ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : advances.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><TrendingUp /></EmptyMedia>
                <EmptyTitle>No advances found</EmptyTitle>
                <EmptyDescription>
                  {statusFilter !== "all"
                    ? `No ${statusFilter} advances`
                    : "Create the first salary advance request"}
                </EmptyDescription>
              </EmptyHeader>
              {statusFilter === "all" && (
                <EmptyContent>
                  <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                    <Plus size={13} /> New Advance
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <AdvancesTable
              advances={advances}
              onView={openDetail}
              onRepay={openRepay}
            />
          )}
        </>
      )}

      <CreateAdvanceDialog open={createOpen} onClose={() => setCreateOpen(false)} agencyId={agencyId} />
      <AdvanceDetailSheet open={detailOpen} onClose={() => setDetailOpen(false)} advance={detailAdvance} />
      <RepaymentDialog open={repayOpen} onClose={() => setRepayOpen(false)} advance={repayAdvance} />
    </div>
  );
}

export default function AdvancesPage() {
  return (
    <>
      <Authenticated>
        <AdvancesContent />
      </Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">Manage salary advances with your account</p>
          </div>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
