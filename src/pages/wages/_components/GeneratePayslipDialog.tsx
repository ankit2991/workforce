import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Plus, Trash2 } from "lucide-react";

type LineItem = { name: string; amount: number };

type Props = {
  open: boolean;
  onClose: () => void;
  worker: Doc<"workers">;
  agencyId: Id<"agencies">;
  periodStart: string;
  periodEnd: string;
};

function fmt(n: number, currency = "MYR") {
  return `${currency} ${n.toFixed(2)}`;
}

export default function GeneratePayslipDialog({ open, onClose, worker, agencyId, periodStart, periodEnd }: Props) {
  const wageConfig = useQuery(api.wages.getConfig, { workerId: worker._id });
  const attendanceSummary = useQuery(
    api.attendance.summaryByWorker,
    { workerId: worker._id, fromDate: periodStart, toDate: periodEnd },
  );

  const [extraAllowances, setExtraAllowances] = useState<LineItem[]>([]);
  const [extraDeductions, setExtraDeductions] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const createRecord = useMutation(api.wages.createRecord);

  const addLine = (type: "allow" | "deduct") => {
    if (type === "allow") setExtraAllowances((p) => [...p, { name: "", amount: 0 }]);
    else setExtraDeductions((p) => [...p, { name: "", amount: 0 }]);
  };

  const updateAllow = (i: number, f: "name" | "amount", v: string) =>
    setExtraAllowances((p) => { const items = [...p]; items[i] = { ...items[i], [f]: f === "amount" ? parseFloat(v) || 0 : v }; return items; });
  const updateDeduct = (i: number, f: "name" | "amount", v: string) =>
    setExtraDeductions((p) => { const items = [...p]; items[i] = { ...items[i], [f]: f === "amount" ? parseFloat(v) || 0 : v }; return items; });

  if (!wageConfig || !attendanceSummary) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-serif">Generate Pay Slip</DialogTitle></DialogHeader>
          <div className="py-8 text-center text-sm text-muted-foreground">
            {!wageConfig ? "No wage config found for this worker. Please set up a wage config first." : "Loading attendance data…"}
          </div>
          <DialogFooter><Button variant="ghost" onClick={onClose}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Compute pay
  const { daysWorked, hoursWorked, overtimeHours, pieceCount } = attendanceSummary;
  const { rateType, baseRate, overtimeMultiplier, currency } = wageConfig;

  let basePay = 0;
  if (rateType === "daily") basePay = daysWorked * baseRate;
  else if (rateType === "hourly") basePay = hoursWorked * baseRate;
  else basePay = pieceCount * baseRate;

  const overtimePay = rateType === "hourly" ? overtimeHours * baseRate * overtimeMultiplier : 0;

  const standingAllowTotal = wageConfig.allowances.reduce((s, a) => s + a.amount, 0);
  const standingDeductTotal = wageConfig.deductions.reduce((s, d) => s + d.amount, 0);
  const extraAllowTotal = extraAllowances.reduce((s, a) => s + a.amount, 0);
  const extraDeductTotal = extraDeductions.reduce((s, d) => s + d.amount, 0);
  const totalAllowances = standingAllowTotal + extraAllowTotal;
  const totalDeductions = standingDeductTotal + extraDeductTotal;
  const grossPay = basePay + overtimePay + totalAllowances;
  const netPay = grossPay - totalDeductions;

  const handleGenerate = async () => {
    setSaving(true);
    try {
      await createRecord({
        workerId: worker._id,
        agencyId,
        periodStart,
        periodEnd,
        daysWorked,
        hoursWorked,
        overtimeHours,
        pieceCount,
        basePay,
        overtimePay,
        extraAllowances,
        extraDeductions,
        totalAllowances,
        totalDeductions,
        grossPay,
        netPay,
        currency,
        status: "draft",
        notes: notes || undefined,
      });
      toast.success("Pay slip generated");
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to generate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">
            Pay Slip — {worker.firstName} {worker.lastName}
          </DialogTitle>
          <p className="text-xs text-muted-foreground pt-1">{periodStart} → {periodEnd}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Attendance summary */}
          <div className="rounded-lg bg-muted/40 p-3 grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Days worked</span><span className="float-right font-medium">{daysWorked}</span></div>
            <div><span className="text-muted-foreground">Hours worked</span><span className="float-right font-medium">{hoursWorked}h</span></div>
            <div><span className="text-muted-foreground">Overtime</span><span className="float-right font-medium">{overtimeHours}h</span></div>
            <div><span className="text-muted-foreground">Piece count</span><span className="float-right font-medium">{pieceCount}</span></div>
          </div>

          {/* Earnings */}
          <div className="space-y-1.5 text-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Earnings</p>
            <div className="flex justify-between"><span>Base Pay ({rateType})</span><span className="font-medium">{fmt(basePay, currency)}</span></div>
            {overtimePay > 0 && <div className="flex justify-between"><span>Overtime ({overtimeMultiplier}×)</span><span className="font-medium">{fmt(overtimePay, currency)}</span></div>}
            {wageConfig.allowances.map((a, i) => (
              <div key={i} className="flex justify-between text-green-600 dark:text-green-400"><span>+ {a.name}</span><span>{fmt(a.amount, currency)}</span></div>
            ))}
          </div>

          {/* Extra allowances */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Extra Allowances</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => addLine("allow")}><Plus size={11} /> Add</Button>
            </div>
            {extraAllowances.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input placeholder="Name" value={item.name} onChange={(e) => updateAllow(i, "name", e.target.value)} className="flex-1 h-7 text-xs" />
                <Input type="number" placeholder="0.00" value={item.amount || ""} onChange={(e) => updateAllow(i, "amount", e.target.value)} className="w-24 h-7 text-xs" />
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setExtraAllowances((p) => p.filter((_, idx) => idx !== i))}><Trash2 size={11} /></Button>
              </div>
            ))}
          </div>

          <Separator />

          {/* Standing deductions */}
          {wageConfig.deductions.length > 0 && (
            <div className="space-y-1.5 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deductions</p>
              {wageConfig.deductions.map((d, i) => (
                <div key={i} className="flex justify-between text-red-600 dark:text-red-400"><span>- {d.name}</span><span>{fmt(d.amount, currency)}</span></div>
              ))}
            </div>
          )}

          {/* Extra deductions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Extra Deductions</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => addLine("deduct")}><Plus size={11} /> Add</Button>
            </div>
            {extraDeductions.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input placeholder="Name" value={item.name} onChange={(e) => updateDeduct(i, "name", e.target.value)} className="flex-1 h-7 text-xs" />
                <Input type="number" placeholder="0.00" value={item.amount || ""} onChange={(e) => updateDeduct(i, "amount", e.target.value)} className="w-24 h-7 text-xs" />
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setExtraDeductions((p) => p.filter((_, idx) => idx !== i))}><Trash2 size={11} /></Button>
              </div>
            ))}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1.5 text-sm font-medium">
            <div className="flex justify-between"><span>Gross Pay</span><span>{fmt(grossPay, currency)}</span></div>
            <div className="flex justify-between text-red-600 dark:text-red-400"><span>Total Deductions</span><span>- {fmt(totalDeductions, currency)}</span></div>
            <div className="flex justify-between text-base font-bold pt-1 border-t">
              <span>Net Pay</span>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0 text-sm font-bold">
                {fmt(netPay, currency)}
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea placeholder="Optional notes…" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-sm" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={saving}>{saving ? "Generating…" : "Generate Pay Slip"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
