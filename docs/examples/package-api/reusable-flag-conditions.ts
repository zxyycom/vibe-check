// #region package-api-example:reusable-flag-conditions
import { any, defineCheck, type CheckFlagCondition } from "@zxyycom/vibe-check";

const ciOrManual: CheckFlagCondition = any("ci", "manual");

const build = defineCheck({
  checkId: "build",
  displayName: "Build",
  enabledByFlags: { when: ciOrManual },
  execute: () => ({ status: "passed", data: {} })
});
const lint = defineCheck({
  checkId: "lint",
  displayName: "Lint",
  enabledByFlags: { when: ciOrManual },
  execute: () => ({ status: "passed", data: {} })
});
// #endregion package-api-example:reusable-flag-conditions

// #region package-api-example:flag-condition-helper
import { all } from "@zxyycom/vibe-check";

function inCi(condition: CheckFlagCondition): CheckFlagCondition {
  return all("ci", condition);
}

const releaseInCi = inCi(any("release", "deploy"));
// #endregion package-api-example:flag-condition-helper

import { defineConfig, run, type CheckFlagEnablement } from "@zxyycom/vibe-check";

const sharedEnablement: CheckFlagEnablement = { when: ciOrManual };
const configuration = defineConfig({
  checks: [
    build,
    lint,
    defineCheck({
      checkId: "release",
      displayName: "Release",
      enabledByFlags: { when: releaseInCi },
      execute: () => ({ status: "passed", data: {} })
    }),
    defineCheck({
      checkId: "literal-name",
      displayName: "Literal condition name",
      enabledByFlags: { when: "ciOrManual" },
      execute: () => ({ status: "passed", data: {} })
    }),
    defineCheck({
      checkId: "shared-enablement",
      displayName: "Shared enablement",
      enabledByFlags: sharedEnablement,
      execute: () => ({ status: "passed", data: {} })
    })
  ],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

async function verifySelection(
  flags: readonly string[],
  expected: Readonly<Record<string, "passed" | "not-applicable">>
): Promise<void> {
  const result = await run(configuration, { flags });
  if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
  for (const [checkId, status] of Object.entries(expected)) {
    const outcome = result.snapshot.checks.find((check) => check.checkId === checkId)?.outcome;
    if (outcome?.status !== status) throw new Error(`Unexpected selection for ${checkId}`);
  }
}

await verifySelection(["ci", "release"], {
  build: "passed",
  lint: "passed",
  release: "passed",
  "literal-name": "not-applicable",
  "shared-enablement": "passed"
});
await verifySelection(["manual"], {
  build: "passed",
  lint: "passed",
  release: "not-applicable",
  "literal-name": "not-applicable",
  "shared-enablement": "passed"
});
await verifySelection(["ciOrManual"], {
  build: "not-applicable",
  lint: "not-applicable",
  release: "not-applicable",
  "literal-name": "passed",
  "shared-enablement": "not-applicable"
});
