import assert from "node:assert/strict";
import { test } from "node:test";

import { cleanupExternalConsumerMaterial, resolveExternalConsumerMaterial } from "./material.ts";
import { externalConsumerNodeCommand } from "./node-command.ts";
import { assertNodeRuntime } from "./runtime-evidence/runtime-host.ts";
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
  assert.throws(() => {
    assertNodeRuntime({ bunVersion: null, nodeVersion: "v24.17.9" });
  }, /expected >=24\.18/);
  assert.doesNotThrow(() => {
    assertNodeRuntime({ bunVersion: null, nodeVersion: "v26.0.0" });
  });
  const fixture = await resolveExternalConsumerMaterial();
  try {
    assertExternalConsumerRuntime(fixture.material);
  } finally {
    if (fixture.cleanup) cleanupExternalConsumerMaterial(fixture.material);
  }
});
