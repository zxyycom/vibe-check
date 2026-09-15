// #region package-api-example:markdown-lint
import { defineConfig, markdownLint, run } from "@zxyycom/vibe-check";

const check = markdownLint({ findingPolicy: "blocking" });
const definition = defineConfig({
  checks: [check],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
const outcome = result.snapshot.checks.find(({ checkId }) => checkId === check.checkId)?.outcome;
if (outcome?.status !== "passed" && outcome?.status !== "not-applicable") {
  throw new Error(`Markdown lint did not pass: ${outcome?.status ?? "no outcome"}`);
}
if (outcome.status === "not-applicable") console.warn("No Markdown input selected; no lint evidence.");
// #endregion package-api-example:markdown-lint
