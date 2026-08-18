import { strict as assert } from "node:assert";
import fs, {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { publishScanV3 } from "../../scan-command/publication-v3.ts";
import { TEST_QUALITY_CONFIG } from "../../test/config.ts";
import {
  PUBLICATION_V3_FAILURE_STAGES,
  PUBLICATION_V3_LIFECYCLE,
  createPublicationModelV3,
  planPublicationCleanupV3
} from "./index.ts";
import { richPublicationInput } from "./publication-test-fixtures.ts";

describe("machine publication v3 lifecycle", () => {
  it("pins candidate artifact and handled-failure lifecycle stages", () => {
    assert.deepEqual(PUBLICATION_V3_LIFECYCLE, {
      candidateStages: [
        "validate-publication-model",
        "serialize-machine-candidates",
        "render-report-candidate",
        "validate-machine-set"
      ],
      artifactStages: [
        "cleanup-stale-owned-temps",
        "write-same-directory-owned-temps",
        "rename-machine-files",
        "rename-report",
        "cleanup-retired-artifacts",
        "publish-trusted-paths"
      ]
    });
    assert.deepEqual(PUBLICATION_V3_FAILURE_STAGES, [
      "validate-publication-model",
      "serialize-machine-candidates",
      "render-report-candidate",
      "validate-machine-set",
      "cleanup-stale-owned-temps",
      "write-same-directory-owned-temps",
      "rename-machine-files",
      "rename-report",
      "cleanup-retired-artifacts"
    ]);
  });
});

describe("machine publication v3 lifecycle", () => {
  it("plans exact canonical retired report and owned-temp cleanup without touching unrelated files", () => {
    const artifactDir = mkdtempSync(join(tmpdir(), "vibe-check-publication-v3-cleanup-"));
    const ownedTempDir = join(artifactDir, ".vibe-check-publication-prior");
    try {
      mkdirSync(ownedTempDir);
      for (const name of [
        "run.json",
        "records.ndjson",
        "report.md",
        "metrics.json",
        "warnings.ndjson",
        "warnings-all.ndjson",
        "unrelated.json"
      ]) {
        writeFileSync(join(artifactDir, name), name, "utf8");
      }
      writeFileSync(join(ownedTempDir, "run.json.tmp"), "temp", "utf8");

      const plan = planPublicationCleanupV3(artifactDir);
      assert.deepEqual(plan.canonicalPaths, [
        join(artifactDir, "records.ndjson"),
        join(artifactDir, "report.md"),
        join(artifactDir, "run.json")
      ]);
      assert.deepEqual(plan.retiredPaths, [
        join(artifactDir, "metrics.json"),
        join(artifactDir, "warnings-all.ndjson"),
        join(artifactDir, "warnings.ndjson")
      ]);
      assert.deepEqual(plan.ownedTempPaths, [ownedTempDir]);
      assert.equal(readFileSync(join(artifactDir, "unrelated.json"), "utf8"), "unrelated.json");
    } finally {
      rmSync(artifactDir, { force: true, recursive: true });
    }
  });

  it("writes every temp before replacement and cleans handled publication failures", async () => {
    const model = createPublicationModelV3(await richPublicationInput());
    proveCandidateWriteFailurePreservesPriorSet(model);
    proveSecondMachineRenameFailureLeavesNoCanonicalSet(model);
  });
});

type PublicationModel = ReturnType<typeof createPublicationModelV3>;

function proveCandidateWriteFailurePreservesPriorSet(model: PublicationModel): void {
  const artifactDir = createPriorPublicationDirectory("write-failure");
  const originalWriteFileSync = fs.writeFileSync;
  let tempWriteCount = 0;
  fs.writeFileSync = (...args: unknown[]): unknown => {
    if (String(args[0]).includes(".vibe-check-publication-")) {
      tempWriteCount += 1;
      if (tempWriteCount === 3) throw new Error("injected candidate write failure");
    }
    return Reflect.apply(originalWriteFileSync, fs, args) as unknown;
  };
  try {
    assert.throws(() => publishTestScan(artifactDir, model), /injected candidate write failure/);
  } finally {
    fs.writeFileSync = originalWriteFileSync;
  }
  try {
    assert.equal(tempWriteCount, 3);
    assertPriorPublication(artifactDir);
    assert.deepEqual(ownedTemps(artifactDir), []);
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
}

function proveSecondMachineRenameFailureLeavesNoCanonicalSet(model: PublicationModel): void {
  const artifactDir = createPriorPublicationDirectory("rename-failure");
  writeFileSync(join(artifactDir, "metrics.json"), "retired", "utf8");
  const runPath = join(artifactDir, "run.json");
  const recordsPath = join(artifactDir, "records.ndjson");
  const originalRenameSync = fs.renameSync;
  const renameTargets: string[] = [];
  fs.renameSync = (...args: unknown[]): unknown => {
    const destination = String(args[1]);
    renameTargets.push(destination);
    if (destination === runPath) {
      assertPriorPublication(artifactDir);
      assert.equal(ownedTemps(artifactDir).length, 3);
    }
    if (destination === recordsPath) throw new Error("injected second rename failure");
    return Reflect.apply(originalRenameSync, fs, args) as unknown;
  };
  try {
    assert.throws(() => publishTestScan(artifactDir, model), /injected second rename failure/);
  } finally {
    fs.renameSync = originalRenameSync;
  }
  try {
    assert.deepEqual(renameTargets, [runPath, recordsPath]);
    for (const name of ["run.json", "records.ndjson", "report.md", "metrics.json"]) {
      assert.equal(existsSync(join(artifactDir, name)), false, name);
    }
    assert.deepEqual(ownedTemps(artifactDir), []);
    assert.equal(readFileSync(join(artifactDir, "unrelated.json"), "utf8"), "unrelated");
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
}

function createPriorPublicationDirectory(label: string): string {
  const artifactDir = mkdtempSync(join(tmpdir(), `vibe-check-publication-v3-${label}-`));
  for (const name of ["run.json", "records.ndjson", "report.md"]) {
    writeFileSync(join(artifactDir, name), `prior-${name}`, "utf8");
  }
  writeFileSync(join(artifactDir, "unrelated.json"), "unrelated", "utf8");
  return artifactDir;
}

function assertPriorPublication(artifactDir: string): void {
  for (const name of ["run.json", "records.ndjson", "report.md"]) {
    assert.equal(readFileSync(join(artifactDir, name), "utf8"), `prior-${name}`);
  }
}

function ownedTemps(artifactDir: string): readonly string[] {
  return readdirSync(artifactDir)
    .filter((name) => name.startsWith(".vibe-check-publication-"))
    .sort();
}

function publishTestScan(artifactDir: string, model: PublicationModel): void {
  publishScanV3({
    artifactDir,
    changedFiles: [],
    model,
    print: false,
    reportPresentation: TEST_QUALITY_CONFIG.report
  });
}
