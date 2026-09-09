import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, SlidersHorizontal, Banknote } from "lucide-react";
import { useAgency } from "@/components/providers/agency.tsx";
import { cn } from "@/lib/utils.ts";
import AdjustmentDialog from "./_components/AdjustmentDialog.tsx";
import FundWalletDialog from "./_components/FundWalletDialog.tsx";

function fmt(n: number, currency = "MYR") {
  return `${currency} ${n.toFixed(2)}`;
}

const ENTRY_COLORS: Record<string, string> = {
  wage_credit: "text-green-600 dark:text-green-400",
  advance_credit: "text-blue-600 dark:text-blue-400",
  advance_repayment: "text-orange-600 dark:text-orange-400",
  withdrawal: "text-red-600 dark:text-red-400",
  marketplace_debit: "text-purple-600 dark:text-purple-400",
  adjustment: "text-yellow-600 dark:text-yellow-400",
  remittance: "text-pink-600 dark:text-pink-400",
  wallet_fund: "text-emerald-600 dark:text-emerald-400",
};

const ENTRY_LABELS: Record<string, string> = {
  wage_credit: "Wage Credit",
  advance_credit: "Advance",
  advance_repayment: "Advance Repayment",
  withdrawal: "Withdrawal",
  marketplace_debit: "Marketplace",
  adjustment: "Adjustment",
  remittance: "Remittance",
  wallet_fund: "Wallet Fund",
};

// ── Wallet Balance Card ──────────────────────────────────────────────────────

function WalletCard({ wallet, currency }: { wallet: Doc<"wallets"> | null | undefined; currency?: string }) {
  const cur = wallet?.currency ?? currency ?? "MYR";
  const earned = wallet?.earned ?? 0;
  const pending = wallet?.pending ?? 0;
  const advances = wallet?.advances ?? 0;
  const spent = wallet?.spent ?? 0;
  const withdrawn = wallet?.withdrawn ?? 0;
  const available = earned - advances - spent - withdrawn;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-xl border bg-green-50 dark:bg-green-900/10 p-4 space-y-1">
        <p className="text-xs text-muted-foreground font-medium">Earned</p>
        <p className="text-lg font-bold text-green-700 dark:text-green-400">{fmt(earned, cur)}</p>
        <p className="text-xs text-muted-foreground">Total credited</p>
      </div>
      <div className="rounded-xl border bg-yellow-50 dark:bg-yellow-900/10 p-4 space-y-1">
        <p className="text-xs text-muted-foreground font-medium">Pending</p>
        <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{fmt(pending, cur)}</p>
        <p className="text-xs text-muted-foreground">Awaiting approval</p>
      </div>
      <div className="rounded-xl border bg-primary/5 p-4 space-y-1">
        <p className="text-xs text-muted-foreground font-medium">Available</p>
        <p className={cn("text-lg font-bold", available >= 0 ? "text-primary" : "text-destructive")}>{fmt(available, cur)}</p>
        <p className="text-xs text-muted-foreground">Ready to use</p>
      </div>
      <div className="rounded-xl border bg-red-50 dark:bg-red-900/10 p-4 space-y-1">
        <p className="text-xs text-muted-foreground font-medium">Spent / Withdrawn</p>
        <p className="text-lg font-bold text-red-700 dark:text-red-400">{fmt(spent + withdrawn, cur)}</p>
        <p className="text-xs text-muted-foreground">Total outflows</p>
      </div>
    </div>
  );
}

// ── Worker Ledger Sheet ──────────────────────────────────────────────────────

