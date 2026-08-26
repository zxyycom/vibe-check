import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import assert from "node:assert/strict";
import { test } from "node:test";

import { walkFiles } from "./files.ts";

test("walks repository files deterministically and reports unreadable roots", () => {
  const repositoryRoot = fs.mkdtempSync(path.join(tmpdir(), "vibe-check-repository-files-"));
  const nestedDirectory = path.join(repositoryRoot, "nested");
  const ignoredDirectory = path.join(repositoryRoot, "ignored");
  const missingDirectory = path.join(repositoryRoot, "missing");

  try {
    fs.mkdirSync(nestedDirectory);
    fs.mkdirSync(ignoredDirectory);
    fs.writeFileSync(path.join(repositoryRoot, "z.ts"), "", "utf8");
    fs.writeFileSync(path.join(nestedDirectory, "a.ts"), "", "utf8");
    fs.writeFileSync(path.join(ignoredDirectory, "excluded.ts"), "", "utf8");

    assert.deepEqual(walkFiles({ ignoredDirs: ["ignored"], rootDir: repositoryRoot }), [
      "nested/a.ts",
      "z.ts"
    ]);
    assert.throws(
      () => walkFiles({ rootDir: missingDirectory }),
      new RegExp(`could not read directory ${escapeRegex(missingDirectory)}`)
    );
  } finally {
    fs.rmSync(repositoryRoot, { force: true, recursive: true });
  }
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
