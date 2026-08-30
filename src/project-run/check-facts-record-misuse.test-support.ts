import assert from "node:assert/strict";

import { defineConfig } from "../project-definition/project-definition.ts";
import { check, definition, PASSED } from "./check-facts-integration.test-support.ts";
import { run } from "./run.ts";

export async function assertInvalidCallbackOutcomes(): Promise<void> {
  await assertRejectedCallback(() => Object.freeze({ status: "unexpected" }));
  await assertRejectedCallback(() => ({
    status: "unavailable",
    reason: { code: "forged", checkIds: ["custom"] }
  }));
}

export async function assertAcceptedAuthorReasonMessage(): Promise<void> {
  const result = await run(
    definition([
      check({
        execution: () => ({
          status: "unavailable",
          reason: { code: "invalid-execution-result" },
          messages: [
            {
              level: "error",
              code: "author-diagnostic",
              message: "The author deliberately used this reason code"
            }
          ]
        })
      })
    ])
  );
  assert.equal(result.kind, "completed");
  if (result.kind !== "completed") return;
  assert.deepEqual(result.checkMessages, [
    {
      checkId: "custom",
      level: "error",
      code: "author-diagnostic",
      message: "The author deliberately used this reason code"
    }
  ]);
}

export async function assertInvalidRecordUseIsContained(): Promise<void> {
  let retainedReporter:
    | Readonly<{ report(identity: { id: string }, data: object): void }>
    | undefined;
  const result = await run(
    definition([
      check({
        execution: (context) => {
          retainedReporter = context.records;
          context.records.report({ id: "retained" }, { value: true });
          context.records.report({ id: "retained" }, { value: false });
          return {
            status: "passed",
            data: { result: true },
            messages: [{ level: "warning", code: "retained", message: "This must not be accepted" }]
          };
        }
      })
    ])
  );
  assert.equal(result.kind, "completed");
  if (result.kind !== "completed") return;
  assert.deepEqual(result.snapshot.checks[0]?.outcome, {
    status: "unavailable",
    reason: { code: "record-conflict" }
  });
  assert.deepEqual(result.snapshot.records, [
    { checkId: "custom", id: "retained", data: { value: true } }
  ]);
  assert.deepEqual(result.checkMessages, []);
  assert.throws(() => retainedReporter?.report({ id: "late" }, {}), /reporter is closed/);
}

export async function assertCancellationRetainsPriorMessages(): Promise<void> {
  const controller = new AbortController();
  const result = await run(cancellationDefinition(controller), { signal: controller.signal });
  assert.equal(result.kind, "cancelled");
  if (result.kind !== "cancelled" || result.phase !== "execution") return;
  assert.deepEqual(result.checkMessages, [
    { checkId: "accepted", level: "info", code: "settled", message: "Accepted before stop" }
  ]);
}
async function assertRejectedCallback(execution: unknown): Promise<void> {
  const invalidCheck = check();
  Object.defineProperty(invalidCheck, "execution", {
    configurable: true,
    enumerable: true,
    value: execution,
    writable: true
  });
  const result = await run(definition([invalidCheck]));
  assert.equal(result.kind, "completed");
  if (result.kind === "completed") {
    assert.deepEqual(result.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "invalid-execution-result" }
    });
  }
}

function cancellationDefinition(controller: AbortController) {
  return defineConfig({
    checks: [
      {
        checkId: "accepted",
        displayName: "Accepted",
        execution: () => ({
          status: "passed",
          data: {},
          messages: [{ level: "info", code: "settled", message: "Accepted before stop" }]
        })
      },
      {
        checkId: "stop",
        displayName: "Stop",
        dependsOn: ["accepted"],
        execution: () => {
          controller.abort();
          return PASSED;
        }
      },
      { checkId: "waiting", displayName: "Waiting", execution: () => PASSED }
    ],
    outputs: { machinePublication: { enabled: false }, progressRendering: { enabled: false } },
    scheduler: { maxParallel: 1 }
  });
}
