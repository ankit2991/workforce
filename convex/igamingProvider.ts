/**
 * iGaming Provider Integration — Seamless Wallet backend
 *
 * This file handles:
 * 1. Session token creation (portal requests a token → iFrame is launched with it)
 * 2. Internal mutations called by the HTTP Action for each provider callback:
 *    - balance: return the worker's current iGaming balance
 *    - debit:   deduct a bet amount from the worker's iGaming wallet
 *    - credit:  add a win/refund to the worker's iGaming wallet
 *    - rollback: reverse a previous debit
 *
 * HTTP endpoints are in convex/http.ts and call these internal functions.
 *
 * ── TO WIRE UP A REAL PROVIDER ────────────────────────────────────────────────
 * 1. In the Admin panel, go to iGaming → Provider Config and save:
 *    - Provider name, Operator ID, API key, Launch URL template, Callback secret
 * 2. Give the provider your callback base URL:
 *    https://enchanted-oriole-185.convex.site/igaming
 *    They will POST to /igaming/balance, /igaming/debit, /igaming/credit, /igaming/rollback
 * 3. Replace the placeholder HMAC verification in verifyProviderSignature() below
 *    with whatever signature scheme your provider uses (header name + algorithm).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import type { MutationCtx, QueryCtx } from "./_generated/server.d.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a cryptographically random hex token */
function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Session is valid for 4 hours */
const SESSION_TTL_MS = 4 * 60 * 60 * 1000;

// ── Queries ───────────────────────────────────────────────────────────────────

/** Admin: get provider config for an agency */
export const getProviderConfig = query({
  args: { agencyId: v.id("agencies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("igamingProviderConfig")
      .withIndex("by_agency", (q) => q.eq("agencyId", args.agencyId))
      .first();
  },
});

/** Portal: look up session by token (used by HTTP action) */
export const getSessionByToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("igamingGameSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
  },
});

