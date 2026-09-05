import { closeSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname } from "node:path";

import type { CheckExecutionClock } from "../check-execution/resolved-checks.ts";
import { renderDiagnosticObservation } from "./observation-rendering.ts";
export { summarizeDiagnosticValue } from "./diagnostic-detail-rendering.ts";

export const DIAGNOSTIC_CHANNELS = ["core", "scheduler", "learnedAdmission"] as const;
export type DiagnosticChannel = (typeof DIAGNOSTIC_CHANNELS)[number];
export type DiagnosticChannelStatus = "disabled" | "failed" | "succeeded";

/** Product-private observation written synchronously at its output owner. */
export interface DiagnosticObservation {
  /** Router-owned correlation, added before any channel write and never authored by Check code. */
  readonly correlation?: Readonly<{
    readonly elapsedMs: number;
    readonly invocationId: string;
    readonly sequence: number;
  }>;
  readonly details?: unknown;
  readonly event: string;
  readonly tags: readonly string[];
}

/** One channel writer. Its failures never escape the lifecycle owner that emits an observation. */
export interface DiagnosticLogger {
  close(): DiagnosticChannelStatus;
  observe(observation: DiagnosticObservation): void;
}

/** The invocation-local router is the sole Product correlation and channel-routing owner. */
export interface DiagnosticLoggingRouter {
  readonly core: DiagnosticLogger;
  readonly learnedAdmission: DiagnosticLogger;
  readonly scheduler: DiagnosticLogger;
  close(): Readonly<Record<DiagnosticChannel, DiagnosticChannelStatus>>;
}

/** A bounded, descriptor-safe description for normal diagnostic payloads. */
export type DiagnosticValueSummary =
  | Readonly<{
      readonly availability: "available";
      readonly bytes: number;
      readonly items?: number;
      readonly keys?: number;
      readonly shape: "array" | "boolean" | "null" | "number" | "object" | "string";
    }>
  | Readonly<{ readonly availability: "unavailable"; readonly reason: string }>;

/** Test-only construction seam; invocation construction owns all three channel lifecycles. */
export type DiagnosticLoggerFactory = (
  input: Readonly<{
    readonly clock: CheckExecutionClock;
    readonly enabled: boolean;
    readonly file: string | null;
  }>
) => DiagnosticLogger;

/**
 * Creates one direct channel writer. The invocation router normally supplies correlation; retaining this
 * construction function keeps focused writer tests independent of multi-channel invocation wiring.
 */
export const createDiagnosticLogger: DiagnosticLoggerFactory = (input) => {
  if (!input.enabled || input.file === null) return disabledLogger();
  return createEnabledLogger({ clock: input.clock, file: input.file });
};

/**
 * Builds the minimal owner-neutral router. It has no subscriber registry: the three Product owners are
 * explicit fields, each writer is isolated, and one shared sequence/clock is assigned before delegation.
 */
export function createDiagnosticLoggingRouter(
  input: Readonly<{
    readonly clock: CheckExecutionClock;
    readonly coreFile: string | null;
    readonly factory: DiagnosticLoggerFactory;
    readonly invocationId: string;
    readonly learnedAdmissionFile: string | null;
    readonly schedulerFile: string | null;
  }>
): DiagnosticLoggingRouter {
  if (
    input.coreFile === null &&
    input.schedulerFile === null &&
    input.learnedAdmissionFile === null
  )
    return disabledDiagnosticLoggingRouter();
  const startedAt = safeNow(input.clock);
  let sequence = 0;
  const route = (file: string | null): DiagnosticLogger => {
    if (file === null) return disabledLogger();
    return createRoutedLogger({
      clock: input.clock,
      factory: input.factory,
      file,
      nextCorrelation: () =>
        Object.freeze({
          elapsedMs: elapsedSince(startedAt, input.clock),
          invocationId: input.invocationId,
          sequence: ++sequence
        })
    });
  };
  const core = route(input.coreFile);
  const scheduler = route(input.schedulerFile);
  const learnedAdmission = route(input.learnedAdmissionFile);
  return Object.freeze({
    core,
    learnedAdmission,
    scheduler,
    close: () =>
      Object.freeze({
        core: core.close(),
        learnedAdmission: learnedAdmission.close(),
        scheduler: scheduler.close()
      })
  });
}

