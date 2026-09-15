// #region package-api-example:markdown-lint
import { defineConfig, markdownLint, run } from "@zxyycom/vibe-check";

const definition = defineConfig({
  checks: [markdownLint({ findingPolicy: "blocking" })],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
// #endregion package-api-example:markdown-lint
