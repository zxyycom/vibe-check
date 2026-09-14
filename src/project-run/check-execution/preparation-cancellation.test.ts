import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { prepareCheck } from "./preparation.ts";
import { executeResolvedChecks } from "./resolved-checks.ts";
import {
  PROJECT,
  deferred,
  diagnosticDetailsRecord,
  hasDiagnosticTags,
  normalized,
  recordingLogger
} from "./resolved-checks.test-support.ts";

describe("Package Run direct Check execution", () => {
  it("passes the invocation signal to admitted preparations and closes cancelled Check Tasks", async () => {
    const observations: DiagnosticObservation[] = [];
    await prepareCheck({
      check: normalized(() => ({ status: "passed", data: {} }), { checkId: "skipped" }),
      diagnosticLogger: recordingLogger(observations),
      project: PROJECT,
      signal: undefined
    });
    const controller = new AbortController();
    controller.abort();
    const resolutions = await Promise.all(
      ["cancelled", "also-cancelled"].map((checkId) =>
        prepareCheck({
          check: normalized(() => ({ status: "passed", data: {} }), { checkId }),
          diagnosticLogger: recordingLogger(observations),
          project: PROJECT,
          signal: controller.signal
        })
      )
    );
    assert.deepEqual(
      resolutions.map((resolution) => resolution.kind),
      ["blocked", "blocked"]
    );
    assert.deepEqual(
      observations.map((observation) => ({
        event: observation.event,
        details: observation.details
      })),
      [
        {
          event: "preparation.resolved",
          details: {
            options: { availability: "available", bytes: 2, keys: 0, shape: "object" },
            source: "authored"
          }
        },
        {
          event: "preparation.resolved",
          details: {
            outcome: { status: "unavailable", reason: { code: "execution-cancelled" } }
          }
        },
        {
          event: "preparation.resolved",
          details: {
            outcome: { status: "unavailable", reason: { code: "execution-cancelled" } }
          }
        }
      ]
    );
    assert.equal(
      observations.some(
        (observation) =>
          observation.event === "preparation.started" ||
          observation.event === "preparation.finished"
      ),
      false
    );
    const afterCallbackController = new AbortController();
    const afterCallbackOutput = { status: "success" as const, preparedOptions: { retained: true } };
    const afterCallbackObservations: DiagnosticObservation[] = [];
    await prepareCheck({
      check: normalized(() => ({ status: "passed", data: {} }), {
        checkId: "cancelled-after-callback",
        prepare: () => {
          afterCallbackController.abort();
          return afterCallbackOutput;
        }
      }),
      diagnosticLogger: recordingLogger(afterCallbackObservations),
      project: PROJECT,
      signal: afterCallbackController.signal
    });
    const afterCallbackDetails = diagnosticDetailsRecord(afterCallbackObservations[0]?.details);
    assert.equal(hasDiagnosticTags(afterCallbackObservations[0], "CANCELLED-AFTER-CALLBACK"), true);
    assert.equal(afterCallbackDetails.raw, afterCallbackOutput);

    const allBlockedController = new AbortController();
    const cooperativePreparationEntered = deferred<void>();
    let observedAllBlockedSignal: AbortSignal | undefined;
    let allBlockedExecutions = 0;
    const allBlocked = executeResolvedChecks({
      checks: [
        normalized(
          () => {
            allBlockedExecutions += 1;
            return { status: "passed", data: {} };
          },
          {
            checkId: "declared-block",
            prepare: () => ({
              status: "failure",
              action: "block",
              reason: { code: "invalid-options" }
            })
          }
        ),
        normalized(
          () => {
            allBlockedExecutions += 1;
            return { status: "passed", data: {} };
          },
          {
            checkId: "cooperative-block",
            prepare: async (_options, signal) => {
              observedAllBlockedSignal = signal;
              cooperativePreparationEntered.resolve();
              await new Promise<void>((resolve) => {
                signal.addEventListener(
                  "abort",
                  () => {
                    resolve();
                  },
                  { once: true }
                );
              });
              return { status: "success", preparedOptions: {} };
            }
          }
        )
      ],
      maxParallel: 2,
      project: PROJECT,
      signal: allBlockedController.signal
    });
    await cooperativePreparationEntered.promise;
    assert.equal(observedAllBlockedSignal, allBlockedController.signal);
    allBlockedController.abort();
    const allBlockedResult = await allBlocked;
    assert.equal(allBlockedResult.kind, "cancelled");
    assert.equal(allBlockedExecutions, 0);
    assert.deepEqual(
      allBlockedResult.snapshot.checks.map((check) => check.outcome),
      [
        { status: "unavailable", reason: { code: "execution-cancelled" } },
        { status: "unavailable", reason: { code: "execution-cancelled" } }
      ]
    );

    const partialReadyController = new AbortController();
    const deferredPreparation = deferred<{
      readonly status: "success";
      readonly preparedOptions: object;
    }>();
    const deferredPreparationEntered = deferred<void>();
    let partialExecutions = 0;
    const partialReady = executeResolvedChecks({
      checks: [
        normalized(
          () => {
            partialExecutions += 1;
            return { status: "passed", data: {} };
          },
          {
            checkId: "ready",
            prepare: () => ({
              status: "success",
              preparedOptions: {},
              messages: [
                { level: "info", code: "prepared", message: "Prepared before cancellation" }
              ]
            })
          }
        ),
        normalized(
          () => {
            partialExecutions += 1;
            return { status: "passed", data: {} };
          },
          {
            checkId: "deferred",
            prepare: (_options, signal) => {
              assert.equal(signal, partialReadyController.signal);
              deferredPreparationEntered.resolve();
              return deferredPreparation.promise;
            }
          }
        )
      ],
      maxParallel: 2,
      project: PROJECT,
      signal: partialReadyController.signal
    });
    await deferredPreparationEntered.promise;
    partialReadyController.abort();
    deferredPreparation.resolve({ status: "success", preparedOptions: {} });
    const partialReadyResult = await partialReady;
    assert.equal(partialReadyResult.kind, "cancelled");
    assert.equal(partialExecutions, 0);
    assert.deepEqual(
      partialReadyResult.snapshot.checks.map((check) => check.outcome.status),
      ["unavailable", "unavailable"]
    );
    assert.deepEqual(partialReadyResult.checkMessages, []);
  });
});
