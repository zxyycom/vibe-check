import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "node:test";

import { runProductCli } from "./index.ts";

it("legacy Product CLI requests return one actionable migration diagnostic without work", async () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-legacy-cli-"));
  const legacyPath = join(root, "private-config.json");
  writeFileSync(legacyPath, "{}", "utf8");
  const messages: string[] = [];

  try {
    for (const argv of [["scan", root, "--config", legacyPath], ["init", root]]) {
      assert.equal(await runProductCli(argv, {
        error: (message) => messages.push(message)
      }), 3);
    }

    assert.equal(messages.length, 2);
    for (const message of messages) {
      assert.match(message, /TypeScript Project Definition/);
      assert.match(message, /bound project Run/);
      assert.doesNotMatch(message, /private-config|--config/);
    }
    assert.equal(existsSync(join(root, ".cache")), false);
    assert.equal(existsSync(join(root, "artifacts")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
