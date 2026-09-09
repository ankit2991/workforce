import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
} from "@/components/ui/empty.tsx";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  ShoppingBag, Plus, MoreHorizontal, CheckCircle2, XCircle,
  Package, Pencil, Trash2, ShoppingCart, Tag, Star, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useAgency } from "@/components/providers/agency.tsx";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

type Product = Doc<"marketplaceProducts">;
type OrderRow = {
  _id: Id<"marketplaceOrders">;
  _creationTime: number;
  workerId: Id<"workers">;
  agencyId: Id<"agencies">;
  productId: Id<"marketplaceProducts">;
  productName: string;
  unitPrice: number;
  currency: string;
  quantity: number;
  totalAmount: number;
  status: "pending" | "confirmed" | "fulfilled" | "cancelled";
  orderedDate: string;
  confirmedDate?: string;
  fulfilledDate?: string;
  notes?: string;
  createdBy: Id<"users">;
  workerName: string;
  workerEmployeeId: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const ORDER_STATUS_COLORS: Record<OrderRow["status"], string> = {
  pending:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  fulfilled: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const CATEGORIES = [
  "Food & Groceries", "Personal Care", "Electronics", "Clothing",
  "Household", "Transport", "Health", "Finance", "Entertainment", "Others",
];

const CATEGORY_ICONS: Record<string, string> = {
  "Food & Groceries": "🍚",
  "Personal Care": "🧴",
  "Electronics": "📱",
  "Clothing": "👕",
  "Household": "🏠",
  "Transport": "🚌",
  "Health": "💊",
  "Finance": "💰",
  "Entertainment": "🎮",
  "Others": "📦",
};

const fmt = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);

// ── Product Form Dialog ───────────────────────────────────────────────────────

function ProductFormDialog({
  open,
  onClose,
  agencyId,
  product,
}: {
  open: boolean;
  onClose: () => void;
  agencyId: Id<"agencies"> | null;
  product?: Product;
}) {
  const isEdit = !!product;
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState(product?.category ?? "Food & Groceries");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [currency, setCurrency] = useState(product?.currency ?? "MYR");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [stock, setStock] = useState(product?.stock?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const createProduct = useMutation(api.marketplace.createProduct);
  const updateProduct = useMutation(api.marketplace.updateProduct);

  const handleSubmit = async () => {
    if (!name || !price || !agencyId) { toast.error("Fill in all required fields"); return; }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) { toast.error("Enter a valid price"); return; }
    setSaving(true);
    try {
      if (isEdit && product) {
        await updateProduct({
          id: product._id,
          name, description: description || undefined, category,
          price: priceNum, currency,
          imageUrl: imageUrl || undefined,
          stock: stock ? parseInt(stock) : undefined,
        });
        toast.success("Product updated");
      } else {
        await createProduct({
          agencyId: agencyId!,
          name, description: description || undefined, category,
          price: priceNum, currency,
          imageUrl: imageUrl || undefined,
          stock: stock ? parseInt(stock) : undefined,
        });
        toast.success("Product created");
      }
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to save product");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">{isEdit ? "Edit Product" : "New Product"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g. 5kg Beras Wangi" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} placeholder="Short description…" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    <span className="mr-1.5">{CATEGORY_ICONS[c] ?? "📦"}</span>{c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Price <span className="text-destructive">*</span></Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["MYR", "USD", "SGD", "IDR", "PHP"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Image URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input placeholder="https://…" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Stock <span className="text-muted-foreground text-xs">(leave blank = unlimited)</span></Label>
            <Input type="number" min="0" placeholder="Unlimited" value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !name || !price}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Place Order Dialog ────────────────────────────────────────────────────────

function PlaceOrderDialog({
  open,
  onClose,
  agencyId,
  product,
}: {
  open: boolean;
  onClose: () => void;
  agencyId: Id<"agencies"> | null;
  product: Product | null;
}) {
  const [workerId, setWorkerId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const workers = useQuery(api.workers.list, { agencyId: agencyId ?? undefined, status: "active" });
  const wallet = useQuery(
    api.wallet.getWallet,
    workerId ? { workerId: workerId as Id<"workers"> } : "skip",
  );
  const available = wallet ? wallet.earned - wallet.advances - wallet.spent - wallet.withdrawn : 0;

  const createOrder = useMutation(api.marketplace.createOrder);

  if (!product) return null;
  const qty = parseInt(quantity) || 1;
  const total = product.price * qty;
  const hasEnough = available >= total;

  const handleSubmit = async () => {
    if (!workerId || !agencyId) return;
    setSaving(true);
    try {
      await createOrder({
        workerId: workerId as Id<"workers">,
        agencyId,
        productId: product._id,
        quantity: qty,
        notes: notes || undefined,
      });
      toast.success(`Order placed for ${product.name}`);
      setWorkerId(""); setQuantity("1"); setNotes("");
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to place order");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">Place Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Product summary */}
          <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
                {CATEGORY_ICONS[product.category] ?? "📦"}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.category}</p>
              <p className="text-sm font-bold text-primary mt-0.5">{fmt(product.price, product.currency)}</p>
            </div>
          </div>

          {/* Worker */}
          <div className="space-y-1.5">
            <Label>Worker <span className="text-destructive">*</span></Label>
            <Select value={workerId} onValueChange={setWorkerId}>
              <SelectTrigger><SelectValue placeholder="Select worker…" /></SelectTrigger>
              <SelectContent>
                {(workers ?? []).map((w) => (
                  <SelectItem key={w._id} value={w._id}>
                    {w.firstName} {w.lastName}
                    <span className="text-muted-foreground font-mono text-xs ml-2">{w.employeeId}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Balance */}
          {workerId && wallet !== undefined && (
            <div className={cn(
              "rounded-lg px-3 py-2 text-sm flex items-center justify-between",
              hasEnough ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                        : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400",
            )}>
              <span className="text-xs font-medium">Available Balance</span>
              <span className="font-bold">{fmt(available, wallet?.currency ?? product.currency)}</span>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input
              type="number" min="1"
              max={product.stock ?? undefined}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {product.stock !== undefined && (
              <p className="text-xs text-muted-foreground">{product.stock} in stock</p>
            )}
          </div>

          {/* Order total */}
          <div className="rounded-lg border px-3 py-2 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Order Total</span>
            <span className={cn("text-base font-bold", !hasEnough && workerId ? "text-destructive" : "text-primary")}>
              {fmt(total, product.currency)}
            </span>
          </div>

          {!hasEnough && workerId && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle size={11} /> Insufficient wallet balance
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input placeholder="Delivery instructions, size, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !workerId || !hasEnough}>
            {saving ? "Placing…" : "Place Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onEdit,
  onOrder,
  onDelete,
  onToggleStatus,
}: {
  product: Product;
  onEdit: (p: Product) => void;
  onOrder: (p: Product) => void;
  onDelete: (p: Product) => void;
  onToggleStatus: (p: Product) => void;
}) {
  const isActive = product.status === "active";
  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden flex flex-col transition-all hover:shadow-md",
      !isActive && "opacity-60",
    )}>
      {/* Image / icon */}
      <div className="h-36 bg-muted/40 flex items-center justify-center relative overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">{CATEGORY_ICONS[product.category] ?? "📦"}</span>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <Badge className={cn("border-0 text-xs", isActive ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400" : "bg-muted text-muted-foreground")}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div>
          <p className="font-semibold text-sm leading-tight line-clamp-1">{product.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span>{CATEGORY_ICONS[product.category] ?? "📦"}</span> {product.category}
          </p>
          {product.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div>
            <p className="text-base font-bold text-primary font-serif">{fmt(product.price, product.currency)}</p>
            <p className="text-xs text-muted-foreground">
              {product.stock === undefined ? "Unlimited stock" : `${product.stock} in stock`}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              className="gap-1 text-xs h-7 px-2"
              disabled={!isActive || (product.stock !== undefined && product.stock === 0)}
              onClick={() => onOrder(product)}
            >
              <ShoppingCart size={12} /> Order
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal size={13} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(product)}>
                  <Pencil size={13} className="mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleStatus(product)}>
                  {isActive ? <XCircle size={13} className="mr-2 text-amber-500" /> : <CheckCircle2 size={13} className="mr-2 text-green-500" />}
                  {isActive ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(product)}>
                  <Trash2 size={13} className="mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Orders Sheet ──────────────────────────────────────────────────────────────

function OrderDetailSheet({ open, onClose, order }: { open: boolean; onClose: () => void; order: OrderRow | null }) {
  if (!order) return null;
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-sm overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="font-serif">Order Details</SheetTitle>
          <p className="font-medium text-sm">{order.workerName}</p>
          <code className="text-xs text-muted-foreground">{order.workerEmployeeId}</code>
          <Badge className={cn("border-0 text-xs w-fit mt-1", ORDER_STATUS_COLORS[order.status])}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
        </SheetHeader>
        <div className="py-4 space-y-4 text-sm">
          <div className="rounded-xl bg-muted/30 p-3 space-y-1.5">
            <p className="font-semibold">{order.productName}</p>
            <div className="flex justify-between text-muted-foreground"><span>Unit Price</span><span>{fmt(order.unitPrice, order.currency)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Quantity</span><span>× {order.quantity}</span></div>
            <Separator />
            <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">{fmt(order.totalAmount, order.currency)}</span></div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Timeline</p>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Ordered</span><span>{order.orderedDate}</span></div>
              {order.confirmedDate && <div className="flex justify-between"><span className="text-muted-foreground">Confirmed</span><span>{order.confirmedDate}</span></div>}
              {order.fulfilledDate && <div className="flex justify-between text-green-600 dark:text-green-400 font-medium"><span>Fulfilled</span><span>{order.fulfilledDate}</span></div>}
            </div>
          </div>
          {order.notes && (
            <>
              <Separator />
              <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p><p className="text-muted-foreground">{order.notes}</p></div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Orders Table ──────────────────────────────────────────────────────────────

function OrdersTable({
  orders,
  onView,
}: {
  orders: OrderRow[];
  onView: (o: OrderRow) => void;
}) {
  const confirm  = useMutation(api.marketplace.confirmOrder);
  const fulfill  = useMutation(api.marketplace.fulfillOrder);
  const cancel   = useMutation(api.marketplace.cancelOrder);

  const handle = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.success(msg); }
    catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Action failed");
    }
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="font-semibold">Worker</TableHead>
            <TableHead className="font-semibold hidden sm:table-cell">Date</TableHead>
            <TableHead className="font-semibold">Product</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Total</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o._id} className="hover:bg-muted/30 cursor-pointer" onClick={() => onView(o)}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    {o.workerName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{o.workerName}</p>
                    <code className="text-xs text-muted-foreground">{o.workerEmployeeId}</code>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm font-mono">{o.orderedDate}</TableCell>
              <TableCell>
                <p className="text-sm font-medium line-clamp-1">{o.productName}</p>
                <p className="text-xs text-muted-foreground">× {o.quantity}</p>
              </TableCell>
              <TableCell className="hidden md:table-cell font-semibold text-sm">{fmt(o.totalAmount, o.currency)}</TableCell>
              <TableCell>
                <Badge className={cn("border-0 text-xs", ORDER_STATUS_COLORS[o.status])}>
                  {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal size={13} /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(o)}>View details</DropdownMenuItem>
                    {o.status === "pending" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handle(() => confirm({ id: o._id }), "Order confirmed")}>
                          <CheckCircle2 size={13} className="mr-2 text-blue-500" /> Confirm
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handle(() => cancel({ id: o._id }), "Order cancelled & refunded")} className="text-destructive">
                          <XCircle size={13} className="mr-2" /> Cancel & Refund
                        </DropdownMenuItem>
                      </>
                    )}
                    {o.status === "confirmed" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handle(() => fulfill({ id: o._id }), "Order fulfilled")}>
                          <Package size={13} className="mr-2 text-green-500" /> Mark Fulfilled
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handle(() => cancel({ id: o._id }), "Order cancelled & refunded")} className="text-destructive">
                          <XCircle size={13} className="mr-2" /> Cancel & Refund
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ products, orders }: { products: Product[]; orders: OrderRow[] }) {
  const activeProducts = products.filter((p) => p.status === "active").length;
  const pendingOrders  = orders.filter((o) => o.status === "pending").length;
  const fulfilledOrders = orders.filter((o) => o.status === "fulfilled");
  const totalRevenue   = fulfilledOrders.reduce((s, o) => s + o.totalAmount, 0);
  const currency       = orders[0]?.currency ?? "MYR";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        { label: "Active Products",   value: activeProducts,           icon: <Tag size={16} />,          color: "text-primary" },
        { label: "Pending Orders",    value: pendingOrders,            icon: <ShoppingCart size={16} />, color: "text-amber-500" },
        { label: "Fulfilled Orders",  value: fulfilledOrders.length,   icon: <Package size={16} />,      color: "text-green-500" },
        { label: "Total Revenue",     value: fmt(totalRevenue, currency), icon: <Star size={16} />,       color: "text-purple-500" },
      ].map((card) => (
        <div key={card.label} className="rounded-xl border bg-card p-4">
          <div className={cn("mb-2", card.color)}>{card.icon}</div>
          <p className="text-xl font-bold font-serif">{card.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Content ──────────────────────────────────────────────────────────────

function MarketplaceContent() {
  const { agencyId } = useAgency();
  const [tab, setTab] = useState("catalog");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | undefined>();
  const [orderProduct, setOrderProduct] = useState<Product | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const updateProduct = useMutation(api.marketplace.updateProduct);
  const deleteProduct = useMutation(api.marketplace.deleteProduct);

  const products = useQuery(
    api.marketplace.listProducts,
    agencyId ? { agencyId } : "skip",
  ) as Product[] | undefined;

  const orders = useQuery(
    api.marketplace.listOrders,
    agencyId
      ? { agencyId, status: orderStatusFilter !== "all" ? (orderStatusFilter as OrderRow["status"]) : undefined }
      : "skip",
  ) as OrderRow[] | undefined;

  const filteredProducts = products?.filter((p) =>
    categoryFilter === "all" ? true : p.category === categoryFilter,
  );

  const handleToggleStatus = async (p: Product) => {
    try {
      await updateProduct({ id: p._id, status: p.status === "active" ? "inactive" : "active" });
      toast.success(p.status === "active" ? "Product deactivated" : "Product activated");
    } catch { toast.error("Failed"); }
  };

  const handleDelete = async (p: Product) => {
    try { await deleteProduct({ id: p._id }); toast.success("Product deleted"); }
    catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to delete");
    }
  };

  const openEdit = (p: Product) => { setEditProduct(p); setProductFormOpen(true); };
  const openOrder = (p: Product) => { setOrderProduct(p); setOrderOpen(true); };
  const openDetail = (o: OrderRow) => { setDetailOrder(o); setDetailOpen(true); };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground">Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Products and services workers can purchase using their wallet balance
          </p>
        </div>
        {agencyId && tab === "catalog" && (
          <Button onClick={() => { setEditProduct(undefined); setProductFormOpen(true); }} className="gap-1.5 flex-shrink-0">
            <Plus size={15} /> Add Product
          </Button>
        )}
      </div>

      {!agencyId ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ShoppingBag size={36} className="mb-3 opacity-30" />
          <p className="text-sm">Select an agency in the sidebar to manage the marketplace</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          {products && orders && (products.length > 0 || orders.length > 0) && (
            <SummaryCards products={products} orders={orders} />
          )}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-8">
              <TabsTrigger value="catalog" className="text-xs h-7 gap-1"><Tag size={12} /> Catalog</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs h-7 gap-1"><ShoppingCart size={12} /> Orders</TabsTrigger>
            </TabsList>

            {/* ── Catalog Tab ── */}
            <TabsContent value="catalog" className="space-y-4 mt-4">
              {/* Category filter */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm" variant={categoryFilter === "all" ? "default" : "ghost"}
                  className="h-7 text-xs"
                  onClick={() => setCategoryFilter("all")}
                >
                  All
                </Button>
                {CATEGORIES.map((c) => (
                  <Button
                    key={c} size="sm"
                    variant={categoryFilter === c ? "default" : "ghost"}
                    className="h-7 text-xs"
                    onClick={() => setCategoryFilter(c)}
                  >
                    {CATEGORY_ICONS[c]} {c}
                  </Button>
                ))}
              </div>

              {filteredProducts === undefined ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)}
                </div>
              ) : filteredProducts.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon"><ShoppingBag /></EmptyMedia>
                    <EmptyTitle>No products found</EmptyTitle>
                    <EmptyDescription>
                      {categoryFilter !== "all" ? `No products in ${categoryFilter}` : "Add the first product to the catalog"}
                    </EmptyDescription>
                  </EmptyHeader>
                  {categoryFilter === "all" && (
                    <EmptyContent>
                      <Button size="sm" onClick={() => { setEditProduct(undefined); setProductFormOpen(true); }} className="gap-1.5">
                        <Plus size={13} /> Add Product
                      </Button>
                    </EmptyContent>
                  )}
                </Empty>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredProducts.map((p) => (
                    <ProductCard
                      key={p._id}
                      product={p}
                      onEdit={openEdit}
                      onOrder={openOrder}
                      onDelete={handleDelete}
                      onToggleStatus={handleToggleStatus}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Orders Tab ── */}
            <TabsContent value="orders" className="space-y-4 mt-4">
              <Tabs value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs h-7">All</TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs h-7">Pending</TabsTrigger>
                  <TabsTrigger value="confirmed" className="text-xs h-7">Confirmed</TabsTrigger>
                  <TabsTrigger value="fulfilled" className="text-xs h-7">Fulfilled</TabsTrigger>
                  <TabsTrigger value="cancelled" className="text-xs h-7">Cancelled</TabsTrigger>
                </TabsList>
              </Tabs>

              {orders === undefined ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : orders.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon"><ShoppingCart /></EmptyMedia>
                    <EmptyTitle>No orders found</EmptyTitle>
                    <EmptyDescription>
                      {orderStatusFilter !== "all" ? `No ${orderStatusFilter} orders` : "Orders will appear here when workers purchase products"}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <OrdersTable orders={orders} onView={openDetail} />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      <ProductFormDialog
        open={productFormOpen}
        onClose={() => { setProductFormOpen(false); setEditProduct(undefined); }}
        agencyId={agencyId}
        product={editProduct}
      />
      <PlaceOrderDialog
        open={orderOpen}
        onClose={() => { setOrderOpen(false); setOrderProduct(null); }}
        agencyId={agencyId}
        product={orderProduct}
      />
      <OrderDetailSheet open={detailOpen} onClose={() => setDetailOpen(false)} order={detailOrder} />
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <>
      <Authenticated><MarketplaceContent /></Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">Manage the marketplace with your account</p>
          </div>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
