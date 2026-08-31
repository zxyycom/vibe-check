import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { functionMetrics } from "./constructor.ts";
import { defineConfig } from "../../project-definition/project-definition.ts";
import { run } from "../../project-run/run.ts";
import {
  MIXED_DETAILS,
  NON_BLOCKING_DETAILS,
  REJECTED_DETAILS,
  TWO_OMITTED_DETAILS
} from "./finding-messages.test-support.ts";
import { executeFunctionMetrics } from "./execution.ts";
import { parseFunctionMetricsData } from "./final-data.ts";
import type {
  CheckDependencies,
  CheckExecution,
  CheckExecutionContext,
  CheckProjectContext,
  CheckResult,
  DeepReadonly
} from "../../check/check.ts";

const NO_DEPENDENCIES: CheckDependencies = Object.freeze({
  get: (checkId: string) =>
    Object.freeze({
      ok: false,
      error: Object.freeze({ code: "dependency-not-declared", checkId })
    }),
  list: () => Object.freeze([])
});

function project(root: string): CheckProjectContext {
  return Object.freeze({
    flags: Object.freeze([]),
    root
  });
}

async function execute<Options extends object>(
  callback: CheckExecution<Options>,
  options: DeepReadonly<Options>,
  root: string,
  signal: AbortSignal = new AbortController().signal
): Promise<
  Readonly<{
    readonly records: readonly ReportedRecord[];
    readonly result: CheckResult;
  }>
> {
  const records: ReportedRecord[] = [];
  const context: CheckExecutionContext<Options> = Object.freeze({
    dependencies: NO_DEPENDENCIES,
    options,
    project: project(root),
    records: Object.freeze({
      report: (identity: Readonly<{ readonly id: string }>, data: object): void => {
        records.push(Object.freeze({ data, identity }));
      }
    }),
    signal
  });
  const result = await callback(context);
  return Object.freeze({
    records: Object.freeze(records),
    result
  });
}

interface ReportedRecord {
  readonly data: object;
  readonly identity: Readonly<{ readonly id: string }>;
}

function recordField(record: ReportedRecord, key: string): unknown {
  return Object.hasOwn(record.data, key) ? Reflect.get(record.data, key) : undefined;
}

function createRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "a.ts"), "export const a = 1;\n", "utf8");
  writeFileSync(join(root, "src", "b.ts"), "export const b = 2;\n", "utf8");
  return root;
}

function createExecutable(root: string, source: string): string {
  const path = join(root, "fake-lizard");
  writeFileSync(path, `#!${process.execPath}\n${source}`, "utf8");
  chmodSync(path, 0o755);
  return path;
}

const STRICT_LIMITS = {
  codeLines: {
    maximum: 10,
    lowComplexityAllowance: { cyclomaticComplexityBelow: 3, maximum: 20 }
  },
  cyclomaticComplexity: { maximum: 5 },
  parameters: { maximum: 4 }
} as const;

const RELAXED_LIMITS = {
  codeLines: {
    maximum: 100,
    lowComplexityAllowance: { cyclomaticComplexityBelow: 3, maximum: 150 }
  },
  cyclomaticComplexity: { maximum: 100 },
  parameters: { maximum: 100 }
} as const;

