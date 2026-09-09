import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import {
  User,
  Building2,
  Phone,
  Mail,
  Briefcase,
  CreditCard,
  FileText,
  Trash2,
  Upload,
  Calendar,
} from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils.ts";

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

type Props = {
  worker: Doc<"workers"> | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function DocumentRow({
  doc,
  workerId,
}: {
  doc: { type: string; name: string; storageId: string; uploadedAt: string };
  workerId: Doc<"workers">["_id"];
}) {
  const url = useQuery(api.workers.getDocumentUrl, { storageId: doc.storageId });
  const removeDoc = useMutation(api.workers.removeDocument);

  const handleDelete = async () => {
    try {
      await removeDoc({ workerId, storageId: doc.storageId });
      toast.success("Document removed");
    } catch {
      toast.error("Failed to remove document");
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-2 min-w-0">
        <FileText size={14} className="text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{doc.name}</p>
          <p className="text-xs text-muted-foreground">{doc.type}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <FileText size={12} />
            </Button>
          </a>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 size={12} />
        </Button>
      </div>
    </div>
  );
}

function DocumentUpload({ worker }: { worker: Doc<"workers"> }) {
  const generateUrl = useMutation(api.workers.generateUploadUrl);
  const addDoc = useMutation(api.workers.addDocument);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploadUrl = await generateUrl({});
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json() as { storageId: string };
      await addDoc({
        workerId: worker._id,
        type: "Document",
        name: file.name,
        storageId,
      });
      toast.success("Document uploaded");
    } catch {
      toast.error("Upload failed");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
      <Button
        variant="secondary"
        size="sm"
        className="gap-1.5 w-full"
        onClick={() => fileRef.current?.click()}
      >
        <Upload size={13} /> Upload Document
      </Button>
    </div>
  );
}

export default function WorkerDetailSheet({ worker, open, onClose, onEdit }: Props) {
  const agency = useQuery(
    api.agencies.getById,
    worker?.agencyId ? { id: worker.agencyId } : "skip",
  );

  if (!worker) return null;

  const fullName = `${worker.firstName} ${worker.lastName}`;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-primary">
                  {worker.firstName.charAt(0)}{worker.lastName.charAt(0)}
                </span>
              </div>
              <div>
                <SheetTitle className="font-serif text-lg">{fullName}</SheetTitle>
                <p className="text-xs text-muted-foreground font-mono">{worker.employeeId}</p>
              </div>
            </div>
            <Badge className={cn("border-0 text-xs capitalize", STATUS_COLORS[worker.status])}>
              {worker.status}
            </Badge>
          </div>
        </SheetHeader>

        <div className="py-4 space-y-5">
          {/* Personal */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User size={12} /> Personal Info
            </h3>
            <InfoRow icon={<Phone size={13} />} label="Phone" value={worker.phone} />
            <InfoRow icon={<Mail size={13} />} label="Email" value={worker.email} />
            <InfoRow icon={<User size={13} />} label="Nationality" value={worker.nationality} />
            <InfoRow icon={<Calendar size={13} />} label="Date of Birth" value={worker.dateOfBirth} />
            <InfoRow icon={<User size={13} />} label="Gender" value={worker.gender ? worker.gender.charAt(0).toUpperCase() + worker.gender.slice(1) : undefined} />
          </section>

          {/* Employment */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Briefcase size={12} /> Employment
            </h3>
            {agency === undefined ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <InfoRow icon={<Building2 size={13} />} label="Agency" value={agency?.name} />
            )}
            <InfoRow icon={<Briefcase size={13} />} label="Job Title" value={worker.jobTitle} />
            <InfoRow icon={<Briefcase size={13} />} label="Department" value={worker.department} />
            <InfoRow icon={<Briefcase size={13} />} label="Employment Type" value={EMP_LABELS[worker.employmentType]} />
            <InfoRow icon={<Calendar size={13} />} label="Start Date" value={worker.startDate} />
            <InfoRow icon={<Calendar size={13} />} label="End Date" value={worker.endDate} />
          </section>

          {/* Bank */}
          {(worker.bankName || worker.bankAccountNumber) && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CreditCard size={12} /> Bank Details
              </h3>
              <InfoRow icon={<CreditCard size={13} />} label="Bank" value={worker.bankName} />
              <InfoRow icon={<CreditCard size={13} />} label="Account Number" value={worker.bankAccountNumber} />
              <InfoRow icon={<CreditCard size={13} />} label="Account Name" value={worker.bankAccountName} />
            </section>
          )}

          {/* Documents */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText size={12} /> Documents
            </h3>
            <div className="space-y-2 mb-3">
              {(worker.documents ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No documents uploaded yet</p>
              ) : (
                (worker.documents ?? []).map((doc) => (
                  <DocumentRow key={doc.storageId} doc={doc} workerId={worker._id} />
                ))
              )}
            </div>
            <DocumentUpload worker={worker} />
          </section>

          {/* Actions */}
          <div className="pt-2 flex gap-2">
            <Button className="flex-1" onClick={onEdit}>Edit Worker</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
