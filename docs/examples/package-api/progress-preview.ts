// #region package-api-example:progress-preview
import {
  defineCheck,
  defineConfig,
  run,
  type ProgressPreviewFormatter
} from "@zxyycom/vibe-check";

const headAndTail: ProgressPreviewFormatter = ({ text, maxCodePoints }) => {
  const points = [...text];
  if (points.length <= maxCodePoints) return text;
  const tailLength = Math.max(1, Math.floor(maxCodePoints / 3));
  const headLength = Math.max(0, maxCodePoints - tailLength - 1);
  return `${points.slice(0, headLength).join("")}…${points.slice(-tailLength).join("")}`;
};

const detail = defineCheck({
  checkId: "detail",
  displayName: "Detail",
  execution: ({ records }) => {
    records.report({ id: "long-detail" }, { text: "a verbose diagnostic value" });
    return { status: "passed", data: {} };
  }
});

const definition = defineConfig({
  checks: [detail],
  outputs: {
    machinePublication: { enabled: false },
    progressRendering: { formatter: headAndTail, textPreviewCodePointLimit: 48 }
  }
});

const result = await run(definition, {
  outputs: { progressRendering: { recordPreviewLimit: 1 } }
});
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
// #endregion package-api-example:progress-preview
