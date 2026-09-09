import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
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
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Banknote } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  worker: Doc<"workers">;
};

export default function FundWalletDialog({ open, onClose, worker }: Props) {
  const wallet = useQuery(api.wallet.getWallet, open ? { workerId: worker._id } : "skip");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const fundWallet = useMutation(api.wallet.fundWallet);

  const currency = wallet?.currency ?? "MYR";
  const currentAvailable = wallet
    ? wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn
    : 0;

  const parsedAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    setSaving(true);
    try {
      await fundWallet({
        workerId: worker._id,
        agencyId: worker.agencyId,
        amount: parsedAmount,
        currency,
        description: description.trim(),
        date,
      });
      toast.success(`${currency} ${parsedAmount.toFixed(2)} funded to ${worker.firstName}'s wallet`);
      setAmount("");
      setDescription("");
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Failed to fund wallet");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Banknote size={18} className="text-green-600" />
            Fund Wallet
          </DialogTitle>
          <DialogDescription>
            Add funds to {worker.firstName} {worker.lastName}{"'"}s wallet
          </DialogDescription>
        </DialogHeader>

        {/* Current balance summary */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Worker</span>
            <span className="font-medium">{worker.firstName} {worker.lastName} ({worker.employeeId})</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Balance</span>
            <span className="font-bold text-primary">{currency} {currentAvailable.toFixed(2)}</span>
          </div>
          {parsedAmount > 0 && (
            <div className="flex items-center justify-between text-sm border-t border-border/50 pt-1.5">
              <span className="text-muted-foreground">New Balance</span>
              <span className="font-bold text-green-600">{currency} {(currentAvailable + parsedAmount).toFixed(2)}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Amount ({currency})</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Textarea
              placeholder="e.g. Wage payment for September 2026"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              <Banknote size={14} />
              {saving ? "Funding…" : "Fund Wallet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
