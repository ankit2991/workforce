import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import { requireUser } from "./lib/auth.ts";
import { internal } from "./_generated/api.js";

// ── Config ────────────────────────────────────────────────────────────────────

export const getConfig = query({
  args: { agencyId: v.optional(v.id("agencies")) },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const agencyId = u.role === "superadmin"
      ? (args.agencyId ?? null)
      : u.agencyId;
    if (!agencyId) return null;
    return await ctx.db
      .query("igamingConfigs")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .first();
  },
});

export const upsertConfig = mutation({
  args: {
    enabled: v.boolean(),
    providerName: v.optional(v.string()),
    providerUrl: v.optional(v.string()),
    minDeposit: v.number(),
    maxDeposit: v.number(),
    dailyDepositLimit: v.optional(v.number()),
    monthlyDepositLimit: v.optional(v.number()),
    currency: v.string(),
    allowedCategories: v.array(v.string()),
    bonusEnabled: v.boolean(),
    welcomeBonus: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<void> => {
    const u = await requireUser(ctx);
    if (u.role !== "superadmin" && u.role !== "agency_admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only admins can configure iGaming" });
    }
    const agencyId = u.agencyId;
    if (!agencyId) throw new ConvexError({ code: "BAD_REQUEST", message: "No agency selected" });

    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("igamingConfigs")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
    } else {
      await ctx.db.insert("igamingConfigs", {
        agencyId,
        ...args,
        createdBy: u.userId,
        updatedAt: now,
      });
    }
  },
});

// ── Accounts ─────────────────────────────────────────────────────────────────

export const listAccounts = query({
  args: { agencyId: v.optional(v.id("agencies")), workerId: v.optional(v.id("workers")) },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const agencyId = u.role === "superadmin" ? (args.agencyId ?? null) : u.agencyId;
    if (!agencyId) return [];

    if (args.workerId) {
      return await ctx.db
        .query("igamingAccounts")
        .withIndex("by_worker", (q) => q.eq("workerId", args.workerId!))
        .collect();
    }
    return await ctx.db
      .query("igamingAccounts")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
  },
});

export const getMyAccount = query({
  args: { workerId: v.id("workers") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db
      .query("igamingAccounts")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .first();
  },
});

export const createAccount = mutation({
  args: {
    workerId: v.id("workers"),
    username: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const u = await requireUser(ctx);
    const agencyId = u.agencyId;
    if (!agencyId) throw new ConvexError({ code: "BAD_REQUEST", message: "No agency selected" });

    const worker = await ctx.db.get(args.workerId);
    if (!worker) throw new ConvexError({ code: "NOT_FOUND", message: "Worker not found" });

    // Check config
    const config = await ctx.db
      .query("igamingConfigs")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .first();
    if (!config?.enabled) throw new ConvexError({ code: "FORBIDDEN", message: "iGaming is not enabled for this agency" });

    // No duplicate accounts
    const existing = await ctx.db
      .query("igamingAccounts")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .first();
    if (existing) throw new ConvexError({ code: "CONFLICT", message: "This worker already has an iGaming account" });

    const now = new Date().toISOString();
    const accountId = await ctx.db.insert("igamingAccounts", {
      workerId: args.workerId,
      agencyId,
      username: args.username,
      balance: 0,
      currency: config.currency,
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalWon: 0,
      totalWagered: 0,
      status: "active",
      createdAt: now,
    });

    // Welcome bonus
    if (config.bonusEnabled && config.welcomeBonus && config.welcomeBonus > 0) {
      const bonus = config.welcomeBonus;
      const bonusAmount = bonus; // flat amount as welcome bonus
      await ctx.db.patch(accountId, { balance: bonusAmount, totalWon: bonusAmount });
      await ctx.db.insert("igamingTransactions", {
        workerId: args.workerId,
        agencyId,
        type: "bonus",
        amount: bonusAmount,
        currency: config.currency,
        balanceAfter: bonusAmount,
        description: `Welcome bonus (${bonus} ${config.currency})`,
        createdAt: now,
      });
    }

    await ctx.runMutation(internal.notifications.create, {
      agencyId,
      type: "igaming_account_created",
      title: "iGaming Account Created",
      body: `iGaming account for ${worker.firstName} ${worker.lastName} (${args.username}) has been created.`,
      link: "/igaming",
      severity: "success",
      entityId: accountId,
      entityType: "igaming_account",
    });
  },
});

export const updateAccountStatus = mutation({
  args: {
    id: v.id("igamingAccounts"),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("self_excluded")),
  },
  handler: async (ctx, args): Promise<void> => {
    const u = await requireUser(ctx);
    if (u.role !== "superadmin" && u.role !== "agency_admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only admins can update account status" });
    }
    const acc = await ctx.db.get(args.id);
    if (!acc) throw new ConvexError({ code: "NOT_FOUND", message: "Account not found" });
    await ctx.db.patch(args.id, { status: args.status });
  },
});

