import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, resolveAgencyFilter } from "./lib/auth.ts";

export const list = query({
  args: { agencyId: v.optional(v.id("agencies")) },
  handler: async (ctx, args) => {
    const effectiveAgency = await resolveAgencyFilter(ctx, args.agencyId).catch(() => args.agencyId ?? null);
    if (effectiveAgency) {
      return await ctx.db
        .query("branches")
        .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency))
        .order("desc")
        .take(200);
    }
    return await ctx.db.query("branches").order("desc").take(200);
  },
});

export const create = mutation({
  args: {
    agencyId: v.id("agencies"),
    name: v.string(),
    code: v.string(),
    address: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    // Agency-scoped users can only create branches in their own agency
    if (u.role !== "superadmin" && u.agencyId && u.agencyId !== args.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot create branches in another agency" });
    }
    return await ctx.db.insert("branches", {
      agencyId: args.agencyId,
      name: args.name,
      code: args.code,
      address: args.address,
      status: args.status,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("branches"),
    agencyId: v.id("agencies"),
    name: v.string(),
    code: v.string(),
    address: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const branch = await ctx.db.get(args.id);
    if (u.role !== "superadmin" && u.agencyId && branch?.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot update branches in another agency" });
    }
    await ctx.db.patch("branches", args.id, {
      agencyId: args.agencyId,
      name: args.name,
      code: args.code,
      address: args.address,
      status: args.status,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("branches") },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const branch = await ctx.db.get(args.id);
    if (u.role !== "superadmin" && u.agencyId && branch?.agencyId !== u.agencyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot delete branches in another agency" });
    }
    await ctx.db.delete("branches", args.id);
  },
});

export const countAll = query({
  args: {},
  handler: async (ctx) => {
    const branches = await ctx.db.query("branches").take(1000);
    return branches.length;
  },
});
