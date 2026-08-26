import { expect, test } from "bun:test";

import { isPathWithin, toSlashPath } from "./path.ts";

test("normalizes slash paths and identifies contained paths", () => {
  expect(toSlashPath("a\\b\\c.ts")).toBe("a/b/c.ts");
  expect(isPathWithin("/workspace/vibe-check", "/workspace/vibe-check/scripts/path.ts")).toBe(true);
  expect(isPathWithin("/workspace/vibe-check", "/workspace/vibe-check")).toBe(false);
  expect(isPathWithin("/workspace/vibe-check", "/workspace/vibe-check-sibling/path.ts")).toBe(
    false
  );
});
