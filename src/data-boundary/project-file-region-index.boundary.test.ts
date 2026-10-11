import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createProjectFileRegionIndex } from "./project-file-region-index.ts";
import type { ProjectFileRegion, ProjectFileRegionSources } from "./project-file-region-index.ts";

describe("project file-region index", () => {
  it("rejects malformed closed structures at every nesting level without evaluating getters", () => {
    let getterCalls = 0;
    const accessor = Object.defineProperty({}, "fileSources", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return [];
      }
    });
    const arrayAccessor = Object.defineProperty(["src/a.ts"], "0", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "src/a.ts";
      }
    });
    const regionAccessor = Object.defineProperty({ id: "a", kind: "members" }, "files", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return [];
      }
    });
    const invalidSources: unknown[] = [
      null,
      [],
      0,
      { extra: [] },
      { fileSources: undefined },
      { regionSources: undefined },
      { fileSources: "a" },
      { fileSources: [undefined] },
      { fileSources: [new Array(1)] },
      { fileSources: [Object.assign(["a"], { extra: true })] },
      { regionSources: [new Array(1)] },
      { regionSources: [[{ id: "a", kind: "unknown" }]] },
      { regionSources: [[{ id: "a", kind: "patterns", patterns: [], files: [] }]] },
      { regionSources: [[{ id: "a", kind: "patterns", patterns: [0] }]] },
      { regionSources: [[{ id: "a", kind: "patterns", patterns: [""] }]] },
      { regionSources: [[{ id: "a", kind: "patterns", patterns: new Array(1) }]] },
      { regionSources: [[{ id: "a", kind: "members", files: [], extra: true }]] },
      Object.assign({}, { [Symbol("extra")]: true }),
      Object.create({ fileSources: [] }),
      Object.defineProperty({}, "fileSources", { value: [] }),
      accessor,
      { fileSources: [arrayAccessor] },
      { regionSources: [[regionAccessor]] }
    ];
    for (const sources of invalidSources) {
      assert.throws(
        () => Reflect.apply(createProjectFileRegionIndex, undefined, [sources]),
        TypeError
      );
      assert.throws(
        () => Reflect.apply(createProjectFileRegionIndex().appendSources, undefined, [sources]),
        TypeError
      );
    }
    assert.equal(getterCalls, 0);
    const plainNullSources: ProjectFileRegionSources = { fileSources: [["a"]] };
    Object.setPrototypeOf(plainNullSources, null);
    const fromNullSources = createProjectFileRegionIndex(plainNullSources);
    assert.deepEqual(fromNullSources.filePaths, ["a"]);
  });

  it("rejects path aliases and invalid or colliding region identities", () => {
    const index = createProjectFileRegionIndex();
    for (const path of [
      "",
      "/a",
      "../a",
      "a/../b",
      "./a",
      "a//b",
      "a/",
      "C:a",
      "a\\b",
      "a\0b",
      0
    ]) {
      assert.throws(() => Reflect.apply(index.regionsForFile, undefined, [path]), TypeError);
      assert.throws(
        () => Reflect.apply(createProjectFileRegionIndex, undefined, [{ fileSources: [[path]] }]),
        TypeError
      );
      assert.throws(
        () =>
          Reflect.apply(createProjectFileRegionIndex, undefined, [
            { regionSources: [[{ id: "x", kind: "members", files: [path] }]] }
          ]),
        TypeError
      );
    }
    for (const id of ["", 0, undefined]) {
      assert.throws(() => Reflect.apply(index.filesForRegion, undefined, [id]), TypeError);
      assert.throws(
        () =>
          Reflect.apply(createProjectFileRegionIndex, undefined, [
            { regionSources: [[{ id, kind: "members", files: [] }]] }
          ]),
        TypeError
      );
    }
    const region: ProjectFileRegion = { id: "same", kind: "members", files: [] };
    for (const regionSources of [
      [[region, region]],
      [[region], [region]],
      [[region], [{ id: "same", kind: "patterns" as const, patterns: ["**/*"] }]]
    ]) {
      assert.throws(() => createProjectFileRegionIndex({ regionSources }), /duplicate region ID/);
    }
    const legal = createProjectFileRegionIndex({
      fileSources: [["a\nb.ts", "真正�.ts", ".dot/a.ts"]]
    });
    assert.deepEqual(legal.filePaths, [".dot/a.ts", "a\nb.ts", "真正�.ts"]);
  });

  it("preserves opaque nonempty region identities through queries and append", () => {
    const id = "nul\0id";
    const region: ProjectFileRegion = { id, kind: "patterns", patterns: [] };
    const index = createProjectFileRegionIndex({ regionSources: [[region]] });
    assert.deepEqual(index.regionIds, [id]);
    assert.deepEqual(index.filesForRegion(id), []);
    assert.equal(index.filesForRegion("unknown\0id"), undefined);
    const appended = index.appendSources({
      regionSources: [[{ id: "\0", kind: "members", files: ["src/a.ts"] }]]
    });
    assert.deepEqual(appended.regionIds, ["\0", id]);
    assert.deepEqual(appended.regionsForFile("src/a.ts"), ["\0"]);
    assert.deepEqual(appended.filesForRegion("\0"), ["src/a.ts"]);
    assert.deepEqual(appended.filesForRegion(id), []);
    assert.deepEqual(index.regionIds, [id]);
    assert.throws(
      () => appended.appendSources({ regionSources: [[region]] }),
      /duplicate region ID/
    );
  });
});
