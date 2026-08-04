import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { scanWithScc } from "./scanners/scc.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("quality scc exact input projection", () => {
  it("returns empty metrics without invoking scc when exact inputs are empty", () => {
    const result = scanWithScc({
      cwd: REPO_ROOT,
      includePaths: [],
      excludeDirs: [],
      dependency: {
        args: [],
        availabilityArgs: ["--version"],
        executable: join(
          REPO_ROOT,
          `vibe-check-missing-scc-${process.pid}.cmd`,
        ),
      },
    });

    assert.deepEqual(result, {
      ok: true,
      files: [],
      aggregates: { byLanguage: [] },
    });
  });

  it("rejects a successful scc invocation that produces no CSV header", () => {
    const dependency = createFakeSccToolConfig("");

    try {
      const result = scanWithScc({
        cwd: REPO_ROOT,
        includePaths: ["src"],
        excludeDirs: [],
        dependency,
      });

      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "invalid-result");
        assert.match(result.error, /header/i);
      }
    } finally {
      dependency.cleanup();
    }
  });
});
function createFakeSccToolConfig(stdout: string) {
  const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-quality-scc-"));
  const fakeSccPath = join(tempDir, "fake-scc.ts");

  writeFileSync(
    fakeSccPath,
    `process.stdout.write(${JSON.stringify(stdout)});\n`,
    "utf8",
  );

  return {
    args: [fakeSccPath],
    availabilityArgs: [fakeSccPath, "--version"],
    executable: process.execPath,
    cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
  };
}
