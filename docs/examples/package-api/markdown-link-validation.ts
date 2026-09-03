// #region package-api-example:markdown-link-validation
import { defineConfig, markdownLinkValidation, run } from "@zxyycom/vibe-check";

// 此调用方自有目录是 absolute、可删除的，并且可能保存 source-derived parse facts。
const cacheDirectory = new URL(".vibe-check/markdown-link-parse-cache", import.meta.url).pathname;
const definition = defineConfig({
  checks: [
    markdownLinkValidation({
      cache: { enabled: true, directory: cacheDirectory }
    })
  ],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
// #endregion package-api-example:markdown-link-validation
