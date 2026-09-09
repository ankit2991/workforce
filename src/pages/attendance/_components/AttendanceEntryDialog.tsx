import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
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
import { toast } from "sonner";
import { ConvexError } from "convex/values";

type RecordType = "days" | "hours" | "piece_work";
type AttendanceStatus =
  | "present"
  | "absent"
  | "half_day"
  | "rest_day"
  | "public_holiday"
  | "leave";

type FormData = {
  recordType: RecordType;
  status: AttendanceStatus;
  daysWorked: string;
  hoursWorked: string;
  overtimeHours: string;
  pieceCount: string;
  pieceRate: string;
  notes: string;
};

const DEFAULT_FORM: FormData = {
  recordType: "days",
  status: "present",
  daysWorked: "1",
  hoursWorked: "",
  overtimeHours: "0",
  pieceCount: "",
  pieceRate: "",
  notes: "",
};

function recordToForm(r: Doc<"attendance">): FormData {
  return {
    recordType: r.recordType,
    status: r.status,
    daysWorked: r.daysWorked?.toString() ?? "1",
    hoursWorked: r.hoursWorked?.toString() ?? "",
    overtimeHours: r.overtimeHours?.toString() ?? "0",
    pieceCount: r.pieceCount?.toString() ?? "",
    pieceRate: r.pieceRate?.toString() ?? "",
    notes: r.notes ?? "",
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  worker: Doc<"workers">;
  date: string;
  existing: Doc<"attendance"> | null;
};

export default function AttendanceEntryDialog({
  open,
  onClose,
  worker,
  date,
  existing,
}: Props) {
  const [form, setForm] = useState<FormData>(
    existing ? recordToForm(existing) : DEFAULT_FORM,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(existing ? recordToForm(existing) : DEFAULT_FORM);
  }, [existing, open]);

  const create = useMutation(api.attendance.create);
  const update = useMutation(api.attendance.update);

  const set = (key: keyof FormData, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const base = {
        recordType: form.recordType,
        status: form.status,
        notes: form.notes || undefined,
        daysWorked:
          form.recordType === "days" && form.daysWorked
            ? parseFloat(form.daysWorked)
            : undefined,
        hoursWorked:
          form.recordType === "hours" && form.hoursWorked
            ? parseFloat(form.hoursWorked)
            : undefined,
        overtimeHours:
          form.recordType === "hours" && form.overtimeHours
            ? parseFloat(form.overtimeHours)
            : undefined,
        pieceCount:
          form.recordType === "piece_work" && form.pieceCount
            ? parseFloat(form.pieceCount)
            : undefined,
        pieceRate:
          form.recordType === "piece_work" && form.pieceRate
            ? parseFloat(form.pieceRate)
            : undefined,
      };

      if (existing) {
        await update({ id: existing._id, ...base });
        toast.success("Record updated");
      } else {
        await create({
          workerId: worker._id,
          agencyId: worker.agencyId,
          branchId: worker.branchId,
          siteId: worker.siteId,
          date,
          ...base,
        });
        toast.success("Attendance saved");
      }
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {worker.firstName} {worker.lastName} — {date}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Record Type</Label>
              <Select value={form.recordType} onValueChange={(v) => set("recordType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="piece_work">Piece Work</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="rest_day">Rest Day</SelectItem>
                  <SelectItem value="public_holiday">Public Holiday</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.recordType === "days" && (
            <div className="space-y-1.5">
              <Label>Days Worked</Label>
              <Select value={form.daysWorked} onValueChange={(v) => set("daysWorked", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 — Full Day</SelectItem>
                  <SelectItem value="0.5">0.5 — Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {form.recordType === "hours" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Hours Worked</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="8"
                  value={form.hoursWorked}
                  onChange={(e) => set("hoursWorked", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Overtime Hours</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={form.overtimeHours}
                  onChange={(e) => set("overtimeHours", e.target.value)}
                />
              </div>
            </div>
          )}

          {form.recordType === "piece_work" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Piece Count</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="100"
                  value={form.pieceCount}
                  onChange={(e) => set("pieceCount", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rate per Piece</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.50"
                  value={form.pieceRate}
                  onChange={(e) => set("pieceRate", e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional notes…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
