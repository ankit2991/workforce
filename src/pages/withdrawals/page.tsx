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
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  ArrowUpFromLine,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Banknote,
  Clock,
  Trash2,
  Copy,
  Building2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useAgency } from "@/components/providers/agency.tsx";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

type WithdrawalRow = {
  _id: Id<"withdrawals">;
  _creationTime: number;
  workerId: Id<"workers">;
  agencyId: Id<"agencies">;
  amount: number;
  currency: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  status: "pending" | "approved" | "rejected" | "processed";
  requestedDate: string;
  approvedDate?: string;
  processedDate?: string;
  transactionRef?: string;
  rejectionReason?: string;
  notes?: string;
  createdBy: Id<"users">;
  workerName: string;
  workerEmployeeId: string;
  availableBalance: number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<WithdrawalRow["status"], string> = {
  pending:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  approved:  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  rejected:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  processed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const STATUS_ICONS: Record<WithdrawalRow["status"], React.ReactNode> = {
  pending:   <Clock size={11} />,
  approved:  <CheckCircle2 size={11} />,
  rejected:  <XCircle size={11} />,
  processed: <Banknote size={11} />,
};

const fmt = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);

// ── Create Withdrawal Dialog ──────────────────────────────────────────────────

function CreateWithdrawalDialog({
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
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [requestedDate, setRequestedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const workers = useQuery(api.workers.list, { agencyId: agencyId ?? undefined, status: "active" });
  const selectedWorker = workers?.find((w) => w._id === workerId);
  const wallet = useQuery(
    api.wallet.getWallet,
    workerId ? { workerId: workerId as Id<"workers"> } : "skip",
  );
  const available = wallet ? wallet.earned - wallet.advances - wallet.spent - wallet.withdrawn : 0;

  const create = useMutation(api.withdrawals.create);

  // Auto-fill bank details when worker selected
  const handleWorkerChange = (id: string) => {
    setWorkerId(id);
    const w = workers?.find((w) => w._id === id);
    if (w) {
      setBankName(w.bankName ?? "");
      setBankAccountNumber(w.bankAccountNumber ?? "");
      setBankAccountName(w.bankAccountName ?? "");
    }
  };

  const reset = () => {
    setWorkerId(""); setAmount(""); setCurrency("MYR");
    setBankName(""); setBankAccountNumber(""); setBankAccountName("");
    setRequestedDate(format(new Date(), "yyyy-MM-dd")); setNotes("");
  };

  const handleSubmit = async () => {
    if (!workerId || !amount || !agencyId || !bankName || !bankAccountNumber || !bankAccountName) {
      toast.error("Please fill in all required fields");
      return;
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      await create({
        workerId: workerId as Id<"workers">,
        agencyId,
        amount: parsed,
        currency,
        bankName,
        bankAccountNumber,
        bankAccountName,
        requestedDate,
        notes: notes || undefined,
      });
      toast.success("Withdrawal request created");
      reset();
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const d = err.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Failed to create withdrawal");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">New Withdrawal Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Worker */}
          <div className="space-y-1.5">
            <Label>Worker <span className="text-destructive">*</span></Label>
            <Select value={workerId} onValueChange={handleWorkerChange}>
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

          {/* Balance indicator */}
          {workerId && wallet !== undefined && (
            <div className={cn(
              "rounded-lg px-3 py-2 text-sm flex items-center justify-between",
              available > 0 ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                            : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400",
            )}>
              <span className="text-xs font-medium">Available Balance</span>
              <span className="font-bold">{fmt(available, wallet?.currency ?? currency)}</span>
            </div>
          )}

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
            <Input type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} />
          </div>

          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bank Details</p>

          {/* Bank fields */}
          <div className="space-y-1.5">
            <Label>Bank Name <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g. Maybank, CIMB, Public Bank…"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Account Number <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g. 1234567890"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Account Name <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Name as on bank account"
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
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
          <Button
            onClick={handleSubmit}
            disabled={saving || !workerId || !amount || !bankName || !bankAccountNumber || !bankAccountName}
          >
            {saving ? "Creating…" : "Create Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Process Dialog ────────────────────────────────────────────────────────────

function ProcessDialog({
  open,
  onClose,
  withdrawal,
}: {
  open: boolean;
  onClose: () => void;
  withdrawal: WithdrawalRow | null;
}) {
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const processMutation = useMutation(api.withdrawals.process);

  if (!withdrawal) return null;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await processMutation({
        id: withdrawal._id,
        transactionRef: transactionRef || undefined,
        notes: notes || undefined,
      });
      toast.success("Withdrawal marked as processed and wallet debited");
      setTransactionRef(""); setNotes("");
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const d = err.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Failed to process withdrawal");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">Process Withdrawal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Summary */}
          <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Worker</span>
              <span className="font-medium">{withdrawal.workerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold text-base">{fmt(withdrawal.amount, withdrawal.currency)}</span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bank</span>
              <span>{withdrawal.bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account</span>
              <span className="font-mono text-xs">{withdrawal.bankAccountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{withdrawal.bankAccountName}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Transaction Reference</Label>
            <Input
              placeholder="Bank receipt / reference number"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input
              placeholder="Optional notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
            <span>This will debit <strong>{fmt(withdrawal.amount, withdrawal.currency)}</strong> from the worker's wallet immediately.</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Processing…" : "Confirm & Process"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Reject Dialog ─────────────────────────────────────────────────────────────

function RejectDialog({
  open,
  onClose,
  withdrawal,
}: {
  open: boolean;
  onClose: () => void;
  withdrawal: WithdrawalRow | null;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const rejectMutation = useMutation(api.withdrawals.reject);

  if (!withdrawal) return null;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await rejectMutation({ id: withdrawal._id, rejectionReason: reason || undefined });
      toast.success("Withdrawal rejected");
      setReason("");
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const d = err.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Failed to reject withdrawal");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">Reject Withdrawal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Reject <strong>{withdrawal.workerName}</strong>'s withdrawal of{" "}
            <strong>{fmt(withdrawal.amount, withdrawal.currency)}</strong>?
          </p>
          <div className="space-y-1.5">
            <Label>Reason <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              rows={2}
              placeholder="Explain why this withdrawal is being rejected…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={saving}>
            {saving ? "Rejecting…" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Detail Sheet ──────────────────────────────────────────────────────────────

function WithdrawalDetailSheet({
  open,
  onClose,
  withdrawal,
}: {
  open: boolean;
  onClose: () => void;
  withdrawal: WithdrawalRow | null;
}) {
  if (!withdrawal) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-sm overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="font-serif">Withdrawal Details</SheetTitle>
          <p className="text-sm font-medium">{withdrawal.workerName}</p>
          <code className="text-xs text-muted-foreground">{withdrawal.workerEmployeeId}</code>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <Badge className={cn("border-0 text-xs gap-1 w-fit", STATUS_COLORS[withdrawal.status])}>
              {STATUS_ICONS[withdrawal.status]}
              {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
            </Badge>
            <span className="text-xl font-bold font-serif">{fmt(withdrawal.amount, withdrawal.currency)}</span>
          </div>
        </SheetHeader>

        <div className="py-4 space-y-4 text-sm">
          {/* Bank details */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <Building2 size={11} /> Bank Details
            </p>
            <div className="rounded-lg bg-muted/30 p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Bank</span>
                <span className="font-medium">{withdrawal.bankName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Account No.</span>
                <div className="flex items-center gap-1">
                  <code className="text-xs font-mono">{withdrawal.bankAccountNumber}</code>
                  <button
                    onClick={() => copyToClipboard(withdrawal.bankAccountNumber, "Account number")}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Copy size={11} />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Account Name</span>
                <span>{withdrawal.bankAccountName}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Timeline</p>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requested</span>
                <span>{withdrawal.requestedDate}</span>
              </div>
              {withdrawal.approvedDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved</span>
                  <span>{withdrawal.approvedDate}</span>
                </div>
              )}
              {withdrawal.processedDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processed</span>
                  <span className="text-green-600 dark:text-green-400">{withdrawal.processedDate}</span>
                </div>
              )}
            </div>
          </div>

          {withdrawal.transactionRef && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Transaction Reference</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1">{withdrawal.transactionRef}</code>
                  <button
                    onClick={() => copyToClipboard(withdrawal.transactionRef!, "Transaction ref")}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>
            </>
          )}

          {withdrawal.rejectionReason && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Rejection Reason</p>
                <p className="text-red-600 dark:text-red-400">{withdrawal.rejectionReason}</p>
              </div>
            </>
          )}

          {withdrawal.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                <p className="text-muted-foreground">{withdrawal.notes}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ withdrawals }: { withdrawals: WithdrawalRow[] }) {
  const pending   = withdrawals.filter((w) => w.status === "pending").length;
  const approved  = withdrawals.filter((w) => w.status === "approved").length;
  const processed = withdrawals.filter((w) => w.status === "processed");
  const totalProcessed = processed.reduce((s, w) => s + w.amount, 0);
  const currency  = withdrawals[0]?.currency ?? "MYR";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        { label: "Pending Review",    value: pending,                           icon: <Clock size={16} />,         color: "text-amber-500" },
        { label: "Awaiting Transfer", value: approved,                          icon: <CheckCircle2 size={16} />,  color: "text-blue-500" },
        { label: "Processed",         value: processed.length,                  icon: <Banknote size={16} />,      color: "text-green-500" },
        { label: "Total Paid Out",    value: fmt(totalProcessed, currency),     icon: <ArrowUpFromLine size={16} />, color: "text-purple-500" },
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

// ── Main Table ────────────────────────────────────────────────────────────────

function WithdrawalsTable({
  withdrawals,
  onView,
  onProcess,
  onReject,
}: {
  withdrawals: WithdrawalRow[];
  onView: (w: WithdrawalRow) => void;
  onProcess: (w: WithdrawalRow) => void;
  onReject: (w: WithdrawalRow) => void;
}) {
  const approveMutation = useMutation(api.withdrawals.approve);
  const removeMutation  = useMutation(api.withdrawals.remove);

  const handle = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.success(msg); }
    catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Action failed");
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
            <TableHead className="font-semibold hidden md:table-cell">Bank</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {withdrawals.map((w) => (
            <TableRow
              key={w._id}
              className="hover:bg-muted/30 cursor-pointer"
              onClick={() => onView(w)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    {w.workerName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{w.workerName}</p>
                    <code className="text-xs text-muted-foreground">{w.workerEmployeeId}</code>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm font-mono">
                {w.requestedDate}
              </TableCell>
              <TableCell>
                <p className="font-semibold text-sm">{fmt(w.amount, w.currency)}</p>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <p className="text-sm font-medium">{w.bankName}</p>
                <code className="text-xs text-muted-foreground">{w.bankAccountNumber}</code>
              </TableCell>
              <TableCell>
                <Badge className={cn("border-0 text-xs gap-1", STATUS_COLORS[w.status])}>
                  {STATUS_ICONS[w.status]}
                  {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
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
                    <DropdownMenuItem onClick={() => onView(w)}>View details</DropdownMenuItem>

                    {w.status === "pending" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handle(() => approveMutation({ id: w._id }), "Withdrawal approved")}>
                          <CheckCircle2 size={13} className="mr-2 text-blue-500" /> Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onReject(w)} className="text-destructive">
                          <XCircle size={13} className="mr-2" /> Reject
                        </DropdownMenuItem>
                      </>
                    )}

                    {w.status === "approved" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onProcess(w)}>
                          <Banknote size={13} className="mr-2 text-green-500" /> Mark as Processed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onReject(w)} className="text-destructive">
                          <XCircle size={13} className="mr-2" /> Reject
                        </DropdownMenuItem>
                      </>
                    )}

                    {(w.status === "pending" || w.status === "rejected") && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handle(() => removeMutation({ id: w._id }), "Deleted")}
                        >
                          <Trash2 size={13} className="mr-2" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Main Content ──────────────────────────────────────────────────────────────

function WithdrawalsContent() {
  const { agencyId } = useAgency();
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<WithdrawalRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [processItem, setProcessItem] = useState<WithdrawalRow | null>(null);
  const [processOpen, setProcessOpen] = useState(false);
  const [rejectItem, setRejectItem] = useState<WithdrawalRow | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const withdrawals = useQuery(
    api.withdrawals.listByAgency,
    agencyId
      ? {
          agencyId,
          status: statusFilter !== "all" ? (statusFilter as WithdrawalRow["status"]) : undefined,
        }
      : "skip",
  ) as WithdrawalRow[] | undefined;

  const openDetail  = (w: WithdrawalRow) => { setDetailItem(w);  setDetailOpen(true); };
  const openProcess = (w: WithdrawalRow) => { setProcessItem(w); setProcessOpen(true); };
  const openReject  = (w: WithdrawalRow) => { setRejectItem(w);  setRejectOpen(true); };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground">Withdrawals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage bank withdrawal requests from worker wallets
          </p>
        </div>
        {agencyId && (
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5 flex-shrink-0">
            <Plus size={15} /> New Request
          </Button>
        )}
      </div>

      {!agencyId ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ArrowUpFromLine size={36} className="mb-3 opacity-30" />
          <p className="text-sm">Select an agency in the sidebar to manage withdrawals</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          {withdrawals && withdrawals.length > 0 && <SummaryCards withdrawals={withdrawals} />}

          {/* Tabs */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs h-7">All</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs h-7">Pending</TabsTrigger>
              <TabsTrigger value="approved" className="text-xs h-7">Approved</TabsTrigger>
              <TabsTrigger value="processed" className="text-xs h-7">Processed</TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs h-7">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Table */}
          {withdrawals === undefined ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : withdrawals.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><ArrowUpFromLine /></EmptyMedia>
                <EmptyTitle>No withdrawals found</EmptyTitle>
                <EmptyDescription>
                  {statusFilter !== "all"
                    ? `No ${statusFilter} withdrawal requests`
                    : "Create the first bank withdrawal request"}
                </EmptyDescription>
              </EmptyHeader>
              {statusFilter === "all" && (
                <EmptyContent>
                  <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                    <Plus size={13} /> New Request
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <WithdrawalsTable
              withdrawals={withdrawals}
              onView={openDetail}
              onProcess={openProcess}
              onReject={openReject}
            />
          )}
        </>
      )}

      <CreateWithdrawalDialog open={createOpen} onClose={() => setCreateOpen(false)} agencyId={agencyId} />
      <WithdrawalDetailSheet open={detailOpen} onClose={() => setDetailOpen(false)} withdrawal={detailItem} />
      <ProcessDialog open={processOpen} onClose={() => setProcessOpen(false)} withdrawal={processItem} />
      <RejectDialog open={rejectOpen} onClose={() => setRejectOpen(false)} withdrawal={rejectItem} />
    </div>
  );
}

export default function WithdrawalsPage() {
  return (
    <>
      <Authenticated>
        <WithdrawalsContent />
      </Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">Manage withdrawals with your account</p>
          </div>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
