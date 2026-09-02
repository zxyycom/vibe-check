import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { describe, it } from "node:test";

import { assertOvermatchedFindingWaiverEvidence } from "../code-quality-findings/finding-waiver-evidence.test-support.ts";
import { functionMetrics } from "./constructor.ts";
import { executeFunctionMetrics } from "./execution.ts";
import {
  createExecutable,
  createRoot,
  execute,
  STRICT_LIMITS
} from "./constructor.test-support.ts";

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

describe("functionMetrics finding waivers", () => {
  it("validates closed identity authoring without invoking hostile accessors", () =>
    assertInvalidFunctionWaiverAuthoring());

  it("audits unused waivers only after forming a complete empty candidate set", async () => {
    await assertFunctionUnusedWaiverAudit();
    await assertFunctionScannerFailureDoesNotAuditWaiver();
  });

  it("preserves applied and stale waiver evidence while settling only actionable metrics", async () => {
    const root = createRoot("vibe-check-function-waiver-");
    try {
      const executable = createExecutable(root, functionScannerRows([functionRow()]));
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
          {
            identity: { ...PARAMETER_IDENTITY, functionName: "removed" },
            reason: "Stale function policy."
          }
        ],
        scanner: { executable }
      });
      const observed = await execute(executeFunctionMetrics, check.options, root);

      assert.deepEqual(observed.result, {
        status: "failed",
        data: { blockingFindingCount: 2, findingCount: 3 },
        messages: [
          {
            code: "blocking-findings",
            level: "error",
            message:
              "2 blocking finding(s) require attention; inspect this Check's Records for affected paths and measurements, then update the code or policy."
          },
          {
            code: "finding-detail",
            level: "error",
            message: "src/a.ts:1 a: cyclomatic-complexity 12 exceeds the 5 limit (areas: source)."
          },
          {
            code: "finding-detail",
            level: "error",
            message: "src/a.ts:1 a: function-code-density 20 exceeds the 10 limit (areas: source)."
          },
          {
            code: "finding-waived",
            level: "info",
            message:
              "Function metric finding for src/a.ts:1 a parameter-count was waived: Generated adapter signature."
          },
          {
            code: "unused-finding-waiver",
            level: "warning",
            message:
              "Configured function-metrics finding waiver for src/a.ts:1 removed parameter-count matched no finding; remove it or update its identity. Reason: Stale function policy."
          }
        ]
      });
      assert.equal(observed.records.length, 4);
      assert.deepEqual(observed.records[2]?.data, {
        blocking: false,
        codeAreas: ["source"],
        functionName: "a",
        limit: 4,
        metric: "parameter-count",
        path: "src/a.ts",
        startLine: 1,
        value: 7,
        waiver: { reason: "Generated adapter signature." }
      });
      assert.deepEqual(observed.records[3]?.data, {
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

  it("keeps duplicate function identities actionable when a waiver overmatches", async () => {
    const root = createRoot("vibe-check-function-overmatched-waiver-");
    try {
      const executable = createExecutable(
        root,
        functionScannerRows([functionRow(), functionRow()])
      );
      const check = functionMetrics({
        codeAreas: {
          source: {
            files: SOURCE_FILES,
            findingPolicy: "blocking",
            limits: STRICT_LIMITS
          }
        },
        findingWaivers: [{ identity: PARAMETER_IDENTITY, reason: "Must not cover two functions." }],
        scanner: { executable }
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

async function assertFunctionScannerFailureDoesNotAuditWaiver(): Promise<void> {
  const root = createRoot("vibe-check-function-failed-scan-waiver-");
  try {
    const executable = createExecutable(
      root,
      "if (process.argv.includes('--version')) process.stdout.write('1.23.0\\n'); else process.exitCode = 2;"
    );
    const check = functionMetrics({
      codeAreas: { source: { files: SOURCE_FILES } },
      findingWaivers: [{ identity: PARAMETER_IDENTITY, reason: "Awaiting complete scan." }],
      scanner: { executable }
    });
    const observed = await execute(executeFunctionMetrics, check.options, root);
    assert.deepEqual(observed.result, {
      status: "unavailable",
      reason: { code: "external-execution-failed" },
      messages: [
        {
          code: "external-execution-failed",
          level: "error",
          message:
            "Lizard did not complete successfully; run the configured command directly and inspect its environment."
        }
      ]
    });
    assert.deepEqual(observed.records, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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

function functionScannerRows(rows: readonly string[]): string {
  return [
    "if (process.argv.includes('--version')) process.stdout.write('1.23.0\\n');",
    `else process.stdout.write(${JSON.stringify(
      [
        "NLOC,CCN,token count,parameter count,length,location,file path,function name,long name,start line,end line",
        ...rows,
        ""
      ].join("\n")
    )});`
  ].join("\n");
}

function functionRow(): string {
  return "20,12,100,7,20,a@1-20@src/a.ts,src/a.ts,a,a (),1,20";
}
