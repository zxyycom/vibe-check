import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { matchesAnyConfigGlob } from "../project-files/config-glob.ts";
import { languages } from "./analyzer/reader-registry.ts";
import { FUNCTION_METRICS_SUPPORTED_FILE_GLOBS, isFunctionMetricsTarget } from "./target-files.ts";

describe("functionMetrics analyzer target files", () => {
  it("selects every translated registry extension case-insensitively and excludes unsupported paths", () => {
    const extensions = [
      ...new Map(
        languages().flatMap((reader) =>
          reader.ext.map((extension) => [extension.toLowerCase(), extension] as const)
        )
      ).values()
    ];
    const supported = extensions.map((extension) => `source/example.${extension}`);
    const files = [
      ...supported,
      "source/upper-case.CPP",
      "source/upper-case.R",
      "README.md",
      "docs/schema.json",
      "source/data.yaml",
      "source/no-extension",
      "c",
      "r",
      "ts"
    ];

    assert.equal(languages().length, 27);
    assert.equal(extensions.length, 55);
    assert.deepEqual(files.filter(isFunctionMetricsTarget), [
      ...supported,
      "source/upper-case.CPP",
      "source/upper-case.R"
    ]);
    assert.equal(FUNCTION_METRICS_SUPPORTED_FILE_GLOBS.length, 55);
    assert.equal(
      matchesAnyConfigGlob("source/upper-case.CPP", FUNCTION_METRICS_SUPPORTED_FILE_GLOBS),
      true
    );
    assert.equal(
      matchesAnyConfigGlob("source/mixed.TsX", FUNCTION_METRICS_SUPPORTED_FILE_GLOBS),
      true
    );
    assert.equal(matchesAnyConfigGlob("README.md", FUNCTION_METRICS_SUPPORTED_FILE_GLOBS), false);
  });
});
