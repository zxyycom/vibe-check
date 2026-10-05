import { quietControls, checkStatusesFor } from "../package-api-support/gate-example-acceptance.ts";

import assert from "node:assert/strict";

import { run } from "@zxyycom/vibe-check";

// #region package-api-example:gate-resource-claims
import { defineCheck, defineConfig } from "@zxyycom/vibe-check";

const runners = ["unit", "integration", "typecheck"].map((checkId) =>
  defineCheck({
    checkId,
    displayName: checkId,
    resourceClaims: { runner: 1 },
    async execute() {
      // 用短等待模拟已等待的异步工作；实际项目在这里调用真实检查。
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { status: "passed", data: {} };
    }
  })
);

const metadata = defineCheck({
  checkId: "metadata",
  displayName: "Metadata",
  execute: () => ({ status: "passed", data: {} })
});

const definition = defineConfig({
  checks: [...runners, metadata],
  scheduler: { maxParallel: 3, resourceCapacities: { runner: 2 } },
  outputs: { machinePublication: { enabled: false } }
});
// #endregion package-api-example:gate-resource-claims

const statuses = checkStatusesFor(definition);
let activeRunners = 0;
let peakRunners = 0;
let metadataOverlapped = false;
const measuredRunners = runners.map((runner) => {
  const execute = runner.execute;
  assert.ok(execute);
  return defineCheck({
    ...runner,
    async execute(context) {
      activeRunners += 1;
      peakRunners = Math.max(peakRunners, activeRunners);
      try {
        return await execute(context);
      } finally {
        activeRunners -= 1;
      }
    }
  });
});
const metadataExecute = metadata.execute;
assert.ok(metadataExecute);
const measuredMetadata = defineCheck({
  ...metadata,
  execute(context) {
    metadataOverlapped = activeRunners === 2;
    return metadataExecute(context);
  }
});
assert.deepEqual(
  statuses(
    await run(
      defineConfig({
        ...definition,
        checks: [...measuredRunners, measuredMetadata]
      }),
      quietControls
    )
  ),
  ["passed", "passed", "passed", "passed"]
);
assert.equal(peakRunners, 2);
assert.equal(activeRunners, 0);
assert.equal(metadataOverlapped, true);
