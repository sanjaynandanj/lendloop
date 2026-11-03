import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { signature, verified } from "../lib/signing.ts";
import { readFileSync } from "node:fs";
test("HMAC matches Node crypto and rejects altered bodies, keys and stale timestamps", async () => {
  const t = String(Date.now()),
    body = '{"loanId":"123","kind":"pending"}';
  const s = await signature("test-only-key", t, body);
  assert.equal(
    s,
    createHmac("sha256", "test-only-key")
      .update(t + "." + body)
      .digest("hex"),
  );
  assert.equal(await verified("test-only-key", t, body, s), true);
  assert.equal(await verified("test-only-key", t, body + " ", s), false);
  assert.equal(await verified("wrong-key", t, body, s), false);
  assert.equal(await verified("test-only-key", "0", body, s), false);
  assert.equal(await verified("test-only-key", t, body, "invalid"), false);
});
test("exported workflow code parses and does not embed credentials", () => {
  for (const path of ["request-notification", "overdue-reminders", "errors"]) {
    const flow = JSON.parse(readFileSync(`n8n/${path}.json`));
    assert.equal(flow.active, false);
    for (const node of flow.nodes) {
      assert.equal(node.credentials, undefined);
      if (node.parameters.jsCode)
        new (Object.getPrototypeOf(async function () {}).constructor)(
          node.parameters.jsCode,
        );
    }
  }
});
