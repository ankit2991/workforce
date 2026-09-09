import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
} from "@/components/ui/empty.tsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  FileBarChart2, Download, DollarSign, Users, Calendar,
  TrendingUp, ArrowUpRight, Send, Wallet, BarChart3, RefreshCw,
  Gamepad2, ShoppingBag, Coins,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useAgency } from "@/components/providers/agency.tsx";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);

function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) { toast.error("No data to export"); return; }
  const csv = Papa.unparse(rows, { header: true, quotes: true });
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success(`Downloaded ${filename}`);
}

const CHART_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#f97316", "#06b6d4"];

const STATUS_COLORS: Record<string, string> = {
  active:      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  inactive:    "bg-muted text-muted-foreground",
  suspended:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  terminated:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  funded:      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  draft:       "bg-muted text-muted-foreground",
  approved:    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  paid:        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending:     "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  disbursed:   "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  repaid:      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected:    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  processed:   "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  processing:  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  completed:   "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  failed:      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

// ── Date Range Picker ─────────────────────────────────────────────────────────

type DateRange = { from: string; to: string; label: string };

const PRESETS: DateRange[] = (() => {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().split("T")[0];
  return [
    { label: "This month",     from: iso(startOfMonth(now)),           to: iso(endOfMonth(now)) },
    { label: "Last month",     from: iso(startOfMonth(subMonths(now,1))), to: iso(endOfMonth(subMonths(now,1))) },
    { label: "Last 3 months",  from: iso(subMonths(now,3)),             to: iso(now) },
    { label: "Last 6 months",  from: iso(subMonths(now,6)),             to: iso(now) },
    { label: "This year",      from: `${now.getFullYear()}-01-01`,      to: iso(now) },
  ];
})();

function DateRangeBar({
  range,
  onChange,
}: {
  range: DateRange;
  onChange: (r: DateRange) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex gap-1.5 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => onChange(p)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer",
              range.label === p.label
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:bg-muted/60 text-muted-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground">
        <span className="font-mono">{range.from}</span>
        <span>→</span>
        <span className="font-mono">{range.to}</span>
      </div>
    </div>
  );
}

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, icon, color,
}: {
  label: string; value: string; sub?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
      <div className={cn("mt-0.5", color)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-lg font-bold font-serif leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── 1. Payroll Report ─────────────────────────────────────────────────────────

function PayrollReport({ agencyId }: { agencyId: Id<"agencies"> | null }) {
  const [range, setRange] = useState(PRESETS[0]);

  const data = useQuery(
    api.reports.payrollSummary,
    agencyId
      ? { agencyId, periodStart: range.from, periodEnd: range.to }
      : { periodStart: range.from, periodEnd: range.to },
  );

  const handleExport = useCallback(() => {
    if (!data) return;
    downloadCsv(
      data.rows.map((r) => ({
        "Employee ID": r.employeeId,
        "Worker Name": r.workerName,
        "Period Start": r.periodStart,
        "Period End": r.periodEnd,
        "Days Worked": r.daysWorked,
        "Hours Worked": r.hoursWorked,
        "Base Pay": r.basePay.toFixed(2),
        "Overtime Pay": r.overtimePay.toFixed(2),
        "Total Allowances": r.totalAllowances.toFixed(2),
        "Total Deductions": r.totalDeductions.toFixed(2),
        "Gross Pay": r.grossPay.toFixed(2),
        "Net Pay": r.netPay.toFixed(2),
        Currency: r.currency,
        Status: r.status,
      })),
      `payroll-report-${range.from}-to-${range.to}.csv`,
    );
  }, [data, range]);

  // Bar chart data — group by worker, sum net pay
  const chartData = data
    ? Object.entries(
        data.rows.reduce((acc: Record<string, number>, r) => {
          acc[r.workerName] = (acc[r.workerName] ?? 0) + r.netPay;
          return acc;
        }, {}),
      )
        .map(([name, netPay]) => ({ name: name.split(" ")[0], netPay: Math.round(netPay * 100) / 100 }))
        .sort((a, b) => b.netPay - a.netPay)
        .slice(0, 10)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <DateRangeBar range={range} onChange={setRange} />
        <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-7" onClick={handleExport} disabled={!data || data.rows.length === 0}>
          <Download size={12} /> Export CSV
        </Button>
      </div>

      {data === undefined ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SummaryCard label="Total Gross Pay" value={fmt(data.totals.grossPay, data.totals.currency)} icon={<DollarSign size={16} />} color="text-primary" />
            <SummaryCard label="Total Net Pay" value={fmt(data.totals.netPay, data.totals.currency)} icon={<TrendingUp size={16} />} color="text-green-500" />
            <SummaryCard label="Payslips" value={String(data.rows.length)} icon={<FileBarChart2 size={16} />} color="text-blue-500" />
          </div>

          {chartData.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Top Net Pay (by worker)</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [fmt(Number(v), data.totals.currency), "Net Pay"]} />
                  <Bar dataKey="netPay" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.rows.length === 0 ? (
            <Empty><EmptyHeader><EmptyMedia variant="icon"><FileBarChart2 /></EmptyMedia><EmptyTitle>No payroll records in this period</EmptyTitle></EmptyHeader></Empty>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="font-semibold">Worker</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Period</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Gross</TableHead>
                    <TableHead className="font-semibold">Net Pay</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((r, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell>
                        <p className="font-medium text-sm">{r.workerName}</p>
                        <code className="text-xs text-muted-foreground">{r.employeeId}</code>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs font-mono text-muted-foreground">
                        {r.periodStart} → {r.periodEnd}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{fmt(r.grossPay, r.currency)}</TableCell>
                      <TableCell className="font-semibold text-sm text-primary">{fmt(r.netPay, r.currency)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge className={cn("border-0 text-xs", STATUS_COLORS[r.status] ?? "bg-muted")}>{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── 2. Attendance Report ──────────────────────────────────────────────────────

function AttendanceReport({ agencyId }: { agencyId: Id<"agencies"> | null }) {
  const [range, setRange] = useState(PRESETS[0]);

  const data = useQuery(
    api.reports.attendanceSummary,
    agencyId
      ? { agencyId, dateFrom: range.from, dateTo: range.to }
      : { dateFrom: range.from, dateTo: range.to },
  );

  const handleExport = useCallback(() => {
    if (!data) return;
    downloadCsv(
      data.map((r) => ({
        "Employee ID": r.employeeId,
        "Worker Name": r.workerName,
        "Present": r.present,
        "Absent": r.absent,
        "Half Day": r.halfDay,
        "Leave": r.leave,
        "Rest Day": r.restDay,
        "Public Holiday": r.publicHoliday,
        "Total Days": r.totalDays,
        "Hours Worked": r.hoursWorked.toFixed(1),
        "Overtime Hours": r.overtimeHours.toFixed(1),
        "Attendance Rate %": r.attendanceRate,
      })),
      `attendance-report-${range.from}-to-${range.to}.csv`,
    );
  }, [data, range]);

  const chartData = data
    ? data.slice(0, 10).map((r) => ({
        name: r.workerName.split(" ")[0],
        "Attendance %": r.attendanceRate,
      }))
    : [];

  // Overall stats
  const avgRate = data && data.length > 0
    ? Math.round(data.reduce((s, r) => s + r.attendanceRate, 0) / data.length)
    : 0;
  const totalHours = data ? data.reduce((s, r) => s + r.hoursWorked, 0) : 0;
  const totalOT    = data ? data.reduce((s, r) => s + r.overtimeHours, 0) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <DateRangeBar range={range} onChange={setRange} />
        <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-7" onClick={handleExport} disabled={!data || data.length === 0}>
          <Download size={12} /> Export CSV
        </Button>
      </div>

      {data === undefined ? (
        <div className="grid grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SummaryCard label="Avg Attendance Rate" value={`${avgRate}%`} icon={<Calendar size={16} />} color="text-primary" />
            <SummaryCard label="Total Hours Worked" value={totalHours.toFixed(0)} icon={<TrendingUp size={16} />} color="text-green-500" />
            <SummaryCard label="Overtime Hours" value={totalOT.toFixed(0)} icon={<ArrowUpRight size={16} />} color="text-amber-500" />
          </div>

          {chartData.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Attendance Rate by Worker</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v) => [`${Number(v)}%`, "Attendance"]} />
                  <Bar dataKey="Attendance %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.length === 0 ? (
            <Empty><EmptyHeader><EmptyMedia variant="icon"><Calendar /></EmptyMedia><EmptyTitle>No attendance records in this period</EmptyTitle></EmptyHeader></Empty>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="font-semibold">Worker</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell text-center">Present</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell text-center">Absent</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell text-center">Hours</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell text-center">OT Hrs</TableHead>
                    <TableHead className="font-semibold text-center">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((r, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell>
                        <p className="font-medium text-sm">{r.workerName}</p>
                        <code className="text-xs text-muted-foreground">{r.employeeId}</code>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center text-sm text-green-600 dark:text-green-400 font-semibold">{r.present}</TableCell>
                      <TableCell className="hidden sm:table-cell text-center text-sm text-red-600 dark:text-red-400 font-semibold">{r.absent}</TableCell>
                      <TableCell className="hidden md:table-cell text-center text-sm">{r.hoursWorked.toFixed(0)}</TableCell>
                      <TableCell className="hidden md:table-cell text-center text-sm text-amber-600 dark:text-amber-400">{r.overtimeHours.toFixed(0)}</TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1">
                          <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={cn("h-full rounded-full", r.attendanceRate >= 90 ? "bg-green-500" : r.attendanceRate >= 70 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${r.attendanceRate}%` }} />
                          </div>
                          <span className="text-xs font-semibold">{r.attendanceRate}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── 3. Wallet Ledger Report ───────────────────────────────────────────────────

const ENTRY_LABELS: Record<string, string> = {
  wage_credit: "Wage Credit", advance_credit: "Advance", advance_repayment: "Repayment",
  withdrawal: "Withdrawal", marketplace_debit: "Marketplace", adjustment: "Adjustment", remittance: "Remittance",
  wallet_fund: "Wallet Fund",
};

function LedgerReport({ agencyId }: { agencyId: Id<"agencies"> | null }) {
  const [range, setRange] = useState(PRESETS[0]);
  const [typeFilter, setTypeFilter] = useState("all");

  const data = useQuery(
    api.reports.walletLedgerReport,
    agencyId
      ? { agencyId, dateFrom: range.from, dateTo: range.to, entryType: typeFilter !== "all" ? typeFilter : undefined }
      : { dateFrom: range.from, dateTo: range.to, entryType: typeFilter !== "all" ? typeFilter : undefined },
  );

  const handleExport = useCallback(() => {
    if (!data) return;
    downloadCsv(
      data.map((e) => ({
        Date: e.date,
        "Employee ID": e.employeeId,
        "Worker Name": e.workerName,
        "Entry Type": e.entryType,
        Amount: e.amount.toFixed(2),
        "Balance After": e.balanceAfter.toFixed(2),
        Currency: e.currency,
        Description: e.description,
      })),
      `ledger-report-${range.from}-to-${range.to}.csv`,
    );
  }, [data, range]);

  // Pie chart: credits vs debits by type
  const typeBreakdown = data
    ? Object.entries(
        data.reduce((acc: Record<string, number>, e) => {
          const label = ENTRY_LABELS[e.entryType] ?? e.entryType;
          acc[label] = (acc[label] ?? 0) + Math.abs(e.amount);
          return acc;
        }, {}),
      ).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    : [];

  const totalCredits = data ? data.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0) : 0;
  const totalDebits  = data ? data.filter((e) => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0) : 0;
  const currency     = data?.[0]?.currency ?? "MYR";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <DateRangeBar range={range} onChange={setRange} />
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(ENTRY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-7" onClick={handleExport} disabled={!data || data.length === 0}>
            <Download size={12} /> Export CSV
          </Button>
        </div>
      </div>

      {data === undefined ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SummaryCard label="Total Credits" value={fmt(totalCredits, currency)} icon={<TrendingUp size={16} />} color="text-green-500" />
            <SummaryCard label="Total Debits" value={fmt(totalDebits, currency)} icon={<ArrowUpRight size={16} />} color="text-red-500" />
            <SummaryCard label="Transactions" value={String(data.length)} icon={<BarChart3 size={16} />} color="text-blue-500" />
          </div>

          {typeBreakdown.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Volume by Transaction Type</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={typeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                    {typeBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [fmt(Number(v), currency), "Volume"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.length === 0 ? (
            <Empty><EmptyHeader><EmptyMedia variant="icon"><BarChart3 /></EmptyMedia><EmptyTitle>No ledger entries in this period</EmptyTitle></EmptyHeader></Empty>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="font-semibold hidden sm:table-cell">Date</TableHead>
                    <TableHead className="font-semibold">Worker</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Type</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Description</TableHead>
                    <TableHead className="font-semibold text-right">Amount</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((e, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell className="hidden sm:table-cell text-xs font-mono">{e.date}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{e.workerName}</p>
                        <code className="text-xs text-muted-foreground">{e.employeeId}</code>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{ENTRY_LABELS[e.entryType] ?? e.entryType}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">{e.description}</span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        <span className={e.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                          {e.amount > 0 ? "+" : ""}{fmt(e.amount, e.currency)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-sm font-mono text-muted-foreground">
                        {fmt(e.balanceAfter, e.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── 4. Advances Report ────────────────────────────────────────────────────────

function AdvancesReport({ agencyId }: { agencyId: Id<"agencies"> | null }) {
  const [range, setRange] = useState(PRESETS[0]);

  const data = useQuery(
    api.reports.advancesReport,
    agencyId
      ? { agencyId, dateFrom: range.from, dateTo: range.to }
      : { dateFrom: range.from, dateTo: range.to },
  );

  const handleExport = useCallback(() => {
    if (!data) return;
    downloadCsv(
      data.rows.map((r) => ({
        "Requested Date": r.requestedDate,
        "Employee ID": r.employeeId,
        "Worker Name": r.workerName,
        "Amount": r.amount.toFixed(2),
        "Repaid Amount": r.repaidAmount.toFixed(2),
        "Outstanding": r.outstanding.toFixed(2),
        Currency: r.currency,
        Status: r.status,
        Reason: r.reason,
      })),
      `advances-report-${range.from}-to-${range.to}.csv`,
    );
  }, [data, range]);

  const statusBreakdown = data
    ? Object.entries(
        data.rows.reduce((acc: Record<string, number>, r) => {
          acc[r.status] = (acc[r.status] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <DateRangeBar range={range} onChange={setRange} />
        <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-7" onClick={handleExport} disabled={!data || data.rows.length === 0}>
          <Download size={12} /> Export CSV
        </Button>
      </div>

      {data === undefined ? (
        <div className="grid grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SummaryCard label="Total Disbursed" value={fmt(data.totals.disbursed, data.totals.currency)} icon={<DollarSign size={16} />} color="text-purple-500" />
            <SummaryCard label="Total Repaid" value={fmt(data.totals.repaid, data.totals.currency)} icon={<TrendingUp size={16} />} color="text-green-500" />
            <SummaryCard label="Outstanding" value={fmt(data.totals.outstanding, data.totals.currency)} icon={<ArrowUpRight size={16} />} color="text-amber-500" />
          </div>

          {statusBreakdown.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Advance Status Breakdown</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={statusBreakdown} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.rows.length === 0 ? (
            <Empty><EmptyHeader><EmptyMedia variant="icon"><DollarSign /></EmptyMedia><EmptyTitle>No advances in this period</EmptyTitle></EmptyHeader></Empty>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="font-semibold">Worker</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Date</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Repaid</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Outstanding</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((r, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell>
                        <p className="font-medium text-sm">{r.workerName}</p>
                        <code className="text-xs text-muted-foreground">{r.employeeId}</code>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm font-mono">{r.requestedDate}</TableCell>
                      <TableCell className="font-semibold text-sm">{fmt(r.amount, r.currency)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-green-600 dark:text-green-400">{fmt(r.repaidAmount, r.currency)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-amber-600 dark:text-amber-400">{fmt(r.outstanding, r.currency)}</TableCell>
                      <TableCell>
                        <Badge className={cn("border-0 text-xs", STATUS_COLORS[r.status] ?? "bg-muted")}>{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── 5. Outflow Report (Withdrawals + Remittances) ────────────────────────────

function OutflowReport({ agencyId }: { agencyId: Id<"agencies"> | null }) {
  const [range, setRange] = useState(PRESETS[0]);
  const [sub, setSub] = useState<"withdrawals" | "remittances">("withdrawals");

  const data = useQuery(
    api.reports.outflowReport,
    agencyId
      ? { agencyId, dateFrom: range.from, dateTo: range.to }
      : { dateFrom: range.from, dateTo: range.to },
  );

  const handleExport = useCallback(() => {
    if (!data) return;
    if (sub === "withdrawals") {
      downloadCsv(
        data.withdrawals.map((w) => ({
          Date: w.date, "Employee ID": w.employeeId, "Worker Name": w.workerName,
          Amount: w.amount.toFixed(2), Currency: w.currency, Status: w.status,
          Bank: w.bankName, "Transaction Ref": w.transactionRef,
        })),
        `withdrawals-report-${range.from}-to-${range.to}.csv`,
      );
    } else {
      downloadCsv(
        data.remittances.map((r) => ({
          Date: r.date, "Employee ID": r.employeeId, "Worker Name": r.workerName,
          "Send Amount": r.sendAmount.toFixed(2), "Send Currency": r.sendCurrency,
          "Receive Amount": r.receiveAmount.toFixed(2), "Receive Currency": r.receiveCurrency,
          "Transfer Fee": r.transferFee.toFixed(2), "Total Debit": r.totalDebit.toFixed(2),
          Recipient: r.recipientName, Country: r.recipientCountry, Method: r.transferMethod, Status: r.status,
        })),
        `remittances-report-${range.from}-to-${range.to}.csv`,
      );
    }
  }, [data, sub, range]);

  const currency = data?.totals.currency ?? "MYR";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <DateRangeBar range={range} onChange={setRange} />
        <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-7" onClick={handleExport} disabled={!data}>
          <Download size={12} /> Export CSV
        </Button>
      </div>

      {data === undefined ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SummaryCard label="Withdrawals Processed" value={fmt(data.totals.totalWithdrawals, currency)} icon={<Wallet size={16} />} color="text-red-500" />
            <SummaryCard label="Remittances Sent" value={fmt(data.totals.totalRemittances, currency)} icon={<Send size={16} />} color="text-indigo-500" />
            <SummaryCard label="Total Records" value={String(data.withdrawals.length + data.remittances.length)} icon={<BarChart3 size={16} />} color="text-blue-500" />
          </div>

          <Tabs value={sub} onValueChange={(v) => setSub(v as typeof sub)}>
            <TabsList className="h-8">
              <TabsTrigger value="withdrawals" className="text-xs h-7 gap-1">
                <Wallet size={12} /> Withdrawals ({data.withdrawals.length})
              </TabsTrigger>
              <TabsTrigger value="remittances" className="text-xs h-7 gap-1">
                <Send size={12} /> Remittances ({data.remittances.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="withdrawals" className="mt-3">
              {data.withdrawals.length === 0 ? (
                <Empty><EmptyHeader><EmptyMedia variant="icon"><Wallet /></EmptyMedia><EmptyTitle>No withdrawals in this period</EmptyTitle></EmptyHeader></Empty>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="font-semibold">Worker</TableHead>
                        <TableHead className="font-semibold hidden sm:table-cell">Date</TableHead>
                        <TableHead className="font-semibold">Amount</TableHead>
                        <TableHead className="font-semibold hidden md:table-cell">Bank</TableHead>
                        <TableHead className="font-semibold hidden md:table-cell">Ref</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.withdrawals.map((w, i) => (
                        <TableRow key={i} className="hover:bg-muted/30">
                          <TableCell>
                            <p className="font-medium text-sm">{w.workerName}</p>
                            <code className="text-xs text-muted-foreground">{w.employeeId}</code>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm font-mono">{w.date}</TableCell>
                          <TableCell className="font-semibold text-sm">{fmt(w.amount, w.currency)}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{w.bankName}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs font-mono text-muted-foreground">{w.transactionRef}</TableCell>
                          <TableCell><Badge className={cn("border-0 text-xs", STATUS_COLORS[w.status] ?? "bg-muted")}>{w.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="remittances" className="mt-3">
              {data.remittances.length === 0 ? (
                <Empty><EmptyHeader><EmptyMedia variant="icon"><Send /></EmptyMedia><EmptyTitle>No remittances in this period</EmptyTitle></EmptyHeader></Empty>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="font-semibold">Worker</TableHead>
                        <TableHead className="font-semibold hidden sm:table-cell">Date</TableHead>
                        <TableHead className="font-semibold">Send</TableHead>
                        <TableHead className="font-semibold hidden md:table-cell">Receive</TableHead>
                        <TableHead className="font-semibold hidden md:table-cell">Recipient</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.remittances.map((r, i) => (
                        <TableRow key={i} className="hover:bg-muted/30">
                          <TableCell>
                            <p className="font-medium text-sm">{r.workerName}</p>
                            <code className="text-xs text-muted-foreground">{r.employeeId}</code>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm font-mono">{r.date}</TableCell>
                          <TableCell className="font-semibold text-sm">{fmt(r.totalDebit, r.sendCurrency)}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{fmt(r.receiveAmount, r.receiveCurrency)}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <p className="text-sm">{r.recipientName}</p>
                            <p className="text-xs text-muted-foreground">{r.recipientCountry}</p>
                          </TableCell>
                          <TableCell><Badge className={cn("border-0 text-xs", STATUS_COLORS[r.status] ?? "bg-muted")}>{r.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// ── 6. Workforce Snapshot ─────────────────────────────────────────────────────

function WorkforceReport({ agencyId }: { agencyId: Id<"agencies"> | null }) {
  const data = useQuery(
    api.reports.workerSummary,
    agencyId ? { agencyId } : {},
  );

  const statusData = data
    ? Object.entries(data.byStatus).map(([name, value]) => ({ name, value }))
    : [];
  const typeData = data
    ? Object.entries(data.byEmploymentType).map(([name, value]) => ({
        name: name.replace(/_/g, " "),
        value,
      }))
    : [];
  const nationalityData = data
    ? Object.entries(data.byNationality)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-4">
      {data === undefined ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Total Workers" value={String(data.total)} icon={<Users size={16} />} color="text-primary" />
            <SummaryCard label="Active" value={String(data.byStatus.active ?? 0)} icon={<Users size={16} />} color="text-green-500" />
            <SummaryCard label="Inactive / Suspended" value={String((data.byStatus.inactive ?? 0) + (data.byStatus.suspended ?? 0))} icon={<Users size={16} />} color="text-amber-500" />
            <SummaryCard label="Terminated" value={String(data.byStatus.terminated ?? 0)} icon={<Users size={16} />} color="text-red-500" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status pie */}
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">By Status</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                    {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Employment type */}
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">By Employment Type</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={typeData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Nationality */}
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Top Nationalities</p>
              <div className="space-y-2">
                {nationalityData.map(({ name, value }, i) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-sm flex-1 truncate">{name}</span>
                    <span className="text-sm font-semibold">{value}</span>
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.round((value / data.total) * 100)}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                  </div>
                ))}
                {nationalityData.length === 0 && <p className="text-sm text-muted-foreground">No nationality data</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Content ──────────────────────────────────────────────────────────────

function ReportsContent() {
  const { agencyId } = useAgency();
  const [tab, setTab] = useState("payroll");

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {agencyId ? "Agency reports" : "All agencies"} with CSV export — payroll, attendance, ledger, advances, outflows, workforce
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-full px-3 py-1.5">
          <RefreshCw size={11} /> Live data
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto">
          <TabsList className="h-8 w-max min-w-full sm:min-w-0">
            <TabsTrigger value="payroll"    className="text-xs h-7 gap-1 flex-shrink-0"><DollarSign size={12} /> Payroll</TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs h-7 gap-1 flex-shrink-0"><Calendar size={12} /> Attendance</TabsTrigger>
            <TabsTrigger value="ledger"     className="text-xs h-7 gap-1 flex-shrink-0"><BarChart3 size={12} /> Ledger</TabsTrigger>
            <TabsTrigger value="advances"   className="text-xs h-7 gap-1 flex-shrink-0"><TrendingUp size={12} /> Advances</TabsTrigger>
            <TabsTrigger value="outflow"    className="text-xs h-7 gap-1 flex-shrink-0"><Send size={12} /> Outflows</TabsTrigger>
            <TabsTrigger value="workforce"  className="text-xs h-7 gap-1 flex-shrink-0"><Users size={12} /> Workforce</TabsTrigger>
            <TabsTrigger value="profits"   className="text-xs h-7 gap-1 flex-shrink-0"><Coins size={12} /> Profits</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="payroll"    className="mt-4"><PayrollReport    agencyId={agencyId} /></TabsContent>
        <TabsContent value="attendance" className="mt-4"><AttendanceReport agencyId={agencyId} /></TabsContent>
        <TabsContent value="ledger"     className="mt-4"><LedgerReport     agencyId={agencyId} /></TabsContent>
        <TabsContent value="advances"   className="mt-4"><AdvancesReport   agencyId={agencyId} /></TabsContent>
        <TabsContent value="outflow"    className="mt-4"><OutflowReport    agencyId={agencyId} /></TabsContent>
        <TabsContent value="workforce"  className="mt-4"><WorkforceReport  agencyId={agencyId} /></TabsContent>
        <TabsContent value="profits"   className="mt-4"><ProfitsReport   agencyId={agencyId} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ── 7. Profits Report ────────────────────────────────────────────────────────

const PROFIT_COLORS = ["#f59e0b", "#8b5cf6", "#10b981"];

function ProfitsReport({ agencyId }: { agencyId: Id<"agencies"> | null }) {
  const [range, setRange] = useState(PRESETS[0]);

  const data = useQuery(
    api.reports.profitSummary,
    agencyId
      ? { agencyId, periodStart: range.from, periodEnd: range.to }
      : { periodStart: range.from, periodEnd: range.to },
  );

  if (data === undefined) {
    return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-48 w-full" /></div>;
  }

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const pieData = [
    { name: "Advance Fees", value: data.advanceFees.total },
    { name: "iGaming Profit", value: Math.max(0, data.igaming.netProfit) },
    { name: "Marketplace", value: data.marketplace.totalRevenue },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-5">
      <DateRangeBar range={range} onChange={setRange} />

      {/* Grand total banner */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
        <p className="text-sm font-medium text-white/80">Total Profit</p>
        <p className="text-3xl font-bold mt-1">{data.currency} {fmt(data.grandTotal)}</p>
        <p className="text-xs text-white/60 mt-1">{range.label} · {range.from} → {range.to}</p>
      </div>

      {/* Revenue source cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Advance Processing Fees */}
        <div className="bg-card border rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <TrendingUp size={14} className="text-amber-600" />
            </div>
            <span className="text-xs text-muted-foreground">Advance Fees</span>
          </div>
          <p className="text-lg font-bold">{data.currency} {fmt(data.advanceFees.total)}</p>
          <p className="text-[11px] text-muted-foreground">{data.advanceFees.count} advance{data.advanceFees.count !== 1 ? "s" : ""} · 10% fee each</p>
        </div>

        {/* iGaming Profit */}
        <div className="bg-card border rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Gamepad2 size={14} className="text-purple-600" />
            </div>
            <span className="text-xs text-muted-foreground">iGaming Profit</span>
          </div>
          <p className={cn("text-lg font-bold", data.igaming.netProfit < 0 ? "text-red-600" : "")}>
            {data.currency} {fmt(data.igaming.netProfit)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Deposits: {fmt(data.igaming.totalDeposited)} · Withdrawals: {fmt(data.igaming.totalWithdrawn)}
          </p>
        </div>

        {/* Marketplace Revenue */}
        <div className="bg-card border rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <ShoppingBag size={14} className="text-emerald-600" />
            </div>
            <span className="text-xs text-muted-foreground">Marketplace</span>
          </div>
          <p className="text-lg font-bold">{data.currency} {fmt(data.marketplace.totalRevenue)}</p>
          <p className="text-[11px] text-muted-foreground">{data.marketplace.orderCount} order{data.marketplace.orderCount !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily breakdown bar chart */}
        {data.breakdown.length > 0 && (
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm font-semibold mb-3">Daily Breakdown</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.breakdown}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(value: unknown) => fmt(Number(value))}
                />
                <Bar dataKey="advanceFees" name="Advance Fees" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0] as const} />
                <Bar dataKey="igamingProfit" name="iGaming" fill="#8b5cf6" stackId="a" radius={[0, 0, 0, 0] as const} />
                <Bar dataKey="marketplaceRevenue" name="Marketplace" fill="#10b981" stackId="a" radius={[4, 4, 0, 0] as const} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pie chart */}
        {pieData.length > 0 && (
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm font-semibold mb-3">Revenue Distribution</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PROFIT_COLORS[i % PROFIT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: unknown) => `${data.currency} ${fmt(Number(value))}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Empty state */}
      {data.grandTotal === 0 && data.breakdown.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Coins /></EmptyMedia>
            <EmptyTitle>No profit data</EmptyTitle>
            <EmptyDescription>No revenue recorded for this period</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <>
      <Authenticated><ReportsContent /></Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">Reports require authentication</p>
          </div>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
