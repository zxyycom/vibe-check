import { strict as assert } from "node:assert";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { DuplicationScannerDependency } from "../../../../scanner-dependencies.ts";
import { resolveCheckCatalog, type ResolvedCheckCatalog } from "../catalog.ts";
import { coordinateCheckRecords } from "../coordinator.ts";
import {
  DUPLICATE_DETECTION_CHECK_DEFINITION,
  createDuplicateDetectionBinding,
  resolveDuplicateDetectionApplicability,
  type DuplicateDetectionExactInputSet,
  type DuplicateDetectionReferenceInput
} from "./duplicate-detection.ts";

const semantics = {
  codeAreas: {
    source: {
      description: "Source",
      excludeGlobs: [],
      globs: ["src/**/*.ts"],
      warningPolicy: "moderate"
    },
    tests: {
      description: "Tests",
      excludeGlobs: [],
      globs: ["test/**/*.ts"],
      warningPolicy: "moderate"
    }
  },
  changedDelta: 0,
  configVersion: "1"
} as const;

describe("duplicate-detection built-in Check", () => {
  it("produces a private cached duplicate record and reference regression fact", async () => {
    const fixture = createJscpdFixture({
      currentReports: { "src/a.ts": duplicateReport("src/a.ts", "src/b.ts", 80, 12) },
      referenceReports: { "src/a.ts": emptyReport() }
    });
    try {
      const runtime = createRuntime(fixture, currentInput(fixture), referenceInput(fixture));
      const snapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(runtime.binding, currentInput(fixture))
      );

      assert.deepEqual(
        DUPLICATE_DETECTION_CHECK_DEFINITION.recordTypes.map(({ recordTypeId }) => recordTypeId),
        ["duplicate-code"]
      );
      assert.equal(JSON.stringify(DUPLICATE_DETECTION_CHECK_DEFINITION).includes("controlled-jscpd"), false);
      assert.deepEqual(snapshot.runs[0]?.result, { verdict: "failed" });
      assert.equal(snapshot.records.length, 1);
      assert.equal(snapshot.records[0]?.recordTypeId, "duplicate-code");
      assert.deepEqual(runtime.referenceFacts(snapshot), {
        evidence: [{
          checkId: "duplicate-detection",
          referenceName: "baseline",
          status: "complete"
        }],
        relations: [{
          recordId: snapshot.records[0]?.recordId,
          referenceName: "baseline",
          relationId: "regression"
        }]
      });
    } finally {
      fixture.cleanup();
    }
  });

  it("keeps equal-shape fragments distinct and their identities stable across line movement", async () => {
    const currentReport = duplicateReports([
      { firstStart: 10, secondStart: 20 },
      { firstStart: 40, secondStart: 50 }
    ]);
    const movedReport = duplicateReports([
      { firstStart: 110, secondStart: 120 },
      { firstStart: 140, secondStart: 150 }
    ]);
    const fixture = createJscpdFixture({
      currentReports: { "src/a.ts": currentReport },
      referenceReports: { "src/a.ts": movedReport }
    });
    const movedFixture = createJscpdFixture({
      currentReports: { "src/a.ts": movedReport },
      referenceReports: {}
    });
    const changedFiles = ["a.ts"];

    try {
      const runtime = createRuntime(
        fixture,
        currentInput(fixture),
        referenceInput(fixture),
        changedFiles
      );
      changedFiles.splice(0, changedFiles.length, "test/not-current.ts");
      const snapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(runtime.binding, currentInput(fixture))
      );

      assert.equal(snapshot.records.length, 2);
      assert.equal(new Set(snapshot.records.map((record) => record.recordId)).size, 2);
      assert.deepEqual(
        runtime.referenceFacts(snapshot).relations.map((relation) => relation.relationId),
        ["changed", "changed"]
      );

      const movedRuntime = createRuntime(movedFixture, currentInput(movedFixture), null, []);
      const movedSnapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(movedRuntime.binding, currentInput(movedFixture))
      );
      assert.deepEqual(
        movedSnapshot.records.map((record) => record.recordId),
        snapshot.records.map((record) => record.recordId)
      );
    } finally {
      fixture.cleanup();
      movedFixture.cleanup();
    }
  });

  it("distinguishes zero findings and no input and fails unavailable invalid and out-of-scope batches", async () => {
    const zero = createJscpdFixture({
      currentReports: { "src/a.ts": emptyReport() },
      referenceReports: {}
    });
    const invalid = createJscpdFixture({
      currentReports: { "src/a.ts": "{" },
      referenceReports: {}
    });
    const outside = createJscpdFixture({
      currentReports: {
        "src/a.ts": duplicateReport("src/a.ts", "../outside.ts", 80, 12)
      },
      referenceReports: {}
    });
    const unavailableRoot = mkdtempSync(join(tmpdir(), "vibe-check-duplicate-unavailable-"));
    const unavailableDependency: DuplicationScannerDependency = {
      executable: join(unavailableRoot, "missing-jscpd"),
      args: [],
      availabilityArgs: ["--version"],
      maxConcurrency: 1
    };
    try {
      const zeroRuntime = createRuntime(zero, currentInput(zero), null);
      const zeroSnapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(zeroRuntime.binding, currentInput(zero))
      );
      const noInputSnapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(zeroRuntime.binding, emptyInput(zero))
      );
      assert.deepEqual(zeroSnapshot.runs[0]?.result, { verdict: "passed" });
      assert.equal(noInputSnapshot.runs[0]?.applicability, "not-applicable");

      for (const [fixture, expected] of [
        [invalid, "invalid-result"],
        [outside, "invalid-result"]
      ] as const) {
        const runtime = createRuntime(fixture, currentInput(fixture), null);
        const snapshot = await coordinateCheckRecords(
          resolveRuntimeCatalog(runtime.binding, currentInput(fixture))
        );
        assert.equal(snapshot.runs[0]?.status, "failed");
        assert.equal(snapshot.runs[0]?.diagnostic?.category, expected);
        assert.deepEqual(snapshot.records, []);
      }

      const unavailableRuntime = createDuplicateDetectionBinding({
        changedFiles: [],
        current: {
          ...currentInput(zero),
          rootDir: unavailableRoot
        },
        dependency: unavailableDependency,
        reference: null,
        semantics
      });
      const unavailableSnapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(unavailableRuntime.binding, currentInput(zero))
      );
      assert.equal(unavailableSnapshot.runs[0]?.diagnostic?.category, "unavailable");
      assert.deepEqual(unavailableSnapshot.records, []);
    } finally {
      zero.cleanup();
      invalid.cleanup();
      outside.cleanup();
      rmSync(unavailableRoot, { recursive: true, force: true });
    }
  });

  it("reuses cache revalidates cached paths and keys backend arguments privately", async () => {
    const fixture = createJscpdFixture({
      currentReports: { "src/a.ts": duplicateReport("src/a.ts", "src/b.ts", 80, 12) },
      referenceReports: {}
    });
    try {
      for (let index = 0; index < 2; index += 1) {
        const runtime = createRuntime(fixture, currentInput(fixture), null);
        await coordinateCheckRecords(resolveRuntimeCatalog(runtime.binding, currentInput(fixture)));
      }
      assert.equal(scanInvocationCount(fixture.capturePath), 1, "second run must use cache");

      const cacheDir = join(fixture.cacheRoot, "quality-scan-cache-v1");
      const cacheFile = readdirSync(cacheDir).find((entry) => entry.endsWith(".json"));
      assert.ok(cacheFile);
      const cachePath = join(cacheDir, cacheFile);
      const cached = JSON.parse(readFileSync(cachePath, "utf8")) as {
        metrics: Array<{ locations: Array<{ path: string }> }>;
      };
      cached.metrics[0]!.locations[0]!.path = "../credential/outside.ts";
      writeFileSync(cachePath, `${JSON.stringify(cached)}\n`, "utf8");

      const revalidating = createRuntime(fixture, currentInput(fixture), null);
      await coordinateCheckRecords(
        resolveRuntimeCatalog(revalidating.binding, currentInput(fixture))
      );
      assert.equal(scanInvocationCount(fixture.capturePath), 2, "out-of-scope cache must rescan");

      const alternateDependency = {
        ...fixture.dependency,
        args: [...fixture.dependency.args, "--backend-variant"]
      };
      const alternate = createDuplicateDetectionBinding({
        changedFiles: [],
        current: currentInput(fixture),
        dependency: alternateDependency,
        reference: null,
        semantics
      });
      await coordinateCheckRecords(resolveRuntimeCatalog(alternate.binding, currentInput(fixture)));
      assert.equal(scanInvocationCount(fixture.capturePath), 3, "backend args must change cache identity");
    } finally {
      fixture.cleanup();
    }
  });

  it("retains an earlier record when a later area batch fails and keeps reference failure separate", async () => {
    const fixture = createJscpdFixture({
      currentReports: {
        "src/a.ts": duplicateReport("src/a.ts", "src/b.ts", 80, 12),
        "test/a.ts": duplicateReport("test/a.ts", "../outside.ts", 60, 8)
      },
      referenceReports: {
        "src/a.ts": duplicateReport("src/a.ts", "../outside.ts", 80, 12)
      }
    });
    const twoAreaInput = {
      ...currentInput(fixture),
      areas: [
        currentInput(fixture).areas[0]!,
        area("tests", ["test/a.ts", "test/b.ts"])
      ]
    } as const;
    try {
      const failing = createRuntime(fixture, twoAreaInput, null);
      const retained = await coordinateCheckRecords(
        resolveRuntimeCatalog(failing.binding, twoAreaInput),
        {
          coordinate: async ([contribution]) => {
            if (contribution === undefined) throw new Error("Expected contribution");
            assert.equal(contribution.ports.submitRecord({
              recordTypeId: "duplicate-code",
              level: "warning",
              semanticSubject: "duplicate:{\"lineCount\":1,\"paths\":[\"prior/a.ts\",\"prior/b.ts\"],\"tokenCount\":1}",
              message: "Prior committed duplicate",
              fields: {
                codeArea: "source",
                lineCount: 1,
                locationCount: 2,
                metric: "duplicate-tokens",
                suggestion: "Extract shared code",
                value: 1
              },
              location: { path: "prior/a.ts", line: 1, column: 1 }
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
      assert.equal(retained.runs[0]?.diagnostic?.category, "invalid-result");
      assert.deepEqual(retained.records.map(({ message }) => message), ["Prior committed duplicate"]);

      const referenceRuntime = createRuntime(
        fixture,
        currentInput(fixture),
        referenceInput(fixture)
      );
      const currentSnapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(referenceRuntime.binding, currentInput(fixture))
      );
      assert.equal(currentSnapshot.runs[0]?.status, "completed");
      assert.equal(currentSnapshot.records.length, 1);
      assert.deepEqual(referenceRuntime.referenceFacts(currentSnapshot), {
        evidence: [{
          checkId: "duplicate-detection",
          referenceName: "baseline",
          status: "incomplete"
        }],
        relations: []
      });
    } finally {
      fixture.cleanup();
    }
  });
});

type JscpdFixture = ReturnType<typeof createJscpdFixture>;

function createRuntime(
  fixture: JscpdFixture,
  current: DuplicateDetectionExactInputSet,
  reference: DuplicateDetectionReferenceInput | null,
  changedFiles: readonly string[] = current.areas.flatMap((areaInput) => (
    areaInput.approvedExactPaths
  ))
) {
  return createDuplicateDetectionBinding({
    changedFiles,
    current,
    dependency: fixture.dependency,
    reference,
    semantics
  });
}

function resolveRuntimeCatalog(
  binding: ReturnType<typeof createDuplicateDetectionBinding>["binding"],
  input: DuplicateDetectionExactInputSet
): ResolvedCheckCatalog {
  const catalog = resolveCheckCatalog({
    invocationKey: "duplicate-detection-test",
    definitions: [DUPLICATE_DETECTION_CHECK_DEFINITION],
    bindings: [{ checkId: "duplicate-detection", execute: binding }],
    selectedCheckIds: ["duplicate-detection"],
    resolveApplicability: () => resolveDuplicateDetectionApplicability(input.areas)
  });
  if (!catalog.ok) throw new Error("Expected duplicate-detection catalog to resolve");
  return catalog.value;
}

function currentInput(fixture: JscpdFixture) {
  return {
    rootDir: fixture.currentRoot,
    cacheRootDir: fixture.cacheRoot,
    commitSha: "current-commit",
    areas: [area("source", ["src/a.ts", "src/b.ts"])]
  } as const;
}

function emptyInput(fixture: JscpdFixture) {
  return {
    rootDir: fixture.currentRoot,
    cacheRootDir: fixture.cacheRoot,
    commitSha: "current-commit",
    areas: []
  } as const;
}

function referenceInput(fixture: JscpdFixture) {
  return {
    referenceName: "baseline",
    rootDir: fixture.referenceRoot,
    cacheRootDir: fixture.cacheRoot,
    commitSha: "reference-commit",
    areas: [area("source", ["src/a.ts", "src/b.ts"])]
  } as const;
}

function area(codeArea: string, paths: readonly string[]) {
  return {
    codeArea,
    approvedExactPaths: [...paths],
    minimumTokens: 50,
    inputFingerprint: {
      fileCount: paths.length,
      fileList: [...paths],
      fingerprint: `sha256:${codeArea}:${paths.join("|")}`
    }
  } as const;
}

function createJscpdFixture(input: Readonly<{
  currentReports: Readonly<Record<string, string>>;
  referenceReports: Readonly<Record<string, string>>;
}>) {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-duplicate-detection-"));
  const currentRoot = join(root, "current");
  const referenceRoot = join(root, "reference");
  const cacheRoot = join(root, "cache");
  const capturePath = join(root, "scans.ndjson");
  const scannerPath = join(root, "controlled-jscpd.ts");
  mkdirSync(currentRoot, { recursive: true });
  mkdirSync(referenceRoot, { recursive: true });
  mkdirSync(cacheRoot, { recursive: true });
  writeFileSync(scannerPath, controlledJscpdSource(input, capturePath), "utf8");
  return {
    cacheRoot,
    capturePath,
    currentRoot,
    referenceRoot,
    dependency: {
      executable: process.execPath,
      args: [scannerPath],
      availabilityArgs: [scannerPath, "--version"],
      maxConcurrency: 1
    } satisfies DuplicationScannerDependency,
    cleanup: () => rmSync(root, { recursive: true, force: true })
  };
}

function controlledJscpdSource(
  input: Readonly<{
    currentReports: Readonly<Record<string, string>>;
    referenceReports: Readonly<Record<string, string>>;
  }>,
  capturePath: string
): string {
  return `
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
if (process.argv.includes("--version")) {
  process.stdout.write("cpd 5.0.11\\n");
} else {
  const configPath = process.argv[process.argv.indexOf("--config") + 1];
  const outputDir = process.argv[process.argv.indexOf("--output") + 1];
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const reports = process.cwd().endsWith("/reference")
    ? ${JSON.stringify(input.referenceReports)}
    : ${JSON.stringify(input.currentReports)};
  const report = reports[config.path[0]] ?? ${JSON.stringify(emptyReport())};
  appendFileSync(${JSON.stringify(capturePath)}, JSON.stringify(config.path) + "\\n", "utf8");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, "jscpd-report.json"), report, "utf8");
}
`;
}

function duplicateReport(
  firstPath: string,
  secondPath: string,
  tokens: number,
  lines: number
): string {
  return duplicateReports([{ firstStart: 10, secondStart: 20 }], {
    firstPath,
    lines,
    secondPath,
    tokens
  });
}

function duplicateReports(
  locations: readonly Readonly<{ firstStart: number; secondStart: number }>[],
  shape: Readonly<{
    firstPath: string;
    lines: number;
    secondPath: string;
    tokens: number;
  }> = {
    firstPath: "src/a.ts",
    lines: 12,
    secondPath: "src/b.ts",
    tokens: 80
  }
): string {
  return JSON.stringify({
    duplicates: locations.map(({ firstStart, secondStart }) => ({
      firstFile: {
        name: shape.firstPath,
        startLoc: { line: firstStart },
        endLoc: { line: firstStart + shape.lines - 1 }
      },
      secondFile: {
        name: shape.secondPath,
        startLoc: { line: secondStart },
        endLoc: { line: secondStart + shape.lines - 1 }
      },
      lines: shape.lines,
      tokens: shape.tokens
    }))
  });
}

function emptyReport(): string {
  return JSON.stringify({ duplicates: [] });
}

function scanInvocationCount(path: string): number {
  try {
    return readFileSync(path, "utf8").trim().split("\n").filter(Boolean).length;
  } catch {
    return 0;
  }
}
