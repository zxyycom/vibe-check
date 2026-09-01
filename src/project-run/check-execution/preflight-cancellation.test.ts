import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { prepareChecks } from "./preparation-barrier.ts";
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
  it("settles already-cancelled preparations without invoking preflight", async () => {
    const observations: DiagnosticObservation[] = [];
    await prepareChecks({
      checks: [normalized(() => ({ status: "passed", data: {} }), { checkId: "skipped" })],
      diagnosticLogger: recordingLogger(observations),
      flags: [],
      signal: undefined
    });
    const controller = new AbortController();
    controller.abort();
    const resolutions = await prepareChecks({
      checks: [
        normalized(() => ({ status: "passed", data: {} }), { checkId: "cancelled" }),
        normalized(() => ({ status: "passed", data: {} }), { checkId: "also-cancelled" })
      ],
      diagnosticLogger: recordingLogger(observations),
      flags: [],
      signal: controller.signal
    });
    assert.deepEqual(
      resolutions.map((resolution) => resolution.kind),
      ["settled", "settled"]
    );
    assert.deepEqual(
      observations.map((observation) => ({
        event: observation.event,
        details: observation.details
      })),
      [
        {
          event: "preflight.resolved",
          details: {
            options: { availability: "available", bytes: 2, keys: 0, shape: "object" },
            source: "authored"
          }
        },
        {
          event: "preflight.resolved",
          details: {
            outcome: { status: "unavailable", reason: { code: "execution-cancelled" } }
          }
        },
        {
          event: "preflight.resolved",
          details: {
            outcome: { status: "unavailable", reason: { code: "execution-cancelled" } }
          }
        }
      ]
    );
    assert.equal(
      observations.some(
        (observation) =>
          observation.event === "preflight.started" || observation.event === "preflight.finished"
      ),
      false
    );
  });

  it("reports cancellation raised by a preflight callback", async () => {
    const afterCallbackController = new AbortController();
    const afterCallbackOutput = { status: "success" as const, preparedOptions: { retained: true } };
    const afterCallbackObservations: DiagnosticObservation[] = [];
    await prepareChecks({
      checks: [
        normalized(() => ({ status: "passed", data: {} }), {
          checkId: "cancelled-after-callback",
          preflight: () => {
            afterCallbackController.abort();
            return afterCallbackOutput;
          }
        })
      ],
      diagnosticLogger: recordingLogger(afterCallbackObservations),
      flags: [],
      signal: afterCallbackController.signal
    });
    const afterCallbackDetails = diagnosticDetailsRecord(afterCallbackObservations[0]?.details);
    assert.equal(hasDiagnosticTags(afterCallbackObservations[0], "CANCELLED-AFTER-CALLBACK"), true);
    assert.equal(afterCallbackDetails.raw, afterCallbackOutput);
  });

  it("closes a fully settled preparation barrier as cancelled", async () => {
    const allBlockedController = new AbortController();
    const cooperativePreflightEntered = deferred<void>();
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
            preflight: () => ({
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
            preflight: async (_options, signal) => {
              observedAllBlockedSignal = signal;
              cooperativePreflightEntered.resolve();
              await new Promise<void>((resolve) =>
                signal.addEventListener("abort", () => resolve(), { once: true })
              );
              return { status: "success", preparedOptions: {} };
            }
          }
        )
      ],
      maxParallel: 2,
      project: PROJECT,
      signal: allBlockedController.signal
    });
    await cooperativePreflightEntered.promise;
    assert.equal(observedAllBlockedSignal, allBlockedController.signal);
    allBlockedController.abort();
    const allBlockedResult = await allBlocked;
    assert.equal(allBlockedResult.kind, "cancelled");
    assert.equal(allBlockedExecutions, 0);
    assert.deepEqual(
      allBlockedResult.snapshot.checks.map((check) => check.outcome),
      [
        { status: "unavailable", reason: { code: "execution-cancelled" } },
        { status: "unavailable", reason: { code: "invalid-options" } }
      ]
    );
  });

  it("retains completed preflight messages when a later preflight cancels", async () => {
    const partialReadyController = new AbortController();
    const deferredPreflight = deferred<{
      readonly status: "success";
      readonly preparedOptions: object;
    }>();
    const deferredPreflightEntered = deferred<void>();
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
            preflight: () => ({
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
            preflight: (_options, signal) => {
              assert.equal(signal, partialReadyController.signal);
              deferredPreflightEntered.resolve();
              return deferredPreflight.promise;
            }
          }
        )
      ],
      maxParallel: 2,
      project: PROJECT,
      signal: partialReadyController.signal
    });
    await deferredPreflightEntered.promise;
    partialReadyController.abort();
    deferredPreflight.resolve({ status: "success", preparedOptions: {} });
    const partialReadyResult = await partialReady;
    assert.equal(partialReadyResult.kind, "cancelled");
    assert.equal(partialExecutions, 0);
    assert.deepEqual(
      partialReadyResult.snapshot.checks.map((check) => check.outcome.status),
      ["unavailable", "unavailable"]
    );
    assert.deepEqual(partialReadyResult.checkMessages, [
      {
        checkId: "ready",
        level: "info",
        code: "prepared",
        message: "Prepared before cancellation"
      }
    ]);
  });
});
