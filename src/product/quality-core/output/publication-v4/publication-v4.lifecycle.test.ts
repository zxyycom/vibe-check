import { strict as assert } from "node:assert";
import fs, { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { publishScanV4 } from "../../scan-command/publication-v4.ts";
import {
  PUBLICATION_V4_FAILURE_STAGES,
  PUBLICATION_V4_LIFECYCLE,
  createPublicationModelV4,
  planPublicationCleanupV4
} from "./index.ts";
import { PUBLICATION_INVOCATION, publicationSnapshot } from "./publication-v4.test-support.ts";

describe("machine publication v4 lifecycle", () => {
  it("pins two-file candidate and handled-failure lifecycle stages", () => {
    assert.deepEqual(PUBLICATION_V4_LIFECYCLE, {
      candidateStages: [
        "validate-publication-model",
        "serialize-machine-candidates",
        "validate-machine-set"
      ],
      artifactStages: [
        "cleanup-stale-owned-temps",
        "write-same-directory-owned-temps",
        "rename-machine-files",
        "cleanup-retired-artifacts",
        "publish-trusted-paths"
      ]
    });
    assert.deepEqual(PUBLICATION_V4_FAILURE_STAGES, [
      "validate-publication-model",
      "serialize-machine-candidates",
      "validate-machine-set",
      "cleanup-stale-owned-temps",
      "write-same-directory-owned-temps",
      "rename-machine-files",
      "cleanup-retired-artifacts"
    ]);
  });

  it("removes retired reports and leaves no canonical set after handled partial replacement", () => {
    const directory = mkdtempSync(join(tmpdir(), "vibe-check-publication-v4-"));
    try {
      for (const name of ["run.json", "records.ndjson", "report.md", "unrelated.json"]) {
        writeFileSync(join(directory, name), `prior-${name}`, "utf8");
      }
      const plan = planPublicationCleanupV4(directory);
      assert.deepEqual(plan.canonicalPaths, [
        join(directory, "records.ndjson"),
        join(directory, "run.json")
      ]);
      assert.ok(plan.retiredPaths.includes(join(directory, "report.md")));

      const originalRename = fs.renameSync;
      let renamed = 0;
      fs.renameSync = (...args: Parameters<typeof fs.renameSync>): void => {
        renamed += 1;
        if (renamed === 2) throw new Error("injected rename failure");
        return originalRename(...args);
      };
      try {
        assert.throws(
          () => publishScanV4({ artifactDir: directory, model: model() }),
          /injected rename failure/
        );
      } finally {
        fs.renameSync = originalRename;
      }
      assert.equal(existsSync(join(directory, "run.json")), false);
      assert.equal(existsSync(join(directory, "records.ndjson")), false);
      assert.equal(existsSync(join(directory, "report.md")), false);
      assert.equal(readFileSync(join(directory, "unrelated.json"), "utf8"), "prior-unrelated.json");
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});

function model() {
  return createPublicationModelV4({
    invocation: PUBLICATION_INVOCATION,
    snapshot: publicationSnapshot()
  });
}
