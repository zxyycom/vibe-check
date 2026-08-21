import { defaultCheckOptionCodeAreasAreKnown } from "./built-ins.ts";
import { resolveParsedCheckTree } from "./check-tree/index.ts";
import { parseCheckTreeAuthoring } from "./check-tree/authoring.ts";
import { materializeCheckTreeAuthoring } from "./check-tree/materialization.ts";
import { parseEffects } from "./effect-validation.ts";
import {
  type ProjectDefinitionDiagnostic,
  type ProjectDefinitionValidationResult,
  type SchedulerPolicy,
  type ValidationResult
} from "./project.ts";
import { parseQualityConfiguration } from "./quality.ts";
import {
  snapshotClosedArray,
  snapshotClosedRecord
} from "../quality-core/check-record/plain-record-values.ts";

const PROJECT_DEFINITION_KEYS = [
  "apiVersion",
  "checks",
  "effects",
  "quality",
  "scheduler"
] as const;

/**
 * Validates one closed Definition before Run can invoke any project callback.
 * Successful validation carries information-only Check warnings separately.
 */
export function validateProjectDefinition(value: unknown): ProjectDefinitionValidationResult {
  try {
    return validateProjectDefinitionValue(value);
  } catch {
    return invalidDefinition("definition");
  }
}

function validateProjectDefinitionValue(value: unknown): ProjectDefinitionValidationResult {
  const data = exactProjectDefinition(value);
  if (!data.ok) return data;
  return parseProjectDefinitionFields(data.value);
}

function parseProjectDefinitionFields(
  data: Readonly<Record<string, unknown>>
): ProjectDefinitionValidationResult {
  const quality = parseQualityConfiguration(data.quality);
  if (quality === undefined) return invalidDefinition("definition.quality");
  const scheduler = parseScheduler(data.scheduler);
  if (scheduler === undefined) return invalidDefinition("definition.scheduler");
  const checks = snapshotClosedArray(data.checks);
  if (checks === undefined) return invalidDefinition("definition.checks");
  const parsedChecks = parseCheckTreeAuthoring(checks);
  if (parsedChecks === undefined) return invalidDefinition("definition.checks");
  const tree = resolveParsedCheckTree(parsedChecks, scheduler.maxParallel);
  if (
    tree === undefined ||
    tree.leaves.some(
      (check) =>
        !defaultCheckOptionCodeAreasAreKnown(
          check.definition.checkId,
          check.options,
          quality.codeAreas
        )
    )
  )
    return invalidDefinition("definition.checks");
  const effects = parseEffects(data.effects);
  if (effects === undefined) return invalidDefinition("definition.effects");
  return Object.freeze({
    ok: true,
    value: {
      apiVersion: "1" as const,
      checks: materializeCheckTreeAuthoring(parsedChecks),
      effects,
      quality,
      scheduler
    },
    warnings: tree.warnings
  });
}

function exactProjectDefinition(
  value: unknown
): ValidationResult<Readonly<Record<string, unknown>>> {
  const data = exactRecord(
    value,
    PROJECT_DEFINITION_KEYS,
    "invalid-project-definition",
    "definition"
  );
  if (!data.ok) return data;
  return data.value.apiVersion === "1"
    ? data
    : invalid("invalid-project-definition", "definition.apiVersion", "invalid-value");
}

function exactRecord(
  value: unknown,
  allowedKeys: readonly string[],
  kind: ProjectDefinitionDiagnostic["kind"],
  path: string
): ValidationResult<Readonly<Record<string, unknown>>> {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return invalid(kind, path, "invalid-value");
  const unknownKey = Object.keys(data).find((key) => !allowedKeys.includes(key));
  if (unknownKey !== undefined) return invalid(kind, `${path}.${unknownKey}`, "unknown-key");
  return Object.freeze({ ok: true, value: data });
}

function parseScheduler(value: unknown): SchedulerPolicy | undefined {
  const data = exactKeys(value, ["maxParallel"]);
  return typeof data?.maxParallel === "number" &&
    Number.isSafeInteger(data.maxParallel) &&
    data.maxParallel > 0
    ? Object.freeze({ maxParallel: data.maxParallel })
    : undefined;
}

function exactKeys(
  value: unknown,
  keys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  return Object.keys(data).length === keys.length && keys.every((key) => Object.hasOwn(data, key))
    ? data
    : undefined;
}

function invalidDefinition(path: string): ProjectDefinitionValidationResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ kind: "invalid-project-definition", path, reason: "invalid-value" })
  });
}

function invalid(
  kind: ProjectDefinitionDiagnostic["kind"],
  path: string,
  reason: ProjectDefinitionDiagnostic["reason"]
): ValidationResult<never> {
  return Object.freeze({ ok: false, error: Object.freeze({ kind, path, reason }) });
}
