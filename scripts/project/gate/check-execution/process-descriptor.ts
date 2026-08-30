import { isNonArrayRecord } from "../../../value-guards.ts";

import type { ProcessCheckDescriptor } from "./process.ts";

const DESCRIPTOR_KEYS = new Set([
  "args",
  "checkId",
  "command",
  "cwd",
  "displayName",
  "environment",
  "timeoutMs"
]);

const REQUIRED_DESCRIPTOR_KEYS = ["args", "checkId", "command", "displayName"] as const;

/** Validates the closed process descriptor retained as a Check's authored options. */
export function validProcessCheckDescriptor(value: unknown): value is ProcessCheckDescriptor {
  if (!isNonArrayRecord(value) || !hasOnlyDescriptorKeys(value)) return false;
  if (!REQUIRED_DESCRIPTOR_KEYS.every((key) => Object.hasOwn(value, key))) return false;
  return validDescriptorFields(value);
}

function validDescriptorFields(value: Readonly<Record<string, unknown>>): boolean {
  return (
    validArguments(value.args) &&
    nonEmptyString(value.checkId) &&
    nonEmptyString(value.command) &&
    nonEmptyString(value.displayName) &&
    (value.cwd === undefined || typeof value.cwd === "string") &&
    validProcessEnvironment(value.environment) &&
    (value.timeoutMs === undefined || positiveInteger(value.timeoutMs))
  );
}

/** Accepts the string-only environment handoff used by process Check definitions. */
export function validProcessEnvironment(value: unknown): value is Readonly<Record<string, string>> {
  return (
    value === undefined ||
    (isNonArrayRecord(value) && Object.values(value).every((item) => typeof item === "string"))
  );
}

function hasOnlyDescriptorKeys(value: Readonly<Record<string, unknown>>): boolean {
  return Object.keys(value).every((key) => DESCRIPTOR_KEYS.has(key));
}

function validArguments(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((argument) => typeof argument === "string");
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
