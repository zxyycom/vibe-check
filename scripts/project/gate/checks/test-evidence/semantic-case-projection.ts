import type {
  TestEvidenceDiagnostic,
  TestEvidenceDiagnosticOrigin
} from "../../../../test-evidence/entities.ts";
import { isSafeRelativePosixPath } from "../../../../test-evidence/relative-path.ts";
import { isNonArrayRecord } from "../../../../value-guards.ts";

import type { NativeOperationDiagnostic } from "../process/native-operation.ts";
import {
  testEvidenceDiagnosticPolicy,
  type DiagnosticFieldPolicy
} from "./semantic-case-diagnostic-policy.ts";

export type SafeTestEvidenceDiagnostic = NativeOperationDiagnostic &
  Readonly<{ readonly code: string }>;

interface SafeDiagnosticContext {
  readonly code: string;
  readonly origin: TestEvidenceDiagnosticOrigin;
  readonly policy: DiagnosticFieldPolicy;
}

interface SafeDiagnosticFields {
  readonly caseId: string | undefined;
  readonly location: Readonly<{ readonly column?: number; readonly line: number }> | undefined;
  readonly path: string | undefined;
  readonly runner: "bun" | undefined;
}

/** Projects owner-approved semantic Case findings into bounded native diagnostics. */
export function safeTestEvidenceBlockingDiagnostics(
  diagnostics: readonly TestEvidenceDiagnostic[]
): readonly SafeTestEvidenceDiagnostic[] | undefined {
  const blocking = diagnostics.filter(({ blocking: blocks }) => blocks);
  if (blocking.length === 0) return undefined;

  const projected: Omit<SafeTestEvidenceDiagnostic, "id">[] = [];
  for (const diagnostic of blocking) {
    const safeDiagnostic = safeDiagnosticProjection(diagnostic);
    if (safeDiagnostic === undefined) return undefined;
    projected.push(safeDiagnostic);
  }
  projected.sort(compareSafeDiagnostic);

  const occurrences = new Map<string, number>();
  return Object.freeze(
    projected.map((diagnostic) => {
      const occurrenceKey = safeDiagnosticIdentityKey(diagnostic);
      const occurrence = (occurrences.get(occurrenceKey) ?? 0) + 1;
      occurrences.set(occurrenceKey, occurrence);
      return Object.freeze({
        ...diagnostic,
        data: Object.freeze({ ...diagnostic.data, occurrence }),
        id: `${occurrenceKey}:${occurrence}`
      });
    })
  );
}

function safeDiagnosticProjection(
  diagnostic: TestEvidenceDiagnostic
): Omit<SafeTestEvidenceDiagnostic, "id"> | undefined {
  const context = safeDiagnosticContext(diagnostic);
  if (context === undefined) return undefined;

  const fields = safeDiagnosticFields(diagnostic, context.policy);
  if (fields === undefined) return undefined;

  const data = safeDiagnosticData(context, fields);
  return Object.freeze({
    code: context.code,
    data,
    presentation: presentation({
      caseId: fields.caseId,
      code: context.code,
      location: fields.location,
      origin: context.origin,
      path: fields.path
    })
  });
}

function safeDiagnosticContext(
  diagnostic: TestEvidenceDiagnostic
): SafeDiagnosticContext | undefined {
  if (diagnostic.blocking !== true || diagnostic.severity !== "error") return undefined;
  if (!isKnownOrigin(diagnostic.origin)) return undefined;

  const policy = testEvidenceDiagnosticPolicy(diagnostic.origin, diagnostic.code);
  if (policy === undefined) return undefined;
  return Object.freeze({ code: diagnostic.code, origin: diagnostic.origin, policy });
}

function safeDiagnosticFields(
  diagnostic: TestEvidenceDiagnostic,
  policy: DiagnosticFieldPolicy
): SafeDiagnosticFields | undefined {
  const path = safePath(diagnostic, policy);
  if (!retainsSafePath(diagnostic, path)) return undefined;

  const location = safeLocation(diagnostic, policy, path);
  if (!retainsSafeLocation(diagnostic, location)) return undefined;

  const caseId = safeCaseId(diagnostic, policy);
  if (!retainsSafeCaseId(diagnostic, caseId)) return undefined;

  const runner = safeRunner(diagnostic, policy);
  if (!retainsSafeRunner(diagnostic, runner)) return undefined;
  return Object.freeze({ caseId, location, path, runner });
}

function retainsSafePath(diagnostic: TestEvidenceDiagnostic, path: string | undefined): boolean {
  return diagnostic.path === undefined || path !== undefined;
}

function retainsSafeLocation(
  diagnostic: TestEvidenceDiagnostic,
  location: Readonly<{ readonly column?: number; readonly line: number }> | undefined
): boolean {
  return (
    (diagnostic.line === undefined && diagnostic.column === undefined) || location !== undefined
  );
}

