import { snapshotClosedRecord } from "../data-boundary/closed-values.ts";
import type { CheckDescriptor } from "./descriptor.ts";

export interface CheckDescriptorValidationIssue {
  readonly path: string;
  readonly code: "invalid-value";
  readonly message: string;
}

export type CheckDescriptorValidationResult = Readonly<
  | { readonly ok: true; readonly value: CheckDescriptor }
  | {
      readonly ok: false;
      readonly issues: readonly [
        CheckDescriptorValidationIssue,
        ...CheckDescriptorValidationIssue[]
      ];
    }
>;

/** Validates the minimal Check identity shared by Definition authoring and final facts. */
export function validateCheckDescriptor(value: unknown): CheckDescriptorValidationResult {
  const definition = snapshotClosedRecord(value);
  if (definition === undefined) return invalid("$", "Check definition must be a closed object");
  if (!hasExactKeys(definition, ["checkId", "displayName"])) {
    return invalid("$", "Check definition has unsupported fields");
  }
  if (
    typeof definition.checkId !== "string" ||
    definition.checkId.length === 0 ||
    typeof definition.displayName !== "string"
  ) {
    return invalid("$", "Check definition identity is invalid");
  }
  if (definition.displayName.length === 0) {
    return invalid("$.displayName", "Check displayName is empty");
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({ checkId: definition.checkId, displayName: definition.displayName })
  });
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}

function invalid(path: string, message: string): CheckDescriptorValidationResult {
  const issue = Object.freeze({
    path,
    code: "invalid-value",
    message
  }) satisfies CheckDescriptorValidationIssue;
  const issues: readonly [CheckDescriptorValidationIssue, ...CheckDescriptorValidationIssue[]] = [
    issue
  ];
  return Object.freeze({ ok: false, issues: Object.freeze(issues) });
}
