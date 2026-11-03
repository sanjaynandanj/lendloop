import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  tools: defineTable({
    name: v.string(),
    category: v.string(),
    condition: v.string(),
    description: v.string(),
    owner: v.string(),
    deleted: v.boolean(),
  }).index("owner", ["owner"]),
  loans: defineTable({
    toolId: v.id("tools"),
    borrower: v.string(),
    lender: v.string(),
    start: v.string(),
    end: v.string(),
    status: v.string(),
  }).index("tool", ["toolId"]),
  trusted: defineTable({ subject: v.string() }).index("subject", ["subject"]),
  events: defineTable({
    loanId: v.id("loans"),
    kind: v.string(),
    recipient: v.string(),
    state: v.string(),
    attempts: v.number(),
    error: v.optional(v.string()),
    key: v.string(),
  }).index("key", ["key"]),
  receipts: defineTable({
    key: v.string(),
    at: v.number(),
    loanId: v.id("loans"),
    kind: v.string(),
  }).index("key", ["key"]),
});
