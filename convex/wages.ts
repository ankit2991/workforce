import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api.js";

const lineItemValidator = v.array(v.object({ name: v.string(), amount: v.number() }));

// ── Wage Config ──────────────────────────────────────────────────────────────

export const getConfig = query({
  args: { workerId: v.id("workers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wageConfigs")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .order("desc")
      .first();
  },
});

export const listConfigs = query({
  args: { agencyId: v.id("agencies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wageConfigs")
      .withIndex("by_agency", (q) => q.eq("agencyId", args.agencyId))
      .collect();
  },
});

export const saveConfig = mutation({
  args: {
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    rateType: v.union(v.literal("daily"), v.literal("hourly"), v.literal("piece"), v.literal("monthly")),
    baseRate: v.number(),
    overtimeMultiplier: v.number(),
    currency: v.string(),
    allowances: lineItemValidator,
    deductions: lineItemValidator,
    effectiveFrom: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    // Replace existing config for this worker
    const existing = await ctx.db
      .query("wageConfigs")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, createdBy: user._id });
      return existing._id;
    }
    return await ctx.db.insert("wageConfigs", { ...args, createdBy: user._id });
  },
});

// ── Wage Records ─────────────────────────────────────────────────────────────

export const listByAgency = query({
  args: {
    agencyId: v.id("agencies"),
    status: v.optional(v.union(v.literal("draft"), v.literal("approved"), v.literal("paid"))),
  },
  handler: async (ctx, args) => {
    let records = await ctx.db
      .query("wageRecords")
      .withIndex("by_agency", (q) => q.eq("agencyId", args.agencyId))
      .order("desc")
      .take(500);
    if (args.status) records = records.filter((r) => r.status === args.status);
    return records;
  },
});

export const listByWorker = query({
  args: { workerId: v.id("workers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wageRecords")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .order("desc")
      .take(100);
  },
});

export const createRecord = mutation({
  args: {
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    periodStart: v.string(),
    periodEnd: v.string(),
    daysWorked: v.number(),
    hoursWorked: v.number(),
    overtimeHours: v.number(),
    pieceCount: v.number(),
    basePay: v.number(),
    overtimePay: v.number(),
    extraAllowances: lineItemValidator,
    extraDeductions: lineItemValidator,
    totalAllowances: v.number(),
    totalDeductions: v.number(),
    grossPay: v.number(),
    netPay: v.number(),
    currency: v.string(),
    status: v.union(v.literal("draft"), v.literal("approved"), v.literal("paid")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    // Prevent duplicate period for same worker
    const existing = await ctx.db
      .query("wageRecords")
      .withIndex("by_worker_period", (q) =>
        q.eq("workerId", args.workerId).eq("periodStart", args.periodStart),
      )
      .first();
    if (existing) {
      throw new ConvexError({ message: "Wage record already exists for this period", code: "CONFLICT" });
    }

    return await ctx.db.insert("wageRecords", { ...args, createdBy: user._id });
  },
});

export const updateRecord = mutation({
  args: {
    id: v.id("wageRecords"),
    extraAllowances: lineItemValidator,
    extraDeductions: lineItemValidator,
    totalAllowances: v.number(),
    totalDeductions: v.number(),
    grossPay: v.number(),
    netPay: v.number(),
    status: v.union(v.literal("draft"), v.literal("approved"), v.literal("paid")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("wageRecords"),
    status: v.union(v.literal("draft"), v.literal("approved"), v.literal("paid")),
  },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const prev = await ctx.db.get(args.id);
    await ctx.db.patch(args.id, { status: args.status });
    // Notify on approval/paid status changes
    if (prev && (args.status === "approved" || args.status === "paid")) {
      const worker = await ctx.db.get(prev.workerId);
      await ctx.runMutation(internal.notifications.create, {
        agencyId: prev.agencyId,
        type: args.status === "approved" ? "wage_approved" : "wage_paid",
        title: args.status === "approved" ? "Wage Record Approved" : "Wage Record Marked as Paid",
        body: `Wage record for ${worker ? `${worker.firstName} ${worker.lastName}` : "worker"} (${prev.periodStart} – ${prev.periodEnd}) — Net Pay: ${prev.currency} ${prev.netPay.toFixed(2)} — marked as ${args.status}.`,
        link: "/wages",
        severity: "success",
        entityId: args.id,
        entityType: "wage",
      });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("wageRecords") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    await ctx.db.delete(args.id);
  },
});
