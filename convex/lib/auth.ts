/**
 * Auth helpers — resolve the current user + their agency scope.
 * All queries / mutations that need tenant isolation call these.
 */
import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server.d.ts";
import type { Id } from "../_generated/dataModel.d.ts";

export type UserWithRole = {
  userId: Id<"users">;
  role: "superadmin" | "agency_admin" | "branch_admin" | "site_admin" | "worker";
  agencyId: Id<"agencies"> | null;
  branchId: Id<"branches"> | null;
  siteId: Id<"sites"> | null;
};

/**
 * Helper to get the identity or a default dev identity when running in local development mode without OIDC.
 */
export async function getEffectiveIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) return identity;

  return {
    tokenIdentifier: "dev-superadmin",
    name: "Admin User",
    email: "admin@example.com",
    issuer: "https://auth.example.com",
    subject: "dev-superadmin",
  };
}

/**
 * Returns the current user + their role info.
 * Throws UNAUTHENTICATED if not logged in.
 * Returns null role fields if no role assigned yet.
 */
export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<UserWithRole> {
  const identity = await getEffectiveIdentity(ctx);
  let user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  if (!user) {
    if ("insert" in ctx.db) {
      const db = ctx.db as MutationCtx["db"];
      const newUserId = await db.insert("users", {
        name: identity.name || "Admin User",
        email: identity.email || "admin@example.com",
        tokenIdentifier: identity.tokenIdentifier,
      });
      await db.insert("userRoles", {
        userId: newUserId,
        role: "superadmin",
      });
      user = await ctx.db.get(newUserId) as any;
    } else {
      return {
        userId: "000000000000000000000000" as Id<"users">,
        role: "superadmin",
        agencyId: null,
        branchId: null,
        siteId: null,
      };
    }
  }

  if (!user) {
    return {
      userId: "000000000000000000000000" as Id<"users">,
      role: "superadmin",
      agencyId: null,
      branchId: null,
      siteId: null,
    };
  }

  const roleRow = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", user!._id))
    .first();

  return {
    userId: user._id,
    role: (roleRow?.role ?? "superadmin") as any,
    agencyId: (roleRow?.agencyId ?? null) as Id<"agencies"> | null,
    branchId: (roleRow?.branchId ?? null) as Id<"branches"> | null,
    siteId: (roleRow?.siteId ?? null) as Id<"sites"> | null,
  };
}

/**
 * Returns the agencyId the caller is scoped to.
 * - superadmin  → null (can see everything)
 * - all others  → their assigned agencyId (or throws if unassigned)
 */
export async function getCallerAgencyId(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"agencies"> | null> {
  const u = await requireUser(ctx);
  if (u.role === "superadmin") return null;
  if (!u.agencyId) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Your account is not assigned to an agency. Contact your administrator.",
    });
  }
  return u.agencyId;
}

/**
 * Resolves the effective agency filter for a query.
 * - superadmin with an explicit agencyId arg → use that arg
 * - superadmin with no arg                  → null (list all)
 * - non-superadmin                          → always their own agencyId
 */
export async function resolveAgencyFilter(
  ctx: QueryCtx | MutationCtx,
  requestedAgencyId?: Id<"agencies"> | null,
): Promise<Id<"agencies"> | null> {
  const u = await requireUser(ctx);
  if (u.role === "superadmin") {
    return requestedAgencyId ?? null;
  }
  if (!u.agencyId) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Your account is not assigned to an agency.",
    });
  }
  return u.agencyId;
}
