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
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import { Users, Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { useAgency } from "@/components/providers/agency.tsx";
import { cn } from "@/lib/utils.ts";
import WorkerFormDialog, {
  DEFAULT_WORKER_FORM,
  type WorkerFormData,
} from "./_components/WorkerForm.tsx";
import WorkerDetailSheet from "./_components/WorkerDetail.tsx";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-muted text-muted-foreground",
  suspended: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  terminated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const EMP_LABELS: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  piece_work: "Piece Work",
};

function WorkersList() {
  const { agencyId } = useAgency();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Doc<"workers"> | null>(null);
  const [detailWorker, setDetailWorker] = useState<Doc<"workers"> | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"workers"> | null>(null);

  const agencies = useQuery(api.agencies.list, {});
  const workers = useQuery(api.workers.list, {
    agencyId: agencyId ?? undefined,
    status:
      statusFilter !== "all"
        ? (statusFilter as Doc<"workers">["status"])
        : undefined,
  });

  const createWorker = useMutation(api.workers.create);
  const updateWorker = useMutation(api.workers.update);
  const removeWorker = useMutation(api.workers.remove);

  const filteredWorkers = (workers ?? []).filter((w) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      w.firstName.toLowerCase().includes(q) ||
      w.lastName.toLowerCase().includes(q) ||
      w.employeeId.toLowerCase().includes(q) ||
      (w.jobTitle ?? "").toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (form: WorkerFormData) => {
    if (!form.firstName || !form.lastName || !form.employeeId || !form.agencyId || !form.startDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        employeeId: form.employeeId,
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: (form.gender || undefined) as Doc<"workers">["gender"],
        nationality: form.nationality || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        agencyId: form.agencyId as Id<"agencies">,
        branchId: (form.branchId || undefined) as Id<"branches"> | undefined,
        siteId: (form.siteId || undefined) as Id<"sites"> | undefined,
        jobTitle: form.jobTitle || undefined,
        department: form.department || undefined,
        employmentType: form.employmentType,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        status: form.status,
        bankName: form.bankName || undefined,
        bankAccountNumber: form.bankAccountNumber || undefined,
        bankAccountName: form.bankAccountName || undefined,
        expectedMonthlySalary: form.expectedMonthlySalary ? parseFloat(form.expectedMonthlySalary) : undefined,
        salaryCurrency: form.salaryCurrency || undefined,
        withdrawalFrequency: (form.withdrawalFrequency || undefined) as "weekly" | "monthly" | undefined,
      };

      if (editingWorker) {
        await updateWorker({ id: editingWorker._id, ...payload });
        toast.success("Worker updated");
      } else {
        await createWorker(payload);
        toast.success("Worker added");
      }
      setFormOpen(false);
      setEditingWorker(null);
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: Id<"workers">) => {
    setDeletingId(id);
    try {
      await removeWorker({ id });
      toast.success("Worker removed");
    } catch {
      toast.error("Failed to remove worker");
    } finally {
      setDeletingId(null);
    }
  };

  const openCreate = () => {
    setEditingWorker(null);
    setFormOpen(true);
  };

  // Pre-fill active agency when creating a new worker
  const getDefaultForm = (): WorkerFormData => ({
    ...DEFAULT_WORKER_FORM,
    agencyId: agencyId ?? "",
  });

  const openEdit = (worker: Doc<"workers">, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingWorker(worker);
    setFormOpen(true);
  };

  const openDetail = (worker: Doc<"workers">) => {
    setDetailWorker(worker);
    setDetailOpen(true);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground">Workers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage worker profiles and employment details</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus size={15} /> Add Worker
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {workers === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filteredWorkers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Users /></EmptyMedia>
            <EmptyTitle>{search || statusFilter !== "all" ? "No workers match your filters" : "No workers yet"}</EmptyTitle>
            <EmptyDescription>
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Add your first worker to get started"}
            </EmptyDescription>
          </EmptyHeader>
          {!search && statusFilter === "all" && (
            <EmptyContent>
              <Button size="sm" onClick={openCreate} className="gap-1.5">
                <Plus size={14} /> Add Worker
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">ID</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Type</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Job Title</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkers.map((worker) => (
                <TableRow
                  key={worker._id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => openDetail(worker)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                        {worker.firstName.charAt(0)}{worker.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{worker.firstName} {worker.lastName}</p>
                        {worker.email && (
                          <p className="text-xs text-muted-foreground hidden sm:block">{worker.email}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{worker.employeeId}</code>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {EMP_LABELS[worker.employmentType]}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {worker.jobTitle ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("border-0 text-xs capitalize", STATUS_COLORS[worker.status])}>
                      {worker.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => openEdit(worker, e)}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(worker._id);
                        }}
                        disabled={deletingId === worker._id}
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

      <WorkerFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingWorker(null); }}
        worker={editingWorker}
        initialValues={editingWorker ? undefined : getDefaultForm()}
        onSubmit={handleSubmit}
        saving={saving}
      />

      <WorkerDetailSheet
        worker={detailWorker}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={() => {
          setDetailOpen(false);
          if (detailWorker) openEdit(detailWorker);
        }}
      />
    </div>
  );
}

export default function WorkersPage() {
  return (
    <>
      <Authenticated>
        <WorkersList />
      </Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">Manage workers with your account</p>
          </div>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
