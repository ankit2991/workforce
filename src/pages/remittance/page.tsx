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
  Globe,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Send,
  Clock,
  Trash2,
  Copy,
  AlertCircle,
  RefreshCw,
  Building2,
  Smartphone,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useAgency } from "@/components/providers/agency.tsx";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

type RemittanceRow = {
  _id: Id<"remittances">;
  _creationTime: number;
  workerId: Id<"workers">;
  agencyId: Id<"agencies">;
  sendAmount: number;
  sendCurrency: string;
  receiveAmount: number;
  receiveCurrency: string;
  exchangeRate: number;
  transferFee: number;
  totalDebit: number;
  recipientName: string;
  recipientCountry: string;
  recipientPhone?: string;
  transferMethod: "bank_transfer" | "mobile_wallet" | "cash_pickup";
  recipientBankName?: string;
  recipientAccountNumber?: string;
  recipientAccountName?: string;
  mobileWalletProvider?: string;
  mobileWalletNumber?: string;
  cashPickupLocation?: string;
  purpose?: string;
  status: "pending" | "approved" | "rejected" | "processing" | "completed" | "failed";
  requestedDate: string;
  approvedDate?: string;
  processedDate?: string;
  completedDate?: string;
  partnerReference?: string;
  rejectionReason?: string;
  failureReason?: string;
  notes?: string;
  createdBy: Id<"users">;
  workerName: string;
  workerEmployeeId: string;
  availableBalance: number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<RemittanceRow["status"], string> = {
  pending:    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  approved:   "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  rejected:   "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  processing: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  completed:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  failed:     "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
};

const METHOD_ICONS: Record<RemittanceRow["transferMethod"], React.ReactNode> = {
  bank_transfer:  <Building2 size={13} />,
  mobile_wallet:  <Smartphone size={13} />,
  cash_pickup:    <MapPin size={13} />,
};

const METHOD_LABELS: Record<RemittanceRow["transferMethod"], string> = {
  bank_transfer: "Bank Transfer",
  mobile_wallet: "Mobile Wallet",
  cash_pickup:   "Cash Pickup",
};

// Popular destination countries for workers in Malaysia
const COUNTRIES = [
  "Indonesia", "Bangladesh", "Nepal", "Myanmar", "Philippines",
  "Vietnam", "India", "Pakistan", "Sri Lanka", "Cambodia",
  "Thailand", "China", "Nigeria", "Ghana", "Others",
];

const CURRENCIES: Record<string, string> = {
  IDR: "Indonesian Rupiah (IDR)",
  BDT: "Bangladeshi Taka (BDT)",
  NPR: "Nepalese Rupee (NPR)",
  MMK: "Myanmar Kyat (MMK)",
  PHP: "Philippine Peso (PHP)",
  VND: "Vietnamese Dong (VND)",
  INR: "Indian Rupee (INR)",
  PKR: "Pakistani Rupee (PKR)",
  LKR: "Sri Lankan Rupee (LKR)",
  KHR: "Cambodian Riel (KHR)",
  THB: "Thai Baht (THB)",
  CNY: "Chinese Yuan (CNY)",
  NGN: "Nigerian Naira (NGN)",
  GHS: "Ghanaian Cedi (GHS)",
  USD: "US Dollar (USD)",
  MYR: "Malaysian Ringgit (MYR)",
};

// Indicative exchange rates from MYR (for UI preview only)
const INDICATIVE_RATES: Record<string, number> = {
  IDR: 3450, BDT: 30.5, NPR: 36.8, MMK: 580, PHP: 12.5,
  VND: 5800, INR: 18.2, PKR: 75, LKR: 85, KHR: 1100,
  THB: 7.6, CNY: 1.55, NGN: 450, GHS: 3.8, USD: 0.21, MYR: 1,
};

const fmt = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);

