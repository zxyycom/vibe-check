export interface RuntimeConfig {
  readonly environment: "local" | "ci";
  readonly retryCount: number;
}

export type FeatureState = "enabled" | "disabled";
