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
  v.literal("processed"),
);

// ── Queries ──────────────────────────────────────────────────────────────────

export const listByAgency = query({
  args: {
    agencyId: v.optional(v.id("agencies")),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"withdrawals">;
    _creationTime: number;
    workerId: Id<"workers">;
    agencyId: Id<"agencies">;
    amount: number;
    currency: string;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
    status: "pending" | "approved" | "rejected" | "processed";
    requestedDate: string;
    approvedDate?: string;
    processedDate?: string;
    transactionRef?: string;
    rejectionReason?: string;
    notes?: string;
    createdBy: Id<"users">;
    workerName: string;
    workerEmployeeId: string;
    availableBalance: number;
  }>> => {
    const effectiveAgency = await resolveAgencyFilter(ctx, args.agencyId).catch(() => args.agencyId ?? null);

    let withdrawals;
    if (effectiveAgency) {
      if (args.status) {
        withdrawals = await ctx.db
          .query("withdrawals")
          .withIndex("by_agency_status", (q) =>
            q.eq("agencyId", effectiveAgency as Id<"agencies">).eq("status", args.status!),
          )
          .order("desc")
          .take(500);
      } else {
        withdrawals = await ctx.db
          .query("withdrawals")
          .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency as Id<"agencies">))
          .order("desc")
          .take(500);
      }
    } else {
      withdrawals = await ctx.db.query("withdrawals").order("desc").take(500);
      if (args.status) withdrawals = withdrawals.filter((w) => w.status === args.status);
    }

    return await Promise.all(
      withdrawals.map(async (w) => {
        const worker = await ctx.db.get(w.workerId);
        const wallet = await ctx.db
          .query("wallets")
          .withIndex("by_worker", (q) => q.eq("workerId", w.workerId))
          .first();
        const available = wallet
          ? wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn
          : 0;
        return {
          ...w,
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
      .query("withdrawals")
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
    amount: v.number(),
    currency: v.string(),
    bankName: v.string(),
    bankAccountNumber: v.string(),
    bankAccountName: v.string(),
    requestedDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    if (u.role !== "superadmin" && u.agencyId && u.agencyId !== args.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot create withdrawals for another agency" });
    }
    if (args.amount <= 0) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Amount must be greater than zero" });
    }

    // Check available balance
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .first();
    const available = wallet ? wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn : 0;
    if (available < args.amount) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Insufficient balance. Available: ${available.toFixed(2)} ${args.currency}`,
      });
    }

    return await ctx.db.insert("withdrawals", {
      ...args,
      status: "pending",
      createdBy: u.userId,
    });
  },
});

export const approve = mutation({
  args: { id: v.id("withdrawals"), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const w = await ctx.db.get(args.id);
    if (!w) throw new ConvexError({ code: "NOT_FOUND", message: "Withdrawal not found" });
    if (u.role !== "superadmin" && u.agencyId && w.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot approve withdrawals for another agency" });
    }
    if (w.status !== "pending") {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Cannot approve a ${w.status} withdrawal` });
    }

    // Re-check balance at approval time
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_worker", (q) => q.eq("workerId", w.workerId))
      .first();
    const available = wallet ? wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn : 0;
    if (available < w.amount) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Insufficient balance at approval time" });
    }

    await ctx.db.patch(args.id, {
      status: "approved",
      approvedDate: new Date().toISOString().split("T")[0],
      approvedBy: u.userId,
      notes: args.notes ?? w.notes,
    });
    const worker = await ctx.db.get(w.workerId);
    await ctx.runMutation(internal.notifications.create, {
      agencyId: w.agencyId,
      type: "withdrawal_approved",
      title: "Withdrawal Approved",
      body: `Withdrawal of ${w.currency} ${w.amount.toFixed(2)} for ${worker ? `${worker.firstName} ${worker.lastName}` : "worker"} has been approved.`,
      link: "/withdrawals",
      severity: "success",
      entityId: args.id,
      entityType: "withdrawal",
    });
  },
});

export const reject = mutation({
  args: { id: v.id("withdrawals"), rejectionReason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const w = await ctx.db.get(args.id);
    if (!w) throw new ConvexError({ code: "NOT_FOUND", message: "Withdrawal not found" });
    if (u.role !== "superadmin" && u.agencyId && w.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot reject withdrawals for another agency" });
    }
    if (w.status !== "pending" && w.status !== "approved") {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Cannot reject a ${w.status} withdrawal` });
    }
    await ctx.db.patch(args.id, {
      status: "rejected",
      rejectionReason: args.rejectionReason,
    });
    const wrej = await ctx.db.get(w.workerId);
    await ctx.runMutation(internal.notifications.create, {
      agencyId: w.agencyId,
      type: "withdrawal_rejected",
      title: "Withdrawal Rejected",
      body: `Withdrawal of ${w.currency} ${w.amount.toFixed(2)} for ${wrej ? `${wrej.firstName} ${wrej.lastName}` : "worker"} was rejected.`,
      link: "/withdrawals",
      severity: "error",
      entityId: args.id,
      entityType: "withdrawal",
    });
  },
});

export const process = mutation({
  args: {
    id: v.id("withdrawals"),
    transactionRef: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const u = await requireUser(ctx);
    const w = await ctx.db.get(args.id);
    if (!w) throw new ConvexError({ code: "NOT_FOUND", message: "Withdrawal not found" });
    if (u.role !== "superadmin" && u.agencyId && w.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot process withdrawals for another agency" });
    }
    if (w.status !== "approved") {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Cannot process a ${w.status} withdrawal` });
    }

    const today = new Date().toISOString().split("T")[0];

    await ctx.db.patch(args.id, {
      status: "processed",
      processedDate: today,
      processedBy: u.userId,
      transactionRef: args.transactionRef ?? w.transactionRef,
      notes: args.notes ?? w.notes,
    });

    // Debit wallet
    await ctx.runMutation(api.wallet.debitWithdrawal, {
      workerId: w.workerId,
      agencyId: w.agencyId,
      amount: w.amount,
      currency: w.currency,
      description: `Bank withdrawal${args.transactionRef ? ` (Ref: ${args.transactionRef})` : ""}`,
      referenceId: args.id,
      date: today,
    });
    // Notify
    const wpro = await ctx.db.get(w.workerId);
    await ctx.runMutation(internal.notifications.create, {
      agencyId: w.agencyId,
      type: "withdrawal_processed",
      title: "Withdrawal Processed",
      body: `${w.currency} ${w.amount.toFixed(2)} withdrawal for ${wpro ? `${wpro.firstName} ${wpro.lastName}` : "worker"} has been processed${args.transactionRef ? ` (Ref: ${args.transactionRef})` : ""}.`,
      link: "/withdrawals",
      severity: "success",
      entityId: args.id,
      entityType: "withdrawal",
    });
  },
});

export const remove = mutation({
  args: { id: v.id("withdrawals") },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const w = await ctx.db.get(args.id);
    if (!w) throw new ConvexError({ code: "NOT_FOUND", message: "Withdrawal not found" });
    if (u.role !== "superadmin" && u.agencyId && w.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot delete withdrawals for another agency" });
    }
    if (w.status === "processed") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Cannot delete a processed withdrawal" });
    }
    await ctx.db.delete(args.id);
  },
});
