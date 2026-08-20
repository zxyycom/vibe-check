import type { ProjectDefinition, ProjectEffects, RunControls } from "../definition/project.ts";
import {
  projectReadablePublicationV3,
  type ValidatedPublicationModelV3
} from "../quality-core/output/publication-v3/index.ts";
import { publishScanV3 } from "../quality-core/scan-command/publication-v3.ts";
import type {
  CheckExecutionLifecycle,
  CheckSettledFact,
  CheckStartedFact
} from "./check-execution.ts";
import {
  createProgressRenderer,
  type ProgressFeedback,
  type ProgressOutcomeCounts,
  type ProgressWriter
} from "./progress.ts";

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

export interface ProgressEffect {
  readonly final: (input: ProgressFinalFeedback) => void;
  readonly lifecycle: CheckExecutionLifecycle;
  readonly prepared: (totalChecks: number) => void;
}

export interface ProgressFinalFeedback {
  readonly counts: ProgressOutcomeCounts;
  readonly elapsedMs: number;
  readonly execution: "cancelled" | "completed";
}

export type ProgressWriterFactory = () => ProgressWriter;

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
    value: () =>
      Object.freeze({
        cache: Object.freeze({ enabled: configuration.cache.enabled, status: statuses.cache }),
        logs: Object.freeze({ enabled: configuration.logs.enabled, status: statuses.logs }),
        output: Object.freeze({ enabled: configuration.output.enabled, status: statuses.output }),
        progress: Object.freeze({
          enabled: configuration.progress.enabled,
          status: statuses.progress
        })
      })
  });
}

/**
 * Owns the progress write boundary. A failed writer is permanently muted so
 * renderer failure remains observable without becoming an execution failure.
 */
export function createProgressEffect(
  effects: EffectStatuses,
  writerFactory: ProgressWriterFactory = defaultProgressWriter
): ProgressEffect {
  if (!effects.value().progress.enabled) return inertProgressEffect();
  let failed = false;
  let renderer: ReturnType<typeof createProgressRenderer> | undefined;

  const render = (feedback: ProgressFeedback): void => {
    if (failed) return;
    try {
      renderer ??= createProgressRenderer(writerFactory());
      renderer.render(feedback);
      if (feedback.kind === "final") effects.succeeded("progress");
    } catch {
      failed = true;
      effects.failed("progress");
    }
  };
  return Object.freeze({
    prepared: (totalChecks: number): void =>
      render(Object.freeze({ kind: "prepared", totalChecks })),
    lifecycle: Object.freeze({
      settled: (fact: CheckSettledFact): void =>
        render(
          Object.freeze({
            kind: "settled",
            checkId: fact.checkId,
            displayName: fact.displayName,
            durationMs: fact.durationMs,
            outcome: fact.outcome
          })
        ),
      started: (fact: CheckStartedFact): void =>
        render(
          Object.freeze({ kind: "started", checkId: fact.checkId, displayName: fact.displayName })
        )
    }),
    final: (input: ProgressFinalFeedback): void =>
      render(
        Object.freeze({
          kind: "final",
          counts: input.counts,
          elapsedMs: input.elapsedMs,
          execution: input.execution
        })
      )
  });
}

export function failedEffect(statuses: RunEffectStatuses): keyof RunEffectStatuses | undefined {
  for (const effect of ["cache", "progress", "output", "logs"] as const) {
    if (statuses[effect].status === "failed") return effect;
  }
  return undefined;
}

function inertProgressEffect(): ProgressEffect {
  const lifecycle = Object.freeze({
    settled: (_fact: CheckSettledFact): void => undefined,
    started: (_fact: CheckStartedFact): void => undefined
  });
  return Object.freeze({
    prepared: (_totalChecks: number): void => undefined,
    lifecycle,
    final: (_input: ProgressFinalFeedback): void => undefined
  });
}

function defaultProgressWriter(): ProgressWriter {
  return Object.freeze({
    color: process.stdout.isTTY === true && process.env.NO_COLOR === undefined,
    isTTY: process.stdout.isTTY === true,
    term: process.env.TERM,
    write: (content: string): void => {
      process.stdout.write(content);
    }
  });
}

export function publishOutput(
  input: Readonly<{
    changedFiles: readonly string[];
    effectConfiguration: ProjectEffects;
    effects: EffectStatuses;
    model: ValidatedPublicationModelV3;
    outputDirectory: string;
    reportPresentation: ProjectDefinition["quality"]["report"];
  }>
) {
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
