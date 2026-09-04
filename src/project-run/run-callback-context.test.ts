import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  assertCapturedContext,
  assertCheckArtifactPathContext,
  assertDirectRunResult,
  runWithCapturedContext
} from "./run.test-support.ts";

describe("Package Run", () => {
  it("executes each normalized Check directly with the public callback context", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-direct-run-"));
    try {
      const { received, result } = await runWithCapturedContext(root);
      assertCapturedContext(received, root);
      assertDirectRunResult(result);
      await assertCheckArtifactPathContext(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
