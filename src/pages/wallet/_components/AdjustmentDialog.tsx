import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
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

type Props = {
  open: boolean;
  onClose: () => void;
  worker: Doc<"workers">;
};

export default function AdjustmentDialog({ open, onClose, worker }: Props) {
  const wallet = useQuery(api.wallet.getWallet, { workerId: worker._id });
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const addAdjustment = useMutation(api.wallet.addAdjustment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    if (!description) { toast.error("Description is required"); return; }
    setSaving(true);
    try {
      const finalAmount = type === "credit" ? parseFloat(amount) : -parseFloat(amount);
      await addAdjustment({
        workerId: worker._id,
        agencyId: worker.agencyId,
        amount: finalAmount,
        currency: wallet?.currency ?? "MYR",
        description,
        date,
      });
      toast.success("Adjustment recorded");
      setAmount(""); setDescription("");
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">Manual Adjustment — {worker.firstName} {worker.lastName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "credit" | "debit")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit (+)</SelectItem>
                  <SelectItem value="debit">Debit (−)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Textarea placeholder="Reason for adjustment…" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Adjustment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
