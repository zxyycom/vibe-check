import { isNonArrayRecord } from "../../value-guards.ts";

export const PROJECT_GATE_RESULT_STATUS = Object.freeze({
  failed: "failed",
  passed: "passed",
  unavailable: "unavailable"
} as const);

export type ProjectGateResultStatus =
  (typeof PROJECT_GATE_RESULT_STATUS)[keyof typeof PROJECT_GATE_RESULT_STATUS];

export interface ProjectGateMessage {
  readonly code: string;
  readonly level: "error" | "info" | "warning";
  readonly message: string;
}

export interface ProjectGateResult {
  readonly messages: readonly ProjectGateMessage[];
  readonly status: ProjectGateResultStatus;
}

/** Maps one Package Run result into the immutable result given to afterGate. */
export function createInitialProjectGateResult(runResult: unknown): ProjectGateResult {
  if (!isCompletedResult(runResult)) return createProjectGateResult("unavailable");
  if (
    runResult.definitionWarnings.length > 0 ||
    runResult.outputs.progressRendering.status !== "succeeded"
  ) {
    return createProjectGateResult("failed");
  }
  return createProjectGateResult(runResult.aggregate === "passed" ? "passed" : "failed");
}

/** Validates and freezes the value returned by the project-private afterGate stage. */
export function parseProjectGateResult(value: unknown): ProjectGateResult | undefined {
  if (
    !isNonArrayRecord(value) ||
    !hasExactKeys(value, ["messages", "status"]) ||
    !isProjectGateResultStatus(value.status) ||
    !Array.isArray(value.messages) ||
    !value.messages.every(isProjectGateMessage)
  ) {
    return undefined;
  }
  return createProjectGateResult(value.status, value.messages);
}

export function createProjectGateResult(
  status: ProjectGateResultStatus,
  messages: readonly ProjectGateMessage[] = []
): ProjectGateResult {
  return Object.freeze({
    messages: Object.freeze(messages.map((message) => Object.freeze({ ...message }))),
    status
  });
}

function isCompletedResult(value: unknown): value is Readonly<{
  readonly aggregate: "failed" | "not-applicable" | "passed" | "unavailable";
  readonly definitionWarnings: readonly unknown[];
  readonly outputs: Readonly<{
    readonly progressRendering: Readonly<{ readonly status: unknown }>;
  }>;
  readonly kind: "completed";
}> {
  return (
    isNonArrayRecord(value) &&
    value.kind === "completed" &&
    isCheckAggregate(value.aggregate) &&
    Array.isArray(value.definitionWarnings) &&
    isNonArrayRecord(value.outputs) &&
    isNonArrayRecord(value.outputs.progressRendering) &&
    isProgressOutputStatus(value.outputs.progressRendering.status)
  );
}

function isCheckAggregate(
  value: unknown
): value is "failed" | "not-applicable" | "passed" | "unavailable" {
  return (
    value === "failed" ||
    value === "not-applicable" ||
    value === "passed" ||
    value === "unavailable"
  );
}

function isProjectGateResultStatus(value: unknown): value is ProjectGateResultStatus {
  return value === "failed" || value === "passed" || value === "unavailable";
}

function isProgressOutputStatus(value: unknown): boolean {
  return value === "disabled" || value === "failed" || value === "not-run" || value === "succeeded";
}

function isProjectGateMessage(value: unknown): value is ProjectGateMessage {
  return (
    isNonArrayRecord(value) &&
    hasExactKeys(value, ["code", "level", "message"]) &&
    (value.level === "error" || value.level === "info" || value.level === "warning") &&
    isSafeTerminalText(value.code) &&
    isSafeTerminalText(value.message)
  );
}

function isSafeTerminalText(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  for (const character of value) {
    if (isUnsafeTerminalCodePoint(character.codePointAt(0) ?? 0)) return false;
  }
  return true;
}

function isUnsafeTerminalCodePoint(codePoint: number): boolean {
  return (
    codePoint <= 0x1f ||
    (codePoint >= 0x7f && codePoint <= 0x9f) ||
    codePoint === 0x2028 ||
    codePoint === 0x2029
  );
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}
