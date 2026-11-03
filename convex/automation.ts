import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { signature } from "../lib/signing";
export const get = internalQuery({
  args: { id: v.id("events") },
  handler: (ctx, { id }) => ctx.db.get(id),
});
export const update = internalMutation({
  args: {
    id: v.id("events"),
    state: v.string(),
    attempts: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...a }) => {
    await ctx.db.patch(id, a);
  },
});
export const deliver = internalAction({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    const e = await ctx.runQuery(internal.automation.get, { id });
    if (!e || e.state === "sent") return;
    const attempts = e.attempts + 1;
    try {
      const body = JSON.stringify({
        key: e.key,
        loanId: e.loanId,
        kind: e.kind,
        recipient: e.recipient,
      });
      const t = String(Date.now());
      const response = await fetch(process.env.N8N_WEBHOOK_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-timestamp": t,
          "x-signature": await signature(
            process.env.AUTOMATION_SECRET!,
            t,
            body,
          ),
        },
        body,
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`Webhook HTTP ${response.status}`);
      await ctx.runMutation(internal.automation.update, {
        id,
        state: "sent",
        attempts,
      });
    } catch {
      await ctx.runMutation(internal.automation.update, {
        id,
        state: attempts >= 5 ? "failed" : "retrying",
        attempts,
        error: "Webhook delivery failed",
      });
      if (attempts < 5)
        await ctx.scheduler.runAfter(
          1000 * 2 ** attempts,
          internal.automation.deliver,
          { id },
        );
      else console.error("Automation delivery exhausted", id);
    }
  },
});
export const overdue = internalQuery({
  args: {},
  handler: async (ctx) => {
    const day = new Date().toISOString().slice(0, 10);
    const loans = (await ctx.db.query("loans").collect()).filter(
      (l) => l.status === "approved" && l.end < day,
    );
    const result = [];
    for (const l of loans) {
      const key = `${l._id}:reminder:${day}`;
      if (
        !(await ctx.db
          .query("receipts")
          .withIndex("key", (q) => q.eq("key", key))
          .first())
      )
        result.push({
          key,
          loanId: l._id,
          recipient: l.borrower,
          kind: "reminder",
        });
    }
    return result;
  },
});
export const receipt = internalMutation({
  args: { key: v.string(), loanId: v.id("loans"), kind: v.string() },
  handler: async (ctx, a) => {
    if (
      await ctx.db
        .query("receipts")
        .withIndex("key", (q) => q.eq("key", a.key))
        .first()
    )
      return;
    if (!(await ctx.db.get(a.loanId))) throw new Error("Loan missing");
    await ctx.db.insert("receipts", { ...a, at: Date.now() });
  },
});
