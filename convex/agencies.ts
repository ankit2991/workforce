import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, resolveAgencyFilter } from "./lib/auth.ts";

/**
 * List agencies:
 * - superadmin → all agencies
 * - others     → only their own agency
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    let agencyId: string | null = null;
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();
      if (user) {
        const role = await ctx.db
          .query("userRoles")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first();
        if (role && role.role !== "superadmin" && role.agencyId) {
          agencyId = role.agencyId;
        }
      }
    }

    if (agencyId) {
      const agency = await ctx.db.get(agencyId as import("./_generated/dataModel.d.ts").Id<"agencies">);
      return agency ? [agency] : [];
    }
    return await ctx.db.query("agencies").order("desc").take(200);
  },
});

export const getById = query({
  args: { id: v.id("agencies") },
  handler: async (ctx, args) => {
    return await ctx.db.get("agencies", args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    country: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    if (u.role !== "superadmin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only superadmins can create agencies" });
    }
    const existing = await ctx.db
      .query("agencies")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
    if (existing) {
      throw new ConvexError({ code: "CONFLICT", message: "Agency code already exists" });
    }
    return await ctx.db.insert("agencies", { ...args, createdBy: u.userId });
  },
});

export const update = mutation({
  args: {
    id: v.id("agencies"),
    name: v.string(),
    code: v.string(),
    country: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    if (u.role !== "superadmin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only superadmins can update agencies" });
    }
    const existing = await ctx.db
      .query("agencies")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
    if (existing && existing._id !== args.id) {
      throw new ConvexError({ code: "CONFLICT", message: "Agency code already exists" });
    }
    await ctx.db.patch("agencies", args.id, {
      name: args.name,
      code: args.code,
      country: args.country,
      status: args.status,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("agencies") },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    if (u.role !== "superadmin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only superadmins can delete agencies" });
    }
    await ctx.db.delete("agencies", args.id);
  },
});

export const countAll = query({
  args: {},
  handler: async (ctx) => {
    const agencyFilter = await resolveAgencyFilter(ctx).catch(() => null);
    if (agencyFilter) {
      return 1;
    }
    const agencies = await ctx.db.query("agencies").take(1000);
    return agencies.length;
  },
});
