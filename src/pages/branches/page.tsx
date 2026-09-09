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
import { GitBranch, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

type BranchStatus = "active" | "inactive";

type BranchFormData = {
  agencyId: Id<"agencies"> | "";
  name: string;
  code: string;
  address: string;
  status: BranchStatus;
};

const DEFAULT_FORM: BranchFormData = {
  agencyId: "",
  name: "",
  code: "",
  address: "",
  status: "active",
};

function BranchDialog({
  open,
  onClose,
  branch,
  agencies,
}: {
  open: boolean;
  onClose: () => void;
  branch: Doc<"branches"> | null;
  agencies: Doc<"agencies">[];
}) {
  const [form, setForm] = useState<BranchFormData>(
    branch
      ? {
          agencyId: branch.agencyId,
          name: branch.name,
          code: branch.code,
          address: branch.address,
          status: branch.status,
        }
      : DEFAULT_FORM,
  );
  const [saving, setSaving] = useState(false);
  const create = useMutation(api.branches.create);
  const update = useMutation(api.branches.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agencyId || !form.name || !form.code || !form.address) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      if (branch) {
        await update({ id: branch._id, agencyId: form.agencyId as Id<"agencies">, name: form.name, code: form.code, address: form.address, status: form.status });
        toast.success("Branch updated");
      } else {
        await create({ agencyId: form.agencyId as Id<"agencies">, name: form.name, code: form.code, address: form.address, status: form.status });
        toast.success("Branch created");
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
          <DialogTitle className="font-serif">{branch ? "Edit Branch" : "Add Branch"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Agency *</Label>
            <Select
              value={form.agencyId}
              onValueChange={(v) => setForm({ ...form, agencyId: v as Id<"agencies"> })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select agency" />
              </SelectTrigger>
              <SelectContent>
                {agencies.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bname">Name *</Label>
            <Input id="bname" placeholder="Kuala Lumpur Branch" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bcode">Code *</Label>
              <Input id="bcode" placeholder="KL001" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as BranchStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="baddress">Address *</Label>
            <Input id="baddress" placeholder="123 Main Street, Kuala Lumpur" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : branch ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BranchesTable() {
  const agencies = useQuery(api.agencies.list, {});
  const [filterAgencyId, setFilterAgencyId] = useState<Id<"agencies"> | "all">("all");
  const branches = useQuery(api.branches.list, {
    agencyId: filterAgencyId !== "all" ? filterAgencyId : undefined,
  });
  const remove = useMutation(api.branches.remove);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Doc<"branches"> | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"branches"> | null>(null);

  const agencyMap = new Map(agencies?.map((a) => [a._id, a.name]) ?? []);

  const handleDelete = async (id: Id<"branches">) => {
    setDeletingId(id);
    try {
      await remove({ id });
      toast.success("Branch deleted");
    } catch {
      toast.error("Failed to delete branch");
    } finally {
      setDeletingId(null);
    }
  };

  const openCreate = () => { setEditingBranch(null); setDialogOpen(true); };
  const openEdit = (branch: Doc<"branches">) => { setEditingBranch(branch); setDialogOpen(true); };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground">Branches</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage branch offices across agencies</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus size={15} /> Add Branch
        </Button>
      </div>

      {/* Agency filter */}
      <div className="flex items-center gap-3">
        <Label className="text-sm text-muted-foreground whitespace-nowrap">Filter by agency:</Label>
        <Select value={filterAgencyId} onValueChange={(v) => setFilterAgencyId(v as Id<"agencies"> | "all")}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All agencies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agencies</SelectItem>
            {agencies?.map((a) => (
              <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {branches === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : branches.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><GitBranch /></EmptyMedia>
            <EmptyTitle>No branches yet</EmptyTitle>
            <EmptyDescription>Add your first branch to get started</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus size={14} /> Add Branch</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Code</TableHead>
                <TableHead className="font-semibold">Agency</TableHead>
                <TableHead className="font-semibold">Address</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch._id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{branch.code}</code></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{agencyMap.get(branch.agencyId) ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{branch.address}</TableCell>
                  <TableCell>
                    <Badge
                      variant={branch.status === "active" ? "default" : "secondary"}
                      className={branch.status === "active"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0"
                        : "bg-muted text-muted-foreground border-0"}
                    >
                      {branch.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(branch)}><Pencil size={13} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(branch._id)} disabled={deletingId === branch._id}><Trash2 size={13} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <BranchDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        branch={editingBranch}
        agencies={agencies ?? []}
      />
    </div>
  );
}

export default function BranchesPage() {
  return (
    <>
      <Authenticated><BranchesTable /></Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 p-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">Manage branches with your account</p>
          </div>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
