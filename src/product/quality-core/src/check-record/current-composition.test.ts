import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it } from "node:test";

import { TEST_QUALITY_CONFIG } from "../../test/config.ts";
import type { ResolvedQualityConfig, SemanticCheckId } from "../model/schema.ts";
import {
  composeCurrentCheckRecords,
  type CurrentCompositionExactInputs,
  type CurrentCompositionReferenceInputs
} from "./current-composition.ts";

const baselineIdentity = Object.freeze({
  referenceId: "reference/v1/sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  referenceName: "baseline"
});

const semanticCheckIds = [
  "duplicate-code",
  "file-code-lines",
  "function-code-lines",
  "function-cyclomatic-complexity",
  "function-parameter-count"
] as const satisfies readonly SemanticCheckId[];

describe("current Check/Record composition", () => {
  it("coordinates three selected built-ins into five record types and evaluates all changed and regressions as ordinary policies", async () => {
    const fixture = createCompositionFixture();
    try {
      for (const gate of ["all", "changed", "regressions"] as const) {
        const result = await composeCurrentCheckRecords({
          ...fixture.input,
          baseline: gate === "all" ? null : fixture.baseline,
          config: configWithAcceptances([]),
          gate,
          invocationKey: `current-composition-${gate}`,
          verificationOutput: false
        });
        assert.deepEqual(
          result.snapshot.records.map((record) => record.recordTypeId).sort(),
          [...semanticCheckIds].sort()
        );
        assert.deepEqual(
          result.snapshot.runs.map((run) => [run.checkId, run.status]),
          [
            ["duplicate-detection", "completed"],
            ["file-metrics", "completed"],
            ["function-metrics", "completed"]
          ]
        );
        assert.equal(result.decision.policyId, gate);
        assert.equal(result.decision.gate.status, "failed");
        if (gate === "all") {
          assert.deepEqual(result.referenceFacts, { evidence: [], relations: [] });
        } else {
          assert.deepEqual(
            result.referenceFacts.evidence.map(({ checkId, status }) => [checkId, status]),
            [
              ["duplicate-detection", "complete"],
              ["file-metrics", "complete"],
              ["function-metrics", "complete"]
            ]
          );
          assert.equal(result.referenceFacts.relations.length, 5);
        }
      }
    } finally {
      fixture.cleanup();
    }
  });

  it("keeps an omitted gate disabled while acceptance supplies the all-current verification view and reasons", async () => {
    const fixture = createCompositionFixture();
    const config = configWithAcceptances(semanticCheckIds);
    try {
      const normal = await composeCurrentCheckRecords({
        ...fixture.input,
        baseline: null,
        config,
        gate: null,
        invocationKey: "current-composition-disabled",
        verificationOutput: false
      });
      const verification = await composeCurrentCheckRecords({
        ...fixture.input,
        baseline: null,
        config,
        gate: null,
        invocationKey: "current-composition-disabled",
        verificationOutput: true
      });

      assert.deepEqual(normal.snapshot, verification.snapshot);
      assert.deepEqual(normal.decision, verification.decision);
      assert.deepEqual(normal.decision.gate, { policyId: null, status: "disabled" });
      assert.equal(normal.decision.policyId, null);
      assert.deepEqual(normal.decision.readiness, []);
      assert.equal(normal.decision.blockWhen, null);
      assert.equal(normal.decision.acceptance.length, 5);
      assert.ok(normal.decision.acceptance.every(({ reason }) => (
        reason.endsWith("accepted for verification")
      )));
      assert.equal(normal.decision.views[0]?.viewId, "all-current");
      assert.equal(normal.decision.views[0]?.recordRefs.length, 5);
      assert.deepEqual(normal.humanStatus, {
        normal: "warning",
        selected: "warning",
        verification: "passed"
      });
      assert.deepEqual(verification.humanStatus, {
        normal: "warning",
        selected: "passed",
        verification: "passed"
      });
    } finally {
      fixture.cleanup();
    }
  });

  it("retains the complete current snapshot when one reference is incomplete and stops comparison policy readiness", async () => {
    const fixture = createCompositionFixture({ invalidReferenceScc: true });
    try {
      const result = await composeCurrentCheckRecords({
        ...fixture.input,
        baseline: fixture.baseline,
        config: configWithAcceptances([]),
        gate: "changed",
        invocationKey: "current-composition-reference-incomplete",
        verificationOutput: false
      });

      assert.equal(result.snapshot.completeness.status, "complete");
      assert.equal(result.snapshot.records.length, 5);
      assert.deepEqual(
        result.referenceFacts.evidence.map(({ checkId, status }) => [checkId, status]),
        [
          ["duplicate-detection", "complete"],
          ["file-metrics", "incomplete"],
          ["function-metrics", "complete"]
        ]
      );
      assert.equal(result.decision.gate.status, "not-evaluated");
      if (result.decision.gate.status !== "not-evaluated") {
        throw new Error("Expected comparison readiness to stop evaluation");
      }
      assert.equal(result.decision.gate.policyId, "changed");
      assert.equal(result.decision.gate.reason, "comparison-unavailable");
      assert.ok(result.decision.gate.evidenceRefs.length > 0);
    } finally {
      fixture.cleanup();
    }
  });
});

