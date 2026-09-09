import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
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
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

type AgencyStatus = "active" | "inactive";

type AgencyFormData = {
  name: string;
  code: string;
  country: string;
  status: AgencyStatus;
};

const DEFAULT_FORM: AgencyFormData = {
  name: "",
  code: "",
  country: "",
  status: "active",
};

function AgencyDialog({
  open,
  onClose,
  agency,
}: {
  open: boolean;
  onClose: () => void;
  agency: Doc<"agencies"> | null;
}) {
  const [form, setForm] = useState<AgencyFormData>(
    agency
      ? { name: agency.name, code: agency.code, country: agency.country, status: agency.status }
      : DEFAULT_FORM,
  );
  const [saving, setSaving] = useState(false);
  const create = useMutation(api.agencies.create);
  const update = useMutation(api.agencies.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.country) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      if (agency) {
        await update({ id: agency._id, ...form });
        toast.success("Agency updated");
      } else {
        await create(form);
        toast.success("Agency created");
      }
      onClose();
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">{agency ? "Edit Agency" : "Add Agency"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="Acme Staffing Ltd"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                placeholder="ACM001"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                placeholder="Malaysia"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as AgencyStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : agency ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AgenciesTable() {
  const agencies = useQuery(api.agencies.list, {});
  const remove = useMutation(api.agencies.remove);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Doc<"agencies"> | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"agencies"> | null>(null);

  const handleDelete = async (id: Id<"agencies">) => {
    setDeletingId(id);
    try {
      await remove({ id });
      toast.success("Agency deleted");
    } catch {
      toast.error("Failed to delete agency");
    } finally {
      setDeletingId(null);
    }
  };

  const openCreate = () => {
    setEditingAgency(null);
    setDialogOpen(true);
  };

  const openEdit = (agency: Doc<"agencies">) => {
    setEditingAgency(agency);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground">Agencies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your registered agencies</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus size={15} /> Add Agency
        </Button>
      </div>

      {agencies === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : agencies.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>No agencies yet</EmptyTitle>
            <EmptyDescription>Add your first agency to get started</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus size={14} /> Add Agency
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Code</TableHead>
                <TableHead className="font-semibold">Country</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agencies.map((agency) => (
                <TableRow key={agency._id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{agency.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{agency.code}</code>
                  </TableCell>
                  <TableCell>{agency.country}</TableCell>
                  <TableCell>
                    <Badge
                      variant={agency.status === "active" ? "default" : "secondary"}
                      className={
                        agency.status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0"
                          : "bg-muted text-muted-foreground border-0"
                      }
                    >
                      {agency.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(agency)}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(agency._id)}
                        disabled={deletingId === agency._id}
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

      <AgencyDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        agency={editingAgency}
      />
    </div>
  );
}

export default function AgenciesPage() {
  return (
    <>
      <Authenticated>
        <AgenciesTable />
      </Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 p-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">Manage agencies with your account</p>
          </div>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
