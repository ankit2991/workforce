import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel.d.ts";
import { requireUser, resolveAgencyFilter } from "./lib/auth.ts";

// ── Validators ────────────────────────────────────────────────────────────────

const severityValidator = v.union(
  v.literal("info"),
  v.literal("success"),
  v.literal("warning"),
  v.literal("error"),
);

// ── Queries ──────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    agencyId: v.optional(v.id("agencies")),
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Doc<"notifications">[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Resolve agency
    const effectiveAgency = await resolveAgencyFilter(ctx, args.agencyId).catch(
      () => args.agencyId ?? null,
    );

    let notifs: Doc<"notifications">[];

    if (effectiveAgency) {
      if (args.unreadOnly) {
        notifs = await ctx.db
          .query("notifications")
          .withIndex("by_agency_read", (q) =>
            q.eq("agencyId", effectiveAgency as Id<"agencies">).eq("read", false),
          )
          .order("desc")
          .take(args.limit ?? 100);
      } else {
        notifs = await ctx.db
          .query("notifications")
          .withIndex("by_agency", (q) => q.eq("agencyId", effectiveAgency as Id<"agencies">))
          .order("desc")
          .take(args.limit ?? 100);
      }
    } else {
      // superadmin with no specific agency — return latest 200 across all agencies
      notifs = await ctx.db.query("notifications").order("desc").take(200);
      if (args.unreadOnly) notifs = notifs.filter((n) => !n.read);
      notifs = notifs.slice(0, args.limit ?? 100);
    }

    return notifs;
  },
});

export const unreadCount = query({
  args: {
    agencyId: v.optional(v.id("agencies")),
  },
  handler: async (ctx, args): Promise<number> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const effectiveAgency = await resolveAgencyFilter(ctx, args.agencyId).catch(
      () => args.agencyId ?? null,
    );

    if (effectiveAgency) {
      const unread = await ctx.db
        .query("notifications")
        .withIndex("by_agency_read", (q) =>
          q.eq("agencyId", effectiveAgency as Id<"agencies">).eq("read", false),
        )
        .take(200);
      return unread.length;
    }

    const allUnread = await ctx.db
      .query("notifications")
      .order("desc")
      .take(500);
    return allUnread.filter((n) => !n.read).length;
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Mark a single notification as read */
export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const notif = await ctx.db.get(args.id);
    if (!notif) return;
    if (notif.read) return;
    const readBy = notif.readBy.includes(u.userId)
      ? notif.readBy
      : [...notif.readBy, u.userId];
    await ctx.db.patch(args.id, { read: true, readBy });
  },
});

/** Mark all notifications for a given agency as read */
export const markAllRead = mutation({
  args: { agencyId: v.optional(v.id("agencies")) },
  handler: async (ctx, args) => {
    const u = await requireUser(ctx);
    const effectiveAgency = await resolveAgencyFilter(ctx, args.agencyId).catch(
      () => args.agencyId ?? null,
    );

    let unread: Doc<"notifications">[];
    if (effectiveAgency) {
      unread = await ctx.db
        .query("notifications")
        .withIndex("by_agency_read", (q) =>
          q.eq("agencyId", effectiveAgency as Id<"agencies">).eq("read", false),
        )
        .take(500);
    } else {
      const all = await ctx.db.query("notifications").take(1000);
      unread = all.filter((n) => !n.read);
    }

    await Promise.all(
      unread.map((n) => {
        const readBy = n.readBy.includes(u.userId) ? n.readBy : [...n.readBy, u.userId];
        return ctx.db.patch(n._id, { read: true, readBy });
      }),
    );
  },
});

/** Delete (dismiss) a single notification */
export const dismiss = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const notif = await ctx.db.get(args.id);
    if (!notif) return;
    await ctx.db.delete(args.id);
  },
});

/** Clear all read notifications for an agency (housekeeping) */
export const clearRead = mutation({
  args: { agencyId: v.id("agencies") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const read = await ctx.db
      .query("notifications")
      .withIndex("by_agency", (q) => q.eq("agencyId", args.agencyId))
      .collect();
    await Promise.all(
      read.filter((n) => n.read).map((n) => ctx.db.delete(n._id)),
    );
  },
});

// ── Internal helper — called from other modules ───────────────────────────────

export const create = internalMutation({
  args: {
    agencyId: v.id("agencies"),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    link: v.optional(v.string()),
    severity: severityValidator,
    entityId: v.optional(v.string()),
    entityType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      ...args,
      read: false,
      readBy: [],
      createdAt: new Date().toISOString(),
    });
  },
});
