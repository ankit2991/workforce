import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  DollarSign,
  Settings2,
  FileText,
  MoreHorizontal,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAgency } from "@/components/providers/agency.tsx";
import { cn } from "@/lib/utils.ts";
import { format } from "date-fns";
import WageConfigDialog from "./_components/WageConfigDialog.tsx";
import GeneratePayslipDialog from "./_components/GeneratePayslipDialog.tsx";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

function fmt(n: number, currency = "MYR") {
  return `${currency} ${n.toFixed(2)}`;
}

// ── Workers Rate Config Tab ──────────────────────────────────────────────────

function RateConfigTab() {
  const { agencyId } = useAgency();
  const [configWorker, setConfigWorker] = useState<Doc<"workers"> | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const workers = useQuery(api.workers.list, {
    agencyId: agencyId ?? undefined,
  });

  return (
    <div className="space-y-4">
      {workers === undefined ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : workers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><DollarSign /></EmptyMedia>
            <EmptyTitle>No workers found</EmptyTitle>
            <EmptyDescription>Add workers first to configure their wage rates</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Worker</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">Employment Type</TableHead>
                <TableHead className="font-semibold">Rate Config</TableHead>
                <TableHead className="font-semibold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((worker) => (
                <WorkerRateRow
                  key={worker._id}
                  worker={worker}
                  onConfigure={() => { setConfigWorker(worker); setConfigOpen(true); }}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {configWorker && (
        <WageConfigDialog
          open={configOpen}
          onClose={() => { setConfigOpen(false); setConfigWorker(null); }}
          worker={configWorker}
        />
      )}
    </div>
  );
}

function WorkerRateRow({ worker, onConfigure }: { worker: Doc<"workers">; onConfigure: () => void }) {
  const config = useQuery(api.wages.getConfig, { workerId: worker._id });
  const EMP_LABELS: Record<string, string> = {
    full_time: "Full Time", part_time: "Part Time", contract: "Contract", piece_work: "Piece Work",
  };
  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {worker.firstName.charAt(0)}{worker.lastName.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-sm">{worker.firstName} {worker.lastName}</p>
            <p className="text-xs text-muted-foreground font-mono">{worker.employeeId}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell text-sm">{EMP_LABELS[worker.employmentType]}</TableCell>
      <TableCell>
        {config === undefined ? (
          <Skeleton className="h-5 w-32" />
        ) : config ? (
          <span className="text-sm font-medium">
            {config.currency} {config.baseRate.toFixed(2)}<span className="text-muted-foreground text-xs">/{config.rateType}</span>
          </span>
        ) : (
          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 text-xs">Not configured</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={onConfigure}>
          <Settings2 size={12} /> Configure
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ── Payroll Tab ──────────────────────────────────────────────────────────────

function PayrollTab() {
  const { agencyId } = useAgency();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date(); d.setDate(1); return format(d, "yyyy-MM-dd");
  });
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [generateWorker, setGenerateWorker] = useState<Doc<"workers"> | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [slipRecord, setSlipRecord] = useState<Doc<"wageRecords"> | null>(null);
  const [slipOpen, setSlipOpen] = useState(false);

  const workers = useQuery(api.workers.list, {
    agencyId: agencyId ?? undefined,
    status: "active",
  });
  const wageRecords = useQuery(
    api.wages.listByAgency,
    agencyId
      ? { agencyId, status: statusFilter !== "all" ? (statusFilter as Doc<"wageRecords">["status"]) : undefined }
      : "skip",
  );
  const updateStatus = useMutation(api.wages.updateStatus);
  const remove = useMutation(api.wages.remove);

  const handleStatus = async (id: Id<"wageRecords">, status: Doc<"wageRecords">["status"]) => {
    try {
      await updateStatus({ id, status });
      toast.success(`Marked as ${status}`);
    } catch { toast.error("Failed to update status"); }
  };

  const handleDelete = async (id: Id<"wageRecords">) => {
    try { await remove({ id }); toast.success("Deleted"); }
    catch { toast.error("Failed to delete"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-36 h-8 text-sm" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-36 h-8 text-sm" />
        </div>
      </div>

      {/* Generate buttons */}
      {agencyId && (
        <div className="flex flex-wrap gap-2">
          {(workers ?? []).map((w) => (
            <Button
              key={w._id}
              variant="secondary"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => { setGenerateWorker(w); setGenerateOpen(true); }}
            >
              <FileText size={11} /> {w.firstName} {w.lastName}
            </Button>
          ))}
        </div>
      )}

      {!agencyId ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <DollarSign size={32} className="mb-3 opacity-40" />
          <p className="text-sm">Select an agency in the sidebar to view payroll</p>
        </div>
      ) : wageRecords === undefined ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : wageRecords.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileText /></EmptyMedia>
            <EmptyTitle>No pay slips yet</EmptyTitle>
            <EmptyDescription>Click a worker button above to generate their pay slip for the period</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Worker</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">Period</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Gross</TableHead>
                <TableHead className="font-semibold">Net Pay</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wageRecords.map((record) => (
                <TableRow
                  key={record._id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => { setSlipRecord(record); setSlipOpen(true); }}
                >
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{record.workerId.slice(-6)}</code>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm font-mono">{record.periodStart} → {record.periodEnd}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{fmt(record.grossPay, record.currency)}</TableCell>
                  <TableCell className="font-semibold text-sm">{fmt(record.netPay, record.currency)}</TableCell>
                  <TableCell>
                    <Badge className={cn("border-0 text-xs capitalize", STATUS_COLORS[record.status])}>
                      {record.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal size={13} /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {record.status === "draft" && (
                          <DropdownMenuItem onClick={() => handleStatus(record._id, "approved")}>
                            <CheckCircle2 size={13} className="mr-2" /> Approve
                          </DropdownMenuItem>
                        )}
                        {record.status === "approved" && (
                          <DropdownMenuItem onClick={() => handleStatus(record._id, "paid")}>
                            <CheckCircle2 size={13} className="mr-2" /> Mark Paid
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(record._id)}>
                          <Trash2 size={13} className="mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {generateWorker && (
        <GeneratePayslipDialog
          open={generateOpen}
          onClose={() => { setGenerateOpen(false); setGenerateWorker(null); }}
          worker={generateWorker}
          agencyId={generateWorker.agencyId}
          periodStart={periodStart}
          periodEnd={periodEnd}
        />
      )}

      {slipRecord && (
        <PaySlipSheet open={slipOpen} onClose={() => setSlipOpen(false)} record={slipRecord} />
      )}
    </div>
  );
}

// ── Pay Slip Detail Sheet ────────────────────────────────────────────────────

function PaySlipSheet({ open, onClose, record }: { open: boolean; onClose: () => void; record: Doc<"wageRecords"> }) {
  const worker = useQuery(api.workers.getById, { id: record.workerId });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-sm overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="font-serif">Pay Slip</SheetTitle>
          {worker && <p className="text-sm font-medium">{worker.firstName} {worker.lastName} <span className="text-muted-foreground font-mono text-xs ml-1">{worker.employeeId}</span></p>}
          <p className="text-xs text-muted-foreground">{record.periodStart} → {record.periodEnd}</p>
          <Badge className={cn("w-fit border-0 text-xs capitalize", STATUS_COLORS[record.status])}>{record.status}</Badge>
        </SheetHeader>

        <div className="py-4 space-y-4 text-sm">
          {/* Work summary */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Work Summary</p>
            <div className="grid grid-cols-2 gap-1.5 bg-muted/30 rounded-lg p-3">
              <span className="text-muted-foreground">Days worked</span><span className="text-right font-medium">{record.daysWorked}</span>
              <span className="text-muted-foreground">Hours</span><span className="text-right font-medium">{record.hoursWorked}h</span>
              <span className="text-muted-foreground">Overtime</span><span className="text-right font-medium">{record.overtimeHours}h</span>
              <span className="text-muted-foreground">Pieces</span><span className="text-right font-medium">{record.pieceCount}</span>
            </div>
          </div>

          {/* Earnings */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Earnings</p>
            <div className="space-y-1">
              <div className="flex justify-between"><span>Base Pay</span><span>{fmt(record.basePay, record.currency)}</span></div>
              {record.overtimePay > 0 && <div className="flex justify-between"><span>Overtime</span><span>{fmt(record.overtimePay, record.currency)}</span></div>}
              {[...record.extraAllowances].map((a, i) => (
                <div key={i} className="flex justify-between text-green-600 dark:text-green-400"><span>+ {a.name}</span><span>{fmt(a.amount, record.currency)}</span></div>
              ))}
              <div className="flex justify-between font-medium border-t pt-1 mt-1">
                <span>Total Allowances</span><span className="text-green-600 dark:text-green-400">+{fmt(record.totalAllowances, record.currency)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Deductions */}
          {(record.totalDeductions > 0 || record.extraDeductions.length > 0) && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Deductions</p>
              <div className="space-y-1">
                {record.extraDeductions.map((d, i) => (
                  <div key={i} className="flex justify-between text-red-600 dark:text-red-400"><span>- {d.name}</span><span>{fmt(d.amount, record.currency)}</span></div>
                ))}
                <div className="flex justify-between font-medium border-t pt-1 mt-1">
                  <span>Total Deductions</span><span className="text-red-600 dark:text-red-400">-{fmt(record.totalDeductions, record.currency)}</span>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Net */}
          <div className="space-y-1.5">
            <div className="flex justify-between"><span>Gross Pay</span><span className="font-semibold">{fmt(record.grossPay, record.currency)}</span></div>
            <div className="flex justify-between text-base font-bold">
              <span>Net Pay</span>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0 text-sm font-bold">
                {fmt(record.netPay, record.currency)}
              </Badge>
            </div>
          </div>

          {record.notes && (
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">{record.notes}</div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

function WagesContent() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-serif text-foreground">Wages</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure rates and generate pay slips</p>
      </div>
      <Tabs defaultValue="payroll">
        <TabsList>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="rates">Rate Config</TabsTrigger>
        </TabsList>
        <TabsContent value="payroll" className="mt-4"><PayrollTab /></TabsContent>
        <TabsContent value="rates" className="mt-4"><RateConfigTab /></TabsContent>
      </Tabs>
    </div>
  );
}

export default function WagesPage() {
  return (
    <>
      <Authenticated><WagesContent /></Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">Manage wages with your account</p>
          </div>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
