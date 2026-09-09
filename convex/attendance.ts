import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

const recordTypeValidator = v.union(
  v.literal("days"),
  v.literal("hours"),
  v.literal("piece_work"),
);

const statusValidator = v.union(
  v.literal("present"),
  v.literal("absent"),
  v.literal("half_day"),
  v.literal("rest_day"),
  v.literal("public_holiday"),
  v.literal("leave"),
);

export const listByWorker = query({
  args: {
    workerId: v.id("workers"),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let records = await ctx.db
      .query("attendance")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .order("desc")
      .take(500);

    if (args.fromDate) {
      records = records.filter((r) => r.date >= args.fromDate!);
    }
    if (args.toDate) {
      records = records.filter((r) => r.date <= args.toDate!);
    }
    return records;
  },
});

export const listByAgency = query({
  args: {
    agencyId: v.id("agencies"),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
    branchId: v.optional(v.id("branches")),
    siteId: v.optional(v.id("sites")),
  },
  handler: async (ctx, args) => {
    let records = await ctx.db
      .query("attendance")
      .withIndex("by_agency", (q) => q.eq("agencyId", args.agencyId))
      .order("desc")
      .take(1000);

    if (args.fromDate) records = records.filter((r) => r.date >= args.fromDate!);
    if (args.toDate) records = records.filter((r) => r.date <= args.toDate!);
    if (args.branchId) records = records.filter((r) => r.branchId === args.branchId);
    if (args.siteId) records = records.filter((r) => r.siteId === args.siteId);

    return records;
  },
});

export const listByDate = query({
  args: {
    date: v.string(),
    agencyId: v.optional(v.id("agencies")),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("attendance")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();

    if (args.agencyId) {
      return records.filter((r) => r.agencyId === args.agencyId);
    }
    return records;
  },
});

export const getByWorkerDate = query({
  args: {
    workerId: v.id("workers"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("attendance")
      .withIndex("by_worker_date", (q) =>
        q.eq("workerId", args.workerId).eq("date", args.date),
      )
      .first();
  },
});

export const summaryByWorker = query({
  args: {
    workerId: v.id("workers"),
    fromDate: v.string(),
    toDate: v.string(),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("attendance")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .collect();

    const filtered = records.filter(
      (r) => r.date >= args.fromDate && r.date <= args.toDate,
    );

    return {
      totalDays: filtered.filter((r) => r.status === "present" || r.status === "half_day").length,
      daysWorked: filtered.reduce((s, r) => s + (r.daysWorked ?? 0), 0),
      hoursWorked: filtered.reduce((s, r) => s + (r.hoursWorked ?? 0), 0),
      overtimeHours: filtered.reduce((s, r) => s + (r.overtimeHours ?? 0), 0),
      pieceCount: filtered.reduce((s, r) => s + (r.pieceCount ?? 0), 0),
      absent: filtered.filter((r) => r.status === "absent").length,
      leave: filtered.filter((r) => r.status === "leave").length,
    };
  },
});

export const create = mutation({
  args: {
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    branchId: v.optional(v.id("branches")),
    siteId: v.optional(v.id("sites")),
    date: v.string(),
    recordType: recordTypeValidator,
    daysWorked: v.optional(v.number()),
    hoursWorked: v.optional(v.number()),
    overtimeHours: v.optional(v.number()),
    pieceCount: v.optional(v.number()),
    pieceRate: v.optional(v.number()),
    status: statusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) {
      throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    }

    // Prevent duplicate records for same worker+date
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_worker_date", (q) =>
        q.eq("workerId", args.workerId).eq("date", args.date),
      )
      .first();
    if (existing) {
      throw new ConvexError({
        message: "Attendance record already exists for this worker on this date",
        code: "CONFLICT",
      });
    }

    return await ctx.db.insert("attendance", { ...args, createdBy: user._id });
  },
});

