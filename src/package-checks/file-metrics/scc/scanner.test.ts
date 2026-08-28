import { strict as assert } from "node:assert";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { scanWithScc } from "./scanner.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("quality scc exact input projection", () => {
  it("returns empty metrics without invoking scc when exact inputs are empty", () => {
    const result = scanWithScc({
      cwd: REPO_ROOT,
      includePaths: [],
      dependency: {
        executable: join(REPO_ROOT, `vibe-check-missing-scc-${process.pid}.cmd`)
      }
    });

    assert.deepEqual(result, {
      ok: true,
      measurements: []
    });
  });

  it("rejects a successful scc invocation that produces no CSV header", () => {
    const dependency = createFakeSccToolConfig("");

    try {
      const result = scanWithScc({
        cwd: REPO_ROOT,
        includePaths: ["src"],
        dependency
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
  const fakeSccPath = join(tempDir, "fake-scc.mjs");

  writeFileSync(
    fakeSccPath,
    `#!/usr/bin/env bun\nprocess.stdout.write(${JSON.stringify(stdout)});\n`,
    "utf8"
  );
  chmodSync(fakeSccPath, 0o755);

  return {
    executable: fakeSccPath,
    cleanup: () => rmSync(tempDir, { recursive: true, force: true })
  };
}
