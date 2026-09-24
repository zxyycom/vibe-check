import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { prepareCompilerEmit } from "./compiler-cache.ts";

test("candidate compiler cache reuses docs-only emit and rejects changed or corrupt inputs", () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-compiler-cache-"));
  const repositoryRoot = join(root, "repository");
  const stateDirectory = join(root, "state");
  const stagingDirectory = join(root, "staging");
  const tsBuildInfoPath = join(stateDirectory, "candidate.tsbuildinfo");
  const sourcePath = join(repositoryRoot, "src/index.ts");
  const compileHadBuildInfo: boolean[] = [];
  try {
    mkdirSync(join(repositoryRoot, "src"), { recursive: true });
    mkdirSync(join(repositoryRoot, "scripts/package"), { recursive: true });
    mkdirSync(join(repositoryRoot, "docs"), { recursive: true });
    writeFileSync(join(repositoryRoot, "package.json"), "{}\n");
    writeFileSync(join(repositoryRoot, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    writeFileSync(sourcePath, "export const value = 1;\n");
    const prepare = () => {
      prepareCompilerEmit({
        repositoryRoot,
        stagingDirectory,
        tsBuildInfoPath,
        compile: ({ declarationDirectory, runtimeDirectory }) => {
          compileHadBuildInfo.push(existsSync(tsBuildInfoPath));
          mkdirSync(declarationDirectory, { recursive: true });
          mkdirSync(runtimeDirectory, { recursive: true });
          writeFileSync(join(runtimeDirectory, "index.js"), readFileSync(sourcePath));
          writeFileSync(
            join(declarationDirectory, "index.d.ts"),
            "export declare const value: number;\n"
          );
          writeFileSync(tsBuildInfoPath, "fixture compiler graph\n");
        }
      });
    };

    prepare();
    assert.deepEqual(compileHadBuildInfo, [false]);
    assert.equal(
      readFileSync(join(stagingDirectory, "dist/esm/index.js"), "utf8"),
      "export const value = 1;\n"
    );

    writeFileSync(join(repositoryRoot, "docs/readme.md"), "docs changed\n");
    prepare();
    assert.deepEqual(compileHadBuildInfo, [false], "documentation must not re-run compiler emit");

    writeFileSync(sourcePath, "export const value = 2;\n");
    prepare();
    assert.deepEqual(
      compileHadBuildInfo,
      [false, true],
      "same source graph may reuse incremental state"
    );
    assert.equal(
      readFileSync(join(stagingDirectory, "dist/esm/index.js"), "utf8"),
      "export const value = 2;\n"
    );

    writeFileSync(join(stateDirectory, "compiler-emit/dist/esm/index.js"), "corrupt\n");
    prepare();
    assert.deepEqual(
      compileHadBuildInfo,
      [false, true, false],
      "corrupt output must force a cold emit"
    );

    writeFileSync(tsBuildInfoPath, "corrupt compiler graph\n");
    prepare();
    assert.deepEqual(
      compileHadBuildInfo,
      [false, true, false, false],
      "corrupt build info must force a cold emit"
    );

    writeFileSync(join(repositoryRoot, "src/extra.ts"), "export const extra = 1;\n");
    prepare();
    assert.deepEqual(
      compileHadBuildInfo,
      [false, true, false, false, false],
      "changed source set must force a cold emit"
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
