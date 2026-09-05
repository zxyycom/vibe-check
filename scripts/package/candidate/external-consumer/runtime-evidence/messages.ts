import assert from "node:assert/strict";

import { isRecord, isUnknownArray } from "./values.ts";

type ExpectedRunMessage = Readonly<{
  readonly checkId: string;
  readonly code: string;
  readonly level: "info" | "warning";
  readonly message: string;
}>;

const expectedRunMessages: readonly ExpectedRunMessage[] = [
  {
    checkId: "function-metrics",
    code: "non-blocking-findings",
    level: "warning",
    message:
      "1 non-blocking finding(s) were recorded; inspect this Check's Records for affected paths and measurements, then update the code or policy."
  },
  {
    checkId: "function-metrics",
    code: "finding-detail",
    level: "warning",
    message:
      "function-metrics.ts:1 workerProof: cyclomatic-complexity 2 exceeds the 1 limit (areas: worker). Complexity contributors: if at line 2."
  },
  {
    checkId: "duplicate-detection",
    code: "non-blocking-findings",
    level: "warning",
    message:
      "1 non-blocking finding(s) were recorded; inspect this Check's Records for affected paths and measurements, then update the code or policy."
  },
  {
    checkId: "duplicate-detection",
    code: "finding-detail",
    level: "warning",
    message:
      "Duplicate fragment contains 80 tokens across 19 lines at duplicate-a.ts:1-19, duplicate-b.ts:1-19."
  },
  {
    checkId: "installed-terminal-note",
    code: "installed-terminal-note",
    level: "info",
    message: "Installed candidate terminal message."
  }
];

/** Verifies the fixture's quality findings and terminal presentation messages. */
export function assertDuplicateAndTerminalMessages(value: unknown): void {
  if (!isUnknownArray(value)) throw new TypeError("isolated Run checkMessages must be an array");
  assert.equal(value.length, 5);
  for (const expected of expectedRunMessages) {
    assert.deepEqual(findRunMessage(value, expected), expected);
  }
}

function findRunMessage(
  messages: readonly unknown[],
  expected: ExpectedRunMessage
): Readonly<Record<string, unknown>> | undefined {
  return messages.find(
    (message): message is Readonly<Record<string, unknown>> =>
      isRecord(message) &&
      message.checkId === expected.checkId &&
      (expected.checkId === "installed-terminal-note" || message.code === expected.code)
  );
}