describe("functionMetrics constructor", () => {
  it("materializes frozen defaults and rejects malformed closed policy", async () => {
    const check = functionMetrics();
    assert.equal(check.parseData, parseFunctionMetricsData);
    assert.deepEqual(check.parseData({ blockingFindingCount: 1, findingCount: 1 }), {
      blockingFindingCount: 1,
      findingCount: 1
    });
    assert.throws(
      () => check.parseData({ blockingFindingCount: 1, findingCount: 0 }),
      /functionMetrics final data/
    );
    assert.equal(check.options.scanner.executable, "lizard");
    assert.equal(check.options.codeAreas.project?.findingPolicy, "non-blocking");
    assert.deepEqual(check.options.codeAreas.project?.limits, {
      codeLines: {
        lowComplexityAllowance: { cyclomaticComplexityBelow: 6, maximum: 180 },
        maximum: 60
      },
      cyclomaticComplexity: { maximum: 12 },
      parameters: { maximum: 6 }
    });
    assert.equal(Object.isFrozen(check.options), true);
    assert.equal(Object.isFrozen(check.options.codeAreas.project?.files.include), true);
    assert.equal(check.options.codeAreas.project?.files.include.length, 55);
    assert.equal(check.options.codeAreas.project?.files.include.includes("**/*.[tT][sS]"), true);

    const invalidInputs: readonly unknown[] = [
      { unknown: true },
      { codeAreas: {} },
      { codeAreas: { source: { files: { excludeDirs: [] } } } },
      { codeAreas: { source: { files: { source: "auto" } } } },
      { codeAreas: { "": { files: {} } } },
      { codeAreas: { source: { files: {}, limits: { parameters: { maximum: 0 } } } } },
      { codeAreas: { source: { files: {}, limits: { parameters: { maximum: 1.5 } } } } },
      {
        codeAreas: {
          source: {
            files: {},
            limits: {
              codeLines: {
                maximum: 50,
                lowComplexityAllowance: { maximum: 49 }
              }
            }
          }
        }
      },
      { findingPolicy: "warning" },
      { scanner: { executable: "" } },
      { scanner: { args: ["--csv"] } },
      { scanner: { availabilityArgs: ["--version"] } }
    ];
    for (const input of invalidInputs) {
      assert.throws(
        () => Reflect.apply(functionMetrics, undefined, [input]),
        /functionMetrics options must use the documented closed policy/
      );
    }

    const invalidPreflight = await check.preflight!(
      { ...check.options, codeAreas: {} },
      new AbortController().signal
    );
    assert.equal(invalidPreflight.status, "failure");

    const specialAreaId = "__proto__";
    const specialAreaCheck = functionMetrics({
      codeAreas: Object.fromEntries([[specialAreaId, { files: {} }]])
    });
    assert.equal(Object.hasOwn(specialAreaCheck.options.codeAreas, specialAreaId), true);
  });
});

