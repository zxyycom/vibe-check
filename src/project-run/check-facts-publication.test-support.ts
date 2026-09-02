import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Check } from "../check/check.ts";
import { readValidatedMachinePublication } from "../machine-output/v4/publication.test-support.ts";
import { defineConfig } from "../project-definition/project-definition.ts";
import { run } from "./run.ts";

export async function assertPublishedRunIntegration(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-terminal-message-integration-"));
  try {
    const { dependentCalls, result } = await publishedIntegration(root);
    assert.equal(result.kind, "completed");
    if (result.kind !== "completed") return;
    assertPublishedRunFacts(result, dependentCalls);
    assertPublishedMachineFacts(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
async function publishedIntegration(root: string) {
  let dependentCalls = 0;
  const result = await run(
    defineConfig({
      checks: publishedChecks(() => {
        dependentCalls += 1;
      }),
      outputs: {
        machinePublication: { directory: "machine", enabled: true },
        progressRendering: { enabled: false }
      }
    }),
    {
      checkAggregation: {
        checks: "all",
        mode: "all",
        unavailable: "propagate",
        notApplicable: "exclude",
        empty: "failed"
      },
      projectRoot: root
    }
  );
  return { dependentCalls, result };
}

function publishedChecks(dependent: () => void): Check[] {
  return [
    {
      checkId: "attention-support",
      displayName: "Attention support",
      visibility: "attention",
      execution: (context) => {
        context.records.report({ id: "support-record" }, { retained: true });
        return { status: "passed", data: { supporting: true } };
      }
    },
    {
      checkId: "message-source",
      displayName: "Message source",
      execution: () => ({
        status: "passed",
        data: { source: true },
        messages: [{ level: "warning", code: "source-message", message: "Source needs review" }]
      })
    },
    {
      checkId: "dependent",
      displayName: "Dependent",
      dependsOn: ["message-source"],
      execution: () => {
        dependent();
        return { status: "passed", data: { dependent: true } };
      }
    }
  ];
}

function assertPublishedRunFacts(
  result: Extract<Awaited<ReturnType<typeof run>>, { kind: "completed" }>,
  dependentCalls: number
): void {
  assert.equal(dependentCalls, 1);
  assert.equal(result.aggregate, "passed");
  assert.deepEqual(
    result.snapshot.checks.map(({ checkId, outcome }) => ({ checkId, outcome })),
    [
      { checkId: "attention-support", outcome: { status: "passed", data: { supporting: true } } },
      { checkId: "dependent", outcome: { status: "passed", data: { dependent: true } } },
      { checkId: "message-source", outcome: { status: "passed", data: { source: true } } }
    ]
  );
  assert.deepEqual(result.snapshot.records, [
    { checkId: "attention-support", id: "support-record", data: { retained: true } }
  ]);
  assert.deepEqual(
    result.checkDurations.map(({ checkId, durationMs }) => [checkId, typeof durationMs]),
    [
      ["attention-support", "number"],
      ["dependent", "number"],
      ["message-source", "number"]
    ]
  );
  assert.deepEqual(result.checkMessages, [
    {
      checkId: "message-source",
      level: "warning",
      code: "source-message",
      message: "Source needs review"
    }
  ]);
}

function assertPublishedMachineFacts(root: string): void {
  const { recordsNdjson, runJson, value } = readValidatedMachinePublication(root);
  assert.equal(value.run.schemaVersion, "vibe-check.run.v4");
  assert.equal(value.records[0]?.schemaVersion, "vibe-check.record.v4");
  assert.deepEqual(
    value.run.checks.map(({ checkId, outcome }) => [checkId, outcome.status]),
    [
      ["attention-support", "passed"],
      ["dependent", "passed"],
      ["message-source", "passed"]
    ]
  );
  assert.doesNotMatch(
    `${runJson}${recordsNdjson}${JSON.stringify(value)}`,
    /"(?:messages|visibility)"/
  );
}
