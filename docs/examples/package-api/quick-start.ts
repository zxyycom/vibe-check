// #region package-api-example:quick-start
import { defineCheck, defineConfig, run } from "vibe-check";

const sourceChangeSummary = defineCheck({
  checkId: "source-change-summary",
  displayName: "Source change summary",
  options: { sourcePrefix: "src/" },
  execution({ options, project, records }) {
    const files = project.changedFiles.filter((path) => path.startsWith(options.sourcePrefix));
    if (files.length === 0) {
      return { status: "not-applicable", reason: { code: "no-source-changes" } };
    }

    records.report({ id: "changed-source-files" }, { files });
    return { status: "passed", data: { changedSourceFileCount: files.length } };
  }
});

const definition = defineConfig({
  checks: [sourceChangeSummary],
  outputs: {
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition, { changedFiles: ["src/index.ts"] });
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
const outcome = result.snapshot.checks.find(
  ({ checkId }) => checkId === sourceChangeSummary.checkId
)?.outcome;
if (outcome?.status !== "passed" || outcome.data.changedSourceFileCount !== 1) {
  throw new Error("Source change summary did not produce the expected result");
}
// #endregion package-api-example:quick-start
