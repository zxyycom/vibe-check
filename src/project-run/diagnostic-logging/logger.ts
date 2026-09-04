import { closeSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname } from "node:path";

import type { CheckExecutionClock } from "../check-execution/resolved-checks.ts";
import { renderSafeDiagnosticDetail } from "./diagnostic-detail-rendering.ts";
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
        const buffer = renderObservation({
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

function renderObservation(
  input: Readonly<{
    readonly elapsedMs: number;
    readonly invocationId: string | undefined;
    readonly observation: DiagnosticObservation;
    readonly sequence: number;
  }>
): string {
  const tags = input.observation.tags.map((tag) => `[${escapeLogHeaderField(tag)}]`).join(" ");
  const invocation =
    input.invocationId === undefined ? "" : ` invocationId=${JSON.stringify(input.invocationId)}`;
  const header = `#${String(input.sequence).padStart(6, "0")} +${formatElapsed(input.elapsedMs)} ${tags}${invocation} ${escapeLogHeaderField(input.observation.event)}`;
  return renderFactLines(header, diagnosticFacts(input.observation));
}

/** Keeps author-controlled header fields on one physical header line. */
function escapeLogHeaderField(text: string): string {
  let escaped = "";
  for (const character of text) {
    if (character === "\\") {
      escaped += "\\\\";
      continue;
    }
    const codeUnit = character.charCodeAt(0);
    escaped +=
      codeUnit <= 0x1f ||
      (codeUnit >= 0x7f && codeUnit <= 0x9f) ||
      codeUnit === 0x5b ||
      codeUnit === 0x5d ||
      codeUnit === 0x2028 ||
      codeUnit === 0x2029
        ? `\\u${codeUnit.toString(16).padStart(4, "0")}`
        : character;
  }
  return escaped;
}

function diagnosticFacts(observation: DiagnosticObservation): readonly string[] {
  if (observation.details === undefined) return Object.freeze([]);
  const rendered = renderSafeDiagnosticDetail(observation.details);
  if (!rendered.ok)
    return Object.freeze([`details=unavailable:${escapeLogHeaderField(rendered.reason)}`]);

  const value: unknown = JSON.parse(rendered.text);
  const facts: string[] = [];
  flattenDiagnosticFacts(value, [], facts, observation);
  return Object.freeze(facts);
}

function flattenDiagnosticFacts(
  value: unknown,
  path: readonly string[],
  facts: string[],
  observation: DiagnosticObservation
): void {
  if (Array.isArray(value)) {
    flattenDiagnosticArrayFacts(value, path, facts, observation);
    return;
  }

  if (value !== null && typeof value === "object") {
    flattenDiagnosticRecordFacts(value, path, facts, observation);
    return;
  }

  facts.push(`${factKey(path)}=${factValue(path, value)}`);
}

function flattenDiagnosticArrayFacts(
  value: readonly unknown[],
  path: readonly string[],
  facts: string[],
  observation: DiagnosticObservation
): void {
  const inline = JSON.stringify(value);
  if (inline.length <= MAX_INLINE_DIAGNOSTIC_VALUE_CHARACTERS) {
    facts.push(`${factKey(path)}=${inline}`);
    return;
  }
  const arrayPath = path.length === 0 ? ["details"] : path;
  for (let index = 0; index < value.length; index += 1) {
    flattenDiagnosticFacts(value[index], [...arrayPath, String(index)], facts, observation);
  }
}

function flattenDiagnosticRecordFacts(
  value: object,
  path: readonly string[],
  facts: string[],
  observation: DiagnosticObservation
): void {
  const entries = Object.entries(value);
  if (entries.length === 0) {
    facts.push(`${factKey(path)}={}`);
    return;
  }
  for (const [key, nested] of entries) {
    if (path.length === 0 && isTopLevelFactRepresentedByTag(observation, key, nested)) continue;
    flattenDiagnosticFacts(nested, [...path, key], facts, observation);
  }
}

/** Omits only exact producer facts already visible in the observation's filter tags. */
function isTopLevelFactRepresentedByTag(
  observation: DiagnosticObservation,
  key: string,
  value: unknown
): boolean {
  if (typeof value !== "string") return false;
  if (observation.event === "scheduler.decision") {
    if (key === "kind") return observation.tags.includes(value.toUpperCase());
    return key === "taskId" && observation.tags.includes(`TASK:${value}`);
  }
  return (
    observation.event === "record.reported" &&
    key === "result" &&
    observation.tags.includes(value.toUpperCase())
  );
}

const MAX_INLINE_DIAGNOSTIC_VALUE_CHARACTERS = 120;

function factKey(path: readonly string[]): string {
  if (path.length === 0) return "details";
  const joined = path.join(".");
  return /^[A-Za-z_][A-Za-z0-9_.-]*$/u.test(joined) ? joined : JSON.stringify(joined);
}

function factValue(path: readonly string[], value: unknown): string {
  const key = path.at(-1);
  if (typeof value === "number" && key?.endsWith("Ms")) {
    return String(Math.round(value * 1_000) / 1_000);
  }
  return JSON.stringify(value);
}

const MAX_DIAGNOSTIC_LINE_CHARACTERS = 200;

function renderFactLines(header: string, facts: readonly string[]): string {
  if (facts.length === 0) return `${header}\n`;

  const lines: string[] = [];
  let current = header;
  for (const fact of facts) {
    if (current.length + 1 + fact.length <= MAX_DIAGNOSTIC_LINE_CHARACTERS) {
      current += ` ${fact}`;
      continue;
    }

    lines.push(current);
    const firstCapacity = MAX_DIAGNOSTIC_LINE_CHARACTERS - "│ ".length;
    const continuationCapacity = MAX_DIAGNOSTIC_LINE_CHARACTERS - "│   ".length;
    let offset = 0;
    let prefix = "│ ";
    while (fact.length - offset > (prefix === "│ " ? firstCapacity : continuationCapacity)) {
      const capacity = prefix === "│ " ? firstCapacity : continuationCapacity;
      const end = diagnosticChunkEnd(fact, offset, capacity);
      lines.push(`${prefix}${fact.slice(offset, end)}`);
      offset = end;
      prefix = "│   ";
    }
    current = `${prefix}${fact.slice(offset)}`;
  }
  lines.push(current);
  return `${lines.join("\n")}\n`;
}

function diagnosticChunkEnd(text: string, offset: number, capacity: number): number {
  let end = offset + capacity;
  const preferredMinimum = offset + Math.floor(capacity * 0.6);
  for (let index = end - 1; index >= preferredMinimum; index -= 1) {
    if (text[index] === " ") {
      end = index;
      break;
    }
    if (text[index] === ",") {
      end = index + 1;
      break;
    }
  }
  if (
    end < text.length &&
    text.charCodeAt(end - 1) >= 0xd800 &&
    text.charCodeAt(end - 1) <= 0xdbff &&
    text.charCodeAt(end) >= 0xdc00 &&
    text.charCodeAt(end) <= 0xdfff
  ) {
    end -= 1;
  }
  return end;
}

function formatElapsed(elapsedMs: number): string {
  const totalMilliseconds = Math.round(elapsedMs);
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMilliseconds % 60_000) / 1_000);
  const milliseconds = totalMilliseconds % 1_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
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
