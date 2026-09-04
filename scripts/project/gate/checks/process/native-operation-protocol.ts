import {
  canonicalizeScriptJsonObject,
  type CanonicalScriptJsonObject
} from "../../../../canonical-json.ts";
import {
  isSafeDiagnosticIdentifier,
  isSafeDiagnosticPresentation
} from "../../../../diagnostic-safety.ts";

interface OwnDataProperty {
  readonly enumerable: boolean;
  readonly value: unknown;
}

interface SafeNativeOperationPassed {
  readonly kind: "passed";
}

export interface SafeNativeOperationFailed {
  readonly code: string;
  readonly diagnostics: readonly NativeOperationDiagnostic[];
  readonly focusedCommand: string;
  readonly kind: "failed";
}

export type SafeNativeOperationResult = Readonly<
  SafeNativeOperationPassed | SafeNativeOperationFailed
>;

const SAFE_NATIVE_OPERATION_PASSED: SafeNativeOperationPassed = Object.freeze({ kind: "passed" });

/** A provider-owned safe diagnostic that becomes one Check-local supplemental Record. */
export interface NativeOperationDiagnostic {
  readonly data: CanonicalScriptJsonObject;
  readonly id: string;
}

export interface NativeOperationPassed {
  readonly passed: true;
}

export interface NativeOperationFailed {
  readonly code: string;
  readonly diagnostics: readonly NativeOperationDiagnostic[];
  readonly focusedCommand: string;
  readonly passed: false;
}

export type NativeOperationResult = Readonly<NativeOperationPassed | NativeOperationFailed>;

/**
 * Snapshots an operation result through own data descriptors before any native
 * Check judgment or Record publication. Accessors, prototype variants, and
 * incomplete nested diagnostics fail closed rather than becoming published facts.
 */
export function safeNativeOperationResult(value: unknown): SafeNativeOperationResult | undefined {
  const properties = snapshotPlainObjectProperties(value);
  if (properties === undefined) return undefined;

  const passed = propertyValue(properties, "passed");
  if (passed === true && hasExactEnumerableKeys(properties, ["passed"]))
    return SAFE_NATIVE_OPERATION_PASSED;
  if (passed === false) return safeNativeOperationFailure(properties);
  return undefined;
}

/** Constructs the private success fact returned by a domain native operation. */
export function nativePassed(): NativeOperationResult {
  return Object.freeze({ passed: true });
}

/** Constructs the private failure fact returned by a domain native operation. */
export function nativeFailed(input: Omit<NativeOperationFailed, "passed">): NativeOperationResult {
  return Object.freeze({ passed: false, ...input });
}

function safeNativeOperationFailure(
  properties: ReadonlyMap<string, OwnDataProperty>
): SafeNativeOperationFailed | undefined {
  if (
    !hasExactEnumerableKeys(properties, ["code", "diagnostics", "focusedCommand", "passed"]) ||
    propertyValue(properties, "passed") !== false
  ) {
    return undefined;
  }

  const code = propertyValue(properties, "code");
  const focusedCommand = propertyValue(properties, "focusedCommand");
  const diagnostics = safeNativeOperationDiagnostics(propertyValue(properties, "diagnostics"));
  if (!isSafeCode(code) || !isSafeTerminalText(focusedCommand) || diagnostics === undefined)
    return undefined;

  return Object.freeze({ code, diagnostics, focusedCommand, kind: "failed" });
}

function safeNativeOperationDiagnostics(
  value: unknown
): readonly NativeOperationDiagnostic[] | undefined {
  const entries = snapshotDiagnosticEntries(value);
  if (entries === undefined || entries.length === 0) return undefined;

  const ids = new Set<string>();
  const diagnostics: NativeOperationDiagnostic[] = [];
  for (const entry of entries) {
    const diagnostic = safeNativeOperationDiagnostic(entry);
    if (diagnostic === undefined || ids.has(diagnostic.id)) return undefined;
    ids.add(diagnostic.id);
    diagnostics.push(diagnostic);
  }
  return Object.freeze(diagnostics);
}

function safeNativeOperationDiagnostic(value: unknown): NativeOperationDiagnostic | undefined {
  const properties = snapshotPlainObjectProperties(value);
  if (properties === undefined || !hasExactEnumerableKeys(properties, ["data", "id"])) {
    return undefined;
  }

  const data = canonicalizeScriptJsonObject(propertyValue(properties, "data"));
  const id = propertyValue(properties, "id");
  if (data === undefined || !isSafeDiagnosticIdentifier(id)) return undefined;
  return Object.freeze({ data, id });
}

function snapshotPlainObjectProperties(
  value: unknown
): ReadonlyMap<string, OwnDataProperty> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return undefined;
  return snapshotOwnDataProperties(value);
}

function snapshotDiagnosticEntries(value: unknown): readonly unknown[] | undefined {
  if (!isPlainDiagnosticArray(value)) return undefined;
  const properties = snapshotOwnDataProperties(value);
  if (properties === undefined) return undefined;

  const length = snapshotArrayLength(properties);
  return length === undefined ? undefined : snapshotArrayEntries(properties, length);
}

function isPlainDiagnosticArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype;
}

function snapshotArrayLength(properties: ReadonlyMap<string, OwnDataProperty>): number | undefined {
  const lengthProperty = properties.get("length");
  const length = safeArrayLength(lengthProperty?.value);
  if (length === undefined || lengthProperty?.enumerable !== false) return undefined;
  return properties.size === length + 1 ? length : undefined;
}

function snapshotArrayEntries(
  properties: ReadonlyMap<string, OwnDataProperty>,
  length: number
): readonly unknown[] | undefined {
  const entries: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const entry = properties.get(String(index));
    if (entry === undefined || !entry.enumerable) return undefined;
    entries.push(entry.value);
  }
  return Object.freeze(entries);
}

function safeArrayLength(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function snapshotOwnDataProperties(
  value: object
): ReadonlyMap<string, OwnDataProperty> | undefined {
  const properties = new Map<string, OwnDataProperty>();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string") return undefined;
    const descriptorEntry = Object.getOwnPropertyDescriptor(descriptors, key);
    if (!isDataDescriptor(descriptorEntry)) return undefined;
    const descriptor = descriptorEntry.value;
    if (!isDataDescriptor(descriptor)) return undefined;
    properties.set(
      key,
      Object.freeze({ enumerable: descriptor.enumerable === true, value: descriptor.value })
    );
  }
  return properties;
}

function hasExactEnumerableKeys(
  properties: ReadonlyMap<string, OwnDataProperty>,
  expectedKeys: readonly string[]
): boolean {
  return (
    properties.size === expectedKeys.length &&
    expectedKeys.every((key) => properties.get(key)?.enumerable === true)
  );
}

function propertyValue(properties: ReadonlyMap<string, OwnDataProperty>, key: string): unknown {
  return properties.get(key)?.value;
}

type DataDescriptor = Omit<PropertyDescriptor, "get" | "set" | "value"> &
  Readonly<{ readonly get?: undefined; readonly set?: undefined; readonly value: unknown }>;

function isDataDescriptor(descriptor: unknown): descriptor is DataDescriptor {
  if (typeof descriptor !== "object" || descriptor === null) return false;
  const candidate = descriptor as PropertyDescriptor;
  return (
    candidate.get === undefined && candidate.set === undefined && Object.hasOwn(candidate, "value")
  );
}

function isSafeCode(value: unknown): value is string {
  return typeof value === "string" && /^[a-z][a-z0-9:.-]*$/u.test(value);
}

function isSafeTerminalText(value: unknown): value is string {
  return isSafeDiagnosticPresentation(value);
}
