import {
  canonicalizeScriptJsonObject,
  type CanonicalScriptJsonObject
} from "../../canonical-json.ts";
import {
  isSafeDiagnosticIdentifier,
  isSafeDiagnosticPresentation
} from "../../diagnostic-safety.ts";
import { isNonArrayRecord } from "../../value-guards.ts";

const MATERIAL_DIAGNOSTIC_KEYS = ["data", "id", "presentation"] as const;

/** A provider-approved, machine-safe fact about an expected material validation failure. */
export interface MaterialValidationDiagnostic {
  readonly data: CanonicalScriptJsonObject;
  readonly id: string;
  readonly presentation: string;
}

/** A typed expected failure; workflow consumers use diagnostics, never this error's text. */
export class ExpectedMaterialValidationFailure extends Error {
  public readonly diagnostics: readonly MaterialValidationDiagnostic[];

  public constructor(diagnostics: readonly MaterialValidationDiagnostic[]) {
    const safeDiagnostics = validateExpectedDiagnostics(diagnostics);
    super(safeDiagnostics.map((diagnostic) => diagnostic.presentation).join("\n"));
    this.diagnostics = safeDiagnostics;
  }
}

export function expectedMaterialValidationFailure(
  diagnostics: readonly MaterialValidationDiagnostic[]
): ExpectedMaterialValidationFailure {
  return new ExpectedMaterialValidationFailure(diagnostics);
}

function validateExpectedDiagnostics(
  diagnostics: readonly MaterialValidationDiagnostic[]
): readonly MaterialValidationDiagnostic[] {
  if (!Array.isArray(diagnostics) || diagnostics.length === 0) throw invalidDiagnostics();

  const identifiers = new Set<string>();
  const safeDiagnostics: MaterialValidationDiagnostic[] = [];
  for (const diagnostic of diagnostics) {
    const safeDiagnostic = validateExpectedDiagnostic(diagnostic);
    if (identifiers.has(safeDiagnostic.id)) throw invalidDiagnostics();
    identifiers.add(safeDiagnostic.id);
    safeDiagnostics.push(safeDiagnostic);
  }
  return Object.freeze(safeDiagnostics);
}

function validateExpectedDiagnostic(value: unknown): MaterialValidationDiagnostic {
  if (!isNonArrayRecord(value) || !hasExactKeys(value, MATERIAL_DIAGNOSTIC_KEYS))
    throw invalidDiagnostics();
  const data = ownDataValue(value, "data");
  const id = ownDataValue(value, "id");
  const presentation = ownDataValue(value, "presentation");
  const canonicalData = canonicalizeScriptJsonObject(data);
  if (
    canonicalData === undefined ||
    !isSafeDiagnosticIdentifier(id) ||
    !isSafeDiagnosticPresentation(presentation)
  ) {
    throw invalidDiagnostics();
  }
  return Object.freeze({ data: canonicalData, id, presentation });
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[]
): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function ownDataValue(value: Readonly<Record<string, unknown>>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (
    descriptor === undefined ||
    descriptor.get !== undefined ||
    descriptor.set !== undefined ||
    !Object.hasOwn(descriptor, "value")
  ) {
    throw invalidDiagnostics();
  }
  return descriptor.value;
}

function invalidDiagnostics(): Error {
  return new Error("Repository material validation diagnostics are invalid");
}