// ── Transactions ─────────────────────────────────────────────────────────────

export const listTransactions = query({
  args: { agencyId: v.optional(v.id("agencies")), workerId: v.optional(v.id("workers")), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const agencyId = u.role === "superadmin" ? (args.agencyId ?? null) : u.agencyId;
    if (!agencyId) return [];
    const limit = args.limit ?? 50;

    if (args.workerId) {
      return await ctx.db
        .query("igamingTransactions")
        .withIndex("by_worker", (q) => q.eq("workerId", args.workerId!))
        .order("desc")
        .take(limit);
    }
    return await ctx.db
      .query("igamingTransactions")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .order("desc")
      .take(limit);
  },
});

export const deposit = mutation({
  args: {
    workerId: v.id("workers"),
    amount: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const u = await requireUser(ctx);
    const agencyId = u.agencyId;
    if (!agencyId) throw new ConvexError({ code: "BAD_REQUEST", message: "No agency selected" });

    const config = await ctx.db
      .query("igamingConfigs")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .first();
    if (!config?.enabled) throw new ConvexError({ code: "FORBIDDEN", message: "iGaming not enabled" });

    if (args.amount < config.minDeposit)
      throw new ConvexError({ code: "BAD_REQUEST", message: `Minimum deposit is ${config.currency} ${config.minDeposit}` });
    if (args.amount > config.maxDeposit)
      throw new ConvexError({ code: "BAD_REQUEST", message: `Maximum deposit is ${config.currency} ${config.maxDeposit}` });

    const acc = await ctx.db
      .query("igamingAccounts")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .first();
    if (!acc) throw new ConvexError({ code: "NOT_FOUND", message: "No iGaming account found for this worker" });
    if (acc.status !== "active") throw new ConvexError({ code: "FORBIDDEN", message: "Account is suspended or self-excluded" });

    // Debit main worker wallet
    const walletRow = await ctx.db
      .query("wallets")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .first();
    if (!walletRow) throw new ConvexError({ code: "NOT_FOUND", message: "Worker wallet not found" });
    const available = walletRow.earned + walletRow.advances - walletRow.spent - walletRow.withdrawn;
    if (available < args.amount) throw new ConvexError({ code: "BAD_REQUEST", message: "Insufficient wallet balance" });

    // Update main wallet (treat as spent)
    await ctx.db.patch(walletRow._id, { spent: walletRow.spent + args.amount });

    // Running balance entry
    const worker = await ctx.db.get(args.workerId);
    const today = new Date().toISOString().split("T")[0];
    await ctx.db.insert("ledgerEntries", {
      workerId: args.workerId,
      agencyId,
      entryType: "marketplace_debit",
      amount: -args.amount,
      balanceAfter: available - args.amount,
      currency: config.currency,
      description: `iGaming deposit to account @${acc.username}`,
      date: today,
      createdBy: u.userId,
    });

    // Credit iGaming account
    const newBalance = acc.balance + args.amount;
    await ctx.db.patch(acc._id, {
      balance: newBalance,
      totalDeposited: acc.totalDeposited + args.amount,
    });

    const now = new Date().toISOString();
    await ctx.db.insert("igamingTransactions", {
      workerId: args.workerId,
      agencyId,
      type: "deposit",
      amount: args.amount,
      currency: config.currency,
      balanceAfter: newBalance,
      description: `Deposit from main wallet for ${worker ? `${worker.firstName} ${worker.lastName}` : "worker"}`,
      createdAt: now,
    });
  },
});

export const withdraw = mutation({
  args: {
    workerId: v.id("workers"),
    amount: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const u = await requireUser(ctx);
    const agencyId = u.agencyId;
    if (!agencyId) throw new ConvexError({ code: "BAD_REQUEST", message: "No agency selected" });

    const acc = await ctx.db
      .query("igamingAccounts")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .first();
    if (!acc) throw new ConvexError({ code: "NOT_FOUND", message: "No iGaming account found" });
    if (acc.status !== "active") throw new ConvexError({ code: "FORBIDDEN", message: "Account is not active" });
    if (acc.balance < args.amount) throw new ConvexError({ code: "BAD_REQUEST", message: "Insufficient iGaming balance" });

    const config = await ctx.db
      .query("igamingConfigs")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .first();

    // Deduct from iGaming
    const newBalance = acc.balance - args.amount;
    await ctx.db.patch(acc._id, {
      balance: newBalance,
      totalWithdrawn: acc.totalWithdrawn + args.amount,
    });

    // Credit main wallet
    const walletRow = await ctx.db
      .query("wallets")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .first();
    if (walletRow) {
      await ctx.db.patch(walletRow._id, { earned: walletRow.earned + args.amount });
    }

    const now = new Date().toISOString();
    const worker = await ctx.db.get(args.workerId);
    const today = now.split("T")[0];

    if (walletRow) {
      const available = walletRow.earned + walletRow.advances - walletRow.spent - walletRow.withdrawn;
      await ctx.db.insert("ledgerEntries", {
        workerId: args.workerId,
        agencyId,
        entryType: "adjustment",
        amount: args.amount,
        balanceAfter: available + args.amount,
        currency: config?.currency ?? acc.currency,
        description: `iGaming withdrawal to main wallet from @${acc.username}`,
        date: today,
        createdBy: u.userId,
      });
    }

    await ctx.db.insert("igamingTransactions", {
      workerId: args.workerId,
      agencyId,
      type: "withdrawal",
      amount: -args.amount,
      currency: acc.currency,
      balanceAfter: newBalance,
      description: `Withdrawal to main wallet for ${worker ? `${worker.firstName} ${worker.lastName}` : "worker"}`,
      createdAt: now,
    });
  },
});