describe("functionMetrics availability", () => {
  it("fails aggregate and does not scan when version provenance is unsupported", async () => {
    const root = createRoot("vibe-check-function-version-rejection-");
    const scanMarker = join(root, "scan-called");
    try {
      const executable = createExecutable(
        root,
        [
          "if (process.argv.includes('--version')) {",
          "  process.stdout.write('1.24.0\\n');",
          "} else {",
          "  require('node:fs').writeFileSync('scan-called', '');",
          "}"
        ].join("\n")
      );
      const result = await run(
        defineConfig({ checks: [functionMetrics({ scanner: { executable } })] }),
        {
          checkAggregation: {
            checks: "all",
            empty: "failed",
            mode: "all",
            notApplicable: "fail",
            unavailable: "fail"
          },
          projectRoot: root
        }
      );

      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.equal(result.aggregate, "failed");
      assert.deepEqual(result.snapshot.checks[0]?.outcome, {
        status: "unavailable",
        reason: { code: "external-dependency-unavailable" }
      });
      assert.equal(existsSync(scanMarker), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("functionMetrics cancellation", () => {
  it("stops before scanner measurement when cancellation is observed after availability", async () => {
    const root = createRoot("vibe-check-function-cancelled-");
    const scanMarker = join(root, "scan-called");
    try {
      const executable = createExecutable(
        root,
        [
          "if (process.argv.includes('--version')) {",
          "  setTimeout(() => process.stdout.write('1.23.0\\n'), 50);",
          "} else {",
          "  require('node:fs').writeFileSync('scan-called', '');",
          "}"
        ].join("\n")
      );
      const check = functionMetrics({ scanner: { executable } });
      const controller = new AbortController();
      const cancellation = setTimeout(() => controller.abort(), 5);
      try {
        const observed = await execute(
          executeFunctionMetrics,
          check.options,
          root,
          controller.signal
        );
        assert.deepEqual(observed.result, {
          status: "unavailable",
          reason: { code: "cancelled" },
          messages: [
            {
              code: "cancelled",
              level: "error",
              message:
                "Function metrics was cancelled before it could form a complete result; inspect the caller's cancellation reason and retry if appropriate."
            }
          ]
        });
        assert.equal(observed.records.length, 0);
        assert.equal(existsSync(scanMarker), false);
      } finally {
        clearTimeout(cancellation);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("functionMetrics area findings", () => {
  it("records complete area evidence and fails only for effective blocking findings", async () => {
    const root = createRoot("vibe-check-function-areas-");
    try {
      const executable = createExecutable(
        root,
        [
          "if (process.argv.includes('--version')) {",
          "  process.stdout.write('1.23.0\\n');",
          "} else {",
          "  const expected = ['src/a.ts', 'src/b.ts', '--csv'];",
          "  if (JSON.stringify(process.argv.slice(2)) !== JSON.stringify(expected)) process.exit(2);",
          "  process.stdout.write('NLOC,CCN,token count,parameter count,length,location,file path,function name,long name,start line,end line\\n20,12,100,7,20,a@1-20@src/a.ts,src/a.ts,a,a (),1,20\\n20,12,100,7,20,b@1-20@src/b.ts,src/b.ts,b,b (),1,20\\n');",
          "}"
        ].join("\n")
      );
      const nonBlockingOptions = {
        codeAreas: {
          source: {
            files: { exclude: [], include: ["src/**/*.ts"], source: "filesystem" },
            limits: STRICT_LIMITS
          }
        },
        scanner: { executable }
      } as const;
      const nonBlocking = functionMetrics(nonBlockingOptions);
      const observed = await execute(executeFunctionMetrics, nonBlocking.options, root);
      assert.deepEqual(observed.result, {
        status: "passed",
        data: { blockingFindingCount: 0, findingCount: 6 },
        messages: [
          {
            code: "non-blocking-findings",
            level: "warning",
            message:
              "6 non-blocking finding(s) were recorded; inspect this Check's Records for affected paths and measurements, then update the code or policy."
          },
          ...NON_BLOCKING_DETAILS
        ]
      });
      assert.equal(observed.records.length, 6);
      assert.equal(
        observed.records.every((record) => recordField(record, "blocking") === false),
        true
      );

      const mixed = functionMetrics({
        ...nonBlockingOptions,
        codeAreas: {
          source: nonBlockingOptions.codeAreas.source,
          overlap: {
            files: { exclude: [], include: ["src/a.ts"], source: "filesystem" },
            findingPolicy: "blocking",
            limits: RELAXED_LIMITS
          }
        }
      });
      const blocked = await execute(executeFunctionMetrics, mixed.options, root);
      assert.deepEqual(blocked.result, {
        status: "failed",
        data: { blockingFindingCount: 3, findingCount: 6 },
        messages: [
          {
            code: "blocking-findings",
            level: "error",
            message:
              "3 blocking finding(s) require attention; inspect this Check's Records for affected paths and measurements, then update the code or policy."
          },
          ...MIXED_DETAILS
        ]
      });
      const aRecords = blocked.records.filter(
        (record) => recordField(record, "path") === "src/a.ts"
      );
      const bRecords = blocked.records.filter(
        (record) => recordField(record, "path") === "src/b.ts"
      );
      assert.equal(aRecords.length, 3);
      assert.equal(
        aRecords.every((record) => recordField(record, "blocking") === true),
        true
      );
      assert.equal(
        aRecords.every(
          (record) => JSON.stringify(recordField(record, "codeAreas")) === '["overlap","source"]'
        ),
        true
      );
      assert.equal(bRecords.length, 3);
      assert.equal(
        bRecords.every((record) => recordField(record, "blocking") === false),
        true
      );
      assert.equal(
        bRecords.every(
          (record) => JSON.stringify(recordField(record, "codeAreas")) === '["source"]'
        ),
        true
      );
      const sourceUnavailable = await execute(
        executeFunctionMetrics,
        {
          ...mixed.options,
          codeAreas: {
            source: {
              ...mixed.options.codeAreas.source,
              files: { ...mixed.options.codeAreas.source.files, source: "git-worktree" }
            }
          }
        },
        root
      );
      assert.deepEqual(sourceUnavailable.result, {
        status: "unavailable",
        reason: { code: "source-unavailable" },
        messages: [
          {
            code: "source-unavailable",
            level: "error",
            message:
              "Function metrics could not collect its configured project files; check the project root, file permissions, and selected file source."
          }
        ]
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports every rejected selected path once and sends only accepted paths to Lizard", async () => {
    const root = createRoot("vibe-check-function-rejected-");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(join(root, "docs", "data.json"), "{}\n", "utf8");
      writeFileSync(join(root, "docs", "guide.md"), "# Guide\n", "utf8");
      const executable = createExecutable(
        root,
        [
          "if (process.argv.includes('--version')) {",
          "  process.stdout.write('1.23.0\\n');",
          "} else {",
          "  const expected = ['src/a.ts', '--csv'];",
          "  if (JSON.stringify(process.argv.slice(2)) !== JSON.stringify(expected)) process.exit(2);",
          "}"
        ].join("\n")
      );
      const check = functionMetrics({
        codeAreas: {
          broad: {
            files: {
              exclude: [],
              include: ["src/a.ts", "docs/**"],
              source: "filesystem"
            },
            findingPolicy: "blocking"
          },
          overlap: {
            files: { exclude: [], include: ["docs/guide.md"], source: "filesystem" },
            findingPolicy: "blocking"
          }
        },
        scanner: { executable }
      });

      const observed = await execute(executeFunctionMetrics, check.options, root);
      assert.deepEqual(observed.result, {
        status: "passed",
        data: { blockingFindingCount: 0, findingCount: 2 },
        messages: [
          {
            code: "input-rejected",
            level: "warning",
            message:
              "2 selected functionMetrics input file(s) were rejected because their file type is unsupported; inspect this Check's Records and narrow files.include/exclude."
          },
          ...REJECTED_DETAILS
        ]
      });
      assert.deepEqual(observed.records, [
        {
          identity: { id: "/input-rejected/docs/data.json" },
          data: {
            blocking: false,
            codeAreas: ["broad"],
            kind: "input-rejected",
            path: "docs/data.json",
            reason: "unsupported-file-type"
          }
        },
        {
          identity: { id: "/input-rejected/docs/guide.md" },
          data: {
            blocking: false,
            codeAreas: ["broad", "overlap"],
            kind: "input-rejected",
            path: "docs/guide.md",
            reason: "unsupported-file-type"
          }
        }
      ]);

      createExecutable(
        root,
        [
          "if (process.argv.includes('--version')) {",
          "  process.stdout.write('1.23.0\\n');",
          "} else process.exit(2);"
        ].join("\n")
      );
      const unavailableObserved = await execute(executeFunctionMetrics, check.options, root);
      assert.deepEqual(unavailableObserved.records, observed.records);
      assert.deepEqual(unavailableObserved.result, {
        status: "unavailable",
        reason: { code: "external-execution-failed" },
        messages: [
          {
            code: "external-execution-failed",
            level: "error",
            message:
              "Lizard did not complete successfully; run the configured command directly and inspect its environment."
          },
          {
            code: "input-rejected",
            level: "warning",
            message:
              "2 selected functionMetrics input file(s) were rejected because their file type is unsupported; inspect this Check's Records and narrow files.include/exclude."
          }
        ]
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not start Lizard when every selected path is rejected", async () => {
    const root = createRoot("vibe-check-function-all-rejected-");
    const marker = join(root, "lizard-called");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      const rejectedPaths = Array.from(
        { length: 12 },
        (_, index) => `docs/guide-${String(index + 1).padStart(2, "0")}.md`
      );
      for (const path of rejectedPaths) {
        writeFileSync(join(root, path), "# Guide\n", "utf8");
      }
      const executable = createExecutable(
        root,
        "require('node:fs').writeFileSync('lizard-called', '');"
      );
      const check = functionMetrics({
        codeAreas: {
          docs: {
            files: { exclude: [], include: ["docs/**"], source: "filesystem" },
            findingPolicy: "blocking"
          }
        },
        scanner: { executable }
      });

      const observed = await execute(executeFunctionMetrics, check.options, root);
      assert.deepEqual(observed.result, {
        status: "passed",
        data: { blockingFindingCount: 0, findingCount: 12 },
        messages: [
          {
            code: "input-rejected",
            level: "warning",
            message:
              "12 selected functionMetrics input file(s) were rejected because their file type is unsupported; inspect this Check's Records and narrow files.include/exclude."
          },
          ...rejectedPaths.slice(0, 10).map((path) => ({
            code: "finding-detail",
            level: "warning",
            message: `${path}: selected input is not supported by function metrics (areas: docs).`
          })),
          TWO_OMITTED_DETAILS
        ]
      });
      assert.equal(observed.records.length, 12);
      assert.equal(existsSync(marker), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
