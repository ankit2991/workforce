import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

type WorkerStatus = "active" | "inactive" | "suspended" | "terminated";
type EmploymentType = "full_time" | "part_time" | "contract" | "piece_work";
type Gender = "male" | "female" | "other";

export type WorkerFormData = {
  employeeId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender | "";
  nationality: string;
  phone: string;
  email: string;
  agencyId: string;
  branchId: string;
  siteId: string;
  jobTitle: string;
  department: string;
  employmentType: EmploymentType;
  startDate: string;
  endDate: string;
  status: WorkerStatus;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  expectedMonthlySalary: string;
  salaryCurrency: string;
  withdrawalFrequency: "weekly" | "monthly" | "";
};

export const DEFAULT_WORKER_FORM: WorkerFormData = {
  employeeId: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  nationality: "",
  phone: "",
  email: "",
  agencyId: "",
  branchId: "",
  siteId: "",
  jobTitle: "",
  department: "",
  employmentType: "full_time",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  status: "active",
  bankName: "",
  bankAccountNumber: "",
  bankAccountName: "",
  expectedMonthlySalary: "",
  salaryCurrency: "MYR",
  withdrawalFrequency: "",
};

function workerToForm(worker: Doc<"workers">): WorkerFormData {
  return {
    employeeId: worker.employeeId,
    firstName: worker.firstName,
    lastName: worker.lastName,
    dateOfBirth: worker.dateOfBirth ?? "",
    gender: worker.gender ?? "",
    nationality: worker.nationality ?? "",
    phone: worker.phone ?? "",
    email: worker.email ?? "",
    agencyId: worker.agencyId,
    branchId: worker.branchId ?? "",
    siteId: worker.siteId ?? "",
    jobTitle: worker.jobTitle ?? "",
    department: worker.department ?? "",
    employmentType: worker.employmentType,
    startDate: worker.startDate,
    endDate: worker.endDate ?? "",
    status: worker.status,
    bankName: worker.bankName ?? "",
    bankAccountNumber: worker.bankAccountNumber ?? "",
    bankAccountName: worker.bankAccountName ?? "",
    expectedMonthlySalary: worker.expectedMonthlySalary != null ? String(worker.expectedMonthlySalary) : "",
    salaryCurrency: worker.salaryCurrency ?? "MYR",
    withdrawalFrequency: worker.withdrawalFrequency ?? "",
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  worker: Doc<"workers"> | null;
  initialValues?: WorkerFormData;
  onSubmit: (data: WorkerFormData) => Promise<void>;
  saving: boolean;
};

export default function WorkerFormDialog({ open, onClose, worker, initialValues, onSubmit, saving }: Props) {
  const defaultForm = initialValues ?? DEFAULT_WORKER_FORM;
  const [form, setForm] = useState<WorkerFormData>(
    worker ? workerToForm(worker) : defaultForm,
  );

  useEffect(() => {
    setForm(worker ? workerToForm(worker) : (initialValues ?? DEFAULT_WORKER_FORM));
  }, [worker, open, initialValues]);

  const agencies = useQuery(api.agencies.list, {});
  const branches = useQuery(
    api.branches.list,
    form.agencyId ? { agencyId: form.agencyId as Doc<"agencies">["_id"] } : "skip",
  );
  const sites = useQuery(
    api.sites.list,
    form.branchId ? { branchId: form.branchId as Doc<"branches">["_id"] } : "skip",
  );

  const set = (key: keyof WorkerFormData, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {worker ? "Edit Worker" : "Add Worker"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="personal" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="personal" className="flex-1">Personal</TabsTrigger>
              <TabsTrigger value="employment" className="flex-1">Employment</TabsTrigger>
              <TabsTrigger value="bank" className="flex-1">Salary & Bank</TabsTrigger>
            </TabsList>

            {/* Personal Info */}
            <TabsContent value="personal" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First Name *</Label>
                  <Input
                    placeholder="John"
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name *</Label>
                  <Input
                    placeholder="Smith"
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Employee ID *</Label>
                <Input
                  placeholder="EMP001"
                  value={form.employeeId}
                  onChange={(e) => set("employeeId", e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => set("dateOfBirth", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select value={form.gender || "none"} onValueChange={(v) => set("gender", v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nationality</Label>
                  <Input
                    placeholder="Malaysian"
                    value={form.nationality}
                    onChange={(e) => set("nationality", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    placeholder="+60 12-345 6789"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="worker@example.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
            </TabsContent>

            {/* Employment */}
            <TabsContent value="employment" className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label>Agency *</Label>
                <Select
                  value={form.agencyId || "none"}
                  onValueChange={(v) => {
                    setForm((prev) => ({ ...prev, agencyId: v === "none" ? "" : v, branchId: "", siteId: "" }));
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select agency…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select agency…</SelectItem>
                    {(agencies ?? []).map((a) => (
                      <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Branch</Label>
                  <Select
                    value={form.branchId || "none"}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, branchId: v === "none" ? "" : v, siteId: "" }))}
                    disabled={!form.agencyId}
                  >
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(branches ?? []).map((b) => (
                        <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Site</Label>
                  <Select
                    value={form.siteId || "none"}
                    onValueChange={(v) => set("siteId", v === "none" ? "" : v)}
                    disabled={!form.branchId}
                  >
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(sites ?? []).map((s) => (
                        <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Job Title</Label>
                  <Input
                    placeholder="Production Worker"
                    value={form.jobTitle}
                    onChange={(e) => set("jobTitle", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Input
                    placeholder="Assembly"
                    value={form.department}
                    onChange={(e) => set("department", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Employment Type *</Label>
                <Select value={form.employmentType} onValueChange={(v) => set("employmentType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="piece_work">Piece Work</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => set("startDate", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => set("endDate", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Salary & Bank Details */}
            <TabsContent value="bank" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Expected Monthly Salary</Label>
                  <Input
                    type="number"
                    placeholder="3000"
                    value={form.expectedMonthlySalary}
                    onChange={(e) => set("expectedMonthlySalary", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Salary Currency</Label>
                  <Input
                    placeholder="MYR"
                    value={form.salaryCurrency}
                    onChange={(e) => set("salaryCurrency", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Withdrawal Frequency</Label>
                <Select value={form.withdrawalFrequency || "none"} onValueChange={(v) => set("withdrawalFrequency", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border-t pt-4 mt-2">
                <p className="text-xs text-muted-foreground font-medium mb-3">Bank Details</p>
              </div>
              <div className="space-y-1.5">
                <Label>Bank Name</Label>
                <Input
                  placeholder="Maybank"
                  value={form.bankName}
                  onChange={(e) => set("bankName", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Account Number</Label>
                <Input
                  placeholder="1234567890"
                  value={form.bankAccountNumber}
                  onChange={(e) => set("bankAccountNumber", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Account Holder Name</Label>
                <Input
                  placeholder="John Smith"
                  value={form.bankAccountName}
                  onChange={(e) => set("bankAccountName", e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-6">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : worker ? "Update Worker" : "Add Worker"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
