// #region package-api-example:markdown-link-validation
import { defineConfig, markdownLinkValidation, run } from "vibe-check";

const definition = defineConfig({
  checks: [markdownLinkValidation],
  effects: {
    cache: { enabled: false },
    output: { enabled: false },
    progress: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
// #endregion package-api-example:markdown-link-validation
