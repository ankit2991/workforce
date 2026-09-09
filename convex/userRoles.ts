import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, getEffectiveIdentity } from "./lib/auth.ts";

export const getMyRole = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getEffectiveIdentity(ctx);
    let user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return {
        userId: "000000000000000000000000" as import("./_generated/dataModel.d.ts").Id<"users">,
        name: identity.name || "Admin User",
        email: identity.email || "admin@example.com",
        role: "superadmin",
        agencyId: null,
        branchId: null,
        siteId: null,
        workerId: null,
      };
    }

    if (!user) return null;
    const roleRow = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", user!._id))
      .first();
    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: roleRow?.role ?? "superadmin",
      agencyId: roleRow?.agencyId ?? null,
      branchId: roleRow?.branchId ?? null,
      siteId: roleRow?.siteId ?? null,
      workerId: roleRow?.workerId ?? null,
    };
  },
});

export const getUserRole = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/** List all users with their roles — superadmin only */
export const listUsersWithRoles = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me) return [];
    const myRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .first();
    if (!myRole || myRole.role !== "superadmin") return [];

    const users = await ctx.db.query("users").take(500);
    const results = await Promise.all(
      users.map(async (u) => {
        const role = await ctx.db
          .query("userRoles")
          .withIndex("by_user", (q) => q.eq("userId", u._id))
          .first();
        return {
          userId: u._id,
          name: u.name ?? "",
          email: u.email ?? "",
          role: role?.role ?? null,
          agencyId: role?.agencyId ?? null,
          branchId: role?.branchId ?? null,
          siteId: role?.siteId ?? null,
          tokenIdentifier: u.tokenIdentifier,
        };
      }),
    );
    return results;
  },
});

export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("superadmin"),
      v.literal("agency_admin"),
      v.literal("branch_admin"),
      v.literal("site_admin"),
      v.literal("worker"),
    ),
    agencyId: v.optional(v.id("agencies")),
    branchId: v.optional(v.id("branches")),
    siteId: v.optional(v.id("sites")),
    workerId: v.optional(v.id("workers")),
  },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    if (u.role !== "superadmin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only superadmins can assign roles" });
    }
    const existing = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) {
      await ctx.db.patch("userRoles", existing._id, {
        role: args.role,
        agencyId: args.agencyId,
        branchId: args.branchId,
        siteId: args.siteId,
        workerId: args.workerId,
      });
      return existing._id;
    }
    return await ctx.db.insert("userRoles", {
      userId: args.userId,
      role: args.role,
      agencyId: args.agencyId,
      branchId: args.branchId,
      siteId: args.siteId,
      workerId: args.workerId,
    });
  },
});

/** Promote self to superadmin — only if NO superadmin exists yet (first-run bootstrap) */
export const bootstrapSuperadmin = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });

    // Check if any superadmin exists
    const existingRoles = await ctx.db.query("userRoles").take(500);
    const hasSuperadmin = existingRoles.some((r) => r.role === "superadmin");

    if (hasSuperadmin) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "A superadmin already exists. Contact them to be granted access.",
      });
    }

    const existing = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existing) {
      await ctx.db.patch("userRoles", existing._id, { role: "superadmin", agencyId: undefined, branchId: undefined, siteId: undefined });
      return existing._id;
    }
    return await ctx.db.insert("userRoles", { userId: user._id, role: "superadmin" });
  },
});

export const countWorkers = query({
  args: {},
  handler: async (ctx) => {
    const roles = await ctx.db.query("userRoles").take(1000);
    return roles.filter((r) => r.role === "worker").length;
  },
});

/** Delete a user and their role — superadmin only */
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    if (u.role !== "superadmin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only superadmins can delete users" });
    }

    // Prevent deleting yourself
    if (args.userId === u.userId) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "You cannot delete your own account" });
    }

    // Delete their role entry
    const roleRow = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (roleRow) {
      await ctx.db.delete(roleRow._id);
    }

    // Delete the user record
    await ctx.db.delete(args.userId);
  },
});
