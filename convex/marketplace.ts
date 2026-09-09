import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import { requireUser, resolveAgencyFilter } from "./lib/auth.ts";
import { api, internal } from "./_generated/api.js";

// ── Products ──────────────────────────────────────────────────────────────────

export const listProducts = query({
  args: {
    agencyId: v.optional(v.id("agencies")),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const effectiveAgency = await resolveAgencyFilter(ctx, args.agencyId).catch(() => args.agencyId ?? null);
    if (effectiveAgency) {
      if (args.status) {
        return await ctx.db
          .query("marketplaceProducts")
          .withIndex("by_agency_status", (q) =>
            q.eq("agencyId", effectiveAgency as Id<"agencies">).eq("status", args.status!),
          )
          .collect();
      }
      return await ctx.db
        .query("marketplaceProducts")
        .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency as Id<"agencies">))
        .collect();
    }
    const all = await ctx.db.query("marketplaceProducts").collect();
    return args.status ? all.filter((p) => p.status === args.status) : all;
  },
});

export const createProduct = mutation({
  args: {
    agencyId: v.id("agencies"),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    price: v.number(),
    currency: v.string(),
    imageUrl: v.optional(v.string()),
    stock: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    if (u.role !== "superadmin" && u.agencyId && u.agencyId !== args.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot create products for another agency" });
    }
    if (args.price < 0) throw new ConvexError({ code: "BAD_REQUEST", message: "Price cannot be negative" });
    return await ctx.db.insert("marketplaceProducts", {
      ...args,
      status: "active",
      createdBy: u.userId,
    });
  },
});

export const updateProduct = mutation({
  args: {
    id: v.id("marketplaceProducts"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    stock: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const p = await ctx.db.get(args.id);
    if (!p) throw new ConvexError({ code: "NOT_FOUND", message: "Product not found" });
    if (u.role !== "superadmin" && u.agencyId && p.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot edit products for another agency" });
    }
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const deleteProduct = mutation({
  args: { id: v.id("marketplaceProducts") },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const p = await ctx.db.get(args.id);
    if (!p) throw new ConvexError({ code: "NOT_FOUND", message: "Product not found" });
    if (u.role !== "superadmin" && u.agencyId && p.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot delete products for another agency" });
    }
    await ctx.db.delete(args.id);
  },
});

// ── Orders ────────────────────────────────────────────────────────────────────

export const listOrders = query({
  args: {
    agencyId: v.optional(v.id("agencies")),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("fulfilled"),
      v.literal("cancelled"),
    )),
  },
  handler: async (ctx, args): Promise<Array<{
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
  }>> => {
    const effectiveAgency = await resolveAgencyFilter(ctx, args.agencyId).catch(() => args.agencyId ?? null);
    let orders;
    if (effectiveAgency) {
      if (args.status) {
        orders = await ctx.db
          .query("marketplaceOrders")
          .withIndex("by_agency_status", (q) =>
            q.eq("agencyId", effectiveAgency as Id<"agencies">).eq("status", args.status!),
          )
          .order("desc")
          .take(500);
      } else {
        orders = await ctx.db
          .query("marketplaceOrders")
          .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency as Id<"agencies">))
          .order("desc")
          .take(500);
      }
    } else {
      orders = await ctx.db.query("marketplaceOrders").order("desc").take(500);
      if (args.status) orders = orders.filter((o) => o.status === args.status);
    }
    return await Promise.all(
      orders.map(async (o) => {
        const worker = await ctx.db.get(o.workerId);
        return {
          ...o,
          workerName: worker ? `${worker.firstName} ${worker.lastName}` : "Unknown",
          workerEmployeeId: worker?.employeeId ?? "—",
        };
      }),
    );
  },
});