function retainsSafeCaseId(
  diagnostic: TestEvidenceDiagnostic,
  caseId: string | undefined
): boolean {
  return diagnostic.caseId === undefined || caseId !== undefined;
}

function retainsSafeRunner(diagnostic: TestEvidenceDiagnostic, runner: "bun" | undefined): boolean {
  return diagnostic.runner === undefined || runner !== undefined;
}

function safeDiagnosticData(
  context: SafeDiagnosticContext,
  fields: SafeDiagnosticFields
): NativeOperationDiagnostic["data"] {
  return Object.freeze({
    code: context.code,
    kind: "test-evidence-diagnostic",
    origin: context.origin,
    ...(fields.caseId === undefined ? {} : { caseId: fields.caseId }),
    ...(fields.location === undefined ? {} : { location: fields.location }),
    ...(fields.path === undefined ? {} : { path: fields.path }),
    ...(fields.runner === undefined ? {} : { runner: fields.runner })
  });
}

function safePath(
  diagnostic: TestEvidenceDiagnostic,
  policy: DiagnosticFieldPolicy
): string | undefined {
  if (!policy.path || diagnostic.path === undefined) return undefined;
  return isSafeRelativePosixPath(diagnostic.path) ? diagnostic.path : undefined;
}

function safeLocation(
  diagnostic: TestEvidenceDiagnostic,
  policy: DiagnosticFieldPolicy,
  path: string | undefined
): Readonly<{ readonly column?: number; readonly line: number }> | undefined {
  if (!policy.location || diagnostic.line === undefined) return undefined;
  if (path === undefined || !isSafeLocationPart(diagnostic.line)) return undefined;
  if (diagnostic.column !== undefined && !isSafeLocationPart(diagnostic.column)) return undefined;
  return Object.freeze({
    ...(diagnostic.column === undefined ? {} : { column: diagnostic.column }),
    line: diagnostic.line
  });
}

function safeCaseId(
  diagnostic: TestEvidenceDiagnostic,
  policy: DiagnosticFieldPolicy
): string | undefined {
  if (!policy.caseId || diagnostic.caseId === undefined) return undefined;
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(diagnostic.caseId) ? diagnostic.caseId : undefined;
}

function safeRunner(
  diagnostic: TestEvidenceDiagnostic,
  policy: DiagnosticFieldPolicy
): "bun" | undefined {
  if (!policy.runner || diagnostic.runner === undefined) return undefined;
  return diagnostic.runner === "bun" ? "bun" : undefined;
}

function presentation(options: {
  readonly caseId: string | undefined;
  readonly code: string;
  readonly location: Readonly<{ readonly column?: number; readonly line: number }> | undefined;
  readonly origin: TestEvidenceDiagnosticOrigin;
  readonly path: string | undefined;
}): string {
  const location = presentationLocation(options.path, options.location);
  const casePrefix = options.caseId === undefined ? "" : `Case ${options.caseId}: `;
  return `${casePrefix}Test Evidence ${options.origin} diagnostic ${options.code}${location}.`;
}

function presentationLocation(
  path: string | undefined,
  location: Readonly<{ readonly column?: number; readonly line: number }> | undefined
): string {
  if (path === undefined) return "";
  if (location === undefined) return ` at ${path}`;
  const column = location.column === undefined ? "" : `:${location.column}`;
  return ` at ${path}:${location.line}${column}`;
}

function compareSafeDiagnostic(
  left: Omit<SafeTestEvidenceDiagnostic, "id">,
  right: Omit<SafeTestEvidenceDiagnostic, "id">
): number {
  const leftKey = safeDiagnosticIdentityKey(left);
  const rightKey = safeDiagnosticIdentityKey(right);
  if (leftKey < rightKey) return -1;
  if (leftKey > rightKey) return 1;
  return 0;
}

function safeDiagnosticIdentityKey(diagnostic: Omit<SafeTestEvidenceDiagnostic, "id">): string {
  const { caseId, code, origin, path, runner } = diagnostic.data;
  return [
    "test-evidence",
    safeDataText(origin),
    safeDataText(code),
    safeDataText(path),
    safeDataText(caseId),
    safeDataText(runner),
    safeLocationIdentitySuffix(diagnostic.data.location)
  ]
    .map(encodeURIComponent)
    .join(":");
}

function safeDataText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeLocationIdentitySuffix(value: unknown): string {
  if (!isNonArrayRecord(value) || !isSafeLocationPart(value.line)) return "";
  if (value.column !== undefined && !isSafeLocationPart(value.column)) return "";
  return `:${value.line}:${value.column ?? ""}`;
}

function isKnownOrigin(value: unknown): value is TestEvidenceDiagnosticOrigin {
  return (
    value === "profile" ||
    value === "static" ||
    value === "runner" ||
    value === "case" ||
    value === "query"
  );
}

function isSafeLocationPart(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
