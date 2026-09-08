import type {
  ProgressRenderingOutput,
  ResolvedProgressRenderingOutput
} from "./progress-rendering-output.ts";

/** Default Run-owned output values applied when a Project Definition omits an override. */
export const DEFAULT_PROJECT_OUTPUTS = Object.freeze({
  machinePublication: Object.freeze({ directory: "artifacts/vibe-check", enabled: true }),
  progressRendering: Object.freeze({
    enabled: true,
    formatter: null,
    messagePreviewLimit: 5,
    recordPreviewLimit: 5,
    textPreviewCodePointLimit: 240
  }),
  diagnosticLogging: Object.freeze({ directory: ".log/vibe-check", enabled: false })
} as const);

/** Materializes compatible progress authoring into the single renderer-ready policy. */
export function resolveProgressRenderingOutput(
  output: Partial<ProgressRenderingOutput>
): ResolvedProgressRenderingOutput {
  const {
    enabled = DEFAULT_PROJECT_OUTPUTS.progressRendering.enabled,
    formatter = DEFAULT_PROJECT_OUTPUTS.progressRendering.formatter,
    messagePreviewLimit = DEFAULT_PROJECT_OUTPUTS.progressRendering.messagePreviewLimit,
    recordPreviewLimit = DEFAULT_PROJECT_OUTPUTS.progressRendering.recordPreviewLimit,
    textPreviewCodePointLimit = DEFAULT_PROJECT_OUTPUTS.progressRendering.textPreviewCodePointLimit
  } = output;
  return Object.freeze({
    enabled,
    formatter,
    messagePreviewLimit,
    recordPreviewLimit,
    textPreviewCodePointLimit
  });
}
