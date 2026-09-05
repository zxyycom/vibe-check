import type { DiagnosticObservation } from "./logger.ts";
import { renderSafeDiagnosticDetail } from "./diagnostic-detail-rendering.ts";

export function renderDiagnosticObservation(
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
