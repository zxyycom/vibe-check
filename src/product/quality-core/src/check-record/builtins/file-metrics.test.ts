import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { FileScannerDependency } from "../../../../scanner-dependencies.ts";
import { resolveCheckCatalog, type ResolvedCheckCatalog } from "../catalog.ts";
import { coordinateCheckRecords } from "../coordinator.ts";
import { createRecordId } from "../identity.ts";
import { evaluateDecisionPolicy } from "../policy-evaluator.ts";
import {
  validatePolicyResolution,
  validateReferenceFacts
} from "../policy-validation.ts";
import {
  FILE_METRICS_CHECK_DEFINITION,
  createFileMetricsBinding,
  resolveFileMetricsApplicability
} from "./file-metrics.ts";

const referenceId = "reference/v1/sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const semantics = {
  codeAreas: {
    source: {
      description: "Source",
      excludeGlobs: [],
      globs: ["src/**/*.ts"],
      warningPolicy: "moderate"
    }
  },
  generatedFiles: [],
  codeLines: {
    absoluteFloor: 300,
    changedDelta: 100,
    lowDecisionTokenAllowance: {
      codeLineFloor: 500,
      maxDecisionTokens: 10
    }
  }
} as const;

describe("file-metrics built-in Check", () => {
  it("runs controlled current and reference exact inputs into one snapshot and reference policy result", async () => {
    const fixture = createSccFixture({
      currentRows: [sccRow("src/a.ts", 450, 400, 20)],
      referenceRows: [sccRow("src/a.ts", 250, 200, 20)]
    });

    try {
      const runtime = createFileMetricsBinding({
        changedFiles: ["src/a.ts"],
        current: { rootDir: fixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: fixture.dependency,
        reference: {
          referenceName: "baseline",
          rootDir: fixture.referenceRoot,
          approvedExactPaths: ["src/a.ts"]
        },
        semantics
      });
      const catalog = resolveRuntimeCatalog(runtime.binding, ["src/a.ts"]);

      const snapshot = await coordinateCheckRecords(catalog);
      assert.equal(snapshot.runs.length, 1);
      assert.deepEqual(snapshot.runs[0]?.result, { verdict: "failed" });
      assert.equal(snapshot.records.length, 1);
      assert.deepEqual(snapshot.records[0], {
        recordId: snapshot.records[0]?.recordId,
        checkId: "file-metrics",
        checkRunId: snapshot.runs[0]?.checkRunId,
        recordTypeId: "file-code-lines",
        level: "warning",
        semanticSubject: "src/a.ts",
        message: "File src/a.ts has 400 code lines (threshold: 300)",
        fields: {
          codeArea: "source",
          limit: 300,
          metric: "code-lines",
          value: 400
        },
        location: { path: "src/a.ts", line: 1, column: 1 }
      });

      const policy = validatePolicyResolution(fileRegressionPolicy(), catalog);
      assert.equal(policy.ok, true);
      if (!policy.ok) throw new Error("Expected policy to resolve");
      const referenceFacts = validateReferenceFacts(
        runtime.referenceFacts(snapshot),
        policy.value,
        snapshot
      );
      assert.equal(referenceFacts.ok, true);
      if (!referenceFacts.ok) throw new Error("Expected reference facts to validate");
      assert.deepEqual(referenceFacts.value, {
        evidence: [{ checkId: "file-metrics", referenceName: "baseline", status: "complete" }],
        relations: [{
          recordId: snapshot.records[0]?.recordId,
          referenceName: "baseline",
          relationId: "regression"
        }]
      });
      assert.equal(
        evaluateDecisionPolicy(policy.value, snapshot, referenceFacts.value).gate.status,
        "failed"
      );
    } finally {
      fixture.cleanup();
    }
  });

  it("uses the frozen changed-file scope instead of baseline delta to classify changed records", async () => {
    const fixture = createSccFixture({
      currentRows: [
        sccRow("src/a.ts", 450, 400, 20),
        sccRow("src/b.ts", 550, 500, 20)
      ],
      referenceRows: [
        sccRow("src/a.ts", 450, 400, 20),
        sccRow("src/b.ts", 150, 100, 20)
      ]
    });
    const changedFiles = ["a.ts"];

    try {
      const runtime = createFileMetricsBinding({
        changedFiles,
        current: {
          rootDir: fixture.currentRoot,
          approvedExactPaths: ["src/a.ts", "src/b.ts"]
        },
        dependency: fixture.dependency,
        reference: {
          referenceName: "baseline",
          rootDir: fixture.referenceRoot,
          approvedExactPaths: ["src/a.ts", "src/b.ts"]
        },
        semantics
      });
      changedFiles.splice(0, changedFiles.length, "src/b.ts");

      const snapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(runtime.binding, ["src/a.ts", "src/b.ts"])
      );
      const facts = runtime.referenceFacts(snapshot);
      const relatedRecords = facts.relations.map((relation) => ({
        path: snapshot.records.find((record) => record.recordId === relation.recordId)?.location?.path,
        relationId: relation.relationId
      }));

      assert.equal(snapshot.records.length, 2);
      assert.deepEqual(relatedRecords, [{ path: "src/a.ts", relationId: "changed" }]);
    } finally {
      fixture.cleanup();
    }
  });

  it("fails current unavailable process CSV and out-of-scope batches without records", async () => {
    const unavailableRoot = mkdtempSync(join(tmpdir(), "vibe-check-file-metrics-unavailable-"));
    const unavailableDependency: FileScannerDependency = {
      executable: join(unavailableRoot, "missing-scc"),
      args: [],
      availabilityArgs: ["--version"]
    };
    const fixtures = [
      {
        expectedCategory: "unavailable",
        rootDir: unavailableRoot,
        dependency: unavailableDependency,
        cleanup: () => rmSync(unavailableRoot, { recursive: true, force: true })
      },
      fixtureCase(createSccFixture({
        currentRows: [],
        referenceRows: [],
        currentExitCode: 7
      }), "execution-failed"),
      fixtureCase(createSccFixture({
        currentOutput: "not,scc,csv\n",
        currentRows: [],
        referenceRows: []
      }), "invalid-result"),
      fixtureCase(createSccFixture({
        currentRows: [
          sccRow("src/a.ts", 450, 400, 20),
          sccRow("../outside.ts", 450, 400, 20)
        ],
        referenceRows: []
      }), "invalid-result")
    ] as const;

    try {
      for (const fixture of fixtures) {
        const runtime = createFileMetricsBinding({
          changedFiles: [],
          current: { rootDir: fixture.rootDir, approvedExactPaths: ["src/a.ts"] },
          dependency: fixture.dependency,
          reference: null,
          semantics
        });
        const snapshot = await coordinateCheckRecords(
          resolveRuntimeCatalog(runtime.binding, ["src/a.ts"])
        );
        assert.equal(snapshot.runs[0]?.status, "failed");
        assert.equal(snapshot.runs[0]?.result, null);
        assert.equal(snapshot.runs[0]?.diagnostic?.category, fixture.expectedCategory);
        assert.deepEqual(snapshot.records, []);
      }
    } finally {
      for (const fixture of fixtures) fixture.cleanup();
    }
  });

  it("retains an earlier valid record when a later out-of-scope batch is rejected", async () => {
    const fixture = createSccFixture({
      currentRows: [
        sccRow("src/a.ts", 450, 400, 20),
        sccRow("../outside.ts", 450, 400, 20)
      ],
      referenceRows: []
    });

    try {
      const runtime = createFileMetricsBinding({
        changedFiles: [],
        current: { rootDir: fixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: fixture.dependency,
        reference: null,
        semantics
      });
      const snapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(runtime.binding, ["src/a.ts"]),
        {
          coordinate: async ([contribution]) => {
            if (contribution === undefined) throw new Error("Expected contribution");
            assert.equal(contribution.ports.submitRecord({
              recordTypeId: "file-code-lines",
              level: "warning",
              semanticSubject: "src/prior.ts",
              message: "Prior valid record",
              fields: {
                codeArea: "source",
                limit: 300,
                metric: "code-lines",
                value: 350
              },
              location: { path: "src/prior.ts", line: 1, column: 1 }
            }), "committed");
            const result = await contribution.execute(contribution.ports);
            return [{
              checkId: contribution.checkId,
              checkRunId: contribution.checkRunId,
              status: "returned",
              result
            }];
          }
        }
      );

      assert.equal(snapshot.runs[0]?.status, "failed");
      assert.equal(snapshot.runs[0]?.result, null);
      assert.equal(snapshot.runs[0]?.diagnostic?.category, "invalid-result");
      assert.deepEqual(snapshot.records.map((record) => record.semanticSubject), ["src/prior.ts"]);
    } finally {
      fixture.cleanup();
    }
  });

  it("keeps current facts complete when reference scope is incomplete and policy readiness stops evaluation", async () => {
    const fixture = createSccFixture({
      currentRows: [sccRow("src/a.ts", 450, 400, 20)],
      referenceRows: [sccRow("../outside.ts", 250, 200, 20)]
    });

    try {
      const runtime = createFileMetricsBinding({
        changedFiles: [],
        current: { rootDir: fixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: fixture.dependency,
        reference: {
          referenceName: "baseline",
          rootDir: fixture.referenceRoot,
          approvedExactPaths: ["src/a.ts"]
        },
        semantics
      });
      const catalog = resolveRuntimeCatalog(runtime.binding, ["src/a.ts"]);
      const snapshot = await coordinateCheckRecords(catalog);
      const policy = validatePolicyResolution(fileRegressionPolicy(), catalog);
      assert.equal(policy.ok, true);
      if (!policy.ok) throw new Error("Expected policy to resolve");
      const facts = validateReferenceFacts(runtime.referenceFacts(snapshot), policy.value, snapshot);
      assert.equal(facts.ok, true);
      if (!facts.ok) throw new Error("Expected incomplete facts to validate");
      const decision = evaluateDecisionPolicy(policy.value, snapshot, facts.value);

      assert.equal(snapshot.runs.length, 1);
      assert.equal(snapshot.runs[0]?.status, "completed");
      assert.deepEqual(snapshot.runs[0]?.result, { verdict: "failed" });
      assert.equal(snapshot.completeness.status, "complete");
      assert.equal(snapshot.records.length, 1);
      assert.deepEqual(facts.value, {
        evidence: [{ checkId: "file-metrics", referenceName: "baseline", status: "incomplete" }],
        relations: []
      });
      assert.equal(decision.gate.status, "not-evaluated");
      if (decision.gate.status !== "not-evaluated") {
        throw new Error("Expected reference readiness to stop evaluation");
      }
      assert.equal(decision.gate.policyId, "file-regressions");
      assert.equal(decision.gate.reason, "comparison-unavailable");
    } finally {
      fixture.cleanup();
    }
  });

  it("keeps file record identity stable when only current location changes", async () => {
    const fixture = createSccFixture({
      currentRows: [sccRow("src/a.ts", 450, 400, 20)],
      referenceRows: []
    });

    try {
      const runtime = createFileMetricsBinding({
        changedFiles: [],
        current: { rootDir: fixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: fixture.dependency,
        reference: null,
        semantics
      });
      const snapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(runtime.binding, ["src/a.ts"])
      );
      const record = snapshot.records[0]!;
      const recordType = FILE_METRICS_CHECK_DEFINITION.recordTypes[0];
      const relocatedId = createRecordId({
        ...record,
        location: { path: record.location!.path, line: 99, column: 7 }
      }, recordType).recordId;

      assert.equal(relocatedId, record.recordId);
    } finally {
      fixture.cleanup();
    }
  });
});

function resolveRuntimeCatalog(
  binding: ReturnType<typeof createFileMetricsBinding>["binding"],
  approvedExactPaths: readonly string[]
): ResolvedCheckCatalog {
  const catalog = resolveCheckCatalog({
    invocationKey: "file-metrics-test",
    definitions: [FILE_METRICS_CHECK_DEFINITION],
    bindings: [{ checkId: "file-metrics", execute: binding }],
    selectedCheckIds: ["file-metrics"],
    resolveApplicability: () => resolveFileMetricsApplicability(approvedExactPaths)
  });
  if (!catalog.ok) throw new Error("Expected file-metrics catalog to resolve");
  return catalog.value;
}

function fileRegressionPolicy() {
  return {
    references: [{ referenceName: "baseline", referenceId }],
    policy: {
      policyId: "file-regressions",
      references: [{ referenceName: "baseline", checkIds: ["file-metrics"] }],
      acceptance: [],
      views: [{
        viewId: "file-regressions",
        selectors: [{ checkId: "file-metrics", recordTypeId: "file-code-lines" }],
        acceptance: "all",
        predicates: [{
          kind: "relation-is",
          referenceName: "baseline",
          relationId: "regression"
        }]
      }],
      readiness: [{
        readinessId: "current-complete",
        predicate: { kind: "run-status", checkId: "file-metrics", status: "completed" },
        reason: "scan-incomplete"
      }, {
        readinessId: "comparison-complete",
        predicate: {
          kind: "reference-status",
          checkId: "file-metrics",
          referenceName: "baseline",
          status: "complete"
        },
        reason: "comparison-unavailable"
      }],
      blockWhen: { kind: "view-not-empty", viewId: "file-regressions" }
    }
  } as const;
}

function createSccFixture(input: Readonly<{
  currentExitCode?: number;
  currentOutput?: string;
  currentRows: readonly string[];
  referenceExitCode?: number;
  referenceOutput?: string;
  referenceRows: readonly string[];
}>): Readonly<{
  cleanup: () => void;
  currentRoot: string;
  dependency: FileScannerDependency;
  referenceRoot: string;
}> {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-file-metrics-"));
  const currentRoot = join(root, "current");
  const referenceRoot = join(root, "reference");
  const scannerPath = join(root, "controlled-scc.ts");
  mkdirSync(currentRoot, { recursive: true });
  mkdirSync(referenceRoot, { recursive: true });
  const header = "Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC";
  const currentOutput = input.currentOutput
    ?? [header, ...input.currentRows].join("\n") + "\n";
  const referenceOutput = input.referenceOutput
    ?? [header, ...input.referenceRows].join("\n") + "\n";
  writeFileSync(scannerPath, [
    `const current = ${JSON.stringify(currentOutput)};`,
    `const reference = ${JSON.stringify(referenceOutput)};`,
    `const currentExitCode = ${input.currentExitCode ?? 0};`,
    `const referenceExitCode = ${input.referenceExitCode ?? 0};`,
    "if (process.argv.includes('--version')) process.stdout.write('scc version 3.7.0\\n');",
    "else {",
    "  const isReference = process.cwd().endsWith('/reference');",
    "  process.stdout.write(isReference ? reference : current);",
    "  process.exitCode = isReference ? referenceExitCode : currentExitCode;",
    "}"
  ].join("\n"), "utf8");
  return {
    currentRoot,
    referenceRoot,
    dependency: {
      executable: process.execPath,
      args: [scannerPath],
      availabilityArgs: [scannerPath, "--version"]
    },
    cleanup: () => rmSync(root, { recursive: true, force: true })
  };
}

function fixtureCase(
  fixture: ReturnType<typeof createSccFixture>,
  expectedCategory: string
) {
  return {
    cleanup: fixture.cleanup,
    dependency: fixture.dependency,
    expectedCategory,
    rootDir: fixture.currentRoot
  };
}

function sccRow(path: string, lines: number, codeLines: number, decisionTokens: number): string {
  return `TypeScript,,${path},${lines},${codeLines},20,30,${decisionTokens},1000,${codeLines}`;
}
