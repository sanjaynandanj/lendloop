/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { test, expect, vi, afterEach } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
const listing = {
  name: "Drill",
  category: "Power tools",
  condition: "Good",
  description: "A useful drill",
};
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
test("public projection and listing ownership are enforced by Convex", async () => {
  const t = convexTest(schema, modules),
    a = t.withIdentity({ subject: "alice" }),
    b = t.withIdentity({ subject: "bob" });
  const id = await a.mutation(api.board.save, listing);
  expect(await t.query(api.board.browse, {})).toEqual([
    { _id: id, name: "Drill", category: "Power tools" },
  ]);
  await expect(t.mutation(api.board.save, listing)).rejects.toThrow(
    "Sign in required",
  );
  await expect(b.mutation(api.board.save, { ...listing, id })).rejects.toThrow(
    "Not your listing",
  );
  await expect(b.mutation(api.board.remove, { id })).rejects.toThrow(
    "Forbidden",
  );
  await expect(b.mutation(api.board.trust, { subject: "bob" })).rejects.toThrow(
    "Admin only",
  );
});
test("only lender approves; overlaps blocked; participants return; reminders idempotent", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2030-01-01T12:00:00Z"));
  const t = convexTest(schema, modules),
    a = t.withIdentity({ subject: "alice" }),
    b = t.withIdentity({ subject: "bob" }),
    c = t.withIdentity({ subject: "carol" });
  const toolId = await a.mutation(api.board.save, listing);
  const first = await b.mutation(api.board.request, {
    toolId,
    start: "2030-01-02",
    end: "2030-01-03",
  });
  const second = await c.mutation(api.board.request, {
    toolId,
    start: "2030-01-03",
    end: "2030-01-04",
  });
  await expect(
    b.mutation(api.board.transition, { id: first, status: "approved" }),
  ).rejects.toThrow("Forbidden");
  await a.mutation(api.board.transition, { id: first, status: "approved" });
  await expect(
    a.mutation(api.board.transition, { id: second, status: "approved" }),
  ).rejects.toThrow("Dates already reserved");
  await expect(
    c.mutation(api.board.transition, { id: first, status: "returned" }),
  ).rejects.toThrow("Forbidden");
  vi.setSystemTime(new Date("2030-01-05T12:00:00Z"));
  const due = await t.query(internal.automation.overdue, {});
  expect(due).toHaveLength(1);
  const { key, loanId, kind } = due[0];
  await t.mutation(internal.automation.receipt, { key, loanId, kind });
  await t.mutation(internal.automation.receipt, { key, loanId, kind });
  expect(await t.run((ctx) => ctx.db.query("receipts").collect())).toHaveLength(
    1,
  );
  expect(await t.query(internal.automation.overdue, {})).toHaveLength(0);
  await b.mutation(api.board.transition, { id: first, status: "returned" });
  expect((await b.query(api.board.mine, {})).loans[0].status).toBe("returned");
});
test("admin can remove and trust but cannot edit someone else’s listing", async () => {
  vi.stubEnv("ADMIN_SUBJECTS", "root");
  const t = convexTest(schema, modules),
    a = t.withIdentity({ subject: "alice" }),
    admin = t.withIdentity({ subject: "root" });
  const id = await a.mutation(api.board.save, listing);
  await admin.mutation(api.board.trust, { subject: "alice" });
  expect((await a.query(api.board.browse, {}))[0].trusted).toBe(true);
  await expect(
    admin.mutation(api.board.save, { ...listing, id }),
  ).rejects.toThrow("Not your listing");
  await admin.mutation(api.board.remove, { id });
  expect(await t.query(api.board.browse, {})).toEqual([]);
});
