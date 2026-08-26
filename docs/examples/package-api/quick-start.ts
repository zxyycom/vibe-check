// #region package-api-example:quick-start
import { defineConfig, run } from "vibe-check";

const definition = defineConfig({
  checks: [
    {
      checkId: "welcome",
      displayName: "Welcome",
      execution({ records }) {
        records.report({ id: "guide" }, { message: "Package Run completed." });
        return { status: "passed", data: { checked: true } };
      }
    }
  ],
  outputs: {
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
// #endregion package-api-example:quick-start
