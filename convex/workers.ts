import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import { requireUser, resolveAgencyFilter } from "./lib/auth.ts";

const workerArgs = {
  employeeId: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.optional(v.string()),
  gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
  nationality: v.optional(v.string()),
  phone: v.optional(v.string()),
  email: v.optional(v.string()),
  agencyId: v.id("agencies"),
  branchId: v.optional(v.id("branches")),
  siteId: v.optional(v.id("sites")),
  jobTitle: v.optional(v.string()),
  department: v.optional(v.string()),
  employmentType: v.union(
    v.literal("full_time"),
    v.literal("part_time"),
    v.literal("contract"),
    v.literal("piece_work"),
  ),
  startDate: v.string(),
  endDate: v.optional(v.string()),
  status: v.union(
    v.literal("active"),
    v.literal("inactive"),
    v.literal("suspended"),
    v.literal("terminated"),
  ),
  bankName: v.optional(v.string()),
  bankAccountNumber: v.optional(v.string()),
  bankAccountName: v.optional(v.string()),
  expectedMonthlySalary: v.optional(v.number()),
  salaryCurrency: v.optional(v.string()),
  withdrawalFrequency: v.optional(v.union(v.literal("weekly"), v.literal("monthly"))),
};

export const list = query({
  args: {
    agencyId: v.optional(v.id("agencies")),
    branchId: v.optional(v.id("branches")),
    siteId: v.optional(v.id("sites")),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("suspended"),
        v.literal("terminated"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const effectiveAgency = await resolveAgencyFilter(ctx, args.agencyId).catch(() => args.agencyId ?? null);

    let workers;
    if (effectiveAgency) {
      workers = await ctx.db
        .query("workers")
        .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency as Id<"agencies">))
        .collect();
    } else {
      workers = await ctx.db.query("workers").collect();
    }

    if (args.branchId) workers = workers.filter((w) => w.branchId === args.branchId);
    if (args.siteId) workers = workers.filter((w) => w.siteId === args.siteId);
    if (args.status) workers = workers.filter((w) => w.status === args.status);

    return workers;
  },
});

export const getById = query({
  args: { id: v.id("workers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const count = query({
  args: {},
  handler: async (ctx) => {
    const workers = await ctx.db.query("workers").collect();
    return workers.length;
  },
});

export const create = mutation({
  args: workerArgs,
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    // Enforce: non-superadmin can only create workers in their own agency
    if (u.role !== "superadmin" && u.agencyId && u.agencyId !== args.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot create workers in another agency" });
    }

    const existing = await ctx.db
      .query("workers")
      .withIndex("by_employee_id", (q) => q.eq("employeeId", args.employeeId))
      .first();
    if (existing) {
      throw new ConvexError({ message: "Employee ID already exists", code: "CONFLICT" });
    }

    return await ctx.db.insert("workers", {
      ...args,
      documents: [],
      createdBy: u.userId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("workers"),
    ...workerArgs,
  },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const worker = await ctx.db.get(args.id);
    if (!worker) throw new ConvexError({ message: "Worker not found", code: "NOT_FOUND" });
    if (u.role !== "superadmin" && u.agencyId && worker.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot update workers in another agency" });
    }

    if (args.employeeId !== worker.employeeId) {
      const existing = await ctx.db
        .query("workers")
        .withIndex("by_employee_id", (q) => q.eq("employeeId", args.employeeId))
        .first();
      if (existing) {
        throw new ConvexError({ message: "Employee ID already exists", code: "CONFLICT" });
      }
    }

    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("workers") },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const worker = await ctx.db.get(args.id);
    if (u.role !== "superadmin" && u.agencyId && worker?.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot delete workers in another agency" });
    }
    await ctx.db.delete(args.id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const addDocument = mutation({
  args: {
    workerId: v.id("workers"),
    type: v.string(),
    name: v.string(),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const worker = await ctx.db.get(args.workerId);
    if (!worker) throw new ConvexError({ message: "Worker not found", code: "NOT_FOUND" });
    if (u.role !== "superadmin" && u.agencyId && worker.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot modify workers in another agency" });
    }
    const docs = worker.documents ?? [];
    await ctx.db.patch(args.workerId, {
      documents: [
        ...docs,
        { type: args.type, name: args.name, storageId: args.storageId, uploadedAt: new Date().toISOString() },
      ],
    });
  },
});

export const removeDocument = mutation({
  args: {
    workerId: v.id("workers"),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const worker = await ctx.db.get(args.workerId);
    if (!worker) throw new ConvexError({ message: "Worker not found", code: "NOT_FOUND" });
    if (u.role !== "superadmin" && u.agencyId && worker.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot modify workers in another agency" });
    }
    const docs = (worker.documents ?? []).filter((d) => d.storageId !== args.storageId);
    await ctx.db.patch(args.workerId, { documents: docs });
  },
});

export const getDocumentUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
