import type {
  ProjectDefinition,
  ProjectEffects,
  RunControls
} from "../definition/project.ts";
import {
  projectReadablePublicationV3,
  type ValidatedPublicationModelV3
} from "../quality-core/output/publication-v3/index.ts";
import { publishScanV3 } from "../quality-core/scan-command/publication-v3.ts";

export interface RunEffectStatus {
  readonly enabled: boolean;
  readonly status: "disabled" | "failed" | "not-run" | "succeeded";
}

export interface RunEffectStatuses {
  readonly cache: RunEffectStatus;
  readonly logs: RunEffectStatus;
  readonly output: RunEffectStatus;
  readonly progress: RunEffectStatus;
}

export interface EffectStatuses {
  readonly cache: (activity: "failed" | "read" | "write") => void;
  readonly cacheStatus: () => RunEffectStatus["status"];
  readonly failed: (effect: keyof RunEffectStatuses) => void;
  readonly succeeded: (effect: keyof RunEffectStatuses) => void;
  readonly value: () => RunEffectStatuses;
}

export function effectiveEffects(
  definition: ProjectDefinition,
  controls: RunControls
): ProjectEffects {
  return Object.freeze({
    cache: Object.freeze({ ...definition.effects.cache, ...controls.effects?.cache }),
    logs: Object.freeze({ ...definition.effects.logs, ...controls.effects?.logs }),
    output: Object.freeze({ ...definition.effects.output, ...controls.effects?.output }),
    progress: Object.freeze({ ...definition.effects.progress, ...controls.effects?.progress })
  });
}

export function createEffectStatuses(configuration: ProjectEffects): EffectStatuses {
  const statuses: Record<keyof RunEffectStatuses, RunEffectStatus["status"]> = {
    cache: initialStatus(configuration.cache.enabled),
    logs: initialStatus(configuration.logs.enabled),
    output: initialStatus(configuration.output.enabled),
    progress: initialStatus(configuration.progress.enabled)
  };
  const enabled = (effect: keyof RunEffectStatuses): boolean => configuration[effect].enabled;
  return Object.freeze({
    cache: (activity: "failed" | "read" | "write") => {
      if (!configuration.cache.enabled) return;
      statuses.cache = activity === "failed" ? "failed" : "succeeded";
    },
    cacheStatus: () => statuses.cache,
    failed: (effect: keyof RunEffectStatuses) => {
      if (enabled(effect)) statuses[effect] = "failed";
    },
    succeeded: (effect: keyof RunEffectStatuses) => {
      if (enabled(effect)) statuses[effect] = "succeeded";
    },
    value: () => Object.freeze({
      cache: Object.freeze({ enabled: configuration.cache.enabled, status: statuses.cache }),
      logs: Object.freeze({ enabled: configuration.logs.enabled, status: statuses.logs }),
      output: Object.freeze({ enabled: configuration.output.enabled, status: statuses.output }),
      progress: Object.freeze({ enabled: configuration.progress.enabled, status: statuses.progress })
    })
  });
}

export function emitProgress(
  effects: EffectStatuses,
  stage: "effects" | "execution"
): boolean {
  if (!effects.value().progress.enabled) return true;
  try {
    console.log(`Vibe Check: ${stage}`);
    effects.succeeded("progress");
    return true;
  } catch {
    effects.failed("progress");
    return false;
  }
}

export function publishOutput(input: Readonly<{
  changedFiles: readonly string[];
  effectConfiguration: ProjectEffects;
  effects: EffectStatuses;
  model: ValidatedPublicationModelV3;
  outputDirectory: string;
  reportPresentation: ProjectDefinition["quality"]["report"];
}>) {
  if (!input.effectConfiguration.output.enabled) {
    return projectReadablePublicationV3({
      model: input.model,
      report: {
        changedFiles: input.changedFiles,
        presentation: input.reportPresentation
      }
    }).console;
  }
  try {
    const published = publishScanV3({
      artifactDir: input.outputDirectory,
      changedFiles: input.changedFiles,
      model: input.model,
      print: false,
      reportPresentation: input.reportPresentation
    });
    input.effects.succeeded("output");
    return published.readable;
  } catch {
    input.effects.failed("output");
    return undefined;
  }
}

function initialStatus(enabled: boolean): RunEffectStatus["status"] {
  return enabled ? "not-run" : "disabled";
}
