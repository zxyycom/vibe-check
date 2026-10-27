import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { defineCheck, run as packageRun } from "@zxyycom/vibe-check";
import { runProcessSync } from "../../../process-execution/execution.ts";
import { createProjectGateDefinition } from "../definition.ts";
import { defineProjectGateEntries } from "./entries.ts";
import { createScopedProjectGateSelection, selectionFlags } from "./controls.ts";

// The parent owns this directory and supplies an isolated process environment.
const projectRoot = process.argv[2];
if (projectRoot === undefined || !isAbsolute(projectRoot)) {
  throw new Error("Expected the absolute temporary scoped-selection project root");
}

const executedCheckIds: string[] = [];
const createFixtureCheck = ({
  checkId,
  dependsOn = []
}: {
  readonly checkId: string;
  readonly dependsOn?: readonly string[];
}) =>
  defineCheck({
    checkId,
    displayName: checkId,
    dependsOn,
    execute: () => {
      executedCheckIds.push(checkId);
      return { status: "passed", data: {} };
    }
  });
const entries = defineProjectGateEntries([
  { check: createFixtureCheck({ checkId: "base" }), fast: true, presets: [] },
  { check: createFixtureCheck({ checkId: "prerequisite" }), fast: false, presets: [] },
  {
    check: createFixtureCheck({ checkId: "owned", dependsOn: ["prerequisite"] }),
    fast: false,
    presets: [],
    changeRegion: "material-json-input"
  },
  {
    check: createFixtureCheck({ checkId: "unrelated-slow" }),
    fast: false,
    presets: [],
    changeRegion: "material-schema-input"
  },
  {
    check: createFixtureCheck({ checkId: "unrelated-fast" }),
    fast: true,
    presets: [],
    changeRegion: "material-schema-input"
  },
  {
    check: createFixtureCheck({ checkId: "release" }),
    fast: false,
    presets: ["consumer-types"],
    selectionPolicy: "release-only"
  },
  {
    check: createFixtureCheck({ checkId: "explicit" }),
    fast: false,
    presets: ["admission-workbench"],
    selectionPolicy: "explicit-only"
  }
]);
const verifySelection = async ({
  scopes,
  expectedCheckIds
}: {
  readonly scopes: readonly string[];
  readonly expectedCheckIds: readonly string[];
}): Promise<void> => {
  executedCheckIds.length = 0;
  const result = await packageRun(createProjectGateDefinition(entries), {
    projectRoot,
    flags: selectionFlags(createScopedProjectGateSelection(scopes)),
    outputs: {
      diagnosticLogging: { enabled: false },
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    }
  });
  assert.equal(result.kind, "completed");
  if (result.kind !== "completed") return;
  assert.equal(result.aggregate, "passed");
  assert.deepEqual(executedCheckIds.toSorted(), expectedCheckIds.toSorted());
  assert.equal(
    result.snapshot.checks.find(({ checkId }) => checkId === "release")?.outcome.status,
    "not-applicable"
  );
  assert.equal(
    result.snapshot.checks.find(({ checkId }) => checkId === "explicit")?.outcome.status,
    "not-applicable"
  );
};
// No Git injects all change regions, but must not expand scoped into changed fallback.
await verifySelection({
  scopes: ["material-json-input"],
  expectedCheckIds: ["base", "owned", "prerequisite", "unrelated-fast"]
});
await verifySelection({
  scopes: ["material-json-input", "material-schema-input"],
  expectedCheckIds: ["base", "owned", "prerequisite", "unrelated-fast", "unrelated-slow"]
});

// Two empty commits satisfy HEAD~1 without adding any changed input.
for (const args of [
  ["init", "--quiet"],
  ["commit", "--allow-empty", "--quiet", "-m", "seed"],
  ["commit", "--allow-empty", "--quiet", "-m", "baseline"]
]) {
  const git = runProcessSync({
    command: "git",
    args: [
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "user.name=Gate scope fixture",
      "-c",
      "user.email=gate@example.invalid",
      ...args
    ],
    cwd: projectRoot
  });
  assert.equal(git.status, 0, git.stderr);
}
await verifySelection({
  scopes: ["material-json-input"],
  expectedCheckIds: ["base", "owned", "prerequisite"]
});

mkdirSync(join(projectRoot, "docs/schemas"), { recursive: true });
writeFileSync(join(projectRoot, "docs/schemas/unrelated.json"), "{}\n");
await verifySelection({
  scopes: ["material-json-input"],
  expectedCheckIds: ["base", "owned", "prerequisite", "unrelated-fast"]
});

console.log("scoped-selection-fixture-passed");
