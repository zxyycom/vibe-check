import assert from "node:assert/strict";
import { it } from "node:test";

import { run } from "./project-run.ts";

it("repository Project Run binds its definition before another caller supplies controls", async () => {
  const controller = new AbortController();
  controller.abort();

  const result = await run({ signal: controller.signal });

  assert.equal(result.kind, "cancelled");
  if (result.kind === "cancelled") assert.equal(result.phase, "pre-work");
});
