/** Default effect values applied when a Project Definition omits an override. */
export const DEFAULT_PROJECT_EFFECTS = Object.freeze({
  cache: Object.freeze({
    directory: ".cache/vibe-check",
    enabled: true
  }),
  output: Object.freeze({
    directory: "artifacts/vibe-check",
    enabled: true
  }),
  progress: Object.freeze({ enabled: true })
} as const);