// ── Simulated game spin (demo) ────────────────────────────────────────────────

export const placeBet = mutation({
  args: {
    workerId: v.id("workers"),
    gameId: v.string(),
    gameName: v.string(),
    betAmount: v.number(),
  },
  handler: async (ctx, args): Promise<{ won: boolean; winAmount: number; balanceAfter: number }> => {
    const u = await requireUser(ctx);
    const agencyId = u.agencyId;
    if (!agencyId) throw new ConvexError({ code: "BAD_REQUEST", message: "No agency selected" });

    const acc = await ctx.db
      .query("igamingAccounts")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .first();
    if (!acc) throw new ConvexError({ code: "NOT_FOUND", message: "No iGaming account" });
    if (acc.status !== "active") throw new ConvexError({ code: "FORBIDDEN", message: "Account not active" });
    if (acc.balance < args.betAmount) throw new ConvexError({ code: "BAD_REQUEST", message: "Insufficient iGaming balance" });

    const now = new Date().toISOString();

    // Deduct bet
    let newBalance = acc.balance - args.betAmount;
    await ctx.db.patch(acc._id, {
      balance: newBalance,
      totalWagered: acc.totalWagered + args.betAmount,
    });

    await ctx.db.insert("igamingTransactions", {
      workerId: args.workerId,
      agencyId,
      type: "bet",
      amount: -args.betAmount,
      currency: acc.currency,
      balanceAfter: newBalance,
      gameId: args.gameId,
      gameName: args.gameName,
      description: `Bet on ${args.gameName}`,
      createdAt: now,
    });

    // Simulate outcome (RTP ~94%)
    const roll = Math.random();
    let won = false;
    let winAmount = 0;

    if (roll < 0.45) {
      // Win: 2x–5x multiplier
      const multiplier = 2 + Math.floor(Math.random() * 4);
      winAmount = args.betAmount * multiplier;
      won = true;
    } else if (roll < 0.50) {
      // Push (return bet)
      winAmount = args.betAmount;
      won = true;
    }

    if (won && winAmount > 0) {
      newBalance = newBalance + winAmount;
      await ctx.db.patch(acc._id, {
        balance: newBalance,
        totalWon: acc.totalWon + winAmount,
      });
      const winNow = new Date().toISOString();
      await ctx.db.insert("igamingTransactions", {
        workerId: args.workerId,
        agencyId,
        type: "win",
        amount: winAmount,
        currency: acc.currency,
        balanceAfter: newBalance,
        gameId: args.gameId,
        gameName: args.gameName,
        description: `Win on ${args.gameName} (×${winAmount / args.betAmount})`,
        createdAt: winNow,
      });
    }

    return { won, winAmount, balanceAfter: newBalance };
  },
});

// ── Stats ─────────────────────────────────────────────────────────────────────

export const getAgencyStats = query({
  args: { agencyId: v.optional(v.id("agencies")) },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const agencyId = u.role === "superadmin" ? (args.agencyId ?? null) : u.agencyId;
    if (!agencyId) return null;

    const accounts = await ctx.db
      .query("igamingAccounts")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();

    const totalDeposited = accounts.reduce((s, a) => s + a.totalDeposited, 0);
    const totalWithdrawn = accounts.reduce((s, a) => s + a.totalWithdrawn, 0);
    const totalWon = accounts.reduce((s, a) => s + a.totalWon, 0);
    const totalWagered = accounts.reduce((s, a) => s + a.totalWagered, 0);
    const activeAccounts = accounts.filter((a) => a.status === "active").length;

    return {
      totalAccounts: accounts.length,
      activeAccounts,
      totalDeposited,
      totalWithdrawn,
      totalWon,
      totalWagered,
      ggr: totalWagered - totalWon, // Gross Gaming Revenue
    };
  },
});
