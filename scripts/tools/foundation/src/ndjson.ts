import { errorMessage } from "./errors.ts";

export type NdjsonRecord<T = unknown> = {
  readonly line: number;
  readonly value: T;
};

export type NdjsonDiagnostic = {
  readonly line: number;
  readonly message: string;
};

export interface ParsedNdjson {
  readonly diagnostics: readonly NdjsonDiagnostic[];
  readonly records: readonly NdjsonRecord[];
}

export function toNdjson(values: readonly unknown[]): string {
  if (values.length === 0) {
    return "";
  }
  return `${values.map(serializeNdjsonValue).join("\n")}\n`;
}

export function parseNdjson(content: string): ParsedNdjson {
  const diagnostics: NdjsonDiagnostic[] = [];
  const records: NdjsonRecord[] = [];

  for (const [index, line] of content.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      const value: unknown = JSON.parse(line);
      records.push({ line: index + 1, value });
    } catch (error: unknown) {
      diagnostics.push({ line: index + 1, message: `invalid JSON: ${errorMessage(error)}` });
    }
  }

  return Object.freeze({
    diagnostics: Object.freeze(diagnostics),
    records: Object.freeze(records)
  });
}

function serializeNdjsonValue(value: unknown, index: number): string {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new TypeError("value is not JSON-serializable");
    }
    return serialized;
  } catch (error: unknown) {
    throw new Error(`could not serialize NDJSON record ${index + 1}: ${errorMessage(error)}`, {
      cause: error
    });
  }
}
