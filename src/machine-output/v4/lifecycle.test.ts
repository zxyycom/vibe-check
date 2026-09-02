import { strict as assert } from "node:assert";
import fs, {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { publishScanV4 } from "./publish.ts";
import { createPublicationModelV4 } from "./publication-model.ts";
import { PUBLICATION_INVOCATION, publicationSnapshot } from "./publication.test-support.ts";

describe("machine publication v4 lifecycle", () => {
  it("replaces only canonical files while preserving legacy-named and unrelated files", () => {
    const directory = mkdtempSync(join(tmpdir(), "vibe-check-publication-v4-"));
    try {
      writeFixtureFiles(directory);
      publishScanV4({ artifactDir: directory, model: model() });
      assert.equal(readFileSync(join(directory, "run.json"), "utf8").startsWith("{"), true);
      assert.notEqual(
        readFileSync(join(directory, "records.ndjson"), "utf8"),
        "prior-records.ndjson"
      );
      assertPreservedLegacyAndUnrelatedFiles(directory);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
  it("preserves prior artifacts when candidate writing fails before replacement", () => {
    const directory = mkdtempSync(join(tmpdir(), "vibe-check-publication-v4-"));
    try {
      writeFixtureFiles(directory);
      writeFileSync(join(directory, ".vibe-check-publication-prior.tmp"), "prior", "utf8");

      const originalWrite = fs.writeFileSync;
      let written = 0;
      fs.writeFileSync = (...args: Parameters<typeof fs.writeFileSync>): void => {
        written += 1;
        if (written === 2) throw new Error("injected candidate write failure");
        return originalWrite(...args);
      };
      try {
        assert.throws(
          () => publishScanV4({ artifactDir: directory, model: model() }),
          /injected candidate write failure/
        );
      } finally {
        fs.writeFileSync = originalWrite;
      }

      assertUnchangedPublicationAfterFailure(directory);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("preserves prior artifacts when the first canonical rename fails", () => {
    const directory = mkdtempSync(join(tmpdir(), "vibe-check-publication-v4-"));
    try {
      writeFixtureFiles(directory);
      writeFileSync(join(directory, ".vibe-check-publication-prior.tmp"), "prior", "utf8");

      const originalRename = fs.renameSync;
      fs.renameSync = (): void => {
        throw new Error("injected first rename failure");
      };
      try {
        assert.throws(
          () => publishScanV4({ artifactDir: directory, model: model() }),
          /injected first rename failure/
        );
      } finally {
        fs.renameSync = originalRename;
      }

      assertUnchangedPublicationAfterFailure(directory);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("cleans a partial replacement without deleting legacy-named or unrelated files", () => {
    const directory = mkdtempSync(join(tmpdir(), "vibe-check-publication-v4-"));
    try {
      writeFixtureFiles(directory);
      writeFileSync(join(directory, ".vibe-check-publication-prior.tmp"), "prior", "utf8");

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
      assertPreservedLegacyAndUnrelatedFiles(directory);
      assert.equal(existsSync(join(directory, ".vibe-check-publication-prior.tmp")), false);
      assert.equal(existsSync(join(directory, "raw")), false);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});

const LEGACY_AND_UNRELATED_NAMES = [
  "metrics.json",
  "report.md",
  "warnings-all.ndjson",
  "warnings.ndjson",
  "unrelated.json"
] as const;

function assertPriorCanonicalArtifacts(directory: string): void {
  assert.equal(readFileSync(join(directory, "run.json"), "utf8"), "prior-run.json");
  assert.equal(readFileSync(join(directory, "records.ndjson"), "utf8"), "prior-records.ndjson");
}

function assertUnchangedPublicationAfterFailure(directory: string): void {
  assertPriorCanonicalArtifacts(directory);
  assertPreservedLegacyAndUnrelatedFiles(directory);
  assert.deepEqual(
    readdirSync(directory).filter((name) => name.startsWith(".vibe-check-publication-")),
    []
  );
  assert.equal(existsSync(join(directory, "raw")), false);
}

function writeFixtureFiles(directory: string): void {
  for (const name of ["run.json", "records.ndjson", ...LEGACY_AND_UNRELATED_NAMES])
    writeFileSync(join(directory, name), `prior-${name}`, "utf8");
}

function assertPreservedLegacyAndUnrelatedFiles(directory: string): void {
  for (const name of LEGACY_AND_UNRELATED_NAMES)
    assert.equal(readFileSync(join(directory, name), "utf8"), `prior-${name}`);
}

function model() {
  return createPublicationModelV4({
    invocation: PUBLICATION_INVOCATION,
    snapshot: publicationSnapshot()
  });
}