/** Builds one immutable set of human-filterable diagnostic labels. */
export function diagnosticTags(...tags: readonly string[]): readonly string[] {
  return Object.freeze([...tags]);
}

/** Correlates one channel while containing its factory, write, and close lifecycle. */
function createRoutedLogger(
  input: Readonly<{
    readonly clock: CheckExecutionClock;
    readonly factory: DiagnosticLoggerFactory;
    readonly file: string;
    readonly nextCorrelation: () => NonNullable<DiagnosticObservation["correlation"]>;
  }>
): DiagnosticLogger {
  let delegate: DiagnosticLogger | undefined;
  let closed = false;
  let failed = false;
  try {
    delegate = input.factory({ clock: input.clock, enabled: true, file: input.file });
  } catch {
    failed = true;
  }
  return Object.freeze({
    close: (): DiagnosticChannelStatus => {
      if (closed) return failed ? "failed" : "succeeded";
      closed = true;
      if (delegate === undefined) return "failed";
      try {
        const status = delegate.close();
        failed ||= status === "failed";
      } catch {
        failed = true;
      }
      return failed ? "failed" : "succeeded";
    },
    observe: (observation: DiagnosticObservation): void => {
      if (closed) return;
      const correlation = input.nextCorrelation();
      if (failed || delegate === undefined) return;
      try {
        delegate.observe(Object.freeze({ ...observation, correlation }));
      } catch {
        failed = true;
      }
    }
  });
}

function disabledLogger(): DiagnosticLogger {
  return Object.freeze({
    close: () => "disabled" as const,
    observe: () => undefined
  });
}

function disabledDiagnosticLoggingRouter(): DiagnosticLoggingRouter {
  const disabled = disabledLogger();
  return Object.freeze({
    core: disabled,
    learnedAdmission: disabled,
    scheduler: disabled,
    close: () =>
      Object.freeze({
        core: "disabled" as const,
        learnedAdmission: "disabled" as const,
        scheduler: "disabled" as const
      })
  });
}

function createEnabledLogger(
  input: Readonly<{
    readonly clock: CheckExecutionClock;
    readonly file: string;
  }>
): DiagnosticLogger {
  let descriptor: number | undefined;
  let failed = false;
  let sequence = 0;
  const startedAt = safeNow(input.clock);

  try {
    mkdirSync(dirname(input.file), { recursive: true });
    descriptor = openSync(input.file, "wx");
  } catch {
    failed = true;
  }

  return Object.freeze({
    close: () => {
      if (descriptor !== undefined) {
        try {
          closeSync(descriptor);
        } catch {
          failed = true;
        }
        descriptor = undefined;
      }
      return failed ? "failed" : "succeeded";
    },
    observe: (observation: DiagnosticObservation) => {
      if (failed || descriptor === undefined) return;
      try {
        const correlation = observation.correlation;
        const buffer = renderDiagnosticObservation({
          elapsedMs: correlation?.elapsedMs ?? elapsedSince(startedAt, input.clock),
          invocationId: correlation?.invocationId,
          observation,
          sequence: correlation?.sequence ?? sequence + 1
        });
        if (correlation === undefined) sequence += 1;
        writeBuffer(descriptor, buffer);
      } catch {
        failed = true;
      }
    }
  });
}

function writeBuffer(descriptor: number, buffer: string): void {
  const bytes = Buffer.from(buffer, "utf8");
  let offset = 0;
  while (offset < bytes.length) {
    const written = writeSync(descriptor, bytes, offset, bytes.length - offset, null);
    if (written <= 0) throw new Error("Diagnostic log append made no progress");
    offset += written;
  }
}

function safeNow(clock: CheckExecutionClock): number {
  try {
    const now = clock.now();
    return Number.isFinite(now) ? now : 0;
  } catch {
    return 0;
  }
}

function elapsedSince(startedAt: number, clock: CheckExecutionClock): number {
  const elapsed = safeNow(clock) - startedAt;
  return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
}
