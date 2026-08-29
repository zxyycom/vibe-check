import assert from "node:assert/strict";
import { preparePackageCandidate } from "../../package/candidate/prepare.ts";
import { it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const installedCandidateDirectory = fileURLToPath(
  new URL("../node_modules/vibe-check/", import.meta.url)
);

it("repository Project Run binds its definition before another caller supplies controls", async () => {
  await preparePackageCandidate();
  assert.ok(
    import.meta.resolve("vibe-check").startsWith(pathToFileURL(installedCandidateDirectory).href)
  );
  const { run } = await import("./project-run.ts");
  const { default: definition } = await import("./definition.ts");
  assert.deepEqual(definition.outputs.diagnosticLogging, {
    directory: ".log/project-run",
    enabled: true
  });
  const controller = new AbortController();
  controller.abort();

  const result = await run({ signal: controller.signal });

  assert.equal(result.kind, "cancelled");
  if (result.kind === "cancelled") assert.equal(result.phase, "pre-work");
});
