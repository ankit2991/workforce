import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, resolveAgencyFilter } from "./lib/auth.ts";

export const list = query({
  args: {
    branchId: v.optional(v.id("branches")),
    agencyId: v.optional(v.id("agencies")),
  },
  handler: async (ctx, args) => {
    const effectiveAgency = await resolveAgencyFilter(ctx, args.agencyId).catch(() => args.agencyId ?? null);
    if (args.branchId) {
      return await ctx.db
        .query("sites")
        .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
        .order("desc")
        .take(200);
    }
    if (effectiveAgency) {
      return await ctx.db
        .query("sites")
        .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency))
        .order("desc")
        .take(200);
    }
    return await ctx.db.query("sites").order("desc").take(200);
  },
});

export const create = mutation({
  args: {
    branchId: v.id("branches"),
    agencyId: v.id("agencies"),
    name: v.string(),
    code: v.string(),
    address: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    if (u.role !== "superadmin" && u.agencyId && u.agencyId !== args.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot create sites in another agency" });
    }
    return await ctx.db.insert("sites", { ...args });
  },
});

export const update = mutation({
  args: {
    id: v.id("sites"),
    branchId: v.id("branches"),
    agencyId: v.id("agencies"),
    name: v.string(),
    code: v.string(),
    address: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const site = await ctx.db.get(args.id);
    if (u.role !== "superadmin" && u.agencyId && site?.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot update sites in another agency" });
    }
    await ctx.db.patch("sites", args.id, {
      branchId: args.branchId,
      agencyId: args.agencyId,
      name: args.name,
      code: args.code,
      address: args.address,
      status: args.status,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("sites") },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const site = await ctx.db.get(args.id);
    if (u.role !== "superadmin" && u.agencyId && site?.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot delete sites in another agency" });
    }
    await ctx.db.delete("sites", args.id);
  },
});

export const countAll = query({
  args: {},
  handler: async (ctx) => {
    const sites = await ctx.db.query("sites").take(1000);
    return sites.length;
  },
});
