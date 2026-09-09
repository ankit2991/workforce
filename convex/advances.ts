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
  v.literal("disbursed"),
  v.literal("repaid"),
);

// ── Queries ──────────────────────────────────────────────────────────────────

export const listByAgency = query({
  args: {
    agencyId: v.optional(v.id("agencies")),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"advances">;
    _creationTime: number;
    workerId: Id<"workers">;
    agencyId: Id<"agencies">;
    amount: number;
    currency: string;
    reason?: string;
    status: "pending" | "approved" | "rejected" | "disbursed" | "repaid";
    requestedDate: string;
    approvedDate?: string;
    approvedBy?: Id<"users">;
    disbursedDate?: string;
    repaidAmount: number;
    repaymentSchedule?: string;
    notes?: string;
    createdBy: Id<"users">;
    workerName: string;
    workerEmployeeId: string;
  }>> => {
    const effectiveAgency = await resolveAgencyFilter(ctx, args.agencyId).catch(() => args.agencyId ?? null);

    let advances;
    if (effectiveAgency) {
      if (args.status) {
        advances = await ctx.db
          .query("advances")
          .withIndex("by_agency_status", (q) =>
            q.eq("agencyId", effectiveAgency as Id<"agencies">).eq("status", args.status!),
          )
          .order("desc")
          .take(500);
      } else {
        advances = await ctx.db
          .query("advances")
          .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency as Id<"agencies">))
          .order("desc")
          .take(500);
      }
    } else {
      advances = await ctx.db.query("advances").order("desc").take(500);
      if (args.status) advances = advances.filter((a) => a.status === args.status);
    }

    return await Promise.all(
      advances.map(async (a) => {
        const worker = await ctx.db.get(a.workerId);
        return {
          ...a,
          workerName: worker ? `${worker.firstName} ${worker.lastName}` : "Unknown",
          workerEmployeeId: worker?.employeeId ?? "—",
        };
      }),
    );
  },
});

export const listByWorker = query({
  args: { workerId: v.id("workers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("advances")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .order("desc")
      .take(100);
  },
});

export const getById = query({
  args: { id: v.id("advances") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    amount: v.number(),
    currency: v.string(),
    reason: v.optional(v.string()),
    requestedDate: v.string(),
    repaymentSchedule: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    if (u.role !== "superadmin" && u.agencyId && u.agencyId !== args.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot create advances for another agency" });
    }
    if (args.amount <= 0) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Amount must be greater than zero" });
    }
    return await ctx.db.insert("advances", {
      ...args,
      status: "pending",
      repaidAmount: 0,
      createdBy: u.userId,
    });
  },
});

export const approve = mutation({
  args: { id: v.id("advances"), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const advance = await ctx.db.get(args.id);
    if (!advance) throw new ConvexError({ code: "NOT_FOUND", message: "Advance not found" });
    if (u.role !== "superadmin" && u.agencyId && advance.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot approve advances for another agency" });
    }
    if (advance.status !== "pending") {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Cannot approve a ${advance.status} advance` });
    }
    await ctx.db.patch(args.id, {
      status: "approved",
      approvedDate: new Date().toISOString().split("T")[0],
      approvedBy: u.userId,
      notes: args.notes ?? advance.notes,
    });
    // Notify
    const worker = await ctx.db.get(advance.workerId);
    await ctx.runMutation(internal.notifications.create, {
      agencyId: advance.agencyId,
      type: "advance_approved",
      title: "Salary Advance Approved",
      body: `Advance of ${advance.currency} ${advance.amount.toFixed(2)} for ${worker ? `${worker.firstName} ${worker.lastName}` : "worker"} has been approved.`,
      link: "/advances",
      severity: "success",
      entityId: args.id,
      entityType: "advance",
    });
  },
});

export const reject = mutation({
  args: { id: v.id("advances"), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const advance = await ctx.db.get(args.id);
    if (!advance) throw new ConvexError({ code: "NOT_FOUND", message: "Advance not found" });
    if (u.role !== "superadmin" && u.agencyId && advance.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot reject advances for another agency" });
    }
    if (advance.status !== "pending") {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Cannot reject a ${advance.status} advance` });
    }
    await ctx.db.patch(args.id, {
      status: "rejected",
      notes: args.notes ?? advance.notes,
    });
    const worker2 = await ctx.db.get(advance.workerId);
    await ctx.runMutation(internal.notifications.create, {
      agencyId: advance.agencyId,
      type: "advance_rejected",
      title: "Salary Advance Rejected",
      body: `Advance of ${advance.currency} ${advance.amount.toFixed(2)} for ${worker2 ? `${worker2.firstName} ${worker2.lastName}` : "worker"} has been rejected.`,
      link: "/advances",
      severity: "error",
      entityId: args.id,
      entityType: "advance",
    });
  },
});

