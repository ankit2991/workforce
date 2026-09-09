import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import { requireUser, resolveAgencyFilter } from "./lib/auth.ts";
import { api, internal } from "./_generated/api.js";

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed"),
);

const transferMethodValidator = v.union(
  v.literal("bank_transfer"),
  v.literal("mobile_wallet"),
  v.literal("cash_pickup"),
);

// ── Queries ──────────────────────────────────────────────────────────────────

export const listByAgency = query({
  args: {
    agencyId: v.optional(v.id("agencies")),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"remittances">;
    _creationTime: number;
    workerId: Id<"workers">;
    agencyId: Id<"agencies">;
    sendAmount: number;
    sendCurrency: string;
    receiveAmount: number;
    receiveCurrency: string;
    exchangeRate: number;
    transferFee: number;
    totalDebit: number;
    recipientName: string;
    recipientCountry: string;
    recipientPhone?: string;
    recipientAddress?: string;
    transferMethod: "bank_transfer" | "mobile_wallet" | "cash_pickup";
    recipientBankName?: string;
    recipientAccountNumber?: string;
    recipientAccountName?: string;
    mobileWalletProvider?: string;
    mobileWalletNumber?: string;
    cashPickupLocation?: string;
    purpose?: string;
    status: "pending" | "approved" | "rejected" | "processing" | "completed" | "failed";
    requestedDate: string;
    approvedDate?: string;
    processedDate?: string;
    completedDate?: string;
    partnerReference?: string;
    rejectionReason?: string;
    failureReason?: string;
    notes?: string;
    createdBy: Id<"users">;
    workerName: string;
    workerEmployeeId: string;
    availableBalance: number;
  }>> => {
    const effectiveAgency = await resolveAgencyFilter(ctx, args.agencyId).catch(() => args.agencyId ?? null);

    let remittances;
    if (effectiveAgency) {
      if (args.status) {
        remittances = await ctx.db
          .query("remittances")
          .withIndex("by_agency_status", (q) =>
            q.eq("agencyId", effectiveAgency as Id<"agencies">).eq("status", args.status!),
          )
          .order("desc")
          .take(500);
      } else {
        remittances = await ctx.db
          .query("remittances")
          .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency as Id<"agencies">))
          .order("desc")
          .take(500);
      }
    } else {
      remittances = await ctx.db.query("remittances").order("desc").take(500);
      if (args.status) remittances = remittances.filter((r) => r.status === args.status);
    }

    return await Promise.all(
      remittances.map(async (r) => {
        const worker = await ctx.db.get(r.workerId);
        const wallet = await ctx.db
          .query("wallets")
          .withIndex("by_worker", (q) => q.eq("workerId", r.workerId))
          .first();
        const available = wallet
          ? wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn
          : 0;
        return {
          ...r,
          workerName: worker ? `${worker.firstName} ${worker.lastName}` : "Unknown",
          workerEmployeeId: worker?.employeeId ?? "—",
          availableBalance: available,
        };
      }),
    );
  },
});

