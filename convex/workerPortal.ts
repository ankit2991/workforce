/**
 * Worker Self-Service Portal — all queries and mutations a worker uses themselves.
 * Every handler derives the workerId from the caller's userRoles record; nothing
 * is accepted as an untrusted argument.
 */
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import type { QueryCtx, MutationCtx } from "./_generated/server.d.ts";

// ── Auth helper ───────────────────────────────────────────────────────────────

type WorkerSession = {
  userId: Id<"users">;
  role: string;
  workerId: Id<"workers"> | null;
  agencyId: Id<"agencies"> | null;
} | null;

async function getWorkerSession(ctx: QueryCtx | MutationCtx): Promise<WorkerSession> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) return null;

  const roleRow = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();
  if (!roleRow) return null;

  return {
    userId: user._id,
    role: roleRow.role,
    workerId: (roleRow.workerId ?? null) as Id<"workers"> | null,
    agencyId: (roleRow.agencyId ?? null) as Id<"agencies"> | null,
  };
}

/** Like getWorkerSession but throws for mutations where we need identity */
async function requireWorkerSession(ctx: QueryCtx | MutationCtx): Promise<NonNullable<WorkerSession>> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });

  const roleRow = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();
  if (!roleRow) throw new ConvexError({ code: "FORBIDDEN", message: "No role assigned" });

  return {
    userId: user._id,
    role: roleRow.role,
    workerId: (roleRow.workerId ?? null) as Id<"workers"> | null,
    agencyId: (roleRow.agencyId ?? null) as Id<"agencies"> | null,
  };
}

// ── My Profile ────────────────────────────────────────────────────────────────

/** Auto-register a new worker from the portal sign-up flow */
export const autoRegisterWorker = mutation({
  args: {
    agencyId: v.id("agencies"),
    // Personal
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
    nationality: v.optional(v.string()),
    phone: v.optional(v.string()),
    // Employment
    jobTitle: v.optional(v.string()),
    department: v.optional(v.string()),
    employmentType: v.optional(v.union(
      v.literal("full_time"),
      v.literal("part_time"),
      v.literal("contract"),
      v.literal("piece_work"),
    )),
    // Bank
    bankName: v.optional(v.string()),
    bankAccountNumber: v.optional(v.string()),
    bankAccountName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ workerId: Id<"workers">; agencyId: Id<"agencies"> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });

    // Check if user already has a role — prevent double registration
    const existingRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existingRole?.workerId) {
      return {
        workerId: existingRole.workerId as Id<"workers">,
        agencyId: (existingRole.agencyId ?? args.agencyId) as Id<"agencies">,
      };
    }

    // Validate agency exists and is active
    const agency = await ctx.db.get(args.agencyId);
    if (!agency || agency.status !== "active") {
      throw new ConvexError({ code: "NOT_FOUND", message: "Agency not found or inactive." });
    }

    // Generate a unique employee ID
    const allWorkers = await ctx.db
      .query("workers")
      .withIndex("by_agency", (q) => q.eq("agencyId", agency._id))
      .collect();
    const nextNum = allWorkers.length + 1;
    const employeeId = `EMP${String(nextNum).padStart(3, "0")}`;

    const today = new Date().toISOString().slice(0, 10);

    // Create worker record
    const workerId = await ctx.db.insert("workers", {
      employeeId,
      firstName: args.firstName,
      lastName: args.lastName,
      email: identity.email ?? user.email,
      dateOfBirth: args.dateOfBirth,
      gender: args.gender,
      nationality: args.nationality,
      phone: args.phone,
      agencyId: agency._id,
      jobTitle: args.jobTitle,
      department: args.department,
      employmentType: args.employmentType ?? "full_time",
      startDate: today,
      status: "active",
      bankName: args.bankName,
      bankAccountNumber: args.bankAccountNumber,
      bankAccountName: args.bankAccountName,
      createdBy: user._id,
    });

    // Create or update userRoles entry
    if (existingRole) {
      await ctx.db.patch(existingRole._id, {
        role: "worker",
        agencyId: agency._id,
        workerId,
      });
    } else {
      await ctx.db.insert("userRoles", {
        userId: user._id,
        role: "worker",
        agencyId: agency._id,
        workerId,
      });
    }

    return { workerId, agencyId: agency._id };
  },
});

