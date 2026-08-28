import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { functionMetrics } from "./constructor.ts";
import { executeFunctionMetrics } from "./execution.ts";
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
    })
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
    assert.equal(check.options.scanner.executable, "lizard");
    assert.equal(check.options.codeAreas.project?.findingPolicy, "blocking");
    assert.deepEqual(check.options.codeAreas.project?.limits, {
      codeLines: {
        lowComplexityAllowance: { cyclomaticComplexityBelow: 5, maximum: 150 },
        maximum: 50
      },
      cyclomaticComplexity: { maximum: 10 },
      parameters: { maximum: 5 }
    });
    assert.equal(Object.isFrozen(check.options), true);
    assert.equal(Object.isFrozen(check.options.codeAreas.project?.files.include), true);

    const invalidInputs: readonly unknown[] = [
      { unknown: true },
      { codeAreas: {} },
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

describe("functionMetrics cancellation", () => {
  it("stops before scanner measurement when cancellation is observed after availability", async () => {
    const root = createRoot("vibe-check-function-cancelled-");
    const scanMarker = join(root, "scan-called");
    try {
      const executable = createExecutable(
        root,
        [
          "if (process.argv.includes('--version')) {",
          "  setTimeout(() => process.stdout.write('lizard 1.23\\n'), 50);",
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
          reason: { code: "cancelled" }
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
          "  process.stdout.write('lizard 1.23\\n');",
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
            files: { excludeDirs: [], generatedFiles: [], include: ["src/**/*.ts"] },
            limits: STRICT_LIMITS
          }
        },
        findingPolicy: "non-blocking",
        scanner: { executable }
      } as const;
      const nonBlocking = functionMetrics(nonBlockingOptions);
      const observed = await execute(executeFunctionMetrics, nonBlocking.options, root);
      assert.deepEqual(observed.result, {
        status: "passed",
        data: { blockingFindingCount: 0, findingCount: 6 }
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
            files: { excludeDirs: [], generatedFiles: [], include: ["src/a.ts"] },
            findingPolicy: "blocking",
            limits: RELAXED_LIMITS
          }
        }
      });
      const blocked = await execute(executeFunctionMetrics, mixed.options, root);
      assert.deepEqual(blocked.result, {
        status: "failed",
        data: { blockingFindingCount: 3, findingCount: 6 }
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
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