export const listByWorker = query({
  args: { workerId: v.id("workers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("remittances")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .order("desc")
      .take(100);
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    sendAmount: v.number(),
    sendCurrency: v.string(),
    receiveAmount: v.number(),
    receiveCurrency: v.string(),
    exchangeRate: v.number(),
    transferFee: v.number(),
    totalDebit: v.number(),
    recipientName: v.string(),
    recipientCountry: v.string(),
    recipientPhone: v.optional(v.string()),
    recipientAddress: v.optional(v.string()),
    transferMethod: transferMethodValidator,
    recipientBankName: v.optional(v.string()),
    recipientAccountNumber: v.optional(v.string()),
    recipientAccountName: v.optional(v.string()),
    mobileWalletProvider: v.optional(v.string()),
    mobileWalletNumber: v.optional(v.string()),
    cashPickupLocation: v.optional(v.string()),
    purpose: v.optional(v.string()),
    requestedDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    if (u.role !== "superadmin" && u.agencyId && u.agencyId !== args.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot create remittances for another agency" });
    }
    if (args.sendAmount <= 0) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Send amount must be greater than zero" });
    }
    // Check available balance
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .first();
    const available = wallet ? wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn : 0;
    if (available < args.totalDebit) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Insufficient balance. Available: ${available.toFixed(2)} ${args.sendCurrency}`,
      });
    }
    return await ctx.db.insert("remittances", {
      ...args,
      status: "pending",
      createdBy: u.userId,
    });
  },
});

export const approve = mutation({
  args: { id: v.id("remittances"), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const r = await ctx.db.get(args.id);
    if (!r) throw new ConvexError({ code: "NOT_FOUND", message: "Remittance not found" });
    if (u.role !== "superadmin" && u.agencyId && r.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot approve remittances for another agency" });
    }
    if (r.status !== "pending") {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Cannot approve a ${r.status} remittance` });
    }
    // Re-check balance
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_worker", (q) => q.eq("workerId", r.workerId))
      .first();
    const available = wallet ? wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn : 0;
    if (available < r.totalDebit) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Insufficient balance at approval time" });
    }
    await ctx.db.patch(args.id, {
      status: "approved",
      approvedDate: new Date().toISOString().split("T")[0],
      approvedBy: u.userId,
      notes: args.notes ?? r.notes,
    });
    const rworker = await ctx.db.get(r.workerId);
    await ctx.runMutation(internal.notifications.create, {
      agencyId: r.agencyId,
      type: "remittance_approved",
      title: "Remittance Approved",
      body: `Remittance of ${r.sendCurrency} ${r.sendAmount.toFixed(2)} to ${r.recipientName} (${r.recipientCountry}) for ${rworker ? `${rworker.firstName} ${rworker.lastName}` : "worker"} has been approved.`,
      link: "/remittance",
      severity: "success",
      entityId: args.id,
      entityType: "remittance",
    });
  },
});

export const reject = mutation({
  args: { id: v.id("remittances"), rejectionReason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const r = await ctx.db.get(args.id);
    if (!r) throw new ConvexError({ code: "NOT_FOUND", message: "Remittance not found" });
    if (u.role !== "superadmin" && u.agencyId && r.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot reject remittances for another agency" });
    }
    if (r.status !== "pending" && r.status !== "approved") {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Cannot reject a ${r.status} remittance` });
    }
    await ctx.db.patch(args.id, {
      status: "rejected",
      rejectionReason: args.rejectionReason,
    });
    const rrej = await ctx.db.get(r.workerId);
    await ctx.runMutation(internal.notifications.create, {
      agencyId: r.agencyId,
      type: "remittance_rejected",
      title: "Remittance Rejected",
      body: `Remittance of ${r.sendCurrency} ${r.sendAmount.toFixed(2)} to ${r.recipientName} for ${rrej ? `${rrej.firstName} ${rrej.lastName}` : "worker"} was rejected.${args.rejectionReason ? ` Reason: ${args.rejectionReason}` : ""}`,
      link: "/remittance",
      severity: "error",
      entityId: args.id,
      entityType: "remittance",
    });
  },
});

export const markProcessing = mutation({
  args: {
    id: v.id("remittances"),
    partnerReference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const u = await requireUser(ctx);
    const r = await ctx.db.get(args.id);
    if (!r) throw new ConvexError({ code: "NOT_FOUND", message: "Remittance not found" });
    if (u.role !== "superadmin" && u.agencyId && r.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot process remittances for another agency" });
    }
    if (r.status !== "approved") {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Cannot process a ${r.status} remittance` });
    }
    const today = new Date().toISOString().split("T")[0];
    await ctx.db.patch(args.id, {
      status: "processing",
      processedDate: today,
      processedBy: u.userId,
      partnerReference: args.partnerReference ?? r.partnerReference,
      notes: args.notes ?? r.notes,
    });
    // Debit wallet immediately on dispatch
    await ctx.runMutation(api.wallet.debitRemittance, {
      workerId: r.workerId,
      agencyId: r.agencyId,
      amount: r.totalDebit,
      currency: r.sendCurrency,
      description: `Overseas remittance to ${r.recipientName} (${r.recipientCountry})${args.partnerReference ? ` — Ref: ${args.partnerReference}` : ""}`,
      referenceId: args.id,
      date: today,
    });
  },
});

