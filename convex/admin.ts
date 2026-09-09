/**
 * Admin-level queries for cross-module overview:
 * approval queue (pending counts across advances, withdrawals, remittances)
 * and audit log (full ledger across an agency).
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import { requireUser } from "./lib/auth.ts";

// ── Approval Queue ────────────────────────────────────────────────────────────

/** Returns pending counts per category for the approval queue banner */
export const getPendingCounts = query({
  args: { agencyId: v.optional(v.id("agencies")) },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const effectiveAgency: Id<"agencies"> | null =
      u.role === "superadmin"
        ? (args.agencyId ?? null)
        : u.agencyId ?? null;

    const getCount = async (
      table: "advances" | "withdrawals" | "remittances",
    ) => {
      if (effectiveAgency) {
        const rows = await ctx.db
          .query(table)
          .withIndex("by_agency_status", (q) =>
            q.eq("agencyId", effectiveAgency).eq("status", "pending"),
          )
          .take(500);
        return rows.length;
      }
      const rows = await ctx.db.query(table).take(1000);
      return rows.filter((r) => r.status === "pending").length;
    };

    const [advances, withdrawals, remittances] = await Promise.all([
      getCount("advances"),
      getCount("withdrawals"),
      getCount("remittances"),
    ]);

    return { advances, withdrawals, remittances, total: advances + withdrawals + remittances };
  },
});

// ── Audit Log ─────────────────────────────────────────────────────────────────

/** Full ledger across the agency (or all agencies for superadmin) */
export const getAuditLog = query({
  args: {
    agencyId: v.optional(v.id("agencies")),
    entryType: v.optional(v.union(
      v.literal("wage_credit"),
      v.literal("advance_credit"),
      v.literal("advance_repayment"),
      v.literal("withdrawal"),
      v.literal("marketplace_debit"),
      v.literal("adjustment"),
      v.literal("remittance"),
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"ledgerEntries">;
    _creationTime: number;
    workerId: Id<"workers">;
    agencyId: Id<"agencies">;
    entryType: string;
    amount: number;
    balanceAfter: number;
    currency: string;
    description: string;
    referenceId?: string;
    date: string;
    createdBy: Id<"users">;
    workerName: string;
    workerEmployeeId: string;
    agencyName: string;
    createdByName: string;
  }>> => {
    const u = await requireUser(ctx);
    if (u.role !== "superadmin" && u.role !== "agency_admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only admins can access the audit log" });
    }

    const effectiveAgency: Id<"agencies"> | null =
      u.role === "superadmin"
        ? (args.agencyId ?? null)
        : u.agencyId ?? null;

    const pageSize = Math.min(args.limit ?? 200, 500);

    let entries;
    if (effectiveAgency) {
      entries = await ctx.db
        .query("ledgerEntries")
        .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency))
        .order("desc")
        .take(pageSize);
    } else {
      entries = await ctx.db.query("ledgerEntries").order("desc").take(pageSize);
    }

    if (args.entryType) {
      entries = entries.filter((e) => e.entryType === args.entryType);
    }

    // Cache workers/agencies/users to avoid N+1
    const workerCache = new Map<string, { name: string; employeeId: string }>();
    const agencyCache = new Map<string, string>();
    const userCache   = new Map<string, string>();

    return await Promise.all(
      entries.map(async (e) => {
        // Worker
        if (!workerCache.has(e.workerId)) {
          const w = await ctx.db.get(e.workerId);
          workerCache.set(e.workerId, {
            name: w ? `${w.firstName} ${w.lastName}` : "Unknown",
            employeeId: w?.employeeId ?? "—",
          });
        }
        // Agency
        if (!agencyCache.has(e.agencyId)) {
          const a = await ctx.db.get(e.agencyId);
          agencyCache.set(e.agencyId, a?.name ?? "Unknown Agency");
        }
        // CreatedBy user
        if (!userCache.has(e.createdBy)) {
          const cu = await ctx.db.get(e.createdBy);
          userCache.set(e.createdBy, cu?.name ?? cu?.email ?? "System");
        }

        const workerInfo = workerCache.get(e.workerId)!;
        return {
          ...e,
          workerName: workerInfo.name,
          workerEmployeeId: workerInfo.employeeId,
          agencyName: agencyCache.get(e.agencyId) ?? "—",
          createdByName: userCache.get(e.createdBy) ?? "—",
        };
      }),
    );
  },
});

/** Platform-wide stats for admin dashboard */
export const getPlatformStats = query({
  args: { agencyId: v.optional(v.id("agencies")) },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    if (u.role !== "superadmin" && u.role !== "agency_admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admins only" });
    }

    const effectiveAgency: Id<"agencies"> | null =
      u.role === "superadmin"
        ? (args.agencyId ?? null)
        : u.agencyId ?? null;

    const countTable = async (table: "workers" | "advances" | "withdrawals" | "remittances" | "marketplaceOrders" | "wallets") => {
      if (effectiveAgency) {
        const rows = await ctx.db
          .query(table)
          .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency))
          .take(2000);
        return rows.length;
      }
      return (await ctx.db.query(table).take(2000)).length;
    };

    const [workers, advances, withdrawals, remittances, orders] = await Promise.all([
      countTable("workers"),
      countTable("advances"),
      countTable("withdrawals"),
      countTable("remittances"),
      countTable("marketplaceOrders"),
    ]);

    // Total wallet earned across agency
    let totalEarned = 0;
    if (effectiveAgency) {
      const wallets = await ctx.db
        .query("wallets")
        .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency))
        .take(2000);
      totalEarned = wallets.reduce((s, w) => s + w.earned, 0);
    }

    return { workers, advances, withdrawals, remittances, orders, totalEarned };
  },
});
