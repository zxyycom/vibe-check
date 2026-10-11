// #region package-api-example:project-file-region-index
import { createProjectFileRegionIndex } from "@zxyycom/vibe-check";

const index = createProjectFileRegionIndex({
  fileSources: [["src/a.ts", "docs/readme.md"], ["src/a.ts", "src/b.ts"]],
  regionSources: [[
    { id: "source", kind: "patterns", patterns: ["src/*.ts", "!src/ignored.ts"] },
    { id: "reviewed", kind: "members", files: ["src/a.ts"] },
    { id: "empty", kind: "members", files: [] }
  ]]
});

if (index.regionsForFile("src/a.ts")?.join(",") !== "reviewed,source") {
  throw new Error("Expected overlapping regions");
}
if (index.regionsForFile("docs/readme.md")?.length !== 0 || index.filesForRegion("unknown") !== undefined) {
  throw new Error("Expected known empty and unknown to remain distinct");
}

const next = index.appendSources({ fileSources: [["src/new.ts"]] });
if (next.filesForRegion("source")?.length !== 3 || next.filesForRegion("reviewed")?.length !== 1) {
  throw new Error("Expected rules to rebuild without expanding actual members");
}
if (index.regionsForFile("src/new.ts") !== undefined || !Object.isFrozen(next.filePaths)) {
  throw new Error("Expected independent immutable views");
}
// #endregion package-api-example:project-file-region-index