/** List active agencies for the portal sign-up dropdown */
export const getActiveAgencies = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("agencies")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx): Promise<null | {
    _id: Id<"workers">; _creationTime: number;
    employeeId: string; firstName: string; lastName: string;
    agencyId: Id<"agencies">; startDate: string;
    status: "active" | "inactive" | "suspended" | "terminated";
    employmentType: "full_time" | "part_time" | "contract" | "piece_work";
    createdBy: Id<"users">;
    dateOfBirth?: string; gender?: "male" | "female" | "other";
    nationality?: string; phone?: string; email?: string;
    branchId?: Id<"branches">; siteId?: Id<"sites">;
    jobTitle?: string; department?: string; endDate?: string;
    bankName?: string; bankAccountNumber?: string; bankAccountName?: string;
    expectedMonthlySalary?: number; salaryCurrency?: string;
    withdrawalFrequency?: "weekly" | "monthly";
    documents?: Array<{ type: string; name: string; storageId: string; uploadedAt: string }>;
    agencyName?: string; branchName?: string; siteName?: string;
  }> => {
    const session = await getWorkerSession(ctx);
    const workerId = session?.workerId ?? null;
    if (!workerId) return null;
    const worker = await ctx.db.get(workerId);
    if (!worker) return null;

    const agency = await ctx.db.get(worker.agencyId);
    const branch = worker.branchId ? await ctx.db.get(worker.branchId) : null;
    const site   = worker.siteId   ? await ctx.db.get(worker.siteId)   : null;

    return {
      ...worker,
      agencyName: agency && "name" in agency ? (agency as { name: string }).name : undefined,
      branchName: branch && "name" in branch ? (branch as { name: string }).name : undefined,
      siteName:   site   && "name" in site   ? (site   as { name: string }).name : undefined,
    };
  },
});

// ── My Wage Config ───────────────────────────────────────────────────────────

export const getMyWageConfig = query({
  args: {},
  handler: async (ctx) => {
    const session = await getWorkerSession(ctx);
    const workerId = session?.workerId ?? null;
    if (!workerId) return null;
    return await ctx.db
      .query("wageConfigs")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .order("desc")
      .first();
  },
});

// ── My Wallet ─────────────────────────────────────────────────────────────────

export const getMyWallet = query({
  args: {},
  handler: async (ctx) => {
    const session = await getWorkerSession(ctx);
    const workerId = session?.workerId ?? null;
    if (!workerId) return null;
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .first();
    if (!wallet) return null;
    const available = wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn;
    return { ...wallet, available };
  },
});

export const getMyLedger = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const session = await getWorkerSession(ctx);
    const workerId = session?.workerId ?? null;
    if (!workerId) return [];
    return await ctx.db
      .query("ledgerEntries")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

// ── My Wages ──────────────────────────────────────────────────────────────────

export const getMyWages = query({
  args: {},
  handler: async (ctx) => {
    const session = await getWorkerSession(ctx);
    const workerId = session?.workerId ?? null;
    if (!workerId) return [];
    return await ctx.db
      .query("wageRecords")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .order("desc")
      .take(24);
  },
});

// ── My Advances ───────────────────────────────────────────────────────────────

export const getMyAdvances = query({
  args: {},
  handler: async (ctx) => {
    const session = await getWorkerSession(ctx);
    const workerId = session?.workerId ?? null;
    if (!workerId) return [];
    return await ctx.db
      .query("advances")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .order("desc")
      .take(50);
  },
});

