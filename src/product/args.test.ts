import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { parseArgs } from "./args.ts";

// @case WB-CLI-CONFIG-OPTIONS-001
describe("product config argument parsing", () => {
  it("preserves config path forms and explicit option presence", () => {
    const cases = [
      "vibe-check.config.json",
      "../shared/vibe-check.config.json",
      "/tmp/vibe-check.config.json"
    ];

    for (const configFile of cases) {
      const parsed = parseArgs([
        "--config",
        configFile,
        "--top-n",
        "3",
        "--artifact-dir",
        "artifacts/custom"
      ]);

      assert.equal(parsed.configFile, configFile);
      assert.equal(parsed.topN, 3);
      assert.equal(parsed.artifactDir, "artifacts/custom");
    }
  });

  it("keeps config-dependent options absent when callers omit them", () => {
    const parsed = parseArgs([]);

    assert.equal(parsed.configFile, null);
    assert.equal(parsed.topN, null);
    assert.equal(parsed.artifactDir, null);
  });

  it("rejects duplicate config flags and a missing config value", () => {
    assert.throws(
      () => parseArgs(["--config", "first.json", "--config", "second.json"]),
      /--config may only be provided once/
    );
    assert.throws(() => parseArgs(["--config"]), /config/i);
  });
});
