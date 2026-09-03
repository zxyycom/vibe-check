import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { assertOvermatchedFindingWaiverEvidence } from "../code-quality-findings/finding-waiver-evidence.test-support.ts";
import { functionMetrics } from "./constructor.ts";
import { executeFunctionMetrics } from "./execution.ts";
import { createRoot, execute, type ReportedRecord } from "./constructor.test-support.ts";

const SOURCE_FILES = {
  exclude: [],
  include: ["src/a.ts"],
  source: "filesystem"
} as const;
const PARAMETER_IDENTITY = {
  functionName: "a",
  metric: "parameter-count",
  path: "src/a.ts",
  startLine: 1
} as const;
const NESTING_DEPTH_IDENTITY = {
  functionName: "a",
  metric: "nesting-depth",
  path: "src/a.ts",
  startLine: 1
} as const;
const STRICT_LIMITS = {
  codeLines: {
    maximum: 1,
    lowComplexityAllowance: { cyclomaticComplexityBelow: 1, maximum: 1 }
  },
  cyclomaticComplexity: { maximum: 1 },
  nestingDepth: { maximum: 1 },
  parameters: { maximum: 4 }
} as const;

describe("functionMetrics finding waivers", () => {
  it("validates closed identity authoring without invoking hostile accessors", () =>
    assertInvalidFunctionWaiverAuthoring());

  it("audits unused waivers only after forming a complete empty candidate set", async () => {
    await assertFunctionUnusedWaiverAudit();
  });

  it("preserves applied and stale waiver evidence while settling only actionable metrics", async () => {
    const root = createRoot("vibe-check-function-waiver-");
    try {
      writeFileSync(join(root, "src", "a.ts"), overLimitFunction(), "utf8");
      const check = functionMetrics({
        codeAreas: {
          source: {
            files: SOURCE_FILES,
            findingPolicy: "blocking",
            limits: STRICT_LIMITS
          }
        },
        findingWaivers: [
          { identity: PARAMETER_IDENTITY, reason: "Generated adapter signature." },
          { identity: NESTING_DEPTH_IDENTITY, reason: "Legacy nesting is intentional." },
          {
            identity: { ...PARAMETER_IDENTITY, functionName: "removed" },
            reason: "Stale function policy."
          }
        ]
      });
      const observed = await execute(executeFunctionMetrics, check.options, root);

      assert.equal(observed.result.status, "failed");
      if (observed.result.status !== "failed") return;
      assert.deepEqual(observed.result.data, { blockingFindingCount: 1, findingCount: 3 });
      assert.equal(observed.records.length, 4);
      assert.deepEqual(findingRecord(observed.records, "nesting-depth"), {
        blocking: false,
        codeAreas: ["source"],
        functionName: "a",
        limit: 1,
        metric: "nesting-depth",
        path: "src/a.ts",
        startLine: 1,
        value: 2,
        waiver: { reason: "Legacy nesting is intentional." }
      });
      assert.deepEqual(findingRecord(observed.records, "parameter-count"), {
        blocking: false,
        codeAreas: ["source"],
        functionName: "a",
        limit: 4,
        metric: "parameter-count",
        path: "src/a.ts",
        startLine: 1,
        value: 5,
        waiver: { reason: "Generated adapter signature." }
      });
      assert.deepEqual(observed.records.at(-1)?.data, {
        identity: { ...PARAMETER_IDENTITY, functionName: "removed" },
        kind: "finding-waiver-audit",
        matchCount: 0,
        reason: "Stale function policy.",
        status: "unused"
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps duplicate analyzer function identities actionable when a waiver overmatches", async () => {
    const root = createRoot("vibe-check-function-overmatched-waiver-");
    try {
      writeFileSync(
        join(root, "src", "a.ts"),
        `${overLimitFunction()} ${overLimitFunction()}`,
        "utf8"
      );
      const check = functionMetrics({
        codeAreas: {
          source: {
            files: SOURCE_FILES,
            findingPolicy: "blocking",
            limits: STRICT_LIMITS
          }
        },
        findingWaivers: [{ identity: PARAMETER_IDENTITY, reason: "Must not cover two functions." }]
      });
      const observed = await execute(executeFunctionMetrics, check.options, root);
      assert.equal(observed.result.status, "failed");
      if (observed.result.status !== "failed") return;
      assert.deepEqual(observed.result.data, { blockingFindingCount: 6, findingCount: 6 });
      assertOvermatchedFindingWaiverEvidence(observed, {
        identity: PARAMETER_IDENTITY,
        kind: "finding-waiver-audit",
        matchCount: 2,
        reason: "Must not cover two functions.",
        status: "overmatched"
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function assertInvalidFunctionWaiverAuthoring(): void {
  assert.deepEqual(functionMetrics().options.findingWaivers, []);
  let getterReads = 0;
  const hostileIdentity = Object.defineProperty({}, "metric", {
    enumerable: true,
    get() {
      getterReads += 1;
      return "parameter-count";
    }
  });
  const invalidInputs = [
    { findingWaivers: [{ identity: PARAMETER_IDENTITY, reason: "" }] },
    {
      findingWaivers: [
        { identity: PARAMETER_IDENTITY, reason: "First." },
        { identity: PARAMETER_IDENTITY, reason: "Second." }
      ]
    },
    {
      findingWaivers: [
        {
          identity: { ...PARAMETER_IDENTITY, path: "../outside.ts" },
          reason: "Invalid path."
        }
      ]
    },
    { findingWaivers: [{ identity: hostileIdentity, reason: "Hostile." }] }
  ];
  for (const invalidInput of invalidInputs) {
    assert.throws(
      () => Reflect.apply(functionMetrics, undefined, [invalidInput]),
      /functionMetrics options must use/
    );
  }
  assert.equal(getterReads, 0);
}

async function assertFunctionUnusedWaiverAudit(): Promise<void> {
  const root = createRoot("vibe-check-function-no-input-waiver-");
  try {
    const check = functionMetrics({
      codeAreas: {
        missing: { files: { exclude: [], include: ["missing/**/*.ts"], source: "filesystem" } }
      },
      findingWaivers: [{ identity: PARAMETER_IDENTITY, reason: "Stale function policy." }]
    });
    const observed = await execute(executeFunctionMetrics, check.options, root);
    assert.deepEqual(observed.result, {
      status: "not-applicable",
      reason: { code: "no-eligible-input" },
      messages: [
        {
          code: "unused-finding-waiver",
          level: "warning",
          message:
            "Configured function-metrics finding waiver for src/a.ts:1 a parameter-count matched no finding; remove it or update its identity. Reason: Stale function policy."
        }
      ]
    });
    assert.equal(observed.records.length, 1);
    assert.match(observed.records[0]?.identity.id ?? "", /^\/finding-waiver-audit\/sha256:/);
    assert.deepEqual(observed.records[0]?.data, {
      identity: PARAMETER_IDENTITY,
      kind: "finding-waiver-audit",
      matchCount: 0,
      reason: "Stale function policy.",
      status: "unused"
    });
    await assertInvalidResolvedFunctionWaivers(check.options, root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function assertInvalidResolvedFunctionWaivers(
  options: ReturnType<typeof functionMetrics>["options"],
  root: string
): Promise<void> {
  const observed = await execute(
    executeFunctionMetrics,
    { ...options, findingWaivers: [{ identity: PARAMETER_IDENTITY, reason: "" }] },
    root
  );
  assert.deepEqual(observed.result, {
    status: "unavailable",
    reason: { code: "invalid-options" },
    messages: [
      {
        code: "invalid-options",
        level: "error",
        message:
          "functionMetrics options are invalid; recreate the Check with functionMetrics(options) or restore its complete resolved options."
      }
    ]
  });
}

function overLimitFunction(): string {
  return "export function a(one: number, two: number, three: number, four: number, five: number) { if (one) { if (two) return three; } return four; }";
}

function findingRecord(records: readonly ReportedRecord[], metric: string): unknown {
  return records.find(
    (record) =>
      typeof record.data === "object" &&
      record.data !== null &&
      Reflect.get(record.data, "metric") === metric
  )?.data;
}
