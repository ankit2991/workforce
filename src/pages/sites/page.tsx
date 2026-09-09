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
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

type SiteStatus = "active" | "inactive";

type SiteFormData = {
  branchId: Id<"branches"> | "";
  agencyId: Id<"agencies"> | "";
  name: string;
  code: string;
  address: string;
  status: SiteStatus;
};

const DEFAULT_FORM: SiteFormData = {
  branchId: "",
  agencyId: "",
  name: "",
  code: "",
  address: "",
  status: "active",
};

function SiteDialog({
  open,
  onClose,
  site,
  agencies,
  branches,
}: {
  open: boolean;
  onClose: () => void;
  site: Doc<"sites"> | null;
  agencies: Doc<"agencies">[];
  branches: Doc<"branches">[];
}) {
  const [form, setForm] = useState<SiteFormData>(
    site
      ? {
          branchId: site.branchId,
          agencyId: site.agencyId,
          name: site.name,
          code: site.code,
          address: site.address,
          status: site.status,
        }
      : DEFAULT_FORM,
  );
  const [saving, setSaving] = useState(false);
  const create = useMutation(api.sites.create);
  const update = useMutation(api.sites.update);

  // Filter branches by selected agency
  const filteredBranches = form.agencyId
    ? branches.filter((b) => b.agencyId === form.agencyId)
    : branches;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.branchId || !form.agencyId || !form.name || !form.code || !form.address) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      if (site) {
        await update({
          id: site._id,
          branchId: form.branchId as Id<"branches">,
          agencyId: form.agencyId as Id<"agencies">,
          name: form.name,
          code: form.code,
          address: form.address,
          status: form.status,
        });
        toast.success("Site updated");
      } else {
        await create({
          branchId: form.branchId as Id<"branches">,
          agencyId: form.agencyId as Id<"agencies">,
          name: form.name,
          code: form.code,
          address: form.address,
          status: form.status,
        });
        toast.success("Site created");
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
          <DialogTitle className="font-serif">{site ? "Edit Site" : "Add Site"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Agency *</Label>
            <Select
              value={form.agencyId}
              onValueChange={(v) =>
                setForm({ ...form, agencyId: v as Id<"agencies">, branchId: "" })
              }
            >
              <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
              <SelectContent>
                {agencies.map((a) => (
                  <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Branch *</Label>
            <Select
              value={form.branchId}
              onValueChange={(v) => setForm({ ...form, branchId: v as Id<"branches"> })}
              disabled={!form.agencyId}
            >
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                {filteredBranches.map((b) => (
                  <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sname">Name *</Label>
            <Input id="sname" placeholder="Site Alpha" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="scode">Code *</Label>
              <Input id="scode" placeholder="SA001" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as SiteStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="saddress">Address *</Label>
            <Input id="saddress" placeholder="456 Industrial Park, Selangor" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : site ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SitesTable() {
  const agencies = useQuery(api.agencies.list, {});
  const branches = useQuery(api.branches.list, {});
  const [filterBranchId, setFilterBranchId] = useState<Id<"branches"> | "all">("all");
  const sites = useQuery(api.sites.list, {
    branchId: filterBranchId !== "all" ? filterBranchId : undefined,
  });
  const remove = useMutation(api.sites.remove);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Doc<"sites"> | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"sites"> | null>(null);

  const agencyMap = new Map(agencies?.map((a) => [a._id, a.name]) ?? []);
  const branchMap = new Map(branches?.map((b) => [b._id, b.name]) ?? []);

  const handleDelete = async (id: Id<"sites">) => {
    setDeletingId(id);
    try {
      await remove({ id });
      toast.success("Site deleted");
    } catch {
      toast.error("Failed to delete site");
    } finally {
      setDeletingId(null);
    }
  };

  const openCreate = () => { setEditingSite(null); setDialogOpen(true); };
  const openEdit = (site: Doc<"sites">) => { setEditingSite(site); setDialogOpen(true); };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground">Sites</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage work sites across branches</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus size={15} /> Add Site
        </Button>
      </div>

      {/* Branch filter */}
      <div className="flex items-center gap-3">
        <Label className="text-sm text-muted-foreground whitespace-nowrap">Filter by branch:</Label>
        <Select value={filterBranchId} onValueChange={(v) => setFilterBranchId(v as Id<"branches"> | "all")}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {branches?.map((b) => (
              <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sites === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : sites.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><MapPin /></EmptyMedia>
            <EmptyTitle>No sites yet</EmptyTitle>
            <EmptyDescription>Add your first work site to get started</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus size={14} /> Add Site</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Code</TableHead>
                <TableHead className="font-semibold">Branch</TableHead>
                <TableHead className="font-semibold">Agency</TableHead>
                <TableHead className="font-semibold">Address</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site) => (
                <TableRow key={site._id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{site.name}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{site.code}</code></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{branchMap.get(site.branchId) ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{agencyMap.get(site.agencyId) ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{site.address}</TableCell>
                  <TableCell>
                    <Badge
                      variant={site.status === "active" ? "default" : "secondary"}
                      className={site.status === "active"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0"
                        : "bg-muted text-muted-foreground border-0"}
                    >
                      {site.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(site)}><Pencil size={13} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(site._id)} disabled={deletingId === site._id}><Trash2 size={13} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SiteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        site={editingSite}
        agencies={agencies ?? []}
        branches={branches ?? []}
      />
    </div>
  );
}

export default function SitesPage() {
  return (
    <>
      <Authenticated><SitesTable /></Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 p-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">Manage sites with your account</p>
          </div>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
