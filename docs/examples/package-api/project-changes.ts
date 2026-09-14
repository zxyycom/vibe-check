// #region package-api-example:project-changes
import { changeFlag, defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const sourceChanged = defineCheck({
  checkId: "source-changed",
  displayName: "Source changed",
  enabledByFlags: { when: changeFlag("source") },
  execute: ({ project }) => {
    const changes = project.changes;
    if (changes === undefined) {
      return { status: "unavailable", reason: { code: "changes-not-configured" } };
    }
    return {
      status: "passed",
      data: {
        evidence: changes.ok ? "matched" : "unavailable-conservative",
        matchedPaths: changes.ok ? changes.files.map(({ path }) => path) : []
      }
    };
  }
});

const definition = defineConfig({
  changes: {
    source: { kind: "git", compareWith: "origin/main" },
    flags: {
      source: { include: ["src/**"], exclude: ["src/generated/**"] }
    }
  },
  checks: [sourceChanged],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
const outcome = result.snapshot.checks.find(({ checkId }) => checkId === sourceChanged.checkId)
  ?.outcome;
if (outcome?.status !== "passed" && outcome?.status !== "not-applicable") {
  throw new Error("Change-aware Check did not settle successfully");
}
// #endregion package-api-example:project-changes
