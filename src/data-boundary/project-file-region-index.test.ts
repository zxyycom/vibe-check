import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { createProjectFileRegionIndex } from "./project-file-region-index.ts";
import type { ProjectFileRegion, ProjectFileRegionIndex } from "./project-file-region-index.ts";

describe("project file-region index", () => {
  it("retains one sorted bidirectional relation with overlaps, known empties and unknown keys", () => {
    const index = createProjectFileRegionIndex({
      fileSources: [
        ["src/z.ts", "orphan.txt"],
        ["src/a.ts", "src/z.ts"]
      ],
      regionSources: [
        [{ id: "z-rule", kind: "patterns", patterns: ["src/**"] }],
        [
          { id: "a-members", kind: "members", files: ["src/a.ts", "removed.ts", "src/a.ts"] },
          { id: "empty-members", kind: "members", files: [] },
          { id: "empty-rule", kind: "patterns", patterns: [] },
          { id: "__proto__", kind: "patterns", patterns: ["never/**"] }
        ]
      ]
    });
    assert.deepEqual(index.filePaths, ["orphan.txt", "removed.ts", "src/a.ts", "src/z.ts"]);
    assert.deepEqual(index.regionIds, [
      "__proto__",
      "a-members",
      "empty-members",
      "empty-rule",
      "z-rule"
    ]);
    assert.deepEqual(index.regionsForFile("src/a.ts"), ["a-members", "z-rule"]);
    assert.deepEqual(index.regionsForFile("orphan.txt"), []);
    assert.deepEqual(index.filesForRegion("a-members"), ["removed.ts", "src/a.ts"]);
    assert.deepEqual(index.filesForRegion("z-rule"), ["src/a.ts", "src/z.ts"]);
    assert.deepEqual(index.filesForRegion("empty-members"), []);
    assert.deepEqual(index.filesForRegion("empty-rule"), []);
    assert.deepEqual(index.filesForRegion("__proto__"), []);
    assert.equal(index.regionsForFile("unknown.ts"), undefined);
    assert.equal(index.filesForRegion("unknown"), undefined);
    assertBidirectional(index);
    const empty = createProjectFileRegionIndex();
    assert.deepEqual(empty.filePaths, []);
    assert.deepEqual(empty.regionIds, []);
    assert.equal(empty.regionsForFile("a.ts"), undefined);
    assert.equal(empty.filesForRegion("a"), undefined);
  });

  it("rebuilds batch and appended sources equally without expanding actual members or old views", () => {
    const files = ["src/a.ts"];
    const rule: ProjectFileRegion = { id: "rule", kind: "patterns", patterns: ["src/**"] };
    const actual: ProjectFileRegion = { id: "actual", kind: "members", files: ["src/a.ts"] };
    const regions: ProjectFileRegion[] = [rule, actual];
    const initialSource = Proxy.revocable(
      {
        fileSources: [files],
        regionSources: [regions]
      },
      {}
    );
    const original = createProjectFileRegionIndex(initialSource.proxy);
    initialSource.revoke();
    files.push("src/not-received.ts");
    regions.push({ id: "not-received", kind: "patterns", patterns: ["**/*"] });
    const addition = [{ id: "new-rule", kind: "patterns" as const, patterns: ["**/*.ts"] }];
    const appended = original
      .appendSources({ fileSources: [["src/b.ts", "src/a.ts"]] })
      .appendSources({ regionSources: [addition] });
    addition[0]?.patterns.push("**/*.txt");
    const batch = createProjectFileRegionIndex({
      fileSources: [["src/a.ts"], ["src/b.ts", "src/a.ts"]],
      regionSources: [[rule, actual], [{ id: "new-rule", kind: "patterns", patterns: ["**/*.ts"] }]]
    });
    assert.deepEqual(relationView(appended), relationView(batch));
    assert.deepEqual(appended.filesForRegion("rule"), ["src/a.ts", "src/b.ts"]);
    assert.deepEqual(appended.filesForRegion("actual"), ["src/a.ts"]);
    assert.deepEqual(appended.filesForRegion("new-rule"), ["src/a.ts", "src/b.ts"]);
    assert.deepEqual(original.filesForRegion("rule"), ["src/a.ts"]);
    assert.equal(original.regionsForFile("src/b.ts"), undefined);
    assert.equal(original.filesForRegion("new-rule"), undefined);
    assertBidirectional(appended);
    assert.notEqual(original.appendSources({}), original);
    assert.deepEqual(relationView(original.appendSources({})), relationView(original));
    assert.throws(() => original.appendSources({ regionSources: [[rule]] }), /duplicate region ID/);
    assert.deepEqual(original.regionIds, ["actual", "rule"]);
  });

  it("isolates source values, frozen query arrays and view methods from runtime mutation", () => {
    const paths = ["src/a.ts"];
    const patterns = ["src/**"];
    const actual = ["src/a.ts"];
    const source: ProjectFileRegion = { id: "rule", kind: "patterns", patterns };
    const sources = {
      fileSources: [paths],
      regionSources: [[source, { id: "actual", kind: "members" as const, files: actual }]]
    };
    const index = createProjectFileRegionIndex(sources);
    paths.push("other.txt");
    patterns[0] = "other/**";
    actual.push("other.txt");
    Reflect.set(source, "id", "mutated");
    sources.regionSources.length = 0;
    assert.equal(Object.isFrozen(paths), false);
    assert.equal(Object.isFrozen(source), false);
    for (const array of [
      index.filePaths,
      index.regionIds,
      index.regionsForFile("src/a.ts")!,
      index.filesForRegion("rule")!
    ]) {
      assert.equal(Object.isFrozen(array), true);
      assert.equal(Reflect.set(array, "0", "mutated"), false);
      assert.equal(Reflect.deleteProperty(array, "0"), false);
    }
    assert.equal(Object.isFrozen(index), true);
    assert.equal(
      Reflect.set(index, "regionsForFile", () => []),
      false
    );
    assert.equal(Reflect.set(index, "filePaths", []), false);
    const { regionsForFile, filesForRegion, appendSources } = index;
    assert.deepEqual(regionsForFile("src/a.ts"), ["actual", "rule"]);
    assert.deepEqual(filesForRegion("rule"), ["src/a.ts"]);
    assert.deepEqual(appendSources({ fileSources: [["src/b.ts"]] }).filesForRegion("rule"), [
      "src/a.ts",
      "src/b.ts"
    ]);
    assert.equal(index.regionsForFile("other.txt"), undefined);
  });

  it("matches complete native lists including explicit default-excluded and nonexistent paths", () => {
    const paths = [
      "build/a.ts",
      "docs/new.md",
      "src/.hidden.ts",
      "src/generated/new.ts",
      "src/plain.ts",
      "src/line\nname.ts"
    ];
    const matrix = [
      {
        patterns: ["{build,src}/**/*.ts"],
        files: [
          "build/a.ts",
          "src/.hidden.ts",
          "src/generated/new.ts",
          "src/line\nname.ts",
          "src/plain.ts"
        ]
      },
      { patterns: ["src/**/@(plain|.hidden).ts"], files: ["src/.hidden.ts", "src/plain.ts"] },
      { patterns: ["!src/**"], files: ["build/a.ts", "docs/new.md"] },
      {
        patterns: ["src/**", "!src/generated/**", "src/generated/new.ts"],
        files: ["src/.hidden.ts", "src/generated/new.ts", "src/plain.ts"]
      },
      { patterns: ["./src/**"], files: ["src/.hidden.ts", "src/generated/new.ts", "src/plain.ts"] },
      { patterns: ["SRC/**"], files: [] },
      { patterns: [], files: [] }
    ];
    for (const { patterns, files } of matrix) {
      const index = createProjectFileRegionIndex({
        fileSources: [paths],
        regionSources: [[{ id: "rule", kind: "patterns", patterns }]]
      });
      assert.deepEqual(index.filesForRegion("rule"), files, JSON.stringify(patterns));
      assertBidirectional(index);
    }
  });

  it("constructs, queries and appends while filesystem and process acquisition are blocked", () => {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("./project-file-region-index.test-support.ts", import.meta.url))],
      { encoding: "utf8" }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "no I/O: passed");
  });
});

function assertBidirectional(index: ProjectFileRegionIndex): void {
  for (const path of index.filePaths) {
    for (const regionId of index.regionIds) {
      assert.equal(
        index.regionsForFile(path)?.includes(regionId),
        index.filesForRegion(regionId)?.includes(path)
      );
    }
  }
}

function relationView(index: ProjectFileRegionIndex): unknown {
  return {
    files: index.filePaths.map((path) => [path, index.regionsForFile(path)]),
    regions: index.regionIds.map((id) => [id, index.filesForRegion(id)])
  };
}
