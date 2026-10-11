import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { defineConfig, functionMetrics, run } from "../../index.ts";
import { createRoot } from "./constructor.test-support.ts";

const rust =
  "fn classify(value: i32) -> i32 {\n match value {\n 0 => 3,\n 1 => 4,\n _ => 5,\n }\n}\n";
const kotlin =
  "fun expression(value: Int) = value + 3\nfun choose(value: Int) = when(value) {\n0 -> 3\nelse -> 4\n}\nfun after() {}\n";
const division = "function divide(x,flag,a,b,y) {\n return x\n / (flag ? a : b) / y;\n}";
const rustIdentity = {
  functionName: "classify",
  metric: "cyclomatic-complexity",
  path: "src/arms.rs",
  startLine: 1
} as const;

test("functionMetrics upgraded readers publish strict findings, real contributors, and exact waiver identities through the public Worker path", async () => {
  const root = createRoot("vibe-check-upgrade-public-");
  try {
    writeFileSync(join(root, "src/arms.rs"), rust);
    writeFileSync(join(root, "src/body.kt"), kotlin);
    writeFileSync(join(root, "src/division.js"), division);
    for (const waived of [false, true]) {
      const check = functionMetrics({
        findingPolicy: "blocking",
        codeAreas: {
          rust: {
            files: { patterns: ["src/arms.rs"] },
            limits: { cyclomaticComplexity: { maximum: 2 } }
          },
          kotlin: {
            files: { patterns: ["src/body.kt"] },
            limits: {
              codeLines: {
                maximum: 3,
                lowComplexityAllowance: { cyclomaticComplexityBelow: 6, maximum: 3 }
              },
              cyclomaticComplexity: { maximum: 2 }
            }
          },
          javascript: {
            files: { patterns: ["src/division.js"] },
            limits: { cyclomaticComplexity: { maximum: 1 } }
          }
        },
        findingWaivers: waived
          ? [
              { identity: rustIdentity, reason: "Intentional three-way classification." },
              {
                identity: {
                  functionName: "oldChoose",
                  metric: "function-code-density",
                  path: "src/body.kt",
                  startLine: 2
                },
                reason: "Previous function identity is now stale."
              }
            ]
          : []
      });
      const result = await run(
        defineConfig({
          checks: [check],
          outputs: {
            machinePublication: { enabled: false },
            diagnosticLogging: { enabled: false },
            progressRendering: { enabled: false }
          }
        }),
        { projectRoot: root }
      );
      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") throw new Error("Expected complete Run");
      assert.deepEqual(result.snapshot.checks[0]?.outcome, {
        status: "failed",
        data: { findingCount: 3, blockingFindingCount: waived ? 2 : 3 }
      });
      const records = result.snapshot.records.map(({ data }) => data);
      assert.deepEqual(
        records.find((data) => Reflect.get(data, "path") === "src/arms.rs"),
        {
          ...rustIdentity,
          blocking: !waived,
          codeAreas: ["rust"],
          value: 3,
          limit: 2,
          complexityContributors: [
            { token: "=>", line: 4 },
            { token: "=>", line: 5 }
          ],
          ...(waived ? { waiver: { reason: "Intentional three-way classification." } } : {})
        }
      );
      assert.deepEqual(
        records.find((data) => Reflect.get(data, "path") === "src/body.kt"),
        {
          blocking: true,
          codeAreas: ["kotlin"],
          functionName: "choose",
          metric: "function-code-density",
          path: "src/body.kt",
          startLine: 2,
          value: 4,
          limit: 3
        }
      );
      assert.deepEqual(
        records.find((data) => Reflect.get(data, "path") === "src/division.js"),
        {
          blocking: true,
          codeAreas: ["javascript"],
          functionName: "divide",
          metric: "cyclomatic-complexity",
          path: "src/division.js",
          startLine: 1,
          value: 2,
          limit: 1,
          complexityContributors: [{ token: "?", line: 3 }]
        }
      );
      assert.equal(records.length, waived ? 4 : 3);
      if (waived)
        assert.deepEqual(
          records.find((data) => Reflect.get(data, "kind") === "finding-waiver-audit"),
          {
            identity: {
              functionName: "oldChoose",
              metric: "function-code-density",
              path: "src/body.kt",
              startLine: 2
            },
            kind: "finding-waiver-audit",
            matchCount: 0,
            reason: "Previous function identity is now stale.",
            status: "unused"
          }
        );
    }
    const equalLimit = functionMetrics({
      findingPolicy: "blocking",
      codeAreas: {
        rust: {
          files: { patterns: ["src/arms.rs"] },
          limits: { cyclomaticComplexity: { maximum: 3 } }
        }
      }
    });
    const atLimit = await run(
      defineConfig({
        checks: [equalLimit],
        outputs: {
          machinePublication: { enabled: false },
          diagnosticLogging: { enabled: false },
          progressRendering: { enabled: false }
        }
      }),
      { projectRoot: root }
    );
    assert.equal(atLimit.kind, "completed");
    if (atLimit.kind !== "completed") throw new Error("Expected complete Run");
    assert.deepEqual(atLimit.snapshot.checks[0]?.outcome, {
      status: "passed",
      data: { findingCount: 0, blockingFindingCount: 0 }
    });
    assert.deepEqual(atLimit.snapshot.records, []);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