export const requestAdvance = mutation({
  args: {
    amount: v.number(),
    currency: v.string(),
    reason: v.optional(v.string()),
    repaymentSchedule: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"advances">> => {
    const { workerId, agencyId, userId } = await requireWorkerSession(ctx);
    if (!workerId || !agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Your account is not linked to a worker record" });
    }
    if (args.amount <= 0) throw new ConvexError({ code: "BAD_REQUEST", message: "Amount must be greater than zero" });

    // Enforce 40% of estimated monthly salary limit
    const wageConfig = await ctx.db
      .query("wageConfigs")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .order("desc")
      .first();
    if (wageConfig) {
      let monthlyBase = 0;
      if (wageConfig.rateType === "monthly") {
        monthlyBase = wageConfig.baseRate;
      } else if (wageConfig.rateType === "daily") {
        monthlyBase = wageConfig.baseRate * 26;
      } else if (wageConfig.rateType === "hourly") {
        monthlyBase = wageConfig.baseRate * 8 * 26;
      } else {
        monthlyBase = wageConfig.baseRate * 26;
      }
      const totalAllowances = wageConfig.allowances.reduce((s: number, a: { amount: number }) => s + a.amount, 0);
      const totalDeductions = wageConfig.deductions.reduce((s: number, d: { amount: number }) => s + d.amount, 0);
      const estimatedSalary = monthlyBase + totalAllowances - totalDeductions;
      const advanceLimit = estimatedSalary * 0.4;

      if (estimatedSalary > 0) {
        // Sum all outstanding (non-rejected, non-fully-repaid) advances
        const allAdvances = await ctx.db
          .query("advances")
          .withIndex("by_worker", (q) => q.eq("workerId", workerId))
          .take(200);
        const outstandingTotal = allAdvances
          .filter((a) => a.status !== "rejected")
          .reduce((sum, a) => sum + (a.amount - (a.repaidAmount ?? 0)), 0);

        if (outstandingTotal + args.amount > advanceLimit) {
          const remaining = Math.max(0, advanceLimit - outstandingTotal);
          throw new ConvexError({
            code: "BAD_REQUEST",
            message: `You have exceeded the advance limit. Max remaining: ${wageConfig.currency} ${remaining.toFixed(2)} (40% of salary minus outstanding advances)`,
          });
        }
      }
    }

    // Check no active pending advance
    const pending = await ctx.db
      .query("advances")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
    if (pending) throw new ConvexError({ code: "CONFLICT", message: "You already have a pending advance request" });

    const processingFee = Math.round(args.amount * 0.1 * 100) / 100; // 10% fee

    return await ctx.db.insert("advances", {
      workerId,
      agencyId,
      amount: args.amount,
      processingFee,
      currency: args.currency,
      reason: args.reason,
      status: "pending",
      requestedDate: new Date().toISOString().split("T")[0],
      repaidAmount: 0,
      repaymentSchedule: args.repaymentSchedule,
      createdBy: userId,
    });
  },
});

// ── My Withdrawals ────────────────────────────────────────────────────────────

export const getMyWithdrawals = query({
  args: {},
  handler: async (ctx) => {
    const session = await getWorkerSession(ctx);
    const workerId = session?.workerId ?? null;
    if (!workerId) return [];
    return await ctx.db
      .query("withdrawals")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .order("desc")
      .take(50);
  },
});

export const requestWithdrawal = mutation({
  args: {
    amount: v.number(),
    currency: v.string(),
    bankName: v.string(),
    bankAccountNumber: v.string(),
    bankAccountName: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"withdrawals">> => {
    const { workerId, agencyId, userId } = await requireWorkerSession(ctx);
    if (!workerId || !agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Your account is not linked to a worker record" });
    }
    if (args.amount <= 0) throw new ConvexError({ code: "BAD_REQUEST", message: "Amount must be greater than zero" });

    // Balance check
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .first();
    const available = wallet ? wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn : 0;
    if (available < args.amount) {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Insufficient balance. Available: ${available.toFixed(2)} ${args.currency}` });
    }

    return await ctx.db.insert("withdrawals", {
      workerId,
      agencyId,
      amount: args.amount,
      currency: args.currency,
      bankName: args.bankName,
      bankAccountNumber: args.bankAccountNumber,
      bankAccountName: args.bankAccountName,
      status: "pending",
      requestedDate: new Date().toISOString().split("T")[0],
      notes: args.notes,
      createdBy: userId,
    });
  },
});

// ── My Remittances ────────────────────────────────────────────────────────────

export const getMyRemittances = query({
  args: {},
  handler: async (ctx) => {
    const session = await getWorkerSession(ctx);
    const workerId = session?.workerId ?? null;
    if (!workerId) return [];
    return await ctx.db
      .query("remittances")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .order("desc")
      .take(50);
  },
});

export const requestRemittance = mutation({
  args: {
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
    transferMethod: v.union(v.literal("bank_transfer"), v.literal("mobile_wallet"), v.literal("cash_pickup")),
    recipientBankName: v.optional(v.string()),
    recipientAccountNumber: v.optional(v.string()),
    recipientAccountName: v.optional(v.string()),
    mobileWalletProvider: v.optional(v.string()),
    mobileWalletNumber: v.optional(v.string()),
    cashPickupLocation: v.optional(v.string()),
    purpose: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"remittances">> => {
    const { workerId, agencyId, userId } = await requireWorkerSession(ctx);
    if (!workerId || !agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Your account is not linked to a worker record" });
    }

    // Balance check
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .first();
    const available = wallet ? wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn : 0;
    if (available < args.totalDebit) {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Insufficient balance. Available: ${available.toFixed(2)} ${args.sendCurrency}` });
    }

    return await ctx.db.insert("remittances", {
      workerId,
      agencyId,
      ...args,
      status: "pending",
      requestedDate: new Date().toISOString().split("T")[0],
      createdBy: userId,
    });
  },
});

