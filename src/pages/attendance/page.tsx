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
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import { Clock, CheckCircle2, XCircle, Pencil, Trash2, ChevronLeft, ChevronRight, QrCode, ShieldCheck, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { useAgency } from "@/components/providers/agency.tsx";
import { cn } from "@/lib/utils.ts";
import { format, addDays, subDays } from "date-fns";
import AttendanceEntryDialog from "./_components/AttendanceEntryDialog.tsx";
import QrCodeDisplay from "./_components/QrCodeDisplay.tsx";

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  absent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  half_day: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  rest_day: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  public_holiday: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  leave: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const STATUS_LABELS: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  half_day: "Half Day",
  rest_day: "Rest Day",
  public_holiday: "Public Holiday",
  leave: "Leave",
};

const REC_LABELS: Record<string, string> = {
  days: "Days",
  hours: "Hours",
  piece_work: "Piece Work",
};

// ─── Daily Attendance Tab ───────────────────────────────────────────────────

function DailyView() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const { agencyId } = useAgency();
  const [dialogWorker, setDialogWorker] = useState<Doc<"workers"> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const workers = useQuery(api.workers.list, {
    agencyId: agencyId ?? undefined,
    status: "active",
  });
  const attendanceRecords = useQuery(api.attendance.listByDate, {
    date: selectedDate,
    agencyId: agencyId ?? undefined,
  });
  const removeRecord = useMutation(api.attendance.remove);

  // Map workerId → attendance record
  const recordMap = new Map(
    (attendanceRecords ?? []).map((r) => [r.workerId, r]),
  );

  const openDialog = (worker: Doc<"workers">) => {
    setDialogWorker(worker);
    setDialogOpen(true);
  };

  const handleDelete = async (id: Id<"attendance">) => {
    try {
      await removeRecord({ id });
      toast.success("Record deleted");
    } catch {
      toast.error("Failed to delete record");
    }
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    const shifted = days > 0 ? addDays(d, days) : subDays(d, Math.abs(days));
    setSelectedDate(format(shifted, "yyyy-MM-dd"));
  };

  const presentCount = (attendanceRecords ?? []).filter(
    (r) => r.status === "present" || r.status === "half_day",
  ).length;
  const absentCount = (attendanceRecords ?? []).filter((r) => r.status === "absent").length;

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => shiftDate(-1)}>
            <ChevronLeft size={14} />
          </Button>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40 h-8 text-sm"
          />
          <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => shiftDate(1)}>
            <ChevronRight size={14} />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedDate(today)}>
            Today
          </Button>
        </div>

        {/* Summary badges */}
        {attendanceRecords !== undefined && (
          <div className="flex items-center gap-2 ml-auto">
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 gap-1">
              <CheckCircle2 size={11} /> {presentCount} Present
            </Badge>
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 gap-1">
              <XCircle size={11} /> {absentCount} Absent
            </Badge>
          </div>
        )}
      </div>

      {/* Workers table */}
      {workers === undefined || attendanceRecords === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : workers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Clock /></EmptyMedia>
            <EmptyTitle>No active workers</EmptyTitle>
            <EmptyDescription>Add workers to start tracking attendance</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Worker</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">ID</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Work Record</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((worker) => {
                const record = recordMap.get(worker._id);
                return (
                  <TableRow key={worker._id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {worker.firstName.charAt(0)}{worker.lastName.charAt(0)}
                        </div>
                        <span className="font-medium text-sm">
                          {worker.firstName} {worker.lastName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{worker.employeeId}</code>
                    </TableCell>
                    <TableCell>
                      {record ? (
                        <Badge className={cn("border-0 text-xs", STATUS_COLORS[record.status])}>
                          {STATUS_LABELS[record.status]}
                        </Badge>
                      ) : (
                        <Badge className="border-0 text-xs bg-muted text-muted-foreground">Not recorded</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {record ? (
                        <span>
                          {REC_LABELS[record.recordType]}
                          {record.recordType === "days" && record.daysWorked != null && ` — ${record.daysWorked}d`}
                          {record.recordType === "hours" && record.hoursWorked != null && ` — ${record.hoursWorked}h`}
                          {record.recordType === "piece_work" && record.pieceCount != null && ` — ${record.pieceCount} pcs`}
                          {record.overtimeHours ? ` (+${record.overtimeHours}h OT)` : ""}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openDialog(worker)}
                        >
                          <Pencil size={13} />
                        </Button>
                        {record && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(record._id)}
                          >
                            <Trash2 size={13} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {dialogWorker && (
        <AttendanceEntryDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setDialogWorker(null); }}
          worker={dialogWorker}
          date={selectedDate}
          existing={recordMap.get(dialogWorker._id) ?? null}
        />
      )}
    </div>
  );
}

// ─── History Tab ────────────────────────────────────────────────────────────

function HistoryView() {
  const { agencyId } = useAgency();
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return format(d, "yyyy-MM-dd");
  });
  const [toDate, setToDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [editRecord, setEditRecord] = useState<Doc<"attendance"> | null>(null);
  const [editWorker, setEditWorker] = useState<Doc<"workers"> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const records = useQuery(
    api.attendance.listByAgency,
    agencyId
      ? { agencyId, fromDate, toDate }
      : "skip",
  );
  const removeRecord = useMutation(api.attendance.remove);

  const handleDelete = async (id: Id<"attendance">) => {
    try {
      await removeRecord({ id });
      toast.success("Record deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-36 h-8 text-sm"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-36 h-8 text-sm"
          />
        </div>
        {records && (
          <span className="text-xs text-muted-foreground ml-auto">{records.length} records</span>
        )}
      </div>

      {!agencyId ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Clock size={32} className="mb-3 opacity-40" />
          <p className="text-sm">Select an agency in the sidebar to view attendance history</p>
        </div>
      ) : records === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : records.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Clock /></EmptyMedia>
            <EmptyTitle>No records found</EmptyTitle>
            <EmptyDescription>No attendance records for the selected date range</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Worker ID</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Type</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Details</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Notes</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record._id} className="hover:bg-muted/30">
                  <TableCell className="text-sm font-mono">{record.date}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{record.workerId.slice(-6)}</code>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("border-0 text-xs", STATUS_COLORS[record.status])}>
                      {STATUS_LABELS[record.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {REC_LABELS[record.recordType]}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {record.recordType === "days" && record.daysWorked != null && `${record.daysWorked} day(s)`}
                    {record.recordType === "hours" && record.hoursWorked != null && `${record.hoursWorked}h${record.overtimeHours ? ` +${record.overtimeHours}h OT` : ""}`}
                    {record.recordType === "piece_work" && record.pieceCount != null && `${record.pieceCount} pcs @ ${record.pieceRate ?? 0}`}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[150px] truncate">
                    {record.notes ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditRecord(record);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(record._id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit dialog for history — we need the worker to pass it */}
      {editRecord && editWorker && (
        <AttendanceEntryDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditRecord(null); setEditWorker(null); }}
          worker={editWorker}
          date={editRecord.date}
          existing={editRecord}
        />
      )}
    </div>
  );
}

// ─── QR Codes Tab ──────────────────────────────────────────────────────────

function QrCodesView() {
  const { agencyId } = useAgency();
  const sites = useQuery(
    api.sites.list,
    agencyId ? { agencyId } : "skip",
  );

  if (!agencyId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <QrCode size={32} className="mb-3 opacity-40" />
        <p className="text-sm">Select an agency to display site QR codes</p>
      </div>
    );
  }

  if (sites === undefined) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
      </div>
    );
  }

  // Filter to active sites only
  const activeSites = (sites ?? []).filter((s) => s.status === "active");

  if (activeSites.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><QrCode /></EmptyMedia>
          <EmptyTitle>No active sites</EmptyTitle>
          <EmptyDescription>Create a site first, then QR codes will appear here for workers to scan.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Display these QR codes at each site. Workers scan to clock in and out. Codes auto-refresh every 30 seconds.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeSites.map((site) => (
          <QrCodeDisplay key={site._id} siteId={site._id} siteName={site.name} />
        ))}
      </div>
    </div>
  );
}