/** Portal: get iGaming account for a worker */
export const getIgamingAccount = internalQuery({
  args: { workerId: v.id("workers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("igamingAccounts")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .first();
  },
});

/** Check idempotency — has this provider transactionId been processed? */
export const findProviderTransaction = internalQuery({
  args: { transactionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("igamingProviderTransactions")
      .withIndex("by_transaction_id", (q) => q.eq("transactionId", args.transactionId))
      .first();
  },
});

// ── Session creation (called from portal) ─────────────────────────────────────

export const createGameSession = mutation({
  args: {
    gameId: v.string(),
    gameName: v.string(),
  },
  handler: async (ctx, args): Promise<{ token: string; launchUrl: string }> => {
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
    if (!roleRow?.workerId || !roleRow?.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not linked to a worker record" });
    }

    const workerId = roleRow.workerId as Id<"workers">;
    const agencyId = roleRow.agencyId as Id<"agencies">;

    // Check iGaming account exists and is active
    const acc = await ctx.db
      .query("igamingAccounts")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .first();
    if (!acc) throw new ConvexError({ code: "NOT_FOUND", message: "No iGaming account. Please top up first." });
    if (acc.status !== "active") throw new ConvexError({ code: "FORBIDDEN", message: "Your iGaming account is suspended." });

    // Get provider config
    const config = await ctx.db
      .query("igamingProviderConfig")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .first();

    const token = generateToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

    await ctx.db.insert("igamingGameSessions", {
      workerId,
      agencyId,
      token,
      gameId: args.gameId,
      gameName: args.gameName,
      currency: acc.currency,
      expiresAt,
      launchedAt: now.toISOString(),
      status: "active",
    });

    // Build launch URL from template, or return a placeholder if no config yet
    let launchUrl: string;
    if (config?.enabled && config.launchUrlTemplate) {
      launchUrl = config.launchUrlTemplate
        .replace("{TOKEN}", token)
        .replace("{GAME_ID}", encodeURIComponent(args.gameId))
        .replace("{CURRENCY}", acc.currency)
        .replace("{OPERATOR_ID}", config.operatorId)
        .replace("{SANDBOX}", config.sandboxMode ? "1" : "0");
    } else {
      // Sandbox placeholder — shows a demo page until provider config is saved
      launchUrl = `https://enchanted-oriole-185.convex.site/igaming/demo?token=${token}&game=${encodeURIComponent(args.gameId)}`;
    }

    return { token, launchUrl };
  },
});

// ── End session ───────────────────────────────────────────────────────────────

export const endGameSession = mutation({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const session = await ctx.db
      .query("igamingGameSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session) return;
    await ctx.db.patch(session._id, { status: "ended", endedAt: new Date().toISOString() });
  },
});

// ── Internal mutations called by HTTP Action ──────────────────────────────────

/** BALANCE — provider asks: "how much does this player have?" */
export const handleBalance = internalMutation({
  args: {
    token: v.string(),
    rawPayload: v.string(),
  },
  handler: async (ctx, args): Promise<{ balance: number; currency: string }> => {
    const session = await ctx.db
      .query("igamingGameSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session) throw new ConvexError({ code: "NOT_FOUND", message: "Session not found" });

    // Check session expiry
    if (new Date() > new Date(session.expiresAt)) {
      await ctx.db.patch(session._id, { status: "expired" });
      throw new ConvexError({ code: "FORBIDDEN", message: "Session expired" });
    }

    const acc = await ctx.db
      .query("igamingAccounts")
      .withIndex("by_worker", (q) => q.eq("workerId", session.workerId))
      .first();
    if (!acc) throw new ConvexError({ code: "NOT_FOUND", message: "Account not found" });

    // Log the balance check
    await ctx.db.insert("igamingProviderTransactions", {
      sessionToken: args.token,
      workerId: session.workerId,
      agencyId: session.agencyId,
      type: "balance",
      transactionId: `bal_${Date.now()}_${args.token.slice(0, 8)}`,
      rawPayload: args.rawPayload,
      processedAt: new Date().toISOString(),
      status: "ok",
    });

    return { balance: acc.balance, currency: acc.currency };
  },
});

/** DEBIT — provider deducts a bet from the player's balance */
export const handleDebit = internalMutation({
  args: {
    token: v.string(),
    transactionId: v.string(),
    roundId: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    rawPayload: v.string(),
  },
  handler: async (ctx, args): Promise<{ balance: number; currency: string; transactionId: string }> => {
    // Idempotency check — provider may retry on timeout
    const existing = await ctx.db
      .query("igamingProviderTransactions")
      .withIndex("by_transaction_id", (q) => q.eq("transactionId", args.transactionId))
      .first();
    if (existing && existing.status === "ok") {
      // Already processed — return the stored balanceAfter
      return {
        balance: existing.balanceAfter ?? 0,
        currency: args.currency,
        transactionId: args.transactionId,
      };
    }

    const session = await ctx.db
      .query("igamingGameSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session) throw new ConvexError({ code: "NOT_FOUND", message: "Session not found" });

    const acc = await ctx.db
      .query("igamingAccounts")
      .withIndex("by_worker", (q) => q.eq("workerId", session.workerId))
      .first();
    if (!acc) throw new ConvexError({ code: "NOT_FOUND", message: "Account not found" });

    if (acc.balance < args.amount) {
      await ctx.db.insert("igamingProviderTransactions", {
        sessionToken: args.token,
        workerId: session.workerId,
        agencyId: session.agencyId,
        type: "debit",
        transactionId: args.transactionId,
        roundId: args.roundId,
        amount: args.amount,
        currency: args.currency,
        balanceBefore: acc.balance,
        rawPayload: args.rawPayload,
        processedAt: new Date().toISOString(),
        status: "error",
        errorMessage: "Insufficient balance",
      });
      throw new ConvexError({ code: "BAD_REQUEST", message: "Insufficient balance" });
    }

    const balanceBefore = acc.balance;
    const balanceAfter = Math.round((acc.balance - args.amount) * 100) / 100;
    await ctx.db.patch(acc._id, {
      balance: balanceAfter,
      totalWagered: acc.totalWagered + args.amount,
    });

    // Mirror to igamingTransactions for portal history
    await ctx.db.insert("igamingTransactions", {
      workerId: session.workerId,
      agencyId: session.agencyId,
      type: "bet",
      amount: -args.amount,
      currency: args.currency,
      balanceAfter,
      gameId: session.gameId,
      gameName: session.gameName,
      description: `Bet — round ${args.roundId ?? "unknown"}`,
      referenceId: args.transactionId,
      createdAt: new Date().toISOString(),
    });

    await ctx.db.insert("igamingProviderTransactions", {
      sessionToken: args.token,
      workerId: session.workerId,
      agencyId: session.agencyId,
      type: "debit",
      transactionId: args.transactionId,
      roundId: args.roundId,
      amount: args.amount,
      currency: args.currency,
      balanceBefore,
      balanceAfter,
      rawPayload: args.rawPayload,
      processedAt: new Date().toISOString(),
      status: "ok",
    });

    return { balance: balanceAfter, currency: args.currency, transactionId: args.transactionId };
  },
});

/** CREDIT — provider adds a win or refund to the player's balance */
export const handleCredit = internalMutation({
  args: {
    token: v.string(),
    transactionId: v.string(),
    roundId: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    type: v.union(v.literal("win"), v.literal("bonus"), v.literal("refund")),
    rawPayload: v.string(),
  },
  handler: async (ctx, args): Promise<{ balance: number; currency: string; transactionId: string }> => {
    // Idempotency check
    const existing = await ctx.db
      .query("igamingProviderTransactions")
      .withIndex("by_transaction_id", (q) => q.eq("transactionId", args.transactionId))
      .first();
    if (existing && existing.status === "ok") {
      return { balance: existing.balanceAfter ?? 0, currency: args.currency, transactionId: args.transactionId };
    }

    const session = await ctx.db
      .query("igamingGameSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session) throw new ConvexError({ code: "NOT_FOUND", message: "Session not found" });

    const acc = await ctx.db
      .query("igamingAccounts")
      .withIndex("by_worker", (q) => q.eq("workerId", session.workerId))
      .first();
    if (!acc) throw new ConvexError({ code: "NOT_FOUND", message: "Account not found" });

    const balanceBefore = acc.balance;
    const balanceAfter = Math.round((acc.balance + args.amount) * 100) / 100;
    const isWin = args.type === "win";
    await ctx.db.patch(acc._id, {
      balance: balanceAfter,
      totalWon: isWin ? acc.totalWon + args.amount : acc.totalWon,
    });

    // Mirror to igamingTransactions for portal history
    await ctx.db.insert("igamingTransactions", {
      workerId: session.workerId,
      agencyId: session.agencyId,
      type: isWin ? "win" : "bonus",
      amount: args.amount,
      currency: args.currency,
      balanceAfter,
      gameId: session.gameId,
      gameName: session.gameName,
      description: `${args.type === "win" ? "Win" : args.type === "bonus" ? "Bonus" : "Refund"} — round ${args.roundId ?? "unknown"}`,
      referenceId: args.transactionId,
      createdAt: new Date().toISOString(),
    });

    await ctx.db.insert("igamingProviderTransactions", {
      sessionToken: args.token,
      workerId: session.workerId,
      agencyId: session.agencyId,
      type: "credit",
      transactionId: args.transactionId,
      roundId: args.roundId,
      amount: args.amount,
      currency: args.currency,
      balanceBefore,
      balanceAfter,
      rawPayload: args.rawPayload,
      processedAt: new Date().toISOString(),
      status: "ok",
    });

    return { balance: balanceAfter, currency: args.currency, transactionId: args.transactionId };
  },
});

/** ROLLBACK — provider reverses a debit (e.g. game error, cancelled round) */
export const handleRollback = internalMutation({
  args: {
    token: v.string(),
    transactionId: v.string(),        // the NEW rollback transaction ID
    originalTransactionId: v.string(), // the debit transaction to reverse
    rawPayload: v.string(),
  },
  handler: async (ctx, args): Promise<{ balance: number; currency: string; transactionId: string }> => {
    // Idempotency check for the rollback itself
    const existing = await ctx.db
      .query("igamingProviderTransactions")
      .withIndex("by_transaction_id", (q) => q.eq("transactionId", args.transactionId))
      .first();
    if (existing && existing.status === "ok") {
      return { balance: existing.balanceAfter ?? 0, currency: "MYR", transactionId: args.transactionId };
    }

    // Find the original debit
    const original = await ctx.db
      .query("igamingProviderTransactions")
      .withIndex("by_transaction_id", (q) => q.eq("transactionId", args.originalTransactionId))
      .first();
    if (!original || original.type !== "debit" || original.status !== "ok") {
      // Nothing to rollback — return current balance
      const session = await ctx.db
        .query("igamingGameSessions")
        .withIndex("by_token", (q) => q.eq("token", args.token))
        .first();
      if (!session) throw new ConvexError({ code: "NOT_FOUND", message: "Session not found" });
      const acc = await ctx.db
        .query("igamingAccounts")
        .withIndex("by_worker", (q) => q.eq("workerId", session.workerId))
        .first();
      return { balance: acc?.balance ?? 0, currency: acc?.currency ?? "MYR", transactionId: args.transactionId };
    }

    const session = await ctx.db
      .query("igamingGameSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session) throw new ConvexError({ code: "NOT_FOUND", message: "Session not found" });

    const acc = await ctx.db
      .query("igamingAccounts")
      .withIndex("by_worker", (q) => q.eq("workerId", session.workerId))
      .first();
    if (!acc) throw new ConvexError({ code: "NOT_FOUND", message: "Account not found" });

    const refundAmount = original.amount ?? 0;
    const balanceBefore = acc.balance;
    const balanceAfter = Math.round((acc.balance + refundAmount) * 100) / 100;
    await ctx.db.patch(acc._id, {
      balance: balanceAfter,
      totalWagered: Math.max(0, acc.totalWagered - refundAmount),
    });

    await ctx.db.insert("igamingTransactions", {
      workerId: session.workerId,
      agencyId: session.agencyId,
      type: "bonus",
      amount: refundAmount,
      currency: acc.currency,
      balanceAfter,
      gameId: session.gameId,
      gameName: session.gameName,
      description: `Rollback — txn ${args.originalTransactionId.slice(0, 12)}`,
      referenceId: args.transactionId,
      createdAt: new Date().toISOString(),
    });

    await ctx.db.insert("igamingProviderTransactions", {
      sessionToken: args.token,
      workerId: session.workerId,
      agencyId: session.agencyId,
      type: "rollback",
      transactionId: args.transactionId,
      amount: refundAmount,
      currency: acc.currency,
      balanceBefore,
      balanceAfter,
      rawPayload: args.rawPayload,
      processedAt: new Date().toISOString(),
      status: "ok",
    });

    return { balance: balanceAfter, currency: acc.currency, transactionId: args.transactionId };
  },
});

// ── Admin: save provider config ───────────────────────────────────────────────

export const saveProviderConfig = mutation({
  args: {
    agencyId: v.id("agencies"),
    providerName: v.string(),
    operatorId: v.string(),
    apiKey: v.string(),
    launchUrlTemplate: v.string(),
    callbackSecret: v.string(),
    sandboxMode: v.boolean(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args): Promise<void> => {
    const existing = await ctx.db
      .query("igamingProviderConfig")
      .withIndex("by_agency", (q) => q.eq("agencyId", args.agencyId))
      .first();
    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
    } else {
      await ctx.db.insert("igamingProviderConfig", { ...args, createdAt: now, updatedAt: now });
    }
  },
});
