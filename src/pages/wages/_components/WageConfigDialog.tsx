import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
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
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Plus, Trash2 } from "lucide-react";

type LineItem = { name: string; amount: number };

type FormData = {
  rateType: "daily" | "hourly" | "piece" | "monthly";
  baseRate: string;
  overtimeMultiplier: string;
  currency: string;
  allowances: LineItem[];
  deductions: LineItem[];
  effectiveFrom: string;
};

const DEFAULT: FormData = {
  rateType: "daily",
  baseRate: "",
  overtimeMultiplier: "1.5",
  currency: "MYR",
  allowances: [],
  deductions: [],
  effectiveFrom: new Date().toISOString().slice(0, 10),
};

function configToForm(c: Doc<"wageConfigs">): FormData {
  return {
    rateType: c.rateType,
    baseRate: c.baseRate.toString(),
    overtimeMultiplier: c.overtimeMultiplier.toString(),
    currency: c.currency,
    allowances: c.allowances,
    deductions: c.deductions,
    effectiveFrom: c.effectiveFrom,
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  worker: Doc<"workers">;
};

export default function WageConfigDialog({ open, onClose, worker }: Props) {
  const existing = useQuery(api.wages.getConfig, { workerId: worker._id });
  const [form, setForm] = useState<FormData>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const saveConfig = useMutation(api.wages.saveConfig);

  useEffect(() => {
    if (existing) setForm(configToForm(existing));
    else setForm(DEFAULT);
  }, [existing, open]);

  const set = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const addLine = (type: "allowances" | "deductions") =>
    setForm((p) => ({ ...p, [type]: [...p[type], { name: "", amount: 0 }] }));

  const updateLine = (type: "allowances" | "deductions", i: number, field: "name" | "amount", val: string) =>
    setForm((p) => {
      const items = [...p[type]];
      items[i] = { ...items[i], [field]: field === "amount" ? parseFloat(val) || 0 : val };
      return { ...p, [type]: items };
    });

  const removeLine = (type: "allowances" | "deductions", i: number) =>
    setForm((p) => ({ ...p, [type]: p[type].filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.baseRate) { toast.error("Base rate is required"); return; }
    setSaving(true);
    try {
      await saveConfig({
        workerId: worker._id,
        agencyId: worker.agencyId,
        rateType: form.rateType,
        baseRate: parseFloat(form.baseRate),
        overtimeMultiplier: parseFloat(form.overtimeMultiplier) || 1.5,
        currency: form.currency || "MYR",
        allowances: form.allowances,
        deductions: form.deductions,
        effectiveFrom: form.effectiveFrom,
      });
      toast.success("Wage config saved");
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const rateLabel = form.rateType === "daily" ? "/day" : form.rateType === "hourly" ? "/hr" : form.rateType === "monthly" ? "/month" : "/piece";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">
            Wage Config — {worker.firstName} {worker.lastName}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Base rate */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label>Rate Type</Label>
              <Select value={form.rateType} onValueChange={(v) => set("rateType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="piece">Piece</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label>Base Rate {rateLabel}</Label>
              <Input type="number" min="0" step="0.01" placeholder="80.00" value={form.baseRate} onChange={(e) => set("baseRate", e.target.value)} required />
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label>Currency</Label>
              <Input placeholder="MYR" value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} maxLength={3} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>OT Multiplier</Label>
              <Input type="number" min="1" step="0.1" placeholder="1.5" value={form.overtimeMultiplier} onChange={(e) => set("overtimeMultiplier", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Effective From</Label>
              <Input type="date" value={form.effectiveFrom} onChange={(e) => set("effectiveFrom", e.target.value)} />
            </div>
          </div>

          {/* Allowances */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Standing Allowances</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => addLine("allowances")}>
                <Plus size={12} /> Add
              </Button>
            </div>
            {form.allowances.length === 0 && (
              <p className="text-xs text-muted-foreground">No standing allowances</p>
            )}
            {form.allowances.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input placeholder="e.g. Housing" value={item.name} onChange={(e) => updateLine("allowances", i, "name", e.target.value)} className="flex-1 h-8 text-sm" />
                <Input type="number" placeholder="0.00" value={item.amount || ""} onChange={(e) => updateLine("allowances", i, "amount", e.target.value)} className="w-28 h-8 text-sm" />
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeLine("allowances", i)}><Trash2 size={12} /></Button>
              </div>
            ))}
          </div>

          {/* Deductions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Standing Deductions</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => addLine("deductions")}>
                <Plus size={12} /> Add
              </Button>
            </div>
            {form.deductions.length === 0 && (
              <p className="text-xs text-muted-foreground">No standing deductions</p>
            )}
            {form.deductions.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input placeholder="e.g. EPF" value={item.name} onChange={(e) => updateLine("deductions", i, "name", e.target.value)} className="flex-1 h-8 text-sm" />
                <Input type="number" placeholder="0.00" value={item.amount || ""} onChange={(e) => updateLine("deductions", i, "amount", e.target.value)} className="w-28 h-8 text-sm" />
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeLine("deductions", i)}><Trash2 size={12} /></Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Config"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
