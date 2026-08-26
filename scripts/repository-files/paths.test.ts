import assert from "node:assert/strict";
import { test } from "node:test";

import { isPathWithin, toSlashPath } from "./paths.ts";

test("normalizes slash paths and identifies contained paths", () => {
  assert.equal(toSlashPath("a\\b\\c.ts"), "a/b/c.ts");
  assert.equal(
    isPathWithin("/workspace/vibe-check", "/workspace/vibe-check/scripts/paths.ts"),
    true
  );
  assert.equal(isPathWithin("/workspace/vibe-check", "/workspace/vibe-check"), false);
  assert.equal(
    isPathWithin("/workspace/vibe-check", "/workspace/vibe-check-sibling/path.ts"),
    false
  );
});
