import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { defineConfig, functionMetrics, run } from "../../index.ts";
import { createRoot } from "./constructor.test-support.ts";

const typed =
  'function marker(): string {\n return "marker";\n}\nif (true) {\n for (const value of [1]) {\n  if (true) { void value; }\n }\n}\n';
const coalesce = "function defaults(a,b,c,d) {\n return [a ?? 0,b??0,c ?? 0,d??0];\n}\n";
const identity = {
  functionName: "defaults",
  metric: "cyclomatic-complexity",
  path: "src/coalesce.ts",
  startLine: 1
} as const;
const outputs = {
  machinePublication: { enabled: false },
  diagnosticLogging: { enabled: false },
  progressRendering: { enabled: false }
} as const;

test("functionMetrics TypeScript corrections reach public Worker findings, default limits, strict limits, and waiver reconciliation", async () => {
  const root = createRoot("vibe-check-ts-public-");
  try {
    writeFileSync(join(root, "src/typed.ts"), typed);
    writeFileSync(join(root, "src/coalesce.ts"), coalesce);
    for (const profile of ["default", "diagnostic", "at-limit", "waived"] as const) {
      const check = functionMetrics({
        findingPolicy: "blocking",
        codeAreas: {
          samples: {
            files: { patterns: ["src/*.ts"] },
            ...(profile === "default"
              ? {}
              : {
                  limits: {
                    cyclomaticComplexity: { maximum: profile === "at-limit" ? 5 : 1 },
                    nestingDepth: { maximum: profile === "diagnostic" ? 1 : 4 }
                  }
                })
          }
        },
        findingWaivers:
          profile === "waived"
            ? [
                { identity, reason: "Reviewed four independent defaults." },
                {
                  identity: {
                    functionName: "marker",
                    metric: "nesting-depth",
                    path: "src/typed.ts",
                    startLine: 1
                  },
                  reason: "Old boundary-contamination finding no longer exists."
                }
              ]
            : []
      });
      const result = await run(defineConfig({ checks: [check], outputs }), { projectRoot: root });
      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") throw new Error("Expected complete Run");
      const diagnostic = profile === "diagnostic";
      let findingCount = 0;
      if (diagnostic) findingCount = 2;
      else if (profile === "waived") findingCount = 1;
      assert.deepEqual(result.snapshot.checks[0]?.outcome, {
        status: diagnostic ? "failed" : "passed",
        data: { findingCount: findingCount, blockingFindingCount: diagnostic ? 2 : 0 }
      });
      const records = result.snapshot.records.map((record) => record.data);
      assert.equal(
        records.some((data) => Reflect.get(data, "path") === "src/typed.ts"),
        false
      );
      if (diagnostic || profile === "waived") {
        assert.deepEqual(
          records.find((data) => Reflect.get(data, "metric") === "cyclomatic-complexity"),
          {
            ...identity,
            blocking: diagnostic,
            codeAreas: ["samples"],
            value: 5,
            limit: 1,
            complexityContributors: [2, 2, 2, 2].map((line) => ({ token: "??", line })),
            ...(profile === "waived"
              ? { waiver: { reason: "Reviewed four independent defaults." } }
              : {})
          }
        );
      }
      if (diagnostic) {
        assert.deepEqual(
          records.find((data) => Reflect.get(data, "metric") === "nesting-depth"),
          {
            blocking: true,
            functionName: "defaults",
            metric: "nesting-depth",
            path: "src/coalesce.ts",
            startLine: 1,
            codeAreas: ["samples"],
            value: 4,
            limit: 1
          }
        );
      } else if (profile === "waived") {
        assert.deepEqual(
          records.find((data) => Reflect.get(data, "kind") === "finding-waiver-audit"),
          {
            identity: {
              functionName: "marker",
              metric: "nesting-depth",
              path: "src/typed.ts",
              startLine: 1
            },
            kind: "finding-waiver-audit",
            matchCount: 0,
            reason: "Old boundary-contamination finding no longer exists.",
            status: "unused"
          }
        );
      } else assert.deepEqual(records, []);
    }
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("functionMetrics retains every nullish contributor beyond the eight-item human preview", async () => {
  const root = createRoot("vibe-check-ts-contributors-");
  try {
    writeFileSync(
      join(root, "src/long.ts"),
      `function many(a) {\n${Array.from({ length: 9 }, () => " a ?? 0;").join("\n")}\n}`
    );
    const check = functionMetrics({
      findingPolicy: "blocking",
      codeAreas: {
        sample: {
          files: { patterns: ["src/long.ts"] },
          limits: { cyclomaticComplexity: { maximum: 1 }, nestingDepth: { maximum: 10 } }
        }
      }
    });
    const result = await run(defineConfig({ checks: [check], outputs }), { projectRoot: root });
    assert.equal(result.kind, "completed");
    if (result.kind !== "completed") throw new Error("Expected complete Run");
    assert.deepEqual(result.snapshot.checks[0]?.outcome, {
      status: "failed",
      data: { findingCount: 1, blockingFindingCount: 1 }
    });
    assert.deepEqual(result.snapshot.records[0]?.data, {
      blocking: true,
      codeAreas: ["sample"],
      functionName: "many",
      metric: "cyclomatic-complexity",
      path: "src/long.ts",
      startLine: 1,
      value: 10,
      limit: 1,
      complexityContributors: Array.from({ length: 9 }, (_, index) => ({
        token: "??",
        line: index + 2
      }))
    });
    const message = result.checkMessages.find((entry) => entry.code === "finding-detail")?.message;
    assert.ok(message !== undefined);
    assert.match(message, /1 additional contributor\(s\) are in this finding Record/);
    assert.doesNotMatch(message, /\?\? at line 10/);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
