import { snapshotClosedRecord } from "../../../data-boundary/closed-values.ts";
import { lintSource } from "@secretlint/core";
import { creator as privateKeyRule } from "@secretlint/secretlint-rule-privatekey";

import {
  secretDetectionPrivateKeyRuleId,
  secretDetectionTextDocumentStructuralClass
} from "../finding-waiver-identity.ts";

/** The only detector result shape allowed to leave this private adapter. */
export interface SecretDetectionIssue {
  readonly location: Readonly<{
    readonly endColumn: number;
    readonly endLine: number;
    readonly startColumn: number;
    readonly startLine: number;
  }>;
  readonly ordinal: number;
  readonly path: string;
  readonly ruleId: "@secretlint/secretlint-rule-privatekey";
  readonly structuralClass: "text-document";
}

export type SecretlintDetectionResult = Readonly<
  | { readonly issues: readonly SecretDetectionIssue[]; readonly kind: "complete" }
  | { readonly kind: "protocol-failed" }
  | { readonly kind: "unavailable" }
>;

/**
 * Runs the fixed local Secretlint rule set against already-approved in-memory text.
 * Third-party result, message text, data, error, and source content never leave this module.
 */
export async function detectSecretlintIssues(
  content: string,
  projectRelativePath: string
): Promise<SecretlintDetectionResult> {
  try {
    const result = await lintSource({
      source: { content, contentType: "text", filePath: projectRelativePath },
      options: {
        config: {
          rules: [{ id: secretDetectionPrivateKeyRuleId, rule: privateKeyRule, severity: "error" }]
        },
        maskSecrets: true,
        noPhysicFilePath: true
      }
    });
    return adaptSecretlintMessages(result.messages, projectRelativePath);
  } catch {
    return Object.freeze({ kind: "unavailable" });
  }
}

/** Converts only allowlisted Secretlint message fields to the safe Check-local issue DTO. */
export function adaptSecretlintMessages(
  messages: unknown,
  projectRelativePath: string
): SecretlintDetectionResult {
  if (!Array.isArray(messages)) return Object.freeze({ kind: "protocol-failed" });

  const issues: SecretDetectionIssue[] = [];
  for (const message of messages) {
    const location = safeLocation(message);
    if (location === undefined || !isPrivateKeyMessage(message)) {
      return Object.freeze({ kind: "protocol-failed" });
    }
    issues.push(
      Object.freeze({
        location,
        ordinal: issues.length + 1,
        path: projectRelativePath,
        ruleId: secretDetectionPrivateKeyRuleId,
        structuralClass: secretDetectionTextDocumentStructuralClass
      })
    );
  }
  return Object.freeze({ issues: Object.freeze(issues), kind: "complete" });
}

function isPrivateKeyMessage(value: unknown): boolean {
  const message = snapshotClosedRecord(value);
  return (
    message !== undefined &&
    message.type === "message" &&
    message.ruleId === secretDetectionPrivateKeyRuleId &&
    message.severity === "error"
  );
}

function safeLocation(value: unknown): SecretDetectionIssue["location"] | undefined {
  const message = snapshotClosedRecord(value);
  if (message === undefined) return undefined;
  const loc = snapshotClosedRecord(message.loc);
  if (loc === undefined) return undefined;
  const start = loc.start;
  const end = loc.end;
  if (!isPosition(start) || !isPosition(end)) return undefined;
  if (end.line < start.line || (end.line === start.line && end.column < start.column)) {
    return undefined;
  }
  return Object.freeze({
    endColumn: end.column + 1,
    endLine: end.line,
    startColumn: start.column + 1,
    startLine: start.line
  });
}

function isPosition(
  value: unknown
): value is Readonly<{ readonly column: number; readonly line: number }> {
  const position = snapshotClosedRecord(value);
  return (
    position !== undefined &&
    typeof position.column === "number" &&
    Number.isSafeInteger(position.column) &&
    position.column >= 0 &&
    typeof position.line === "number" &&
    Number.isSafeInteger(position.line) &&
    position.line >= 1
  );
}