export const createOrder = mutation({
  args: {
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    productId: v.id("marketplaceProducts"),
    quantity: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"marketplaceOrders">> => {
    const u = await requireUser(ctx);
    if (u.role !== "superadmin" && u.agencyId && u.agencyId !== args.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot create orders for another agency" });
    }
    if (args.quantity < 1) throw new ConvexError({ code: "BAD_REQUEST", message: "Quantity must be at least 1" });

    const product = await ctx.db.get(args.productId);
    if (!product) throw new ConvexError({ code: "NOT_FOUND", message: "Product not found" });
    if (product.status !== "active") throw new ConvexError({ code: "BAD_REQUEST", message: "Product is not available" });
    if (product.stock !== undefined && product.stock < args.quantity) {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Only ${product.stock} in stock` });
    }

    const totalAmount = product.price * args.quantity;

    // Check wallet balance
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .first();
    const available = wallet ? wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn : 0;
    if (available < totalAmount) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Insufficient balance. Available: ${available.toFixed(2)} ${product.currency}`,
      });
    }

    const today = new Date().toISOString().split("T")[0];

    // Decrement stock if finite
    if (product.stock !== undefined) {
      await ctx.db.patch(args.productId, { stock: product.stock - args.quantity });
    }

    const orderId = await ctx.db.insert("marketplaceOrders", {
      workerId: args.workerId,
      agencyId: args.agencyId,
      productId: args.productId,
      productName: product.name,
      unitPrice: product.price,
      currency: product.currency,
      quantity: args.quantity,
      totalAmount,
      status: "pending",
      orderedDate: today,
      notes: args.notes,
      createdBy: u.userId,
    });

    // Debit wallet immediately on order
    await ctx.runMutation(api.wallet.debitMarketplace, {
      workerId: args.workerId,
      agencyId: args.agencyId,
      amount: totalAmount,
      currency: product.currency,
      description: `Marketplace: ${product.name} × ${args.quantity}`,
      referenceId: orderId,
      date: today,
    });

    return orderId;
  },
});

export const confirmOrder = mutation({
  args: { id: v.id("marketplaceOrders"), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const o = await ctx.db.get(args.id);
    if (!o) throw new ConvexError({ code: "NOT_FOUND", message: "Order not found" });
    if (u.role !== "superadmin" && u.agencyId && o.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot confirm orders for another agency" });
    }
    if (o.status !== "pending") throw new ConvexError({ code: "BAD_REQUEST", message: `Cannot confirm a ${o.status} order` });
    await ctx.db.patch(args.id, {
      status: "confirmed",
      confirmedDate: new Date().toISOString().split("T")[0],
      notes: args.notes ?? o.notes,
    });
  },
});

export const fulfillOrder = mutation({
  args: { id: v.id("marketplaceOrders"), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const o = await ctx.db.get(args.id);
    if (!o) throw new ConvexError({ code: "NOT_FOUND", message: "Order not found" });
    if (u.role !== "superadmin" && u.agencyId && o.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot fulfill orders for another agency" });
    }
    if (o.status !== "confirmed") throw new ConvexError({ code: "BAD_REQUEST", message: `Cannot fulfill a ${o.status} order` });
    await ctx.db.patch(args.id, {
      status: "fulfilled",
      fulfilledDate: new Date().toISOString().split("T")[0],
      notes: args.notes ?? o.notes,
    });
    const fworker = await ctx.db.get(o.workerId);
    await ctx.runMutation(internal.notifications.create, {
      agencyId: o.agencyId,
      type: "order_fulfilled",
      title: "Order Fulfilled",
      body: `Order for ${o.productName} (×${o.quantity}) for ${fworker ? `${fworker.firstName} ${fworker.lastName}` : "worker"} has been fulfilled.`,
      link: "/marketplace",
      severity: "success",
      entityId: args.id,
      entityType: "order",
    });
  },
});

export const cancelOrder = mutation({
  args: { id: v.id("marketplaceOrders"), notes: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const u = await requireUser(ctx);
    const o = await ctx.db.get(args.id);
    if (!o) throw new ConvexError({ code: "NOT_FOUND", message: "Order not found" });
    if (u.role !== "superadmin" && u.agencyId && o.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot cancel orders for another agency" });
    }
    if (o.status === "fulfilled" || o.status === "cancelled") {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Cannot cancel a ${o.status} order` });
    }

    // Restore stock
    const product = await ctx.db.get(o.productId);
    if (product && product.stock !== undefined) {
      await ctx.db.patch(o.productId, { stock: product.stock + o.quantity });
    }

    await ctx.db.patch(args.id, {
      status: "cancelled",
      notes: args.notes ?? o.notes,
    });

    // Refund wallet
    await ctx.runMutation(api.wallet.creditRefund, {
      workerId: o.workerId,
      agencyId: o.agencyId,
      amount: o.totalAmount,
      currency: o.currency,
      description: `Refund: ${o.productName} × ${o.quantity} (order cancelled)`,
      referenceId: args.id,
      date: new Date().toISOString().split("T")[0],
    });
  },
});
