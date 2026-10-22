import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { plainTextProcessEnv } from "../../process-execution/execution.ts";
import { sha256File } from "../pack.ts";
import {
  CANDIDATE_ARTIFACT_PATH_ENV,
  CANDIDATE_ARTIFACT_SHA256_ENV,
  resolveCandidateAcceptanceArtifact
} from "./acceptance-input.ts";

test("accepts an exact Gate candidate artifact input", async () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-acceptance-input-"));
  const artifactPath = join(root, "candidate.tgz");
  try {
    writeFileSync(artifactPath, "candidate\n", "utf8");
    const sha256 = sha256File(artifactPath);
    assert.deepEqual(
      await resolveCandidateAcceptanceArtifact({
        [CANDIDATE_ARTIFACT_PATH_ENV]: artifactPath,
        [CANDIDATE_ARTIFACT_SHA256_ENV]: sha256
      }),
      { artifactPath, sha256 }
    );
    assertDeferredPreparation(root, { artifactPath, sha256 });
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

function assertDeferredPreparation(
  root: string,
  artifact: Readonly<{ artifactPath: string; sha256: string }>
): void {
  const fixture = join(root, "candidate");
  const marker = join(root, "preparation-loaded");
  mkdirSync(fixture);
  const modulePath = join(fixture, "acceptance-input.ts");
  copyFileSync(fileURLToPath(new URL("./acceptance-input.ts", import.meta.url)), modulePath);
  writeFileSync(
    join(root, "pack.ts"),
    `export { fileMatchesSha256, isSha256Digest } from ${JSON.stringify(new URL("../pack.ts", import.meta.url).href)};`
  );
  writeFileSync(
    join(fixture, "prepare.ts"),
    `import {writeFileSync} from "node:fs";
     writeFileSync(${JSON.stringify(marker)}, "loaded");
     export async function preparePackageCandidate() { return ${JSON.stringify(artifact)}; }`
  );
  const result = spawnSync(
    process.execPath,
    [
      "--eval",
      `
      import assert from "node:assert/strict";
      import {existsSync} from "node:fs";
      import {resolveCandidateAcceptanceArtifact} from ${JSON.stringify(pathToFileURL(modulePath).href)};
      const marker = ${JSON.stringify(marker)};
      const artifact = ${JSON.stringify(artifact)};
      const environment = {
        ${JSON.stringify(CANDIDATE_ARTIFACT_PATH_ENV)}: artifact.artifactPath,
        ${JSON.stringify(CANDIDATE_ARTIFACT_SHA256_ENV)}: artifact.sha256
      };
      assert.equal(existsSync(marker), false, "import loaded the local builder");
      assert.deepEqual(await resolveCandidateAcceptanceArtifact(environment), artifact);
      await assert.rejects(resolveCandidateAcceptanceArtifact({
        ...environment, ${JSON.stringify(CANDIDATE_ARTIFACT_SHA256_ENV)}: "0".repeat(64)
      }), /incomplete or invalid/);
      assert.equal(existsSync(marker), false, "Gate input loaded the local builder");
      assert.deepEqual(await resolveCandidateAcceptanceArtifact({}), artifact);
      assert.equal(existsSync(marker), true, "direct fallback did not load preparation");
    `
    ],
    { cwd: root, encoding: "utf8", env: plainTextProcessEnv() }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
}

test("rejects incomplete or mismatched Gate candidate artifact input", async () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-acceptance-input-"));
  const artifactPath = join(root, "candidate.tgz");
  try {
    writeFileSync(artifactPath, "candidate\n", "utf8");
    await assert.rejects(
      resolveCandidateAcceptanceArtifact({ [CANDIDATE_ARTIFACT_PATH_ENV]: artifactPath }),
      /incomplete or invalid/
    );
    await assert.rejects(
      resolveCandidateAcceptanceArtifact({
        [CANDIDATE_ARTIFACT_PATH_ENV]: artifactPath,
        [CANDIDATE_ARTIFACT_SHA256_ENV]: "0".repeat(64)
      }),
      /incomplete or invalid/
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
