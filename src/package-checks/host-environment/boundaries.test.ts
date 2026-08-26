import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { walkFiles, writeJsonFile } from "./filesystem.ts";
import { runProcessSync } from "./process/runner.ts";

describe("package Checks host environment boundaries", () => {
  it("uses named file and process inputs while preserving explicit serialization failures", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "vibe-check-product-foundation-"));
    const filePath = join(rootDir, "record.json");

    try {
      writeJsonFile({ filePath, trailingNewline: false, value: { ok: true } });
      assert.deepEqual(JSON.parse(readFileSync(filePath, "utf8")), { ok: true });
      assert.deepEqual(walkFiles({ rootDir }), ["record.json"]);
      assert.throws(
        () => writeJsonFile({ filePath, value: undefined }),
        /could not serialize JSON file/u
      );

      const processResult = runProcessSync({
        args: ["-e", "process.stdout.write('ok')"],
        command: process.execPath
      });
      assert.equal(processResult.status, 0);
      assert.equal(processResult.stdout, "ok");
    } finally {
      rmSync(rootDir, { force: true, recursive: true });
    }
  });
});
