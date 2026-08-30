import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { partitionProjectFilesByEligibility } from "./input-eligibility.ts";

describe("project file eligibility partition", () => {
  it("assigns every selected path once while preserving accepted and rejected order", () => {
    const visited: string[] = [];
    const partition = partitionProjectFilesByEligibility(
      ["docs/guide.md", "src/index.ts", "docs/notes.txt"],
      (path) => {
        visited.push(path);
        return path.endsWith(".md");
      }
    );

    assert.deepEqual(visited, ["docs/guide.md", "src/index.ts", "docs/notes.txt"]);
    assert.deepEqual(partition, {
      acceptedPaths: ["docs/guide.md"],
      rejectedPaths: ["src/index.ts", "docs/notes.txt"]
    });
    assert.equal(Object.isFrozen(partition), true);
    assert.equal(Object.isFrozen(partition.acceptedPaths), true);
    assert.equal(Object.isFrozen(partition.rejectedPaths), true);
  });
});
