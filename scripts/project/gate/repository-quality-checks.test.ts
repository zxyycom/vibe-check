import assert from "node:assert/strict";
import { isAbsolute } from "node:path";
import { describe, it } from "node:test";

import {
  createRepositoryQualityChecks,
  repositoryQualityScannerCommands
} from "./repository-quality-checks.ts";

describe("repository quality Checks", () => {
  it("uses the retained repository policy and mise-provided absolute scanner commands", () => {
    const checks = createRepositoryQualityChecks({
      lizard: "/tools/lizard",
      scc: "/tools/scc"
    });

    assert.deepEqual(
      checks.map(({ checkId }) => checkId),
      ["duplicate-detection", "file-metrics", "function-metrics", "markdown-link-validation"]
    );
    const [duplicateDetection, fileMetrics, functionMetrics] = checks;
    assert.equal(fileMetrics.options.scanner.executable, "/tools/scc");
    assert.equal(functionMetrics.options.scanner.executable, "/tools/lizard");
    assert.equal(
      functionMetrics.options.codeAreas["product-source"]?.findingPolicy,
      "non-blocking"
    );
    assert.equal(
      functionMetrics.options.codeAreas["script-tooling"]?.findingPolicy,
      "non-blocking"
    );
    assert.equal(duplicateDetection.options.codeAreas["script-tests"]?.minimumTokens, 100);
  });

  it("substitutes an unavailable absolute command when mise bindings are missing or relative", () => {
    const commands = repositoryQualityScannerCommands({
      VIBE_CHECK_LIZARD_CMD: "lizard",
      VIBE_CHECK_SCC_CMD: undefined
    });

    assert.equal(isAbsolute(commands.lizard), true);
    assert.equal(isAbsolute(commands.scc), true);
    assert.notEqual(commands.lizard, "lizard");
    assert.notEqual(commands.scc, "scc");

    const checks = createRepositoryQualityChecks({ lizard: "lizard", scc: "scc" });
    assert.equal(isAbsolute(checks[1].options.scanner.executable), true);
    assert.equal(isAbsolute(checks[2].options.scanner.executable), true);
    assert.notEqual(checks[1].options.scanner.executable, "scc");
    assert.notEqual(checks[2].options.scanner.executable, "lizard");
  });
});