export const update = mutation({
  args: {
    id: v.id("attendance"),
    recordType: recordTypeValidator,
    daysWorked: v.optional(v.number()),
    hoursWorked: v.optional(v.number()),
    overtimeHours: v.optional(v.number()),
    pieceCount: v.optional(v.number()),
    pieceRate: v.optional(v.number()),
    status: statusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("attendance") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    await ctx.db.delete(args.id);
  },
});

export const bulkCreate = mutation({
  args: {
    records: v.array(
      v.object({
        workerId: v.id("workers"),
        agencyId: v.id("agencies"),
        branchId: v.optional(v.id("branches")),
        siteId: v.optional(v.id("sites")),
        date: v.string(),
        recordType: recordTypeValidator,
        daysWorked: v.optional(v.number()),
        hoursWorked: v.optional(v.number()),
        overtimeHours: v.optional(v.number()),
        pieceCount: v.optional(v.number()),
        pieceRate: v.optional(v.number()),
        status: statusValidator,
        notes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) {
      throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    }

    let created = 0;
    let skipped = 0;
    for (const record of args.records) {
      const existing = await ctx.db
        .query("attendance")
        .withIndex("by_worker_date", (q) =>
          q.eq("workerId", record.workerId as Id<"workers">).eq("date", record.date),
        )
        .first();
      if (existing) {
        skipped++;
        continue;
      }
      await ctx.db.insert("attendance", { ...record, createdBy: user._id });
      created++;
    }
    return { created, skipped };
  },
});

// ── QR Code Attendance ──────────────────────────────────────────────────────

/**
 * Generate a QR payload for a site. The payload rotates every 30 seconds
 * to prevent screenshot sharing. Format: JSON with siteId + epoch window.
 */
export const generateQrPayload = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args): Promise<{ payload: string; expiresAt: number; siteId: Id<"sites">; window: number }> => {
    const site = await ctx.db.get(args.siteId);
    if (!site) throw new ConvexError({ message: "Site not found", code: "NOT_FOUND" });

    // 30-second window: floor current time to nearest 30s
    const now = Date.now();
    const window = Math.floor(now / 30000);
    const expiresAt = (window + 1) * 30000;

    const payload = JSON.stringify({
      type: "wfp_attendance",
      siteId: args.siteId,
      siteName: site.name,
      siteCode: site.code,
      agencyId: site.agencyId,
      window,
    });

    // Return structured data so frontend can build a URL-based QR code
    return { payload, expiresAt, siteId: args.siteId, window };
  },
});

/**
 * Clock in — worker scans QR code, creates attendance record for today.
 * If already clocked in today, throws an error.
 */
export const clockIn = mutation({
  args: {
    siteId: v.id("sites"),
    qrWindow: v.number(), // the window value from the QR code
  },
  handler: async (ctx, args): Promise<{ success: boolean; clockInTime: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    // Validate QR window (allow current and previous window for slight delay)
    const currentWindow = Math.floor(Date.now() / 30000);
    if (args.qrWindow < currentWindow - 1 || args.qrWindow > currentWindow) {
      throw new ConvexError({ message: "QR code has expired. Please scan a fresh code.", code: "BAD_REQUEST" });
    }

    // Validate site exists
    const site = await ctx.db.get(args.siteId);
    if (!site) throw new ConvexError({ message: "Site not found", code: "NOT_FOUND" });

    // Find worker linked to this user
    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!userRole?.workerId) throw new ConvexError({ message: "No worker profile linked", code: "NOT_FOUND" });

    const worker = await ctx.db.get(userRole.workerId);
    if (!worker) throw new ConvexError({ message: "Worker not found", code: "NOT_FOUND" });

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const clockInTime = now.toISOString();

    // Check if already clocked in today
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_worker_date", (q) => q.eq("workerId", worker._id).eq("date", today))
      .first();

    if (existing) {
      if (existing.clockInTime) {
        throw new ConvexError({ message: "You have already clocked in today.", code: "CONFLICT" });
      }
      // Update existing manual record with clock-in time
      await ctx.db.patch(existing._id, {
        clockInTime,
        clockInSiteId: args.siteId,
        siteId: args.siteId,
      });
      return { success: true, clockInTime };
    }

    // Create new attendance record
    await ctx.db.insert("attendance", {
      workerId: worker._id,
      agencyId: worker.agencyId,
      branchId: site.branchId,
      siteId: args.siteId,
      date: today,
      recordType: "hours",
      hoursWorked: 0,
      status: "present",
      daysWorked: 1,
      clockInTime,
      clockInSiteId: args.siteId,
      verified: false,
      createdBy: user._id,
    });

    return { success: true, clockInTime };
  },
});

