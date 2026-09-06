import assert from "node:assert/strict";
import { test } from "node:test";

import { cleanupExternalConsumerMaterial, resolveExternalConsumerMaterial } from "./material.ts";
import { externalConsumerNodeCommand } from "./node-command.ts";
import { assertExternalConsumerRuntime } from "./runtime.ts";

test("external consumer runtime acceptance", { concurrency: false, timeout: 20_000 }, async () => {
  assert.throws(
    () => externalConsumerNodeCommand({}),
    /VIBE_CHECK_NODE_CMD must identify the absolute mise-owned Node executable/
  );
  assert.throws(
    () => externalConsumerNodeCommand({ VIBE_CHECK_NODE_CMD: "node" }),
    /VIBE_CHECK_NODE_CMD must identify the absolute mise-owned Node executable/
  );
  const fixture = await resolveExternalConsumerMaterial();
  try {
    assertExternalConsumerRuntime(fixture.material);
  } finally {
    if (fixture.cleanup) cleanupExternalConsumerMaterial(fixture.material);
  }
});
