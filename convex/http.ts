import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { verified } from "../lib/signing";
const http = httpRouter();
for (const path of ["/automation/overdue", "/automation/receipt"])
  http.route({
    path,
    method: "POST",
    handler: httpAction(async (ctx, r) => {
      const body = await r.text();
      if (
        !process.env.AUTOMATION_SECRET ||
        !(await verified(
          process.env.AUTOMATION_SECRET,
          r.headers.get("x-timestamp") || "",
          body,
          r.headers.get("x-signature") || "",
        ))
      )
        return new Response("Unauthorized", { status: 401 });
      try {
        if (path.endsWith("overdue"))
          return Response.json(
            await ctx.runQuery(internal.automation.overdue, {}),
          );
        const { key, loanId, kind } = JSON.parse(body);
        await ctx.runMutation(internal.automation.receipt, {
          key,
          loanId,
          kind,
        });
        return Response.json({ ok: true });
      } catch {
        return new Response("Invalid request", { status: 400 });
      }
    }),
  });
export default http;
