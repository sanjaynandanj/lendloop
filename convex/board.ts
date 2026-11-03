import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
async function identity(ctx: any) {
  const u = await ctx.auth.getUserIdentity();
  if (!u) throw new Error("Sign in required");
  return u.subject;
}
function admin(subject: string) {
  return (process.env.ADMIN_SUBJECTS || "").split(",").includes(subject);
}
const fields = {
  name: v.string(),
  category: v.string(),
  condition: v.string(),
  description: v.string(),
};
function validate(a: any) {
  if (
    !a.name.trim() ||
    a.name.length > 100 ||
    !["Power tools", "Garden", "Kitchen", "Camping", "Other"].includes(
      a.category,
    ) ||
    !a.description.trim() ||
    a.description.length > 600 ||
    !["Like new", "Good", "Well loved"].includes(a.condition)
  )
    throw new Error("Invalid listing");
}
export const browse = query({
  args: {},
  handler: async (ctx) => {
    const u = await ctx.auth.getUserIdentity();
    const tools = (await ctx.db.query("tools").collect()).filter(
      (t) => !t.deleted,
    );
    if (!u)
      return tools.map((t) => ({
        _id: t._id,
        name: t.name,
        category: t.category,
      }));
    const loans = await ctx.db.query("loans").collect();
    const trusted = await ctx.db.query("trusted").collect();
    return tools.map((t) => ({
      ...t,
      trusted: trusted.some((x) => x.subject === t.owner),
      available: !loans.some(
        (l) =>
          l.toolId === t._id &&
          l.status === "approved" &&
          l.start <= new Date().toISOString().slice(0, 10) &&
          l.end >= new Date().toISOString().slice(0, 10),
      ),
    }));
  },
});
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const subject = await identity(ctx);
    const all = await ctx.db.query("loans").collect();
    const loans = all.filter(
      (l) => admin(subject) || l.borrower === subject || l.lender === subject,
    );
    return {
      subject,
      admin: admin(subject),
      loans: await Promise.all(
        loans.map(async (l) => ({
          ...l,
          tool: await ctx.db.get(l.toolId),
          activity: (await ctx.db.query("receipts").collect()).filter(
            (r) => r.loanId === l._id,
          ),
        })),
      ),
    };
  },
});
export const save = mutation({
  args: { ...fields, id: v.optional(v.id("tools")) },
  handler: async (ctx, a) => {
    const owner = await identity(ctx);
    validate(a);
    const { id, ...data } = a;
    if (id) {
      const t = await ctx.db.get(id);
      if (!t || t.owner !== owner || t.deleted)
        throw new Error("Not your listing");
      await ctx.db.patch(id, data);
      return id;
    }
    return await ctx.db.insert("tools", { ...data, owner, deleted: false });
  },
});
export const remove = mutation({
  args: { id: v.id("tools") },
  handler: async (ctx, { id }) => {
    const s = await identity(ctx);
    const t = await ctx.db.get(id);
    if (!t || (t.owner !== s && !admin(s))) throw new Error("Forbidden");
    if (
      (
        await ctx.db
          .query("loans")
          .withIndex("tool", (q) => q.eq("toolId", id))
          .collect()
      ).some((l) => ["pending", "approved"].includes(l.status))
    )
      throw new Error("Resolve active requests before removing");
    await ctx.db.patch(id, { deleted: true });
  },
});
async function event(ctx: any, loanId: any, kind: string, recipient: string) {
  const id = await ctx.db.insert("events", {
    loanId,
    kind,
    recipient,
    state: "pending",
    attempts: 0,
    key: `${loanId}:${kind}`,
  });
  await ctx.scheduler.runAfter(0, internal.automation.deliver, { id });
}
export const request = mutation({
  args: { toolId: v.id("tools"), start: v.string(), end: v.string() },
  handler: async (ctx, a) => {
    const s = await identity(ctx);
    const t = await ctx.db.get(a.toolId);
    if (!t || t.deleted || t.owner === s)
      throw new Error("Cannot borrow this tool");
    const today = new Date().toISOString().slice(0, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(a.start) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(a.end) ||
      !Number.isFinite(Date.parse(a.start)) ||
      !Number.isFinite(Date.parse(a.end)) ||
      new Date(a.start).toISOString().slice(0, 10) !== a.start ||
      new Date(a.end).toISOString().slice(0, 10) !== a.end ||
      a.start < today ||
      a.end < a.start
    )
      throw new Error("Choose a valid future date range");
    const loans = await ctx.db
      .query("loans")
      .withIndex("tool", (q) => q.eq("toolId", a.toolId))
      .collect();
    if (
      loans.some(
        (l) =>
          (l.status === "approved" ||
            (l.status === "pending" && l.borrower === s)) &&
          l.start <= a.end &&
          l.end >= a.start,
      )
    )
      throw new Error("Dates overlap an existing loan or request");
    const id = await ctx.db.insert("loans", {
      ...a,
      borrower: s,
      lender: t.owner,
      status: "pending",
    });
    await event(ctx, id, "pending", t.owner);
    return id;
  },
});
export const transition = mutation({
  args: {
    id: v.id("loans"),
    status: v.union(
      v.literal("approved"),
      v.literal("declined"),
      v.literal("returned"),
    ),
  },
  handler: async (ctx, { id, status }) => {
    const s = await identity(ctx);
    const l = await ctx.db.get(id);
    if (!l) throw new Error("Loan missing");
    if (status === "returned") {
      if (l.status !== "approved" || (s !== l.lender && s !== l.borrower))
        throw new Error("Forbidden");
    } else {
      if (s !== l.lender || l.status !== "pending")
        throw new Error("Forbidden");
      if (status === "approved") {
        const ls = await ctx.db
          .query("loans")
          .withIndex("tool", (q) => q.eq("toolId", l.toolId))
          .collect();
        if (
          ls.some(
            (x) =>
              x._id !== id &&
              x.status === "approved" &&
              x.start <= l.end &&
              x.end >= l.start,
          )
        )
          throw new Error("Dates already reserved");
      }
    }
    await ctx.db.patch(id, { status });
    await event(ctx, id, status, s === l.borrower ? l.lender : l.borrower);
  },
});
export const trust = mutation({
  args: { subject: v.string() },
  handler: async (ctx, { subject }) => {
    if (!admin(await identity(ctx))) throw new Error("Admin only");
    if (
      !(await ctx.db
        .query("trusted")
        .withIndex("subject", (q) => q.eq("subject", subject))
        .first())
    )
      await ctx.db.insert("trusted", { subject });
  },
});