export const disburse = mutation({
  args: { id: v.id("advances"), notes: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const u = await requireUser(ctx);
    const advance = await ctx.db.get(args.id);
    if (!advance) throw new ConvexError({ code: "NOT_FOUND", message: "Advance not found" });
    if (u.role !== "superadmin" && u.agencyId && advance.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot disburse advances for another agency" });
    }
    if (advance.status !== "approved") {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Cannot disburse a ${advance.status} advance` });
    }

    // Get worker for currency
    const worker = await ctx.db.get(advance.workerId);
    if (!worker) throw new ConvexError({ code: "NOT_FOUND", message: "Worker not found" });

    await ctx.db.patch(args.id, {
      status: "disbursed",
      disbursedDate: new Date().toISOString().split("T")[0],
      notes: args.notes ?? advance.notes,
    });

    // Credit the wallet via the wallet mutation helper
    await ctx.runMutation(api.wallet.creditAdvance, {
      workerId: advance.workerId,
      agencyId: advance.agencyId,
      amount: advance.amount,
      currency: advance.currency,
      description: `Salary advance disbursed`,
      referenceId: args.id,
      date: new Date().toISOString().split("T")[0],
    });
    // Notify
    await ctx.runMutation(internal.notifications.create, {
      agencyId: advance.agencyId,
      type: "advance_disbursed",
      title: "Salary Advance Disbursed",
      body: `${advance.currency} ${advance.amount.toFixed(2)} advance for ${worker.firstName} ${worker.lastName} has been disbursed to their wallet.`,
      link: "/advances",
      severity: "success",
      entityId: args.id,
      entityType: "advance",
    });
  },
});

export const recordRepayment = mutation({
  args: {
    id: v.id("advances"),
    amount: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const u = await requireUser(ctx);
    const advance = await ctx.db.get(args.id);
    if (!advance) throw new ConvexError({ code: "NOT_FOUND", message: "Advance not found" });
    if (u.role !== "superadmin" && u.agencyId && advance.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot record repayment for another agency" });
    }
    if (advance.status !== "disbursed") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Can only record repayment for disbursed advances" });
    }
    if (args.amount <= 0) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Repayment amount must be greater than zero" });
    }

    const outstanding = advance.amount - advance.repaidAmount;
    const repayAmount = Math.min(args.amount, outstanding);
    const newRepaid = advance.repaidAmount + repayAmount;
    const fullyRepaid = newRepaid >= advance.amount;

    await ctx.db.patch(args.id, {
      repaidAmount: newRepaid,
      status: fullyRepaid ? "repaid" : "disbursed",
      notes: args.notes ?? advance.notes,
    });

    // Record repayment in wallet ledger
    await ctx.runMutation(api.wallet.repayAdvance, {
      workerId: advance.workerId,
      agencyId: advance.agencyId,
      amount: repayAmount,
      currency: advance.currency,
      description: `Advance repayment${fullyRepaid ? " (fully repaid)" : ""}`,
      referenceId: args.id,
      date: new Date().toISOString().split("T")[0],
    });
  },
});

export const remove = mutation({
  args: { id: v.id("advances") },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const advance = await ctx.db.get(args.id);
    if (!advance) throw new ConvexError({ code: "NOT_FOUND", message: "Advance not found" });
    if (u.role !== "superadmin" && u.agencyId && advance.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot delete advances for another agency" });
    }
    if (advance.status === "disbursed") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Cannot delete a disbursed advance" });
    }
    await ctx.db.delete(args.id);
  },
});
