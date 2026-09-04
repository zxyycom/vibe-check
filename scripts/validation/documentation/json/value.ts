import { errorMessage } from "../../../error-message.ts";
import { isRecord, isUnknownArray } from "../../../value-guards.ts";

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type ParseJsonValueInput = {
  readonly label?: string;
  readonly source: string;
};

/** Signals malformed JSON without exposing parser-provided source text to higher-level reporters. */
export class JsonSyntaxError extends Error {}

export function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return true;
  }
  if (isUnknownArray(value)) {
    return value.every(isJsonValue);
  }
  if (isRecord(value)) {
    return Object.values(value).every(isJsonValue);
  }
  return false;
}

export function parseJsonValue({ label = "JSON", source }: ParseJsonValueInput): JsonValue {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error: unknown) {
    throw new JsonSyntaxError(`${label} parse failed: ${errorMessage(error)}`, { cause: error });
  }
  if (!isJsonValue(parsed)) {
    throw new Error(`${label} must contain a JSON value`);
  }
  return parsed;
}