function configWithAcceptances(
  acceptedCheckIds: readonly SemanticCheckId[]
): ResolvedQualityConfig {
  return {
    ...TEST_QUALITY_CONFIG,
    acceptedWarnings: acceptedCheckIds.map((checkId) => ({
      checkId,
      reason: `${checkId} accepted for verification`
    })),
    checks: {
      ...TEST_QUALITY_CONFIG.checks,
      duplication: {
        ...TEST_QUALITY_CONFIG.checks.duplication,
        defaultMinimumTokens: 50,
        minimumTokensByCodeArea: { source: 75 }
      }
    },
    codeAreas: {
      source: {
        description: "Composition fixture source",
        excludeGlobs: [],
        globs: ["src/**/*.ts"],
        warningPolicy: "moderate"
      }
    },
    generatedFiles: []
  };
}

function createCompositionFixture(
  options: Readonly<{ invalidReferenceScc?: boolean }> = {}
) {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-current-composition-"));
  const currentRoot = join(root, "current");
  const referenceRoot = join(root, "reference");
  const cacheRoot = join(root, "cache");
  const scanner = join(root, "controlled-scanner.ts");
  mkdirSync(join(currentRoot, "src"), { recursive: true });
  mkdirSync(join(referenceRoot, "src"), { recursive: true });
  mkdirSync(cacheRoot, { recursive: true });
  for (const projectRoot of [currentRoot, referenceRoot]) {
    writeFileSync(join(projectRoot, "src/a.ts"), "export const a = 1;\n", "utf8");
    writeFileSync(join(projectRoot, "src/b.ts"), "export const b = 2;\n", "utf8");
  }
  writeFileSync(scanner, controlledScannerSource(options), "utf8");

  const current = exactInputs(currentRoot, cacheRoot, "current-commit");
  const baseline: CurrentCompositionReferenceInputs = Object.freeze({
    ...exactInputs(referenceRoot, cacheRoot, "baseline-commit"),
    identity: baselineIdentity
  });
  return {
    baseline,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
    input: {
      baseline,
      changedFiles: ["src/a.ts", "src/b.ts"],
      current,
      dependencies: {
        duplication: {
          args: [scanner, "jscpd"],
          availabilityArgs: [scanner, "jscpd", "--version"],
          executable: process.execPath,
          maxConcurrency: 1
        },
        file: {
          args: [scanner, "scc"],
          availabilityArgs: [scanner, "scc", "--version"],
          executable: process.execPath
        },
        function: {
          args: [scanner, "lizard"],
          availabilityArgs: [scanner, "lizard", "--version"],
          executable: process.execPath
        }
      },
      selectedCheckIds: ["file-metrics", "function-metrics", "duplicate-detection"]
    } as const
  };
}

function exactInputs(
  rootDir: string,
  cacheRootDir: string,
  commitSha: string
): CurrentCompositionExactInputs {
  const paths = ["src/a.ts", "src/b.ts"] as const;
  return Object.freeze({
    duplicateDetection: Object.freeze({
      areas: Object.freeze([Object.freeze({
        approvedExactPaths: paths,
        codeArea: "source",
        inputFingerprint: Object.freeze({
          fileCount: paths.length,
          fileList: paths,
          fingerprint: `sha256:${commitSha}`
        })
      })]),
      cacheRootDir,
      commitSha,
      rootDir
    }),
    fileMetrics: Object.freeze({ approvedExactPaths: paths, rootDir }),
    functionMetrics: Object.freeze({ approvedExactPaths: paths, rootDir })
  });
}

function controlledScannerSource(
  options: Readonly<{ invalidReferenceScc?: boolean }>
): string {
  const sccHeader = "Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC";
  const currentScc = `${sccHeader}\nTypeScript,,src/a.ts,500,400,20,30,50,1000,400\n`;
  const referenceScc = options.invalidReferenceScc
    ? "not-scc-csv\n"
    : `${sccHeader}\nTypeScript,,src/a.ts,150,100,20,30,5,1000,100\n`;
  const lizardHeader = "NLOC,CCN,token count,parameter count,length,location,file path,function name,long name,start line,end line";
  const currentLizard = `${lizardHeader}\n200,20,300,10,220,large@10-229@src/a.ts,src/a.ts,large,large (),10,229\n`;
  const referenceLizard = `${lizardHeader}\n20,2,30,1,20,large@30-49@src/a.ts,src/a.ts,large,large (),30,49\n`;
  const currentDuplicate = JSON.stringify({
    duplicates: [{
      firstFile: { name: "src/a.ts", startLoc: { line: 10 }, endLoc: { line: 19 } },
      secondFile: { name: "src/b.ts", startLoc: { line: 20 }, endLoc: { line: 29 } },
      lines: 10,
      tokens: 120
    }]
  });
  const referenceDuplicate = JSON.stringify({ duplicates: [] });
  return `
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const mode = process.argv[2];
const reference = process.cwd().endsWith("/reference");
if (process.argv.includes("--version")) {
  process.stdout.write(mode === "scc"
    ? "scc version 3.7.0\\n"
    : mode === "lizard"
      ? "lizard 1.23.0\\n"
      : "cpd 5.0.11\\n");
} else if (mode === "scc") {
  process.stdout.write(reference ? ${JSON.stringify(referenceScc)} : ${JSON.stringify(currentScc)});
} else if (mode === "lizard") {
  process.stdout.write(reference ? ${JSON.stringify(referenceLizard)} : ${JSON.stringify(currentLizard)});
} else {
  const outputDir = process.argv[process.argv.indexOf("--output") + 1];
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    join(outputDir, "jscpd-report.json"),
    reference ? ${JSON.stringify(referenceDuplicate)} : ${JSON.stringify(currentDuplicate)},
    "utf8"
  );
}
`;
}
