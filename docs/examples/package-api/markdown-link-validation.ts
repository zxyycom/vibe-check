// #region package-api-example:markdown-link-validation
import { defineConfig, markdownLinkValidation, run } from "@zxyycom/vibe-check";

const definition = defineConfig({
  checks: [markdownLinkValidation()],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
// #endregion package-api-example:markdown-link-validation