// ─── Clock In/Out Verification Tab ─────────────────────────────────────────

function ClockVerifyView() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const { agencyId } = useAgency();
  const verifyRecord = useMutation(api.attendance.verifyAttendance);
  const bulkVerifyRecords = useMutation(api.attendance.bulkVerify);

  const records = useQuery(api.attendance.listByDate, {
    date: selectedDate,
    agencyId: agencyId ?? undefined,
  });

  // Only show records that have clock-in time (QR-based entries)
  const clockRecords = (records ?? []).filter((r) => r.clockInTime);
  const unverifiedIds = clockRecords.filter((r) => !r.verified).map((r) => r._id);

  const workers = useQuery(api.workers.list, {
    agencyId: agencyId ?? undefined,
    status: "active",
  });
  const workerMap = new Map((workers ?? []).map((w) => [w._id, w]));

  const handleVerify = async (id: Id<"attendance">) => {
    try {
      await verifyRecord({ id });
      toast.success("Attendance verified");
    } catch {
      toast.error("Failed to verify");
    }
  };

  const handleBulkVerify = async () => {
    if (unverifiedIds.length === 0) return;
    try {
      const result = await bulkVerifyRecords({ ids: unverifiedIds });
      toast.success(`Verified ${result.verified} records`);
    } catch {
      toast.error("Failed to verify records");
    }
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    const shifted = days > 0 ? addDays(d, days) : subDays(d, Math.abs(days));
    setSelectedDate(format(shifted, "yyyy-MM-dd"));
  };

  const fmtTime = (iso: string | undefined) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => shiftDate(-1)}>
            <ChevronLeft size={14} />
          </Button>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-40 h-8 text-sm" />
          <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => shiftDate(1)}>
            <ChevronRight size={14} />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedDate(today)}>Today</Button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {unverifiedIds.length > 0 && (
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleBulkVerify}>
              <BadgeCheck size={13} /> Verify All ({unverifiedIds.length})
            </Button>
          )}
          {clockRecords.length > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-1">
              <CheckCircle2 size={11} /> {clockRecords.filter((r) => r.verified).length}/{clockRecords.length} verified
            </Badge>
          )}
        </div>
      </div>

      {records === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : clockRecords.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ShieldCheck /></EmptyMedia>
            <EmptyTitle>No clock-in records</EmptyTitle>
            <EmptyDescription>No workers have clocked in via QR code on this date.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Worker</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">ID</TableHead>
                <TableHead className="font-semibold">Clock In</TableHead>
                <TableHead className="font-semibold">Clock Out</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Hours</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clockRecords.map((record) => {
                const worker = workerMap.get(record.workerId);
                return (
                  <TableRow key={record._id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {worker ? `${worker.firstName.charAt(0)}${worker.lastName.charAt(0)}` : "?"}
                        </div>
                        <span className="font-medium text-sm">
                          {worker ? `${worker.firstName} ${worker.lastName}` : "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{worker?.employeeId ?? "—"}</code>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono text-green-600 dark:text-green-400">
                        {fmtTime(record.clockInTime)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {record.clockOutTime ? (
                        <span className="text-sm font-mono text-red-600 dark:text-red-400">
                          {fmtTime(record.clockOutTime)}
                        </span>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px]">
                          Working
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {record.hoursWorked != null && record.hoursWorked > 0
                        ? `${record.hoursWorked}h${record.overtimeHours ? ` (+${record.overtimeHours}h OT)` : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {record.verified ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px] gap-0.5">
                          <CheckCircle2 size={10} /> Verified
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px]">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!record.verified && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleVerify(record._id)}
                        >
                          <ShieldCheck size={12} /> Verify
                        </Button>
                      )}
                    </TableCell>
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

// ─── Main Page ───────────────────────────────────────────────────────────────

function AttendanceContent() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-serif text-foreground">Attendance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track daily attendance with QR clock-in/out, manual entry, and verification
        </p>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily Entry</TabsTrigger>
          <TabsTrigger value="clockinout" className="gap-1"><Clock size={13} /> Clock In/Out</TabsTrigger>
          <TabsTrigger value="qrcodes" className="gap-1"><QrCode size={13} /> QR Codes</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="mt-4">
          <DailyView />
        </TabsContent>
        <TabsContent value="clockinout" className="mt-4">
          <ClockVerifyView />
        </TabsContent>
        <TabsContent value="qrcodes" className="mt-4">
          <QrCodesView />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <>
      <Authenticated>
        <AttendanceContent />
      </Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">Track attendance with your account</p>
          </div>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
