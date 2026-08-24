import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const candidatePreparationPath = fileURLToPath(
  new URL("../../package/candidate/prepare-command.ts", import.meta.url)
);
const installedCandidateDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "node_modules",
  "vibe-check"
);

it("repository Project Run binds its definition before another caller supplies controls", async () => {
  prepareCandidate();
  assert.ok(
    import.meta.resolve("vibe-check").startsWith(pathToFileURL(installedCandidateDirectory).href)
  );
  const { run } = await import("./project-run.ts");
  const controller = new AbortController();
  controller.abort();

  const result = await run({ signal: controller.signal });

  assert.equal(result.kind, "cancelled");
  if (result.kind === "cancelled") assert.equal(result.phase, "pre-work");
});

function prepareCandidate(): void {
  const result = spawnSync("mise", ["exec", "--", "bun", candidatePreparationPath], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
}
