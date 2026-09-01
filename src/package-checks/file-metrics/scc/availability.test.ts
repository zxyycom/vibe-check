import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { checkScc } from "./availability.ts";

describe("SCC availability", () => {
  it("accepts only the SCC 4.0.0 executable contract", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-scc-availability-"));
    const v3 = executable(root, "scc version 3.7.0\n");
    const v4 = executable(root, "scc version 4.0.0\n");

    try {
      const v3Availability = await checkScc(root, { executable: v3 });
      assert.deepEqual(v3Availability, {
        available: false,
        error: 'expected scc version 4.0.0, got "scc version 3.7.0"',
        name: "scc",
        reason: "contract-error",
        source: "configured command",
        version: null
      });
      const v4Availability = await checkScc(root, { executable: v4 });
      assert.equal(v4Availability.available, true);
      assert.equal(v4Availability.version, "scc version 4.0.0");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function executable(root: string, versionOutput: string): string {
  const path = join(root, versionOutput.includes("3.7.0") ? "scc-v3.mjs" : "scc-v4.mjs");
  writeFileSync(
    path,
    `#!/usr/bin/env bun\nprocess.stdout.write(${JSON.stringify(versionOutput)});\n`
  );
  chmodSync(path, 0o755);
  return path;
}