export const markCompleted = mutation({
  args: {
    id: v.id("remittances"),
    partnerReference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const r = await ctx.db.get(args.id);
    if (!r) throw new ConvexError({ code: "NOT_FOUND", message: "Remittance not found" });
    if (u.role !== "superadmin" && u.agencyId && r.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot complete remittances for another agency" });
    }
    if (r.status !== "processing") {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Cannot complete a ${r.status} remittance` });
    }
    await ctx.db.patch(args.id, {
      status: "completed",
      completedDate: new Date().toISOString().split("T")[0],
      partnerReference: args.partnerReference ?? r.partnerReference,
      notes: args.notes ?? r.notes,
    });
    const rcworker = await ctx.db.get(r.workerId);
    await ctx.runMutation(internal.notifications.create, {
      agencyId: r.agencyId,
      type: "remittance_completed",
      title: "Remittance Completed",
      body: `Remittance of ${r.sendCurrency} ${r.sendAmount.toFixed(2)} to ${r.recipientName} (${r.recipientCountry}) for ${rcworker ? `${rcworker.firstName} ${rcworker.lastName}` : "worker"} was completed.`,
      link: "/remittance",
      severity: "success",
      entityId: args.id,
      entityType: "remittance",
    });
  },
});

export const markFailed = mutation({
  args: { id: v.id("remittances"), failureReason: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const u = await requireUser(ctx);
    const r = await ctx.db.get(args.id);
    if (!r) throw new ConvexError({ code: "NOT_FOUND", message: "Remittance not found" });
    if (u.role !== "superadmin" && u.agencyId && r.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot update remittances for another agency" });
    }
    if (r.status !== "processing") {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Cannot fail a ${r.status} remittance` });
    }
    const today = new Date().toISOString().split("T")[0];
    await ctx.db.patch(args.id, {
      status: "failed",
      failureReason: args.failureReason,
    });
    // Refund wallet
    await ctx.runMutation(api.wallet.creditRefund, {
      workerId: r.workerId,
      agencyId: r.agencyId,
      amount: r.totalDebit,
      currency: r.sendCurrency,
      description: `Remittance refund — failed transfer to ${r.recipientName}`,
      referenceId: args.id,
      date: today,
    });
    const rfworker = await ctx.db.get(r.workerId);
    await ctx.runMutation(internal.notifications.create, {
      agencyId: r.agencyId,
      type: "remittance_failed",
      title: "Remittance Failed",
      body: `Remittance to ${r.recipientName} for ${rfworker ? `${rfworker.firstName} ${rfworker.lastName}` : "worker"} failed. ${r.sendCurrency} ${r.totalDebit.toFixed(2)} has been refunded.${args.failureReason ? ` Reason: ${args.failureReason}` : ""}`,
      link: "/remittance",
      severity: "error",
      entityId: args.id,
      entityType: "remittance",
    });
  },
});

export const remove = mutation({
  args: { id: v.id("remittances") },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const r = await ctx.db.get(args.id);
    if (!r) throw new ConvexError({ code: "NOT_FOUND", message: "Remittance not found" });
    if (u.role !== "superadmin" && u.agencyId && r.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot delete remittances for another agency" });
    }
    if (r.status === "processing" || r.status === "completed") {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Cannot delete a ${r.status} remittance` });
    }
    await ctx.db.delete(args.id);
  },
});
