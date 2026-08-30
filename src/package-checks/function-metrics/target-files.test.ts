import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { selectLizardTargetFiles } from "./target-files.ts";

describe("Lizard target files", () => {
  it("selects every Lizard 1.23-supported extension case-insensitively and excludes fallback inputs", () => {
    const supported = [
      "c",
      "cc",
      "cjs",
      "cpp",
      "cs",
      "cxx",
      "erl",
      "es",
      "escript",
      "f",
      "f03",
      "f08",
      "f70",
      "f90",
      "f95",
      "for",
      "fpp",
      "ftn",
      "gd",
      "go",
      "h",
      "hpp",
      "hrl",
      "java",
      "js",
      "jsx",
      "kt",
      "kts",
      "lua",
      "m",
      "mjs",
      "mm",
      "pck",
      "php",
      "pkb",
      "pks",
      "pl",
      "plb",
      "pls",
      "pm",
      "py",
      "r",
      "rb",
      "rs",
      "scala",
      "sol",
      "sql",
      "st",
      "swift",
      "ts",
      "ttcn",
      "ttcnpp",
      "tsx",
      "vue",
      "zig"
    ].map((extension) => `source/example.${extension}`);
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

    assert.deepEqual(selectLizardTargetFiles(files), [
      ...supported,
      "source/upper-case.CPP",
      "source/upper-case.R"
    ]);
  });
});
