import {
  canonicalizeScriptJsonObject,
  type CanonicalScriptJsonObject
} from "../../../../canonical-json.ts";
import { isSafeDiagnosticIdentifier } from "../../../../diagnostic-safety.ts";

/** One owner-approved supplemental Record projected from a nonzero process result. */
export interface ProcessFailureRecord {
  readonly data: CanonicalScriptJsonObject;
  readonly id: string;
}

/** Converts one settled child stdout into the complete safe Record set, or declines it. */
export interface ProcessFailureProjection {
  readonly recordsFromStdout: (stdout: string) => readonly ProcessFailureRecord[] | undefined;
}

/** Materializes one complete owner projection before any Record can be published. */
export function safeProcessFailureRecords(
  projection: ProcessFailureProjection,
  stdout: string
): readonly ProcessFailureRecord[] | undefined {
  try {
    const projectedRecords = projection.recordsFromStdout(stdout);
    if (!Array.isArray(projectedRecords) || projectedRecords.length === 0) return undefined;

    const ids = new Set<string>();
    const failureRecords: ProcessFailureRecord[] = [];
    for (const candidate of projectedRecords) {
      const record = safeProcessFailureRecord(candidate);
      if (record === undefined || ids.has(record.id)) return undefined;
      ids.add(record.id);
      failureRecords.push(record);
    }
    return Object.freeze(failureRecords);
  } catch {
    return undefined;
  }
}

function safeProcessFailureRecord(value: unknown): ProcessFailureRecord | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const candidate = value as Readonly<{ readonly data?: unknown; readonly id?: unknown }>;
  const data = canonicalizeScriptJsonObject(candidate.data);
  if (data === undefined || !isSafeDiagnosticIdentifier(candidate.id)) return undefined;
  return Object.freeze({ data, id: candidate.id });
}
