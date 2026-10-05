import {
  quietControls,
  completed,
  checkStatusesFor
} from "../package-api-support/gate-example-acceptance.ts";

import assert from "node:assert/strict";

import { run } from "@zxyycom/vibe-check";

// #region package-api-example:gate-terminal-observation
import { defineCheck, defineConfig } from "@zxyycom/vibe-check";

const config = defineCheck({
  checkId: "config",
  displayName: "Configuration",
  execute: () => ({ status: "failed", data: { valid: false } })
});

const consumer = defineCheck({
  checkId: "use-config",
  displayName: "Use configuration",
  dependsOn: [config.checkId],
  execute: () => ({ status: "passed", data: { consumed: true } })
});

const audit = defineCheck({
  checkId: "audit-config",
  displayName: "Audit configuration",
  observes: [config.checkId],
  execute({ dependencies }) {
    const outcomes = dependencies.list().map(({ checkId, outcome }) => ({
      checkId,
      status: outcome.status
    }));
    return { status: "passed", data: { outcomes } };
  }
});

const definition = defineConfig({
  checks: [config, consumer, audit],
  outputs: { machinePublication: { enabled: false } }
});
// #endregion package-api-example:gate-terminal-observation

const statuses = checkStatusesFor(definition);
let consumerExecutions = 0;
const consumerExecute = consumer.execute;
assert.ok(consumerExecute);
const observed = completed(
  await run(
    defineConfig({
      ...definition,
      checks: [
        config,
        defineCheck({
          ...consumer,
          execute(context) {
            consumerExecutions += 1;
            return consumerExecute(context);
          }
        }),
        audit
      ]
    }),
    quietControls
  )
);
assert.deepEqual(statuses(observed), ["failed", "unavailable", "passed"]);
assert.equal(consumerExecutions, 0);
assert.equal(observed.aggregate, "failed");
const blocked = observed.snapshot.checks.find(
  ({ checkId }) => checkId === consumer.checkId
)?.outcome;
assert.equal(blocked?.status, "unavailable");
if (blocked?.status !== "unavailable") throw new Error("Expected blocked consumer");
assert.equal(blocked.reason.code, "dependency-not-passed");
const audited = observed.snapshot.checks.find(({ checkId }) => checkId === audit.checkId)?.outcome;
if (audited?.status !== "passed") throw new Error("Expected completed audit");
assert.equal(
  JSON.stringify(audited.data.outcomes),
  JSON.stringify([{ checkId: "config", status: "failed" }])
);
