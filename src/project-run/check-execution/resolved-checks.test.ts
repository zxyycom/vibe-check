import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CheckResult } from "../../check/check.ts";
import { execute } from "./resolved-checks.test-support.ts";

describe("Package Run direct Check execution", () => {
  it("retains supplemental Records independently from a passed final result", async () => {
    const messages = [
      { level: "info" as const, code: "summary", message: "One detail" },
      { level: "warning" as const, code: "watch", message: "Two details" },
      { level: "error" as const, code: "failure", message: "Three details" }
    ];
    const result = await execute((context) => {
      context.records.report({ id: "sample" }, { durationMs: 12 });
      return { status: "passed", data: { summary: "ok" }, messages };
    });

    assert.equal(result.kind, "completed");
    assert.deepEqual(result.snapshot.checks[0]?.outcome, {
      status: "passed",
      data: { summary: "ok" }
    });
    assert.deepEqual(result.snapshot.records, [
      { checkId: "direct-check", id: "sample", data: { durationMs: 12 } }
    ]);
    assert.deepEqual(result.checkMessages, [
      { checkId: "direct-check", level: "info", code: "summary", message: "One detail" },
      { checkId: "direct-check", level: "warning", code: "watch", message: "Two details" },
      { checkId: "direct-check", level: "error", code: "failure", message: "Three details" }
    ]);
    assert.equal(Object.isFrozen(result.checkMessages), true);
    messages[0].message = "Mutated after settlement";
    assert.equal(result.checkMessages[0]?.message, "One detail");

    await assertUnboundedMessagesAreRetained();
    await assertTerminalMessagesArePublishedOnlyWhenAccepted();
  });
});

async function assertUnboundedMessagesAreRetained(): Promise<void> {
  const whitespaceMessage = " \t ";
  const longMessage = "x".repeat(16_384);
  const manyMessages = Array.from({ length: 257 }, (_, index) => ({
    level: "info" as const,
    code: `detail-${index}`,
    message: `Detail ${index}`
  }));
  const unboundedResult = await execute(() => ({
    status: "passed",
    data: {},
    messages: [
      { level: "warning", code: "whitespace", message: whitespaceMessage },
      { level: "error", code: "long-text", message: longMessage },
      ...manyMessages
    ]
  }));
  assert.equal(unboundedResult.checkMessages.length, 259);
  assert.deepEqual(unboundedResult.checkMessages[0], {
    checkId: "direct-check",
    level: "warning",
    code: "whitespace",
    message: whitespaceMessage
  });
  assert.equal(unboundedResult.checkMessages[1]?.message, longMessage);
  assert.deepEqual(unboundedResult.checkMessages.at(-1), {
    checkId: "direct-check",
    level: "info",
    code: "detail-256",
    message: "Detail 256"
  });
  assert.equal(Object.isFrozen(unboundedResult.checkMessages), true);
  assert.equal(Object.isFrozen(unboundedResult.checkMessages[1]), true);
}

async function assertTerminalMessagesArePublishedOnlyWhenAccepted(): Promise<void> {
  const terminalResults: readonly CheckResult[] = [
    { status: "passed", data: {} },
    { status: "failed", data: {}, messages: undefined },
    { status: "not-applicable", messages: [] },
    {
      status: "unavailable",
      reason: { code: "declared-unavailable" },
      messages: [{ level: "warning", code: "not-ready", message: "Scanner is unavailable" }]
    }
  ];
  for (const terminal of terminalResults) {
    const terminalResult = await execute(() => terminal);
    assert.equal(terminalResult.kind, "completed");
    assert.equal(terminalResult.snapshot.checks[0]?.outcome.status, terminal.status);
    assert.deepEqual(terminalResult.checkMessages, expectedMessages(terminal.status));
  }
}

function expectedMessages(status: CheckResult["status"]) {
  return status === "unavailable"
    ? [
        {
          checkId: "direct-check",
          level: "warning",
          code: "not-ready",
          message: "Scanner is unavailable"
        }
      ]
    : [];
}
