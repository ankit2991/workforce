import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import type { MutationCtx } from "./_generated/server.d.ts";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getOrCreateWallet(
  ctx: MutationCtx,
  workerId: Id<"workers">,
  agencyId: Id<"agencies">,
  currency: string,
) {
  const existing = await ctx.db
    .query("wallets")
    .withIndex("by_worker", (q) => q.eq("workerId", workerId))
    .first();
  if (existing) return existing;
  const id = await ctx.db.insert("wallets", {
    workerId,
    agencyId,
    currency,
    earned: 0,
    pending: 0,
    advances: 0,
    spent: 0,
    withdrawn: 0,
  });
  return (await ctx.db.get(id))!;
}

// ── Queries ──────────────────────────────────────────────────────────────────

export const getWallet = query({
  args: { workerId: v.id("workers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wallets")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .first();
  },
});

export const listWalletsByAgency = query({
  args: { agencyId: v.id("agencies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wallets")
      .withIndex("by_agency", (q) => q.eq("agencyId", args.agencyId))
      .collect();
  },
});

export const getLedger = query({
  args: {
    workerId: v.id("workers"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ledgerEntries")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const getLedgerByAgency = query({
  args: {
    agencyId: v.id("agencies"),
    entryType: v.optional(v.union(
      v.literal("wage_credit"),
      v.literal("advance_credit"),
      v.literal("advance_repayment"),
      v.literal("withdrawal"),
      v.literal("marketplace_debit"),
      v.literal("adjustment"),
      v.literal("remittance"),
      v.literal("wallet_fund"),
    )),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_agency", (q) => q.eq("agencyId", args.agencyId))
      .order("desc")
      .take(500);
    if (args.entryType) return entries.filter((e) => e.entryType === args.entryType);
    return entries;
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

// Called when a wage record is approved — credits earned balance
export const creditWageEarned = mutation({
  args: {
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    referenceId: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const wallet = await getOrCreateWallet(ctx, args.workerId, args.agencyId, args.currency);
    const available = wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn;
    const newEarned = wallet.earned + args.amount;
    const newAvailable = available + args.amount;

    await ctx.db.patch(wallet._id, { earned: newEarned });
    await ctx.db.insert("ledgerEntries", {
      workerId: args.workerId,
      agencyId: args.agencyId,
      entryType: "wage_credit",
      amount: args.amount,
      balanceAfter: newAvailable,
      currency: args.currency,
      description: args.description,
      referenceId: args.referenceId,
      date: args.date,
      createdBy: user._id,
    });
  },
});

// Manual adjustment (admin)
export const addAdjustment = mutation({
  args: {
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    amount: v.number(), // positive = credit, negative = debit
    currency: v.string(),
    description: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const wallet = await getOrCreateWallet(ctx, args.workerId, args.agencyId, args.currency);
    const available = wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn;
    const newAvailable = available + args.amount;

    // Adjust earned for credits, or withdrawn for debits
    if (args.amount > 0) {
      await ctx.db.patch(wallet._id, { earned: wallet.earned + args.amount });
    } else {
      await ctx.db.patch(wallet._id, { withdrawn: wallet.withdrawn + Math.abs(args.amount) });
    }

    await ctx.db.insert("ledgerEntries", {
      workerId: args.workerId,
      agencyId: args.agencyId,
      entryType: "adjustment",
      amount: args.amount,
      balanceAfter: newAvailable,
      currency: args.currency,
      description: args.description,
      date: args.date,
      createdBy: user._id,
    });
  },
});

// Debit for withdrawal (called from withdrawals module)
export const debitWithdrawal = mutation({
  args: {
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    referenceId: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const wallet = await getOrCreateWallet(ctx, args.workerId, args.agencyId, args.currency);
    const available = wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn;
    if (available < args.amount) {
      throw new ConvexError({ message: "Insufficient available balance", code: "BAD_REQUEST" });
    }
    const newWithdrawn = wallet.withdrawn + args.amount;
    const newAvailable = available - args.amount;
    await ctx.db.patch(wallet._id, { withdrawn: newWithdrawn });
    await ctx.db.insert("ledgerEntries", {
      workerId: args.workerId,
      agencyId: args.agencyId,
      entryType: "withdrawal",
      amount: -args.amount,
      balanceAfter: newAvailable,
      currency: args.currency,
      description: args.description,
      referenceId: args.referenceId,
      date: args.date,
      createdBy: user._id,
    });
  },
});

// Debit for marketplace purchase
export const debitMarketplace = mutation({
  args: {
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    referenceId: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const wallet = await getOrCreateWallet(ctx, args.workerId, args.agencyId, args.currency);
    const available = wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn;
    if (available < args.amount) {
      throw new ConvexError({ message: "Insufficient available balance", code: "BAD_REQUEST" });
    }
    await ctx.db.patch(wallet._id, { spent: wallet.spent + args.amount });
    await ctx.db.insert("ledgerEntries", {
      workerId: args.workerId,
      agencyId: args.agencyId,
      entryType: "marketplace_debit",
      amount: -args.amount,
      balanceAfter: available - args.amount,
      currency: args.currency,
      description: args.description,
      referenceId: args.referenceId,
      date: args.date,
      createdBy: user._id,
    });
  },
});

// Credit advance (called from advances module)
export const creditAdvance = mutation({
  args: {
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    referenceId: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const wallet = await getOrCreateWallet(ctx, args.workerId, args.agencyId, args.currency);
    const available = wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn;
    await ctx.db.patch(wallet._id, { advances: wallet.advances + args.amount });
    await ctx.db.insert("ledgerEntries", {
      workerId: args.workerId,
      agencyId: args.agencyId,
      entryType: "advance_credit",
      amount: args.amount,
      balanceAfter: available, // advance doesn't immediately change available (it's tracked separately)
      currency: args.currency,
      description: args.description,
      referenceId: args.referenceId,
      date: args.date,
      createdBy: user._id,
    });
  },
});

// Debit for remittance (called from remittances module)
export const debitRemittance = mutation({
  args: {
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    referenceId: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const wallet = await getOrCreateWallet(ctx, args.workerId, args.agencyId, args.currency);
    const available = wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn;
    if (available < args.amount) {
      throw new ConvexError({ message: "Insufficient available balance", code: "BAD_REQUEST" });
    }
    const newWithdrawn = wallet.withdrawn + args.amount;
    const newAvailable = available - args.amount;
    await ctx.db.patch(wallet._id, { withdrawn: newWithdrawn });
    await ctx.db.insert("ledgerEntries", {
      workerId: args.workerId,
      agencyId: args.agencyId,
      entryType: "remittance",
      amount: -args.amount,
      balanceAfter: newAvailable,
      currency: args.currency,
      description: args.description,
      referenceId: args.referenceId,
      date: args.date,
      createdBy: user._id,
    });
  },
});

// Credit refund (remittance failed — return to wallet)
export const creditRefund = mutation({
  args: {
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    referenceId: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const wallet = await getOrCreateWallet(ctx, args.workerId, args.agencyId, args.currency);
    const available = wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn;
    // Reverse the prior debit by reducing withdrawn
    const newWithdrawn = Math.max(0, wallet.withdrawn - args.amount);
    const newAvailable = available + args.amount;
    await ctx.db.patch(wallet._id, { withdrawn: newWithdrawn });
    await ctx.db.insert("ledgerEntries", {
      workerId: args.workerId,
      agencyId: args.agencyId,
      entryType: "adjustment",
      amount: args.amount,
      balanceAfter: newAvailable,
      currency: args.currency,
      description: args.description,
      referenceId: args.referenceId,
      date: args.date,
      createdBy: user._id,
    });
  },
});

// Repay advance (reduces advances balance)
export const repayAdvance = mutation({
  args: {
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    referenceId: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const wallet = await getOrCreateWallet(ctx, args.workerId, args.agencyId, args.currency);
    const newAdvances = Math.max(0, wallet.advances - args.amount);
    const available = wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn;
    await ctx.db.patch(wallet._id, { advances: newAdvances });
    await ctx.db.insert("ledgerEntries", {
      workerId: args.workerId,
      agencyId: args.agencyId,
      entryType: "advance_repayment",
      amount: -args.amount,
      balanceAfter: available + args.amount,
      currency: args.currency,
      description: args.description,
      referenceId: args.referenceId,
      date: args.date,
      createdBy: user._id,
    });
  },
});

// Admin funds worker wallet (wage payment / top-up)
export const fundWallet = mutation({
  args: {
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    if (args.amount <= 0) throw new ConvexError({ message: "Amount must be greater than 0", code: "BAD_REQUEST" });

    const wallet = await getOrCreateWallet(ctx, args.workerId, args.agencyId, args.currency);
    const available = wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn;
    const newEarned = wallet.earned + args.amount;
    const newAvailable = available + args.amount;

    await ctx.db.patch(wallet._id, { earned: newEarned });
    await ctx.db.insert("ledgerEntries", {
      workerId: args.workerId,
      agencyId: args.agencyId,
      entryType: "wallet_fund",
      amount: args.amount,
      balanceAfter: newAvailable,
      currency: args.currency,
      description: args.description,
      date: args.date,
      createdBy: user._id,
    });
  },
});
