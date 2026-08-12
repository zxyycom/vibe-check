import { strict as assert } from "node:assert";
import { existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  createFixtureProject,
  raiseWarningFloors,
  readFixtureConfig,
  readFormalEntryArtifacts,
  runFormalGateScan,
  setFixtureCacheDir,
  setFixtureWarningPolicy,
  writeFixtureConfig
} from "./cli-gate-acceptance.test-support.ts";
import {
  commitChangedInput,
  commitMetricRegression,
  createComparisonFixture
} from "./cli-gate-comparison.test-support.ts";
import {
  assertEvaluatedGateProjection,
  assertExactLine
} from "./cli-gate-projection.test-support.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureRoot = resolve(repoRoot, "fixtures/projects/configured-typescript");

describe("formal CLI quality gate acceptance", () => {
  it("passes a zero-record quick all gate while preserving the skipped Check run", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject(fixtureRoot, "quick-all-zero");

    try {
      const config = readFixtureConfig(fixture.projectRoot);
      raiseWarningFloors(config);
      writeFixtureConfig(fixture.projectRoot, config);
      const artifactDir = join(fixture.projectRoot, "artifacts", "quick-all-zero");
      const result = runFormalGateScan(repoRoot, fixture.projectRoot, [
        "--profile", "quick", "--gate", "all",
        "--artifact-dir", "artifacts/quick-all-zero"
      ]);
      const artifacts = readFormalEntryArtifacts(artifactDir);

      assert.equal(artifacts.machine.run.completeness.status, "complete");
      assert.deepEqual(artifacts.machine.records, []);
      assert.deepEqual(
        artifacts.machine.run.runs.find(
          ({ checkId }) => checkId === "duplicate-detection"
        ),
        {
          applicability: null,
          checkId: "duplicate-detection",
          checkRunId: artifacts.machine.run.runs[0]?.checkRunId,
          coverage: null,
          diagnostic: null,
          result: null,
          selection: "unselected",
          status: "skipped"
        }
      );
      assertEvaluatedGateProjection({
        artifacts,
        expectedExit: 0,
        policy: "all",
        result,
        status: "passed"
      });
      assertExactLine(artifacts.report, "- `duplicate-detection`: skipped");
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });
});

describe("formal CLI quality gate acceptance", () => {
  it("fails an all gate when the unaccepted all-current view is non-empty", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject(fixtureRoot, "all-only");

    try {
      const artifactDir = join(fixture.projectRoot, "artifacts", "all-only");
      const result = runFormalGateScan(repoRoot, fixture.projectRoot, [
        "--profile", "quick", "--gate", "all",
        "--artifact-dir", "artifacts/all-only"
      ]);
      const artifacts = readFormalEntryArtifacts(artifactDir);

      assert.equal(artifacts.machine.run.completeness.status, "complete");
      assert.ok(artifacts.machine.records.length > 0);
      assertEvaluatedGateProjection({
        artifacts,
        expectedExit: 1,
        policy: "all",
        result,
        status: "failed"
      });
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });
});

describe("formal CLI quality gate acceptance", () => {
  it("keeps input-unchanged evidence relation-free for a regression gate", { timeout: 60_000 }, () => {
    const fixture = createComparisonFixture(fixtureRoot, "input-unchanged");

    try {
      setFixtureCacheDir(fixture.projectRoot, ".cache/input-unchanged");
      const artifactDir = join(fixture.projectRoot, "artifacts", "input-unchanged");
      const result = runFormalGateScan(repoRoot, fixture.projectRoot, [
        "--profile", "full", "--gate", "regressions",
        "--baseline", "baseline-ref",
        "--artifact-dir", "artifacts/input-unchanged"
      ]);
      const artifacts = readFormalEntryArtifacts(artifactDir);

      assert.equal(artifacts.machine.run.references.identities.length, 1);
      assert.equal(
        artifacts.machine.run.references.evidence.every(
          ({ status }) => status === "complete"
        ),
        true
      );
      assert.deepEqual(artifacts.machine.run.references.relations, []);
      assertEvaluatedGateProjection({
        artifacts,
        expectedExit: 0,
        policy: "regressions",
        result,
        status: "passed"
      });
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });
});

describe("formal CLI quality gate acceptance", () => {
  it("projects changed non-regression evidence for a changed gate", { timeout: 60_000 }, () => {
    const fixture = createComparisonFixture(fixtureRoot, "changed-non-regression");

    try {
      commitChangedInput(fixture.projectRoot);
      setFixtureCacheDir(fixture.projectRoot, ".cache/changed-non-regression");
      setFixtureWarningPolicy(fixture.projectRoot, "watchlist-only");
      const artifactDir = join(fixture.projectRoot, "artifacts", "changed-non-regression");
      const result = runFormalGateScan(repoRoot, fixture.projectRoot, [
        "--profile", "full", "--gate", "changed",
        "--baseline", "baseline-ref",
        "--artifact-dir", "artifacts/changed-non-regression"
      ]);
      const artifacts = readFormalEntryArtifacts(artifactDir);

      assert.equal(hasRelation(artifacts, "changed"), true);
      assert.equal(hasRelation(artifacts, "regression"), false);
      assertEvaluatedGateProjection({
        artifacts,
        expectedExit: 1,
        policy: "changed",
        result,
        status: "failed"
      });
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });
});

describe("formal CLI quality gate acceptance", () => {
  it("projects regression evidence for a regressions gate", { timeout: 60_000 }, () => {
    const fixture = createComparisonFixture(fixtureRoot, "regression");

    try {
      commitMetricRegression(fixture.projectRoot);
      setFixtureCacheDir(fixture.projectRoot, ".cache/regression");
      const artifactDir = join(fixture.projectRoot, "artifacts", "regression");
      const result = runFormalGateScan(repoRoot, fixture.projectRoot, [
        "--profile", "full", "--gate", "regressions",
        "--baseline", "baseline-ref",
        "--artifact-dir", "artifacts/regression"
      ]);
      const artifacts = readFormalEntryArtifacts(artifactDir);

      assert.equal(hasRelation(artifacts, "regression"), true);
      assertEvaluatedGateProjection({
        artifacts,
        expectedExit: 1,
        policy: "regressions",
        result,
        status: "failed"
      });
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });
});

describe("formal CLI quality gate acceptance", () => {
  it("rejects a comparison gate without an explicit baseline before scan work", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject(fixtureRoot, "comparison-unavailable");

    try {
      const artifactDir = join(fixture.projectRoot, "artifacts", "comparison-unavailable");
      const result = runFormalGateScan(repoRoot, fixture.projectRoot, [
        "--profile", "full", "--gate", "regressions",
        "--artifact-dir", "artifacts/comparison-unavailable"
      ]);
      assert.equal(result.status, 3);
      assert.equal(result.stdout, "");
      assert.match(
        result.stderr,
        /Fatal error in quality scan: .*--gate regressions.*--baseline <revision>/i
      );
      assert.equal(existsSync(artifactDir), false);
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });
});

function hasRelation(
  artifacts: ReturnType<typeof readFormalEntryArtifacts>,
  relationId: "changed" | "regression"
): boolean {
  return artifacts.machine.run.references.relations.some(
    (relation) => relation.relationId === relationId
  );
}
