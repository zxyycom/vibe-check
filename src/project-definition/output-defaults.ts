/** Default Run-owned output values applied when a Project Definition omits an override. */
export const DEFAULT_PROJECT_OUTPUTS = Object.freeze({
  machinePublication: Object.freeze({ directory: "artifacts/vibe-check", enabled: true }),
  progressRendering: Object.freeze({ enabled: true })
} as const);
