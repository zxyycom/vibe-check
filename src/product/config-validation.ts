import {
  isNonArrayRecord,
  isStringArray
} from "./foundation/src/type-guards.ts";

export type ConfigObject = Record<string, unknown>;

export function exactObject(
  input: unknown,
  path: string,
  requiredFields: readonly string[],
  optionalFields: readonly string[] = []
): ConfigObject {
  const object = objectValue(input, path);
  for (const field of requiredFields) {
    if (!Object.hasOwn(object, field)) {
      throw new Error(`${path} is missing required field "${field}"`);
    }
  }

  const allowedFields = new Set([...requiredFields, ...optionalFields]);
  for (const field of Object.keys(object)) {
    if (!allowedFields.has(field)) {
      throw new Error(`${path} has unknown field "${field}"`);
    }
  }
  return object;
}

export function objectValue(input: unknown, path: string): ConfigObject {
  if (!isNonArrayRecord(input)) {
    throw new Error(`${path} must be an object`);
  }
  return input;
}

export function stringValue(input: unknown, path: string): string {
  if (typeof input !== "string") {
    throw new Error(`${path} must be a string`);
  }
  return input;
}

export function finiteNumber(input: unknown, path: string): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    throw new Error(`${path} must be a finite number`);
  }
  return input;
}

export function booleanValue(input: unknown, path: string): boolean {
  if (typeof input !== "boolean") {
    throw new Error(`${path} must be a boolean`);
  }
  return input;
}

export function stringArray(input: unknown, path: string): string[] {
  if (!isStringArray(input)) {
    throw new Error(`${path} must be an array of strings`);
  }
  return [...input];
}

export function numberRecord(
  input: unknown,
  path: string
): Record<string, number> {
  const object = objectValue(input, path);
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [
      key,
      finiteNumber(value, `${path}.${key}`)
    ])
  );
}

export function nullableStringRecord(
  input: unknown,
  path: string
): Record<string, string | null> {
  const object = objectValue(input, path);
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => {
      if (value !== null && typeof value !== "string") {
        throw new Error(`${path}.${key} must be a string or null`);
      }
      return [key, value];
    })
  );
}
