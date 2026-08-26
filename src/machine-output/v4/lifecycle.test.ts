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
  it("preserves prior artifacts when candidate writing fails before replacement", () => {
    const directory = mkdtempSync(join(tmpdir(), "vibe-check-publication-v4-"));
    try {
      for (const name of ["run.json", "records.ndjson", "report.md", "unrelated.json"]) {
        writeFileSync(join(directory, name), `prior-${name}`, "utf8");
      }
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

      assert.equal(readFileSync(join(directory, "run.json"), "utf8"), "prior-run.json");
      assert.equal(readFileSync(join(directory, "records.ndjson"), "utf8"), "prior-records.ndjson");
      assert.equal(readFileSync(join(directory, "report.md"), "utf8"), "prior-report.md");
      assert.equal(readFileSync(join(directory, "unrelated.json"), "utf8"), "prior-unrelated.json");
      assert.deepEqual(
        readdirSync(directory).filter((name) => name.startsWith(".vibe-check-publication-")),
        []
      );
      assert.equal(existsSync(join(directory, "raw")), false);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("preserves prior artifacts when the first canonical rename fails", () => {
    const directory = mkdtempSync(join(tmpdir(), "vibe-check-publication-v4-"));
    try {
      for (const name of ["run.json", "records.ndjson", "report.md", "unrelated.json"]) {
        writeFileSync(join(directory, name), `prior-${name}`, "utf8");
      }
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

      assert.equal(readFileSync(join(directory, "run.json"), "utf8"), "prior-run.json");
      assert.equal(readFileSync(join(directory, "records.ndjson"), "utf8"), "prior-records.ndjson");
      assert.equal(readFileSync(join(directory, "report.md"), "utf8"), "prior-report.md");
      assert.equal(readFileSync(join(directory, "unrelated.json"), "utf8"), "prior-unrelated.json");
      assert.deepEqual(
        readdirSync(directory).filter((name) => name.startsWith(".vibe-check-publication-")),
        []
      );
      assert.equal(existsSync(join(directory, "raw")), false);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("cleans a partial replacement and retired artifacts without creating raw output", () => {
    const directory = mkdtempSync(join(tmpdir(), "vibe-check-publication-v4-"));
    try {
      for (const name of ["run.json", "records.ndjson", "report.md", "unrelated.json"]) {
        writeFileSync(join(directory, name), `prior-${name}`, "utf8");
      }
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
      assert.equal(existsSync(join(directory, "report.md")), false);
      assert.equal(existsSync(join(directory, ".vibe-check-publication-prior.tmp")), false);
      assert.equal(existsSync(join(directory, "raw")), false);
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