function WorkerLedgerSheet({
  open,
  onClose,
  worker,
}: {
  open: boolean;
  onClose: () => void;
  worker: Doc<"workers">;
}) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const wallet = useQuery(api.wallet.getWallet, open ? { workerId: worker._id } : "skip");
  const ledger = useQuery(api.wallet.getLedger, open ? { workerId: worker._id, limit: 100 } : "skip");

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="font-serif">{worker.firstName} {worker.lastName}</SheetTitle>
                <p className="text-xs text-muted-foreground font-mono">{worker.employeeId}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="default" size="sm" className="gap-1.5 text-xs h-7 cursor-pointer" onClick={() => setFundOpen(true)}>
                  <Banknote size={12} /> Fund
                </Button>
                <Button variant="secondary" size="sm" className="gap-1.5 text-xs h-7 cursor-pointer" onClick={() => setAdjustOpen(true)}>
                  <SlidersHorizontal size={12} /> Adjust
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="py-4 space-y-5">
            {wallet === undefined ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            ) : (
              <WalletCard wallet={wallet} currency={wallet?.currency ?? "MYR"} />
            )}

            {/* Ledger */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Transaction History</p>
              {ledger === undefined ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : ledger.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No transactions yet</p>
              ) : (
                <div className="space-y-1.5">
                  {ledger.map((entry) => (
                    <div key={entry._id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn("flex-shrink-0", ENTRY_COLORS[entry.entryType])}>
                          {entry.amount >= 0 ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">{entry.date} · {ENTRY_LABELS[entry.entryType]}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right ml-3">
                        <p className={cn("text-sm font-semibold", entry.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                          {entry.amount >= 0 ? "+" : ""}{fmt(entry.amount, entry.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">bal: {fmt(entry.balanceAfter, entry.currency)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AdjustmentDialog
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        worker={worker}
      />
      <FundWalletDialog
        open={fundOpen}
        onClose={() => setFundOpen(false)}
        worker={worker}
      />
    </>
  );
}

// ── Agency Ledger Tab ────────────────────────────────────────────────────────

function AgencyLedgerTab() {
  const { agencyId } = useAgency();
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const ledger = useQuery(
    api.wallet.getLedgerByAgency,
    agencyId
      ? {
          agencyId,
          entryType: typeFilter !== "all" ? (typeFilter as Doc<"ledgerEntries">["entryType"]) : undefined,
        }
      : "skip",
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="wage_credit">Wage Credit</SelectItem>
            <SelectItem value="advance_credit">Advance</SelectItem>
            <SelectItem value="advance_repayment">Advance Repayment</SelectItem>
            <SelectItem value="withdrawal">Withdrawal</SelectItem>
            <SelectItem value="marketplace_debit">Marketplace</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
            <SelectItem value="remittance">Remittance</SelectItem>
            <SelectItem value="wallet_fund">Wallet Fund</SelectItem>
          </SelectContent>
        </Select>
        {ledger && <span className="text-xs text-muted-foreground self-center">{ledger.length} entries</span>}
      </div>

      {!agencyId ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Wallet size={32} className="mb-3 opacity-40" />
          <p className="text-sm">Select an agency in the sidebar to view ledger</p>
        </div>
      ) : ledger === undefined ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : ledger.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Wallet /></EmptyMedia>
            <EmptyTitle>No ledger entries</EmptyTitle>
            <EmptyDescription>Entries appear when wages are credited, advances issued, or transactions occur</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Worker</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">Type</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold text-right">Amount</TableHead>
                <TableHead className="font-semibold text-right hidden md:table-cell">Balance After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.map((entry) => (
                <TableRow key={entry._id} className="hover:bg-muted/30">
                  <TableCell className="text-sm font-mono text-muted-foreground">{entry.date}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{entry.workerId.slice(-6)}</code>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge className={cn("border-0 text-xs", ENTRY_COLORS[entry.entryType], "bg-muted")}>
                      {ENTRY_LABELS[entry.entryType]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-[180px] truncate">{entry.description}</TableCell>
                  <TableCell className={cn("text-right text-sm font-semibold", entry.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                    {entry.amount >= 0 ? "+" : ""}{fmt(entry.amount, entry.currency)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground hidden md:table-cell">
                    {fmt(entry.balanceAfter, entry.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Workers Wallet Overview Tab ──────────────────────────────────────────────

function WorkerWalletsTab() {
  const { agencyId } = useAgency();
  const [selectedWorker, setSelectedWorker] = useState<Doc<"workers"> | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [fundWorker, setFundWorker] = useState<Doc<"workers"> | null>(null);
  const [fundOpen, setFundOpen] = useState(false);

  const workers = useQuery(api.workers.list, {
    agencyId: agencyId ?? undefined,
    status: "active",
  });

  return (
    <div className="space-y-4">
      {workers === undefined ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : workers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Wallet /></EmptyMedia>
            <EmptyTitle>No workers found</EmptyTitle>
            <EmptyDescription>Add active workers to view their wallets</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Worker</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">Earned</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Advances</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Spent</TableHead>
                <TableHead className="font-semibold">Available</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((worker) => (
                <WorkerWalletRow
                  key={worker._id}
                  worker={worker}
                  onOpen={() => { setSelectedWorker(worker); setSheetOpen(true); }}
                  onFund={() => { setFundWorker(worker); setFundOpen(true); }}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedWorker && (
        <WorkerLedgerSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          worker={selectedWorker}
        />
      )}

      {fundWorker && (
        <FundWalletDialog
          open={fundOpen}
          onClose={() => setFundOpen(false)}
          worker={fundWorker}
        />
      )}
    </div>
  );
}

function WorkerWalletRow({ worker, onOpen, onFund }: { worker: Doc<"workers">; onOpen: () => void; onFund: () => void }) {
  const wallet = useQuery(api.wallet.getWallet, { workerId: worker._id });
  const earned = wallet?.earned ?? 0;
  const advances = wallet?.advances ?? 0;
  const spent = wallet?.spent ?? 0;
  const withdrawn = wallet?.withdrawn ?? 0;
  const available = earned - advances - spent - withdrawn;
  const currency = wallet?.currency ?? "MYR";

  return (
    <TableRow className="hover:bg-muted/30 cursor-pointer" onClick={onOpen}>
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
      <TableCell className="hidden sm:table-cell">
        {wallet === undefined ? <Skeleton className="h-4 w-20" /> : <span className="text-sm text-green-600 dark:text-green-400 font-medium">{fmt(earned, currency)}</span>}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {wallet === undefined ? <Skeleton className="h-4 w-20" /> : <span className="text-sm text-blue-600 dark:text-blue-400">{fmt(advances, currency)}</span>}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {wallet === undefined ? <Skeleton className="h-4 w-20" /> : <span className="text-sm text-purple-600 dark:text-purple-400">{fmt(spent + withdrawn, currency)}</span>}
      </TableCell>
      <TableCell>
        {wallet === undefined ? (
          <Skeleton className="h-4 w-20" />
        ) : (
          <span className={cn("text-sm font-bold", available >= 0 ? "text-foreground" : "text-destructive")}>
            {fmt(available, currency)}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer" onClick={(e) => { e.stopPropagation(); onFund(); }}>
            <Banknote size={12} /> Fund
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs cursor-pointer" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
            View Ledger
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

function WalletContent() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-serif">Wallet & Ledger</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track earned, pending, available, and spent balances per worker</p>
      </div>
      <Tabs defaultValue="workers">
        <TabsList>
          <TabsTrigger value="workers">Worker Wallets</TabsTrigger>
          <TabsTrigger value="ledger">Agency Ledger</TabsTrigger>
        </TabsList>
        <TabsContent value="workers" className="mt-4"><WorkerWalletsTab /></TabsContent>
        <TabsContent value="ledger" className="mt-4"><AgencyLedgerTab /></TabsContent>
      </Tabs>
    </div>
  );
}

export default function WalletPage() {
  return (
    <>
      <Authenticated><WalletContent /></Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">Manage wallets with your account</p>
          </div>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
