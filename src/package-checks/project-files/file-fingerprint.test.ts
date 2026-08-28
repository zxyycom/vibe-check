import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import { fingerprintProjectFiles } from "./file-fingerprint.ts";

describe("quality input fingerprints", () => {
  it("uses stable SHA-256 fingerprints for sorted file content", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-file-fingerprint-"));
    const orderedPaths = ["src/a.ts", "src/b.ts"];
    const reversedPaths = [...orderedPaths].reverse();

    try {
      writeFixtureFile(tempDir, "src/a.ts", "export const a = 1;\n");
      writeFixtureFile(tempDir, "src/b.ts", "export const b = 2;\n");

      const ordered = fingerprintProjectFiles(tempDir, orderedPaths);
      const reversed = fingerprintProjectFiles(tempDir, reversedPaths);
      assert.equal(reversed.fingerprint, ordered.fingerprint);
      assert.match(ordered.fingerprint, /^sha256:[a-f0-9]{64}:2$/);

      writeFixtureFile(tempDir, "src/b.ts", "export const b = 3;\n");
      const changed = fingerprintProjectFiles(tempDir, orderedPaths);
      assert.notEqual(changed.fingerprint, ordered.fingerprint);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

function writeFixtureFile(root: string, relativePath: string, content: string): void {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}