// ── My Marketplace ────────────────────────────────────────────────────────────

export const getMarketplaceProducts = query({
  args: {},
  handler: async (ctx) => {
    const session = await getWorkerSession(ctx);
    const agencyId = session?.agencyId ?? null;
    if (!agencyId) return [];
    return await ctx.db
      .query("marketplaceProducts")
      .withIndex("by_agency_status", (q) => q.eq("agencyId", agencyId).eq("status", "active"))
      .collect();
  },
});

export const getMyOrders = query({
  args: {},
  handler: async (ctx) => {
    const session = await getWorkerSession(ctx);
    const workerId = session?.workerId ?? null;
    if (!workerId) return [];
    return await ctx.db
      .query("marketplaceOrders")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .order("desc")
      .take(50);
  },
});

export const placeOrder = mutation({
  args: {
    productId: v.id("marketplaceProducts"),
    quantity: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"marketplaceOrders">> => {
    const { workerId, agencyId, userId } = await requireWorkerSession(ctx);
    if (!workerId || !agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Account not linked to a worker record" });
    }
    const product = await ctx.db.get(args.productId);
    if (!product || product.status !== "active") {
      throw new ConvexError({ code: "NOT_FOUND", message: "Product not found or unavailable" });
    }

    const total = product.price * args.quantity;

    // Stock check
    if (product.stock !== undefined && product.stock < args.quantity) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Insufficient stock" });
    }

    // Balance check
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .first();
    const available = wallet ? wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn : 0;
    if (available < total) {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Insufficient balance. Available: ${available.toFixed(2)} ${product.currency}` });
    }

    // Deduct from wallet
    if (wallet) {
      await ctx.db.patch(wallet._id, { spent: wallet.spent + total });
      await ctx.db.insert("ledgerEntries", {
        workerId,
        agencyId,
        entryType: "marketplace_debit",
        amount: -total,
        balanceAfter: available - total,
        currency: product.currency,
        description: `Marketplace purchase: ${product.name} ×${args.quantity}`,
        referenceId: args.productId,
        date: new Date().toISOString().split("T")[0],
        createdBy: userId,
      });
    }

    // Reduce stock
    if (product.stock !== undefined) {
      await ctx.db.patch(args.productId, { stock: product.stock - args.quantity });
    }

    return await ctx.db.insert("marketplaceOrders", {
      workerId,
      agencyId,
      productId: args.productId,
      productName: product.name,
      unitPrice: product.price,
      currency: product.currency,
      quantity: args.quantity,
      totalAmount: total,
      status: "pending",
      orderedDate: new Date().toISOString().split("T")[0],
      createdBy: userId,
    });
  },
});

// ── My Notifications ──────────────────────────────────────────────────────────

export const getMyNotifications = query({
  args: {},
  handler: async (ctx) => {
    const session = await getWorkerSession(ctx);
    const agencyId = session?.agencyId ?? null;
    if (!agencyId) return [];
    return await ctx.db
      .query("notifications")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .order("desc")
      .take(50);
  },
});

// ── My Attendance ─────────────────────────────────────────────────────────────

export const getMyAttendance = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const session = await getWorkerSession(ctx);
    const workerId = session?.workerId ?? null;
    if (!workerId) return [];
    return await ctx.db
      .query("attendance")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .order("desc")
      .take(args.limit ?? 30);
  },
});

// ── My iGaming Account & Transactions (worker-scoped) ─────────────────────────

export const portalDeposit = mutation({
  args: { amount: v.number(), currency: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const { workerId, agencyId } = await requireWorkerSession(ctx);
    if (!workerId || !agencyId) throw new ConvexError({ code: "FORBIDDEN", message: "Account not linked to a worker record" });

    const config = await ctx.db.query("igamingConfigs").withIndex("by_agency", (q) => q.eq("agencyId", agencyId)).first();
    if (!config?.enabled) throw new ConvexError({ code: "FORBIDDEN", message: "iGaming is not enabled for your agency" });

    // Deduct from main wallet
    const wallet = await ctx.db.query("wallets").withIndex("by_worker", (q) => q.eq("workerId", workerId)).first();
    if (!wallet) throw new ConvexError({ code: "NOT_FOUND", message: "No wallet found" });
    const available = wallet.earned + wallet.advances - wallet.spent - wallet.withdrawn;
    if (available < args.amount) throw new ConvexError({ code: "BAD_REQUEST", message: `Insufficient balance. Available: ${available.toFixed(2)}` });
    await ctx.db.patch(wallet._id, { spent: wallet.spent + args.amount });

    // Credit iGaming account (create if not exists)
    let acc = await ctx.db.query("igamingAccounts").withIndex("by_worker", (q) => q.eq("workerId", workerId)).first();
    if (!acc) {
      const accId = await ctx.db.insert("igamingAccounts", { workerId, agencyId, balance: 0, totalDeposited: 0, totalWithdrawn: 0, totalWon: 0, totalWagered: 0, status: "active", currency: args.currency, username: workerId, createdAt: new Date().toISOString() });
      acc = await ctx.db.get(accId);
    }
    if (!acc) throw new ConvexError({ code: "NOT_FOUND", message: "Failed to create account" });
    const newBalance = acc.balance + args.amount;
    await ctx.db.patch(acc._id, { balance: newBalance, totalDeposited: acc.totalDeposited + args.amount });
    await ctx.db.insert("igamingTransactions", { workerId, agencyId, type: "deposit", amount: args.amount, currency: args.currency, balanceAfter: newBalance, description: `Deposit from main wallet`, createdAt: new Date().toISOString() });
  },
});

export const portalWithdraw = mutation({
  args: { amount: v.number(), currency: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const { workerId, agencyId } = await requireWorkerSession(ctx);
    if (!workerId || !agencyId) throw new ConvexError({ code: "FORBIDDEN", message: "Account not linked to a worker record" });

    const acc = await ctx.db.query("igamingAccounts").withIndex("by_worker", (q) => q.eq("workerId", workerId)).first();
    if (!acc) throw new ConvexError({ code: "NOT_FOUND", message: "No iGaming account" });
    if (acc.balance < args.amount) throw new ConvexError({ code: "BAD_REQUEST", message: "Insufficient iGaming balance" });

    const newBalance = acc.balance - args.amount;
    await ctx.db.patch(acc._id, { balance: newBalance, totalWithdrawn: acc.totalWithdrawn + args.amount });
    await ctx.db.insert("igamingTransactions", { workerId, agencyId, type: "withdrawal", amount: args.amount, currency: args.currency, balanceAfter: newBalance, description: `Cash out to main wallet`, createdAt: new Date().toISOString() });

    // Credit main wallet
    const wallet = await ctx.db.query("wallets").withIndex("by_worker", (q) => q.eq("workerId", workerId)).first();
    if (wallet) {
      await ctx.db.patch(wallet._id, { spent: Math.max(0, wallet.spent - args.amount) });
    }
  },
});

export const portalPlaceBet = mutation({
  args: { betAmount: v.number(), currency: v.string() },
  handler: async (ctx, args): Promise<{ won: boolean; winAmount: number }> => {
    const { workerId, agencyId } = await requireWorkerSession(ctx);
    if (!workerId || !agencyId) throw new ConvexError({ code: "FORBIDDEN", message: "Account not linked to a worker record" });

    const acc = await ctx.db.query("igamingAccounts").withIndex("by_worker", (q) => q.eq("workerId", workerId)).first();
    if (!acc) throw new ConvexError({ code: "NOT_FOUND", message: "No iGaming account. Please top up first." });
    if (acc.status !== "active") throw new ConvexError({ code: "FORBIDDEN", message: "Account is not active" });
    if (acc.balance < args.betAmount) throw new ConvexError({ code: "BAD_REQUEST", message: "Insufficient iGaming balance" });

    // Deduct bet
    const afterBet = acc.balance - args.betAmount;
    await ctx.db.patch(acc._id, { balance: afterBet, totalWagered: acc.totalWagered + args.betAmount });
    await ctx.db.insert("igamingTransactions", { workerId, agencyId, type: "bet", amount: -args.betAmount, currency: args.currency, balanceAfter: afterBet, gameName: "Quick Slots", description: `Bet on Quick Slots`, createdAt: new Date().toISOString() });

    // ~45% win rate, 1.5x–4x multiplier
    const won = Math.random() < 0.45;
    let winAmount = 0;
    if (won) {
      const mult = 1.5 + Math.random() * 2.5;
      winAmount = Math.round(args.betAmount * mult * 100) / 100;
      const afterWin = afterBet + winAmount;
      await ctx.db.patch(acc._id, { balance: afterWin, totalWon: acc.totalWon + winAmount });
      await ctx.db.insert("igamingTransactions", { workerId, agencyId, type: "win", amount: winAmount, currency: args.currency, balanceAfter: afterWin, gameName: "Quick Slots", description: `Win on Quick Slots`, createdAt: new Date().toISOString() });
    }
    return { won, winAmount };
  },
});

export const getMyIgamingAccount = query({
  args: {},
  handler: async (ctx) => {
    const session = await getWorkerSession(ctx);
    const workerId = session?.workerId ?? null;
    if (!workerId) return null;
    return await ctx.db
      .query("igamingAccounts")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .first();
  },
});

export const getMyIgamingTransactions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const session = await getWorkerSession(ctx);
    const workerId = session?.workerId ?? null;
    if (!workerId) return [];
    return await ctx.db
      .query("igamingTransactions")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