const fmtSimple = (amount: number, currency: string) =>
  `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;

// ── Create Remittance Dialog ──────────────────────────────────────────────────

function CreateRemittanceDialog({
  open,
  onClose,
  agencyId,
}: {
  open: boolean;
  onClose: () => void;
  agencyId: Id<"agencies"> | null;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [workerId, setWorkerId] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendCurrency, setSendCurrency] = useState("MYR");
  const [receiveCurrency, setReceiveCurrency] = useState("IDR");
  const [transferFee, setTransferFee] = useState("5");
  const [recipientName, setRecipientName] = useState("");
  const [recipientCountry, setRecipientCountry] = useState("Indonesia");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [transferMethod, setTransferMethod] = useState<RemittanceRow["transferMethod"]>("bank_transfer");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [walletProvider, setWalletProvider] = useState("");
  const [walletNumber, setWalletNumber] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [purpose, setPurpose] = useState("");
  const [requestedDate, setRequestedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const workers = useQuery(api.workers.list, { agencyId: agencyId ?? undefined, status: "active" });
  const wallet = useQuery(
    api.wallet.getWallet,
    workerId ? { workerId: workerId as Id<"workers"> } : "skip",
  );
  const available = wallet ? wallet.earned - wallet.advances - wallet.spent - wallet.withdrawn : 0;

  const sendAmountNum = parseFloat(sendAmount) || 0;
  const feeNum = parseFloat(transferFee) || 0;
  const totalDebit = sendAmountNum + feeNum;
  const rate = INDICATIVE_RATES[receiveCurrency] ?? 1;
  const receiveAmount = sendAmountNum * rate;

  const create = useMutation(api.remittances.create);

  const reset = () => {
    setStep(1); setWorkerId(""); setSendAmount(""); setSendCurrency("MYR");
    setReceiveCurrency("IDR"); setTransferFee("5"); setRecipientName("");
    setRecipientCountry("Indonesia"); setRecipientPhone(""); setTransferMethod("bank_transfer");
    setBankName(""); setBankAccountNumber(""); setBankAccountName("");
    setWalletProvider(""); setWalletNumber(""); setPickupLocation("");
    setPurpose(""); setRequestedDate(format(new Date(), "yyyy-MM-dd")); setNotes("");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!workerId || !sendAmount || !agencyId || !recipientName || !recipientCountry) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      await create({
        workerId: workerId as Id<"workers">,
        agencyId,
        sendAmount: sendAmountNum,
        sendCurrency,
        receiveAmount,
        receiveCurrency,
        exchangeRate: rate,
        transferFee: feeNum,
        totalDebit,
        recipientName,
        recipientCountry,
        recipientPhone: recipientPhone || undefined,
        transferMethod,
        recipientBankName: bankName || undefined,
        recipientAccountNumber: bankAccountNumber || undefined,
        recipientAccountName: bankAccountName || undefined,
        mobileWalletProvider: walletProvider || undefined,
        mobileWalletNumber: walletNumber || undefined,
        cashPickupLocation: pickupLocation || undefined,
        purpose: purpose || undefined,
        requestedDate,
        notes: notes || undefined,
      });
      toast.success("Remittance request created");
      reset();
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const d = err.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Failed to create remittance");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">New Overseas Remittance</DialogTitle>
          <div className="flex items-center gap-1 pt-1">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-1">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                  step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}>{s}</div>
                {s < 2 && <div className={cn("w-8 h-0.5 rounded", step > s ? "bg-primary" : "bg-muted")} />}
              </div>
            ))}
            <span className="ml-2 text-xs text-muted-foreground">
              {step === 1 ? "Transfer details" : "Recipient & delivery"}
            </span>
          </div>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-2">
            {/* Worker */}
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

            {/* Balance */}
            {workerId && wallet !== undefined && (
              <div className={cn(
                "rounded-lg px-3 py-2 text-sm flex items-center justify-between",
                available > 0 ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                              : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400",
              )}>
                <span className="text-xs font-medium">Available Balance</span>
                <span className="font-bold">{fmt(available, wallet?.currency ?? sendCurrency)}</span>
              </div>
            )}

            {/* Send amount + currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>You Send <span className="text-destructive">*</span></Label>
                <Input
                  type="number" min="0" step="0.01" placeholder="e.g. 500"
                  value={sendAmount} onChange={(e) => setSendAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Send Currency</Label>
                <Select value={sendCurrency} onValueChange={setSendCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["MYR", "SGD", "USD"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Receive currency */}
            <div className="space-y-1.5">
              <Label>Recipient Receives</Label>
              <Select value={receiveCurrency} onValueChange={setReceiveCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CURRENCIES).map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transfer fee */}
            <div className="space-y-1.5">
              <Label>Transfer Fee</Label>
              <Input
                type="number" min="0" step="0.01" placeholder="e.g. 5"
                value={transferFee} onChange={(e) => setTransferFee(e.target.value)}
              />
            </div>

            {/* FX preview */}
            {sendAmountNum > 0 && (
              <div className="rounded-xl border bg-muted/20 p-3 space-y-2 text-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transfer Summary</p>
                <div className="flex items-center gap-2 justify-between">
                  <div className="text-center">
                    <p className="text-base font-bold">{fmtSimple(sendAmountNum, sendCurrency)}</p>
                    <p className="text-xs text-muted-foreground">You send</p>
                  </div>
                  <ArrowRight size={16} className="text-muted-foreground flex-shrink-0" />
                  <div className="text-center">
                    <p className="text-base font-bold text-primary">{fmtSimple(Math.round(receiveAmount), receiveCurrency)}</p>
                    <p className="text-xs text-muted-foreground">Recipient gets</p>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Indicative rate</span>
                  <span>1 {sendCurrency} ≈ {rate.toLocaleString()} {receiveCurrency}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Fee</span>
                  <span>{fmtSimple(feeNum, sendCurrency)}</span>
                </div>
                <div className="flex justify-between font-semibold text-sm">
                  <span>Total debit</span>
                  <span className={totalDebit > available ? "text-destructive" : ""}>{fmtSimple(totalDebit, sendCurrency)}</span>
                </div>
                {totalDebit > available && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle size={11} /> Exceeds available balance
                  </p>
                )}
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle size={11} /> Rates are indicative only. Actual rate applied at processing.
                </p>
              </div>
            )}

            {/* Date */}
            <div className="space-y-1.5">
              <Label>Request Date</Label>
              <Input type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Recipient */}
            <div className="space-y-1.5">
              <Label>Recipient Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Full name as registered" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Country <span className="text-destructive">*</span></Label>
                <Select value={recipientCountry} onValueChange={setRecipientCountry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Recipient Phone</Label>
                <Input placeholder="+62 8xx…" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} />
              </div>
            </div>

            {/* Transfer method */}
            <div className="space-y-1.5">
              <Label>Transfer Method <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-3 gap-2">
                {(["bank_transfer", "mobile_wallet", "cash_pickup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTransferMethod(m)}
                    className={cn(
                      "rounded-lg border p-2.5 text-xs flex flex-col items-center gap-1.5 transition-colors cursor-pointer",
                      transferMethod === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    {METHOD_ICONS[m]}
                    <span className="text-center leading-tight">{METHOD_LABELS[m]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Method-specific fields */}
            {transferMethod === "bank_transfer" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Bank Name</Label>
                  <Input placeholder="e.g. BCA, BRI, Mandiri…" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Account Number</Label>
                  <Input placeholder="Recipient's bank account" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Account Name</Label>
                  <Input placeholder="Name on account" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} />
                </div>
              </div>
            )}

            {transferMethod === "mobile_wallet" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Wallet Provider</Label>
                  <Input placeholder="e.g. GoPay, OVO, bKash, GCash…" value={walletProvider} onChange={(e) => setWalletProvider(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Mobile Number</Label>
                  <Input placeholder="Registered mobile number" value={walletNumber} onChange={(e) => setWalletNumber(e.target.value)} />
                </div>
              </div>
            )}

            {transferMethod === "cash_pickup" && (
              <div className="space-y-1.5">
                <Label>Pickup Location / Agent</Label>
                <Input placeholder="e.g. Western Union Jakarta, Moneygram Dhaka…" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} />
              </div>
            )}

            {/* Purpose */}
            <div className="space-y-1.5">
              <Label>Purpose of Transfer</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger><SelectValue placeholder="Select purpose…" /></SelectTrigger>
                <SelectContent>
                  {["Family support", "Medical expenses", "Education fees", "Property purchase", "Business", "Others"].map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} placeholder="Optional internal notes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!workerId || !sendAmount || parseFloat(sendAmount) <= 0}
              >
                Next: Recipient →
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
              <Button onClick={handleSubmit} disabled={saving || !recipientName || !recipientCountry}>
                {saving ? "Creating…" : "Create Remittance"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Dispatch Dialog (mark as Processing) ─────────────────────────────────────

function DispatchDialog({
  open,
  onClose,
  remittance,
}: {
  open: boolean;
  onClose: () => void;
  remittance: RemittanceRow | null;
}) {
  const [partnerRef, setPartnerRef] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const dispatch = useMutation(api.remittances.markProcessing);

  if (!remittance) return null;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await dispatch({ id: remittance._id, partnerReference: partnerRef || undefined, notes: notes || undefined });
      toast.success("Remittance dispatched — wallet debited");
      setPartnerRef(""); setNotes("");
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to dispatch remittance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">Dispatch Remittance</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Worker</span><span className="font-medium">{remittance.workerName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Recipient</span><span className="font-medium">{remittance.recipientName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Country</span><span>{remittance.recipientCountry}</span></div>
            <Separator className="my-1" />
            <div className="flex justify-between font-semibold">
              <span>Wallet Debit</span>
              <span>{fmt(remittance.totalDebit, remittance.sendCurrency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recipient Gets</span>
              <span className="text-primary font-medium">{fmtSimple(Math.round(remittance.receiveAmount), remittance.receiveCurrency)}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Partner / Transaction Reference</Label>
            <Input placeholder="e.g. TT-20260101-001" value={partnerRef} onChange={(e) => setPartnerRef(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input placeholder="Optional…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
            <span><strong>{fmt(remittance.totalDebit, remittance.sendCurrency)}</strong> will be debited from the worker's wallet immediately.</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Dispatching…" : "Dispatch & Debit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Complete / Fail Dialogs ───────────────────────────────────────────────────

function CompleteDialog({ open, onClose, remittance }: { open: boolean; onClose: () => void; remittance: RemittanceRow | null }) {
  const [ref, setRef] = useState("");
  const [saving, setSaving] = useState(false);
  const complete = useMutation(api.remittances.markCompleted);
  if (!remittance) return null;
  const handleSubmit = async () => {
    setSaving(true);
    try {
      await complete({ id: remittance._id, partnerReference: ref || undefined });
      toast.success("Remittance marked as completed");
      setRef("");
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed");
    } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-serif">Mark as Completed</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">Confirm that the remittance to <strong>{remittance.recipientName}</strong> has been successfully delivered.</p>
          <div className="space-y-1.5">
            <Label>Final Reference <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input placeholder="Final confirmation reference" value={ref} onChange={(e) => setRef(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Saving…" : "Mark Completed"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FailDialog({ open, onClose, remittance }: { open: boolean; onClose: () => void; remittance: RemittanceRow | null }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const fail = useMutation(api.remittances.markFailed);
  if (!remittance) return null;
  const handleSubmit = async () => {
    setSaving(true);
    try {
      await fail({ id: remittance._id, failureReason: reason || undefined });
      toast.success("Remittance marked as failed — wallet refunded");
      setReason("");
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed");
    } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-serif">Mark as Failed</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">The worker's wallet will be <strong>refunded</strong> {fmt(remittance.totalDebit, remittance.sendCurrency)}.</p>
          <div className="space-y-1.5">
            <Label>Failure Reason</Label>
            <Textarea rows={2} placeholder="Why did it fail?" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={saving}>{saving ? "Saving…" : "Mark Failed & Refund"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Detail Sheet ──────────────────────────────────────────────────────────────

function RemittanceDetailSheet({ open, onClose, remittance }: { open: boolean; onClose: () => void; remittance: RemittanceRow | null }) {
  if (!remittance) return null;
  const copy = (text: string, label: string) =>
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="font-serif">Remittance Details</SheetTitle>
          <p className="text-sm font-medium">{remittance.workerName}</p>
          <code className="text-xs text-muted-foreground">{remittance.workerEmployeeId}</code>
          <Badge className={cn("border-0 text-xs w-fit mt-1", STATUS_COLORS[remittance.status])}>
            {remittance.status.charAt(0).toUpperCase() + remittance.status.slice(1)}
          </Badge>
        </SheetHeader>

        <div className="py-4 space-y-4 text-sm">
          {/* FX Summary */}
          <div className="rounded-xl border bg-gradient-to-r from-primary/5 to-primary/10 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold font-serif">{fmtSimple(remittance.sendAmount, remittance.sendCurrency)}</p>
                <p className="text-xs text-muted-foreground">You send (+ {fmtSimple(remittance.transferFee, remittance.sendCurrency)} fee)</p>
              </div>
              <ArrowRight size={18} className="text-primary" />
              <div className="text-right">
                <p className="text-lg font-bold font-serif text-primary">{fmtSimple(Math.round(remittance.receiveAmount), remittance.receiveCurrency)}</p>
                <p className="text-xs text-muted-foreground">Recipient gets</p>
              </div>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Exchange rate</span>
              <span>1 {remittance.sendCurrency} = {remittance.exchangeRate.toLocaleString()} {remittance.receiveCurrency}</span>
            </div>
          </div>

          {/* Recipient */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recipient</p>
            <div className="rounded-lg bg-muted/30 p-3 space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{remittance.recipientName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Country</span><span>{remittance.recipientCountry}</span></div>
              {remittance.recipientPhone && <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{remittance.recipientPhone}</span></div>}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Method</span>
                <span className="flex items-center gap-1">{METHOD_ICONS[remittance.transferMethod]}{METHOD_LABELS[remittance.transferMethod]}</span>
              </div>
            </div>
          </div>

          {/* Bank / wallet details */}
          {remittance.transferMethod === "bank_transfer" && remittance.recipientBankName && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Bank Details</p>
              <div className="rounded-lg bg-muted/30 p-3 space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span>{remittance.recipientBankName}</span></div>
                {remittance.recipientAccountNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Account</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs">{remittance.recipientAccountNumber}</code>
                      <button onClick={() => copy(remittance.recipientAccountNumber!, "Account")} className="text-muted-foreground hover:text-foreground cursor-pointer"><Copy size={11} /></button>
                    </div>
                  </div>
                )}
                {remittance.recipientAccountName && <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{remittance.recipientAccountName}</span></div>}
              </div>
            </div>
          )}

          {remittance.transferMethod === "mobile_wallet" && remittance.mobileWalletProvider && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Mobile Wallet</p>
              <div className="rounded-lg bg-muted/30 p-3 space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Provider</span><span>{remittance.mobileWalletProvider}</span></div>
                {remittance.mobileWalletNumber && <div className="flex justify-between"><span className="text-muted-foreground">Number</span><span>{remittance.mobileWalletNumber}</span></div>}
              </div>
            </div>
          )}

          {remittance.transferMethod === "cash_pickup" && remittance.cashPickupLocation && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cash Pickup</p>
              <p>{remittance.cashPickupLocation}</p>
            </div>
          )}

          <Separator />

          {/* Timeline */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Timeline</p>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Requested</span><span>{remittance.requestedDate}</span></div>
              {remittance.approvedDate && <div className="flex justify-between"><span className="text-muted-foreground">Approved</span><span>{remittance.approvedDate}</span></div>}
              {remittance.processedDate && <div className="flex justify-between"><span className="text-muted-foreground">Dispatched</span><span>{remittance.processedDate}</span></div>}
              {remittance.completedDate && <div className="flex justify-between"><span className="text-muted-foreground text-green-600 dark:text-green-400">Completed</span><span className="text-green-600 dark:text-green-400">{remittance.completedDate}</span></div>}
            </div>
          </div>

          {remittance.partnerReference && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Partner Reference</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1">{remittance.partnerReference}</code>
                  <button onClick={() => copy(remittance.partnerReference!, "Reference")} className="text-muted-foreground hover:text-foreground cursor-pointer"><Copy size={13} /></button>
                </div>
              </div>
            </>
          )}

          {remittance.purpose && (
            <>
              <Separator />
              <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Purpose</p><p>{remittance.purpose}</p></div>
            </>
          )}

          {remittance.rejectionReason && (
            <>
              <Separator />
              <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Rejection Reason</p><p className="text-red-600 dark:text-red-400">{remittance.rejectionReason}</p></div>
            </>
          )}

          {remittance.failureReason && (
            <>
              <Separator />
              <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Failure Reason</p><p className="text-rose-600 dark:text-rose-400">{remittance.failureReason}</p></div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ remittances }: { remittances: RemittanceRow[] }) {
  const pending    = remittances.filter((r) => r.status === "pending").length;
  const processing = remittances.filter((r) => r.status === "processing").length;
  const completed  = remittances.filter((r) => r.status === "completed");
  const totalCompleted = completed.reduce((s, r) => s + r.sendAmount, 0);
  const currency   = remittances[0]?.sendCurrency ?? "MYR";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        { label: "Pending Review",  value: pending,                         icon: <Clock size={16} />,     color: "text-amber-500" },
        { label: "In Transit",      value: processing,                      icon: <Send size={16} />,      color: "text-purple-500" },
        { label: "Completed",       value: completed.length,                icon: <CheckCircle2 size={16} />, color: "text-green-500" },
        { label: "Total Sent",      value: fmt(totalCompleted, currency),   icon: <Globe size={16} />,     color: "text-blue-500" },
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

function RemittancesTable({
  remittances,
  onView,
  onDispatch,
  onComplete,
  onFail,
}: {
  remittances: RemittanceRow[];
  onView: (r: RemittanceRow) => void;
  onDispatch: (r: RemittanceRow) => void;
  onComplete: (r: RemittanceRow) => void;
  onFail: (r: RemittanceRow) => void;
}) {
  const approveMutation = useMutation(api.remittances.approve);
  const rejectMutation  = useMutation(api.remittances.reject);
  const removeMutation  = useMutation(api.remittances.remove);

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
            <TableHead className="font-semibold">Send</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Recipient</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {remittances.map((r) => (
            <TableRow key={r._id} className="hover:bg-muted/30 cursor-pointer" onClick={() => onView(r)}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    {r.workerName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{r.workerName}</p>
                    <code className="text-xs text-muted-foreground">{r.workerEmployeeId}</code>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm font-mono">{r.requestedDate}</TableCell>
              <TableCell>
                <p className="font-semibold text-sm">{fmt(r.sendAmount, r.sendCurrency)}</p>
                <p className="text-xs text-muted-foreground">≈ {fmtSimple(Math.round(r.receiveAmount), r.receiveCurrency)}</p>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <p className="text-sm font-medium">{r.recipientName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {METHOD_ICONS[r.transferMethod]} {r.recipientCountry}
                </p>
              </TableCell>
              <TableCell>
                <Badge className={cn("border-0 text-xs", STATUS_COLORS[r.status])}>
                  {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal size={13} /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(r)}>View details</DropdownMenuItem>
                    {r.status === "pending" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handle(() => approveMutation({ id: r._id }), "Approved")}>
                          <CheckCircle2 size={13} className="mr-2 text-blue-500" /> Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handle(() => rejectMutation({ id: r._id }), "Rejected")} className="text-destructive">
                          <XCircle size={13} className="mr-2" /> Reject
                        </DropdownMenuItem>
                      </>
                    )}
                    {r.status === "approved" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDispatch(r)}>
                          <Send size={13} className="mr-2 text-purple-500" /> Dispatch to Partner
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handle(() => rejectMutation({ id: r._id }), "Rejected")} className="text-destructive">
                          <XCircle size={13} className="mr-2" /> Reject
                        </DropdownMenuItem>
                      </>
                    )}
                    {r.status === "processing" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onComplete(r)}>
                          <CheckCircle2 size={13} className="mr-2 text-green-500" /> Mark Completed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onFail(r)} className="text-destructive">
                          <RefreshCw size={13} className="mr-2" /> Mark Failed & Refund
                        </DropdownMenuItem>
                      </>
                    )}
                    {(r.status === "pending" || r.status === "rejected" || r.status === "failed") && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handle(() => removeMutation({ id: r._id }), "Deleted")}>
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

function RemittanceContent() {
  const { agencyId } = useAgency();
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<RemittanceRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [dispatchItem, setDispatchItem] = useState<RemittanceRow | null>(null);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [completeItem, setCompleteItem] = useState<RemittanceRow | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [failItem, setFailItem] = useState<RemittanceRow | null>(null);
  const [failOpen, setFailOpen] = useState(false);

  const remittances = useQuery(
    api.remittances.listByAgency,
    agencyId
      ? { agencyId, status: statusFilter !== "all" ? (statusFilter as RemittanceRow["status"]) : undefined }
      : "skip",
  ) as RemittanceRow[] | undefined;

  const openDetail   = (r: RemittanceRow) => { setDetailItem(r);   setDetailOpen(true); };
  const openDispatch = (r: RemittanceRow) => { setDispatchItem(r); setDispatchOpen(true); };
  const openComplete = (r: RemittanceRow) => { setCompleteItem(r); setCompleteOpen(true); };
  const openFail     = (r: RemittanceRow) => { setFailItem(r);     setFailOpen(true); };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground">Overseas Remittance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Send workers' wages to their families abroad — bank, mobile wallet, or cash pickup
          </p>
        </div>
        {agencyId && (
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5 flex-shrink-0">
            <Plus size={15} /> New Remittance
          </Button>
        )}
      </div>

      {!agencyId ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Globe size={36} className="mb-3 opacity-30" />
          <p className="text-sm">Select an agency in the sidebar to manage remittances</p>
        </div>
      ) : (
        <>
          {remittances && remittances.length > 0 && <SummaryCards remittances={remittances} />}

          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="h-8 flex-wrap">
              <TabsTrigger value="all" className="text-xs h-7">All</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs h-7">Pending</TabsTrigger>
              <TabsTrigger value="approved" className="text-xs h-7">Approved</TabsTrigger>
              <TabsTrigger value="processing" className="text-xs h-7">In Transit</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs h-7">Completed</TabsTrigger>
              <TabsTrigger value="failed" className="text-xs h-7">Failed</TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs h-7">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>

          {remittances === undefined ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : remittances.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Globe /></EmptyMedia>
                <EmptyTitle>No remittances found</EmptyTitle>
                <EmptyDescription>
                  {statusFilter !== "all" ? `No ${statusFilter} remittances` : "Create the first overseas remittance"}
                </EmptyDescription>
              </EmptyHeader>
              {statusFilter === "all" && (
                <EmptyContent>
                  <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                    <Plus size={13} /> New Remittance
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <RemittancesTable
              remittances={remittances}
              onView={openDetail}
              onDispatch={openDispatch}
              onComplete={openComplete}
              onFail={openFail}
            />
          )}
        </>
      )}

      <CreateRemittanceDialog open={createOpen} onClose={() => setCreateOpen(false)} agencyId={agencyId} />
      <RemittanceDetailSheet open={detailOpen} onClose={() => setDetailOpen(false)} remittance={detailItem} />
      <DispatchDialog open={dispatchOpen} onClose={() => setDispatchOpen(false)} remittance={dispatchItem} />
      <CompleteDialog open={completeOpen} onClose={() => setCompleteOpen(false)} remittance={completeItem} />
      <FailDialog open={failOpen} onClose={() => setFailOpen(false)} remittance={failItem} />
    </div>
  );
}

export default function RemittancePage() {
  return (
    <>
      <Authenticated>
        <RemittanceContent />
      </Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">Manage overseas remittances with your account</p>
          </div>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
