/**
 * Report queries — all scoped to the caller's agency.
 * Superadmins can pass an explicit agencyId; non-superadmins always use their own.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";
import { requireUser } from "./lib/auth.ts";

// ── 1. Payroll Summary Report ─────────────────────────────────────────────────

export const payrollSummary = query({
  args: {
    agencyId: v.optional(v.id("agencies")),
    periodStart: v.string(),   // YYYY-MM-DD
    periodEnd: v.string(),
  },
  handler: async (ctx, args): Promise<{
    rows: Array<{
      workerName: string;
      employeeId: string;
      daysWorked: number;
      hoursWorked: number;
      basePay: number;
      overtimePay: number;
      totalAllowances: number;
      totalDeductions: number;
      grossPay: number;
      netPay: number;
      currency: string;
      status: string;
      periodStart: string;
      periodEnd: string;
    }>;
    totals: { grossPay: number; netPay: number; basePay: number; currency: string };
  }> => {
    const u = await requireUser(ctx);
    const effectiveAgency: Id<"agencies"> | null =
      u.role === "superadmin" ? (args.agencyId ?? null) : u.agencyId ?? null;

    // ── Formal wage records ──
    let records;
    if (effectiveAgency) {
      records = await ctx.db
        .query("wageRecords")
        .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency))
        .collect();
    } else {
      records = await ctx.db.query("wageRecords").collect();
    }

    records = records.filter(
      (r) => r.periodEnd >= args.periodStart && r.periodStart <= args.periodEnd,
    );

    const wageRows = await Promise.all(
      records.map(async (r) => {
        const worker = await ctx.db.get(r.workerId);
        return {
          workerName: worker ? `${worker.firstName} ${worker.lastName}` : "Unknown",
          employeeId: worker?.employeeId ?? "—",
          daysWorked: r.daysWorked,
          hoursWorked: r.hoursWorked,
          basePay: r.basePay,
          overtimePay: r.overtimePay,
          totalAllowances: r.totalAllowances,
          totalDeductions: r.totalDeductions,
          grossPay: r.grossPay,
          netPay: r.netPay,
          currency: r.currency,
          status: r.status,
          periodStart: r.periodStart,
          periodEnd: r.periodEnd,
        };
      }),
    );

    // ── Wallet funding entries (admin wage payments) ──
    let ledgerEntries;
    if (effectiveAgency) {
      ledgerEntries = await ctx.db
        .query("ledgerEntries")
        .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency))
        .order("desc")
        .take(2000);
    } else {
      ledgerEntries = await ctx.db.query("ledgerEntries").order("desc").take(2000);
    }

    const fundEntries = ledgerEntries.filter(
      (e) =>
        (e.entryType === "wallet_fund" || e.entryType === "wage_credit") &&
        e.date >= args.periodStart &&
        e.date <= args.periodEnd,
    );

    const workerCache = new Map<string, { name: string; employeeId: string }>();
    const fundRows = await Promise.all(
      fundEntries.map(async (e) => {
        if (!workerCache.has(e.workerId)) {
          const w = await ctx.db.get(e.workerId);
          workerCache.set(e.workerId, {
            name: w ? `${w.firstName} ${w.lastName}` : "Unknown",
            employeeId: w?.employeeId ?? "—",
          });
        }
        const worker = workerCache.get(e.workerId)!;
        return {
          workerName: worker.name,
          employeeId: worker.employeeId,
          daysWorked: 0,
          hoursWorked: 0,
          basePay: e.amount,
          overtimePay: 0,
          totalAllowances: 0,
          totalDeductions: 0,
          grossPay: e.amount,
          netPay: e.amount,
          currency: e.currency,
          status: e.entryType === "wallet_fund" ? "funded" : "paid",
          periodStart: e.date,
          periodEnd: e.date,
        };
      }),
    );

    const rows = [...wageRows, ...fundRows];
    const currency = rows[0]?.currency ?? "MYR";
    const totals = rows.reduce(
      (acc, r) => ({
        grossPay: acc.grossPay + r.grossPay,
        netPay: acc.netPay + r.netPay,
        basePay: acc.basePay + r.basePay,
        currency,
      }),
      { grossPay: 0, netPay: 0, basePay: 0, currency },
    );

    return { rows, totals };
  },
});

// ── 2. Attendance Report ──────────────────────────────────────────────────────

export const attendanceSummary = query({
  args: {
    agencyId: v.optional(v.id("agencies")),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, args): Promise<Array<{
    workerName: string;
    employeeId: string;
    present: number;
    absent: number;
    halfDay: number;
    leave: number;
    restDay: number;
    publicHoliday: number;
    totalDays: number;
    hoursWorked: number;
    overtimeHours: number;
    attendanceRate: number;
  }>> => {
    const u = await requireUser(ctx);
    const effectiveAgency: Id<"agencies"> | null =
      u.role === "superadmin" ? (args.agencyId ?? null) : u.agencyId ?? null;

    let records;
    if (effectiveAgency) {
      records = await ctx.db
        .query("attendance")
        .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency))
        .collect();
    } else {
      records = await ctx.db.query("attendance").collect();
    }

    records = records.filter((r) => r.date >= args.dateFrom && r.date <= args.dateTo);

    // Group by worker
    const byWorker = new Map<string, typeof records>();
    for (const r of records) {
      const key = r.workerId;
      if (!byWorker.has(key)) byWorker.set(key, []);
      byWorker.get(key)!.push(r);
    }

    const rows = await Promise.all(
      Array.from(byWorker.entries()).map(async ([workerId, recs]) => {
        const worker = await ctx.db.get(workerId as Id<"workers">);
        const counts = { present: 0, absent: 0, half_day: 0, leave: 0, rest_day: 0, public_holiday: 0 };
        let hoursWorked = 0, overtimeHours = 0;
        for (const r of recs) {
          counts[r.status] = (counts[r.status] ?? 0) + 1;
          hoursWorked += r.hoursWorked ?? 0;
          overtimeHours += r.overtimeHours ?? 0;
        }
        const workDays = counts.present + counts.half_day * 0.5;
        const totalDays = recs.length;
        return {
          workerName: worker ? `${worker.firstName} ${worker.lastName}` : "Unknown",
          employeeId: worker?.employeeId ?? "—",
          present: counts.present,
          absent: counts.absent,
          halfDay: counts.half_day,
          leave: counts.leave,
          restDay: counts.rest_day,
          publicHoliday: counts.public_holiday,
          totalDays,
          hoursWorked,
          overtimeHours,
          attendanceRate: totalDays > 0 ? Math.round((workDays / totalDays) * 100) : 0,
        };
      }),
    );

    return rows.sort((a, b) => b.attendanceRate - a.attendanceRate);
  },
});

// ── 3. Wallet / Transaction Ledger Report ────────────────────────────────────

export const walletLedgerReport = query({
  args: {
    agencyId: v.optional(v.id("agencies")),
    dateFrom: v.string(),
    dateTo: v.string(),
    entryType: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Array<{
    date: string;
    workerName: string;
    employeeId: string;
    entryType: string;
    amount: number;
    balanceAfter: number;
    currency: string;
    description: string;
  }>> => {
    const u = await requireUser(ctx);
    const effectiveAgency: Id<"agencies"> | null =
      u.role === "superadmin" ? (args.agencyId ?? null) : u.agencyId ?? null;

    let entries;
    if (effectiveAgency) {
      entries = await ctx.db
        .query("ledgerEntries")
        .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency))
        .order("desc")
        .take(2000);
    } else {
      entries = await ctx.db.query("ledgerEntries").order("desc").take(2000);
    }

    entries = entries.filter((e) => e.date >= args.dateFrom && e.date <= args.dateTo);
    if (args.entryType && args.entryType !== "all") {
      entries = entries.filter((e) => e.entryType === args.entryType);
    }

    const workerCache = new Map<string, { name: string; employeeId: string }>();
    return await Promise.all(
      entries.map(async (e) => {
        if (!workerCache.has(e.workerId)) {
          const w = await ctx.db.get(e.workerId);
          workerCache.set(e.workerId, {
            name: w ? `${w.firstName} ${w.lastName}` : "Unknown",
            employeeId: w?.employeeId ?? "—",
          });
        }
        const worker = workerCache.get(e.workerId)!;
        return {
          date: e.date,
          workerName: worker.name,
          employeeId: worker.employeeId,
          entryType: e.entryType,
          amount: e.amount,
          balanceAfter: e.balanceAfter,
          currency: e.currency,
          description: e.description,
        };
      }),
    );
  },
});

// ── 4. Advances Report ────────────────────────────────────────────────────────

export const advancesReport = query({
  args: {
    agencyId: v.optional(v.id("agencies")),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, args): Promise<{
    rows: Array<{
      requestedDate: string;
      workerName: string;
      employeeId: string;
      amount: number;
      repaidAmount: number;
      outstanding: number;
      currency: string;
      status: string;
      reason: string;
    }>;
    totals: { disbursed: number; repaid: number; outstanding: number; currency: string };
  }> => {
    const u = await requireUser(ctx);
    const effectiveAgency: Id<"agencies"> | null =
      u.role === "superadmin" ? (args.agencyId ?? null) : u.agencyId ?? null;

    let advances;
    if (effectiveAgency) {
      advances = await ctx.db
        .query("advances")
        .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency))
        .order("desc")
        .take(1000);
    } else {
      advances = await ctx.db.query("advances").order("desc").take(1000);
    }

    advances = advances.filter(
      (a) => a.requestedDate >= args.dateFrom && a.requestedDate <= args.dateTo,
    );

    const workerCache = new Map<string, { name: string; employeeId: string }>();
    const rows = await Promise.all(
      advances.map(async (a) => {
        if (!workerCache.has(a.workerId)) {
          const w = await ctx.db.get(a.workerId);
          workerCache.set(a.workerId, {
            name: w ? `${w.firstName} ${w.lastName}` : "Unknown",
            employeeId: w?.employeeId ?? "—",
          });
        }
        const worker = workerCache.get(a.workerId)!;
        return {
          requestedDate: a.requestedDate,
          workerName: worker.name,
          employeeId: worker.employeeId,
          amount: a.amount,
          repaidAmount: a.repaidAmount,
          outstanding: Math.max(0, a.amount - a.repaidAmount),
          currency: a.currency,
          status: a.status,
          reason: a.reason ?? "—",
        };
      }),
    );

    const currency = rows[0]?.currency ?? "MYR";
    const disbursedRows = rows.filter((r) => r.status === "disbursed" || r.status === "repaid");
    const totals = disbursedRows.reduce(
      (acc, r) => ({
        disbursed: acc.disbursed + r.amount,
        repaid: acc.repaid + r.repaidAmount,
        outstanding: acc.outstanding + r.outstanding,
        currency,
      }),
      { disbursed: 0, repaid: 0, outstanding: 0, currency },
    );

    return { rows, totals };
  },
});

// ── 5. Withdrawals & Remittances Report ───────────────────────────────────────

export const outflowReport = query({
  args: {
    agencyId: v.optional(v.id("agencies")),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, args): Promise<{
    withdrawals: Array<{
      date: string;
      workerName: string;
      employeeId: string;
      amount: number;
      currency: string;
      status: string;
      bankName: string;
      transactionRef: string;
    }>;
    remittances: Array<{
      date: string;
      workerName: string;
      employeeId: string;
      sendAmount: number;
      sendCurrency: string;
      receiveAmount: number;
      receiveCurrency: string;
      transferFee: number;
      totalDebit: number;
      recipientName: string;
      recipientCountry: string;
      transferMethod: string;
      status: string;
    }>;
    totals: {
      totalWithdrawals: number;
      totalRemittances: number;
      currency: string;
    };
  }> => {
    const u = await requireUser(ctx);
    const effectiveAgency: Id<"agencies"> | null =
      u.role === "superadmin" ? (args.agencyId ?? null) : u.agencyId ?? null;

    const [allWithdrawals, allRemittances] = await Promise.all([
      effectiveAgency
        ? ctx.db.query("withdrawals").withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency)).order("desc").take(500)
        : ctx.db.query("withdrawals").order("desc").take(500),
      effectiveAgency
        ? ctx.db.query("remittances").withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency)).order("desc").take(500)
        : ctx.db.query("remittances").order("desc").take(500),
    ]);

    const filteredW = allWithdrawals.filter((w) => w.requestedDate >= args.dateFrom && w.requestedDate <= args.dateTo);
    const filteredR = allRemittances.filter((r) => r.requestedDate >= args.dateFrom && r.requestedDate <= args.dateTo);

    const workerCache = new Map<string, { name: string; employeeId: string }>();
    const getWorker = async (id: Id<"workers">) => {
      if (!workerCache.has(id)) {
        const w = await ctx.db.get(id);
        workerCache.set(id, { name: w ? `${w.firstName} ${w.lastName}` : "Unknown", employeeId: w?.employeeId ?? "—" });
      }
      return workerCache.get(id)!;
    };

    const withdrawals = await Promise.all(
      filteredW.map(async (w) => {
        const worker = await getWorker(w.workerId);
        return {
          date: w.requestedDate,
          workerName: worker.name,
          employeeId: worker.employeeId,
          amount: w.amount,
          currency: w.currency,
          status: w.status,
          bankName: w.bankName,
          transactionRef: w.transactionRef ?? "—",
        };
      }),
    );

    const remittances = await Promise.all(
      filteredR.map(async (r) => {
        const worker = await getWorker(r.workerId);
        return {
          date: r.requestedDate,
          workerName: worker.name,
          employeeId: worker.employeeId,
          sendAmount: r.sendAmount,
          sendCurrency: r.sendCurrency,
          receiveAmount: r.receiveAmount,
          receiveCurrency: r.receiveCurrency,
          transferFee: r.transferFee,
          totalDebit: r.totalDebit,
          recipientName: r.recipientName,
          recipientCountry: r.recipientCountry,
          transferMethod: r.transferMethod,
          status: r.status,
        };
      }),
    );

    const currency = withdrawals[0]?.currency ?? remittances[0]?.sendCurrency ?? "MYR";
    const totalWithdrawals = withdrawals
      .filter((w) => w.status === "processed")
      .reduce((s, w) => s + w.amount, 0);
    const totalRemittances = remittances
      .filter((r) => r.status === "completed" || r.status === "processing")
      .reduce((s, r) => s + r.totalDebit, 0);

    return { withdrawals, remittances, totals: { totalWithdrawals, totalRemittances, currency } };
  },
});

// ── 6. Worker Summary (headcount / status breakdown) ─────────────────────────

export const workerSummary = query({
  args: { agencyId: v.optional(v.id("agencies")) },
  handler: async (ctx, args): Promise<{
    byStatus: Record<string, number>;
    byEmploymentType: Record<string, number>;
    byNationality: Record<string, number>;
    total: number;
  }> => {
    const u = await requireUser(ctx);
    const effectiveAgency: Id<"agencies"> | null =
      u.role === "superadmin" ? (args.agencyId ?? null) : u.agencyId ?? null;

    let workers;
    if (effectiveAgency) {
      workers = await ctx.db
        .query("workers")
        .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency))
        .collect();
    } else {
      workers = await ctx.db.query("workers").collect();
    }

    const byStatus: Record<string, number> = {};
    const byEmploymentType: Record<string, number> = {};
    const byNationality: Record<string, number> = {};

    for (const w of workers) {
      byStatus[w.status] = (byStatus[w.status] ?? 0) + 1;
      byEmploymentType[w.employmentType] = (byEmploymentType[w.employmentType] ?? 0) + 1;
      const nat = w.nationality ?? "Unknown";
      byNationality[nat] = (byNationality[nat] ?? 0) + 1;
    }

    return { byStatus, byEmploymentType, byNationality, total: workers.length };
  },
});

// ── 7. Profit Summary Report ────────────────────────────────────────────────

export const profitSummary = query({
  args: {
    agencyId: v.optional(v.id("agencies")),
    periodStart: v.string(),
    periodEnd: v.string(),
  },
  handler: async (ctx, args): Promise<{
    advanceFees: { total: number; count: number; currency: string };
    igaming: { totalDeposited: number; totalWithdrawn: number; netProfit: number; txCount: number; currency: string };
    marketplace: { totalRevenue: number; orderCount: number; currency: string };
    grandTotal: number;
    currency: string;
    breakdown: Array<{ date: string; advanceFees: number; igamingProfit: number; marketplaceRevenue: number }>;
  }> => {
    const u = await requireUser(ctx);
    const effectiveAgency: Id<"agencies"> | null =
      u.role === "superadmin" ? (args.agencyId ?? null) : u.agencyId ?? null;

    const currency = "MYR"; // default currency

    // ── Advance processing fees ──
    let advances;
    if (effectiveAgency) {
      advances = await ctx.db
        .query("advances")
        .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency))
        .collect();
    } else {
      advances = await ctx.db.query("advances").collect();
    }
    const filteredAdvances = advances.filter(
      (a) => a.requestedDate >= args.periodStart && a.requestedDate <= args.periodEnd && a.status !== "rejected",
    );
    const advanceFeesTotal = filteredAdvances.reduce((s, a) => s + (a.processingFee ?? 0), 0);

    // ── iGaming profit (deposits minus withdrawals = house revenue) ──
    let igamingTx;
    if (effectiveAgency) {
      igamingTx = await ctx.db
        .query("igamingTransactions")
        .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency))
        .collect();
    } else {
      igamingTx = await ctx.db.query("igamingTransactions").collect();
    }
    const filteredIgaming = igamingTx.filter(
      (t) => t.createdAt >= args.periodStart && t.createdAt <= args.periodEnd,
    );
    const totalDeposited = filteredIgaming
      .filter((t) => t.type === "deposit")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalWithdrawn = filteredIgaming
      .filter((t) => t.type === "withdrawal")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const igamingNetProfit = totalDeposited - totalWithdrawn;

    // ── Marketplace revenue ──
    let orders;
    if (effectiveAgency) {
      orders = await ctx.db
        .query("marketplaceOrders")
        .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency))
        .collect();
    } else {
      orders = await ctx.db.query("marketplaceOrders").collect();
    }
    const filteredOrders = orders.filter(
      (o) => o.orderedDate >= args.periodStart && o.orderedDate <= args.periodEnd && o.status !== "cancelled",
    );
    const marketplaceRevenue = filteredOrders.reduce((s, o) => s + o.totalAmount, 0);

    // ── Daily breakdown ──
    const dailyMap = new Map<string, { advanceFees: number; igamingProfit: number; marketplaceRevenue: number }>();
    const ensureDay = (d: string) => {
      if (!dailyMap.has(d)) dailyMap.set(d, { advanceFees: 0, igamingProfit: 0, marketplaceRevenue: 0 });
      return dailyMap.get(d)!;
    };

    for (const a of filteredAdvances) {
      const day = ensureDay(a.requestedDate);
      day.advanceFees += a.processingFee ?? 0;
    }
    for (const t of filteredIgaming) {
      const day = ensureDay(t.createdAt.slice(0, 10));
      if (t.type === "deposit") day.igamingProfit += Math.abs(t.amount);
      if (t.type === "withdrawal") day.igamingProfit -= Math.abs(t.amount);
    }
    for (const o of filteredOrders) {
      const day = ensureDay(o.orderedDate);
      day.marketplaceRevenue += o.totalAmount;
    }

    const breakdown = Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      advanceFees: { total: advanceFeesTotal, count: filteredAdvances.length, currency },
      igaming: { totalDeposited, totalWithdrawn, netProfit: igamingNetProfit, txCount: filteredIgaming.length, currency },
      marketplace: { totalRevenue: marketplaceRevenue, orderCount: filteredOrders.length, currency },
      grandTotal: advanceFeesTotal + igamingNetProfit + marketplaceRevenue,
      currency,
      breakdown,
    };
  },
});
