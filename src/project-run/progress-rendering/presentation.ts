import { closeSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname } from "node:path";

import type {
  CheckExecutionLifecycle,
  CheckSettledFact,
  CheckStartedFact
} from "../check-execution/lifecycle.ts";
import {
  createProgressRenderer,
  type ProgressClock,
  type ProgressFeedback,
  type ProgressOutcomeCounts,
  type ProgressWriter
} from "./renderer.ts";
import type { ProjectOutputs } from "../../project-definition/project-definition.ts";
import type { OutputStatuses } from "../output-status.ts";
export interface ProgressRendering {
  /** Closes only an already-created file tee; it never creates a writer after pre-work termination. */
  readonly close: () => void;
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

export interface ProgressRefreshSchedule {
  cancel(): void;
}

export interface ProgressRefreshScheduler {
  schedule(refresh: () => void, intervalMs: number): ProgressRefreshSchedule;
}

export interface ProgressRenderingDependencies {
  readonly clock?: ProgressClock;
  /** Caller-owned exact progress transcript target for this invocation; `null` keeps terminal-only output. */
  readonly file?: string | null;
  readonly refreshScheduler?: ProgressRefreshScheduler;
  readonly writerFactory?: ProgressWriterFactory;
}

const PROGRESS_REFRESH_INTERVAL_MS = 5_000;

const defaultProgressRefreshScheduler: ProgressRefreshScheduler = Object.freeze({
  schedule: (refresh: () => void, intervalMs: number) => {
    const interval = setInterval(refresh, intervalMs);
    interval.unref();
    return Object.freeze({ cancel: () => clearInterval(interval) });
  }
});

/** Owns terminal progress and its optional file tee; terminal output survives a file-only failure. */
export function createProgressRendering(
  configuration: ProjectOutputs["progressRendering"],
  statuses: OutputStatuses,
  dependencies: ProgressRenderingDependencies = {}
): ProgressRendering {
  if (!configuration.enabled) return inertProgressRendering();
  let terminalFailed = false;
  let closed = false;
  const runningCheckIds = new Set<string>();
  let renderer: ReturnType<typeof createProgressRenderer> | undefined;
  let writer: ProgressWriter | undefined;
  let refreshSchedule: ProgressRefreshSchedule | undefined;

  const failTerminalRendering = (): void => {
    if (terminalFailed) return;
    terminalFailed = true;
    const activeSchedule = refreshSchedule;
    refreshSchedule = undefined;
    try {
      activeSchedule?.cancel();
    } catch {
      // The output is already failed; a scheduler cleanup fault must not reach Check execution.
    }
    statuses.failed("progressRendering");
  };

  const stopRefresh = (): void => {
    const activeSchedule = refreshSchedule;
    refreshSchedule = undefined;
    try {
      activeSchedule?.cancel();
    } catch {
      failTerminalRendering();
    }
  };

  const createRenderer = (): ReturnType<typeof createProgressRenderer> => {
    if (renderer !== undefined) return renderer;
    writer = createProgressTee({
      file: dependencies.file ?? null,
      onFileFailure: () => statuses.failed("progressRendering"),
      terminal: (dependencies.writerFactory ?? defaultProgressWriter)()
    });
    renderer = createProgressRenderer(writer, dependencies.clock);
    return renderer;
  };

  const render = (feedback: ProgressFeedback): void => {
    if (terminalFailed) return;
    try {
      createRenderer().render(feedback);
      if (feedback.kind === "final") statuses.succeeded("progressRendering");
    } catch {
      failTerminalRendering();
    }
  };

  const refresh = (): void => {
    if (terminalFailed) return;
    try {
      renderer?.refresh();
    } catch {
      failTerminalRendering();
    }
  };

  const startRefresh = (): void => {
    if (
      terminalFailed ||
      refreshSchedule !== undefined ||
      runningCheckIds.size === 0 ||
      renderer?.refreshesRunningRegion !== true
    ) {
      return;
    }
    try {
      refreshSchedule = (dependencies.refreshScheduler ?? defaultProgressRefreshScheduler).schedule(
        refresh,
        PROGRESS_REFRESH_INTERVAL_MS
      );
    } catch {
      failTerminalRendering();
    }
  };

  const close = (): void => {
    if (closed) return;
    closed = true;
    stopRefresh();
    if (writer === undefined) return;
    try {
      writer.close?.();
    } catch {
      // A terminal writer close is an output failure; a tee contains file-only failures itself.
      statuses.failed("progressRendering");
    }
  };

  return Object.freeze({
    close,
    prepared: (totalChecks: number) => render(Object.freeze({ kind: "prepared", totalChecks })),
    lifecycle: Object.freeze({
      flagControlCompleted: () => render(Object.freeze({ kind: "flag-control-completed" })),
      settled: (fact: CheckSettledFact) => {
        render(
          Object.freeze({
            kind: "settled",
            checkId: fact.checkId,
            displayName: fact.displayName,
            durationMs: fact.durationMs,
            messages: fact.messages,
            outcome: fact.outcome,
            records: fact.records,
            visibility: fact.visibility
          })
        );
        runningCheckIds.delete(fact.checkId);
        if (runningCheckIds.size === 0) stopRefresh();
      },
      started: (fact: CheckStartedFact) => {
        runningCheckIds.add(fact.checkId);
        render(
          Object.freeze({ kind: "started", checkId: fact.checkId, displayName: fact.displayName })
        );
        startRefresh();
      }
    }),
    final: (input: ProgressFinalFeedback) => {
      stopRefresh();
      render(
        Object.freeze({
          counts: input.counts,
          elapsedMs: input.elapsedMs,
          execution: input.execution,
          kind: "final"
        })
      );
      close();
    }
  });
}
function inertProgressRendering(): ProgressRendering {
  const lifecycle = Object.freeze({
    flagControlCompleted: (): void => undefined,
    settled: (_fact: CheckSettledFact): void => undefined,
    started: (_fact: CheckStartedFact): void => undefined
  });
  return Object.freeze({
    close: (): void => undefined,
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
    write: (content: string) => {
      process.stdout.write(content);
    }
  });
}

function createProgressTee(
  input: Readonly<{
    readonly file: string | null;
    readonly onFileFailure: () => void;
    readonly terminal: ProgressWriter;
  }>
): ProgressWriter {
  if (input.file === null) return input.terminal;
  let descriptor: number | undefined;
  let fileFailed = false;
  let closed = false;
  const failFile = (): void => {
    if (fileFailed) return;
    fileFailed = true;
    input.onFileFailure();
  };
  try {
    mkdirSync(dirname(input.file), { recursive: true });
    descriptor = openSync(input.file, "wx");
  } catch {
    failFile();
  }
  return Object.freeze({
    close: (): void => {
      if (closed) return;
      closed = true;
      if (descriptor === undefined) return;
      try {
        closeSync(descriptor);
      } catch {
        failFile();
      }
      descriptor = undefined;
    },
    color: input.terminal.color,
    isTTY: input.terminal.isTTY,
    term: input.terminal.term,
    write: (content: string): void => {
      input.terminal.write(content);
      if (fileFailed || descriptor === undefined) return;
      try {
        writeFileBuffer(descriptor, content);
      } catch {
        failFile();
      }
    }
  });
}

function writeFileBuffer(descriptor: number, content: string): void {
  const bytes = Buffer.from(content, "utf8");
  let offset = 0;
  while (offset < bytes.length) {
    const written = writeSync(descriptor, bytes, offset, bytes.length - offset, null);
    if (written <= 0) throw new Error("Progress log append made no progress");
    offset += written;
  }
}
