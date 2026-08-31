import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { isNonArrayRecord } from "../../value-guards.ts";
import { auditCandidateManifest, writeCandidateManifest } from "./manifest.ts";

test("generated package manifest rejects legal, host, publish, executable, and export drift", () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-package-manifest-"));
  try {
    const manifestPath = join(root, "package.json");
    writeCandidateManifest({ manifestPath, version: "0.0.1" });
    const source = readFileSync(manifestPath, "utf8");
    assert.doesNotThrow(() => auditCandidateManifest(source, "0.0.1"));

    for (const mutation of [
      (manifest: MutableManifest) => {
        manifest.license = "UNLICENSED";
      },
      (manifest: MutableManifest) => {
        manifest.engines = { node: ">=24" };
      },
      (manifest: MutableManifest) => {
        manifest.publishConfig = { access: "restricted" };
      },
      (manifest: MutableManifest) => {
        manifest.private = false;
      },
      (manifest: MutableManifest) => {
        manifest.bin = { "vibe-check": "cli.mjs" };
      },
      (manifest: MutableManifest) => {
        manifest.scripts = { prepublishOnly: "bun build.ts" };
      },
      (manifest: MutableManifest) => {
        const rootExports = manifest.exports;
        if (!isNonArrayRecord(rootExports)) {
          throw new TypeError("fixture exports must be an object");
        }
        manifest.exports = {
          ...rootExports,
          "./internal": "./dist/internal.mjs"
        };
      }
    ]) {
      const manifest = mutableManifest(source);
      mutation(manifest);
      assert.throws(() => auditCandidateManifest(JSON.stringify(manifest), "0.0.1"));
    }
    assert.throws(() => auditCandidateManifest(source, "0.0.2"), /identity/u);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

type MutableManifest = Record<string, unknown>;

function mutableManifest(source: string): MutableManifest {
  const value: unknown = JSON.parse(source);
  if (!isNonArrayRecord(value)) throw new TypeError("fixture manifest must be an object");
  return value;
}
