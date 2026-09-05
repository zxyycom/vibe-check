import { readFileSync } from "node:fs";

import { errorMessage } from "../../../../error-message.ts";

export function optionalOutcome(value: unknown, description: string): string | null {
  if (value !== null && typeof value !== "string") {
    throw new TypeError(`${description} must be a string or null`);
  }
  return value;
}

export function readJsonRecord(
  path: string,
  description: string
): Readonly<Record<string, unknown>> {
  return parseJsonRecord(readFileSync(path, "utf8"), description);
}

export function parseJsonRecord(
  source: string,
  description: string
): Readonly<Record<string, unknown>> {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (error: unknown) {
    throw new Error(`${description} is not JSON: ${errorMessage(error)}`, { cause: error });
  }
  if (!isRecord(value)) throw new TypeError(`${description} must be an object`);
  return value;
}

export function requiredString(value: unknown, description: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${description} must be a non-empty string`);
  }
  return value;
}

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}
