// #region package-api-example:quick-start
import { defineCheck, defineConfig, run } from "vibe-check";

const bundleSize = defineCheck({
  checkId: "bundle-size",
  displayName: "Bundle size",
  options: {
    actualBytes: 82_000,
    artifactPath: "build/app.mjs",
    maximumBytes: 100_000
  },
  execution({ options, records }) {
    records.report({ id: "artifact-input" }, { path: options.artifactPath });
    const data = {
      actualBytes: options.actualBytes,
      maximumBytes: options.maximumBytes
    };
    return options.actualBytes <= options.maximumBytes
      ? { status: "passed", data }
      : { status: "failed", data };
  }
});

const definition = defineConfig({
  checks: [bundleSize],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
const outcome = result.snapshot.checks.find(
  ({ checkId }) => checkId === bundleSize.checkId
)?.outcome;
if (outcome?.status !== "passed" || outcome.data.actualBytes !== 82_000) {
  throw new Error("Bundle-size Check did not produce the expected result");
}
// #endregion package-api-example:quick-start
