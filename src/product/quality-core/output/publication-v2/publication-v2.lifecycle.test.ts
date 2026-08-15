import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  PUBLICATION_V2_FAILURE_STAGES,
  PUBLICATION_V2_LIFECYCLE,
  planPublicationCleanupV2
} from "./index.ts";

describe("machine publication v2 lifecycle", () => {
  it("pins candidate artifact and handled-failure lifecycle stages", () => {
    assert.deepEqual(PUBLICATION_V2_LIFECYCLE, {
      candidateStages: [
        "validate-publication-model", "serialize-machine-candidates",
        "render-report-candidate", "validate-machine-set"
      ],
      artifactStages: [
        "cleanup-prior-owned-artifacts", "write-same-directory-owned-temps",
        "rename-machine-files", "rename-report", "publish-trusted-paths"
      ]
    });
    assert.deepEqual(PUBLICATION_V2_FAILURE_STAGES, [
      "validate-publication-model", "serialize-machine-candidates",
      "render-report-candidate", "validate-machine-set",
      "cleanup-prior-owned-artifacts", "write-same-directory-owned-temps",
      "rename-machine-files", "rename-report"
    ]);
  });
});

describe("machine publication v2 lifecycle", () => {
  it("plans exact prior-v2 stale-v1 report and owned-temp cleanup without touching unrelated files", () => {
    const artifactDir = mkdtempSync(join(tmpdir(), "vibe-check-publication-v2-cleanup-"));
    const ownedTempDir = join(artifactDir, ".vibe-check-publication-prior");
    try {
      mkdirSync(ownedTempDir);
      for (const name of [
        "run.json", "records.ndjson", "report.md", "metrics.json", "warnings.ndjson",
        "warnings-all.ndjson", "unrelated.json"
      ]) {
        writeFileSync(join(artifactDir, name), name, "utf8");
      }
      writeFileSync(join(ownedTempDir, "run.json.tmp"), "temp", "utf8");

      const plan = planPublicationCleanupV2(artifactDir);
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
});