/**
 * Clock out — update today's attendance record with clock-out time and compute hours.
 */
export const clockOut = mutation({
  args: {
    siteId: v.optional(v.id("sites")),
    qrWindow: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; clockOutTime: string; hoursWorked: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    // Validate QR window if provided
    if (args.qrWindow !== undefined) {
      const currentWindow = Math.floor(Date.now() / 30000);
      if (args.qrWindow < currentWindow - 1 || args.qrWindow > currentWindow) {
        throw new ConvexError({ message: "QR code has expired. Please scan a fresh code.", code: "BAD_REQUEST" });
      }
    }

    // Find worker
    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!userRole?.workerId) throw new ConvexError({ message: "No worker profile linked", code: "NOT_FOUND" });

    const worker = await ctx.db.get(userRole.workerId);
    if (!worker) throw new ConvexError({ message: "Worker not found", code: "NOT_FOUND" });

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const clockOutTime = now.toISOString();

    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_worker_date", (q) => q.eq("workerId", worker._id).eq("date", today))
      .first();

    if (!existing || !existing.clockInTime) {
      throw new ConvexError({ message: "You haven't clocked in today.", code: "BAD_REQUEST" });
    }
    if (existing.clockOutTime) {
      throw new ConvexError({ message: "You have already clocked out today.", code: "CONFLICT" });
    }

    // Compute hours worked
    const inTime = new Date(existing.clockInTime).getTime();
    const outTime = now.getTime();
    const hoursWorked = Math.round(((outTime - inTime) / 3600000) * 100) / 100;
    const overtimeHours = Math.max(0, Math.round((hoursWorked - 8) * 100) / 100);

    await ctx.db.patch(existing._id, {
      clockOutTime,
      clockOutSiteId: args.siteId,
      hoursWorked,
      overtimeHours,
    });

    return { success: true, clockOutTime, hoursWorked };
  },
});

/**
 * Verify an attendance record (admin/supervisor action).
 */
export const verifyAttendance = mutation({
  args: { id: v.id("attendance") },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const record = await ctx.db.get(args.id);
    if (!record) throw new ConvexError({ message: "Attendance record not found", code: "NOT_FOUND" });

    await ctx.db.patch(args.id, {
      verified: true,
      verifiedBy: user._id,
      verifiedAt: new Date().toISOString(),
    });
  },
});

/**
 * Bulk verify attendance records.
 */
export const bulkVerify = mutation({
  args: { ids: v.array(v.id("attendance")) },
  handler: async (ctx, args): Promise<{ verified: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const now = new Date().toISOString();
    let verified = 0;
    for (const id of args.ids) {
      const record = await ctx.db.get(id);
      if (record && !record.verified) {
        await ctx.db.patch(id, { verified: true, verifiedBy: user._id, verifiedAt: now });
        verified++;
      }
    }
    return { verified };
  },
});

/**
 * Get today's attendance status for the current worker (used in portal).
 */
export const getMyTodayAttendance = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!userRole?.workerId) return null;

    const today = new Date().toISOString().split("T")[0];
    return await ctx.db
      .query("attendance")
      .withIndex("by_worker_date", (q) => q.eq("workerId", userRole.workerId!).eq("date", today))
      .first();
  },
});
