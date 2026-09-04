import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CheckDependencies, CheckResult } from "../../check/check.ts";
import { CoreInvariantFailure, createCoreCheckSession } from "../../check-settlement/session.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { executeCheckCallback } from "./callback.ts";
import { executeResolvedChecks } from "./resolved-checks.ts";
import { adversarialCheckValues, type HostileCheckValue } from "./hostile-values.test-support.ts";
import { PROJECT, execute, normalized, recordingLogger } from "./resolved-checks.test-support.ts";

describe("Package Run direct Check execution", () => {
  it("contains invalid or duplicate Record writes without revising prior Records", async () => {
    await assertDuplicateRecordConflict();
    await assertMalformedMessageAttachments();
    await assertHostileValuesAreContained(adversarialCheckValues());
    await assertTrustedInvariantFaultEscapes();
  });
});

async function assertDuplicateRecordConflict(): Promise<void> {
  const observations: DiagnosticObservation[] = [];
  const result = await execute(
    (context) => {
      context.records.report({ id: "retained" }, { value: true });
      context.records.report({ id: "retained" }, { value: false });
      return { status: "passed", data: {} };
    },
    { diagnosticLogger: recordingLogger(observations) }
  );

  assert.equal(result.kind, "completed");
  assert.deepEqual(result.snapshot.checks[0]?.outcome, {
    status: "unavailable",
    reason: { code: "record-conflict" }
  });
  assert.deepEqual(result.snapshot.records, [
    { checkId: "direct-check", id: "retained", data: { value: true } }
  ]);
  assert.deepEqual(
    observations
      .filter((observation) => observation.event === "record.reported")
      .map((observation) => observation.details),
    [
      { checkId: "direct-check", recordId: "retained", result: "committed" },
      {
        checkId: "direct-check",
        rejectionCategory: "record-invalid-or-conflict",
        result: "rejected"
      }
    ]
  );
  assert.deepEqual(
    observations.find((observation) => observation.event === "check.contained")?.details,
    {
      outcome: { reason: { code: "record-conflict" }, status: "unavailable" },
      raw: { status: "passed", data: {} }
    }
  );
}

async function assertMalformedMessageAttachments(): Promise<void> {
  const invalidMessageItems: readonly unknown[] = [
    { level: "verbose", code: "invalid-level", message: "Invalid level" },
    { level: "info", code: "", message: "Empty code" },
    { level: "info", code: "empty-message", message: "" },
    { level: "info", code: "non-string-message", message: 42 },
    { level: "info", code: "extra-key", message: "Unknown field", extra: true }
  ];
  for (const invalidItem of invalidMessageItems) {
    const malformedObservations: DiagnosticObservation[] = [];
    const invalidMessageResult = await execute(
      () => {
        const terminal: CheckResult = { status: "passed", data: {}, messages: [] };
        Object.defineProperty(terminal, "messages", {
          configurable: true,
          enumerable: true,
          value: [
            { level: "info", code: "valid-prefix", message: "This must not escape" },
            invalidItem
          ],
          writable: true
        });
        return terminal;
      },
      { diagnosticLogger: recordingLogger(malformedObservations) }
    );
    assert.ok(
      ["passed", "unavailable"].includes(
        invalidMessageResult.snapshot.checks[0]?.outcome.status ?? ""
      )
    );
    assert.deepEqual(invalidMessageResult.checkMessages, []);
    assert.equal(
      malformedObservations.some((observation) => observation.event === "callback.malformed"),
      true
    );
  }

  const nonKebabMessageResult = await execute(() => ({
    status: "passed" as const,
    data: {},
    messages: [{ level: "info" as const, code: "Camel_Case.v1", message: "Retained exactly" }]
  }));
  assert.deepEqual(nonKebabMessageResult.checkMessages, [
    { checkId: "direct-check", level: "info", code: "Camel_Case.v1", message: "Retained exactly" }
  ]);
}

const HOSTILE_VALUE_CHANNELS = ["final", "messages", "record"] as const;
type HostileValueChannel = (typeof HOSTILE_VALUE_CHANNELS)[number];
type ClosedReporter = Readonly<{ report(identity: { id: string }, data: object): void }>;

async function assertHostileValuesAreContained(
  adversarialData: ReturnType<typeof adversarialCheckValues>
): Promise<void> {
  for (const channel of HOSTILE_VALUE_CHANNELS) {
    await assertHostileValuesContainedInChannel({ adversarialData, channel });
  }
}

async function assertHostileValuesContainedInChannel(
  input: Readonly<{
    readonly adversarialData: ReturnType<typeof adversarialCheckValues>;
    readonly channel: HostileValueChannel;
  }>
): Promise<void> {
  for (const adversary of input.adversarialData) {
    await assertHostileValueIsContained({ channel: input.channel, hostile: adversary.create() });
  }
}

async function assertHostileValueIsContained(
  input: Readonly<{ readonly channel: HostileValueChannel; readonly hostile: HostileCheckValue }>
): Promise<void> {
  const fixture = hostileValueFixture(input);
  const result = await executeResolvedChecks({
    checks: fixture.checks,
    maxParallel: 2,
    project: PROJECT,
    signal: undefined
  });

  assertHostileValueResultIsContained({ channel: input.channel, result });
  input.hostile.assertNotCalled();
  assertReporterIsClosed(fixture.reporter());
  assert.deepEqual(result.snapshot.records, [
    { checkId: "contained", id: "retained", data: { retained: true } }
  ]);
}

function hostileValueFixture(
  input: Readonly<{ readonly channel: HostileValueChannel; readonly hostile: HostileCheckValue }>
) {
  let reporter: ClosedReporter | undefined;
  const contained = normalized(
    (context) => {
      reporter = context.records;
      context.records.report({ id: "retained" }, { retained: true });
      if (input.channel === "record") {
        context.records.report({ id: "invalid" }, { hostile: input.hostile.value });
      }
      if (input.channel === "final") {
        return { status: "passed", data: { hostile: input.hostile.value } };
      }
      if (input.channel === "messages") {
        return malformedHostileMessageAttachment(input.hostile);
      }
      return { status: "passed", data: { valid: true } };
    },
    { checkId: "contained", maxParallel: 2 }
  );
  const independent = normalized(() => ({ status: "passed", data: { independent: true } }), {
    checkId: "independent",
    maxParallel: 2
  });
  return Object.freeze({ checks: [contained, independent], reporter: () => reporter });
}

function malformedHostileMessageAttachment(hostile: HostileCheckValue): CheckResult {
  const malformedAttachment: CheckResult = {
    status: "passed",
    data: { valid: true },
    messages: []
  };
  Object.defineProperty(malformedAttachment, "messages", {
    configurable: true,
    enumerable: true,
    value: hostile.messageAttachment ? hostile.value : [hostile.value],
    writable: true
  });
  return malformedAttachment;
}

function assertHostileValueResultIsContained(
  input: Readonly<{
    readonly channel: HostileValueChannel;
    readonly result: Awaited<ReturnType<typeof executeResolvedChecks>>;
  }>
): void {
  assert.equal(input.result.kind, "completed");
  assert.deepEqual(input.result.snapshot.checks, [
    {
      checkId: "contained",
      displayName: "contained",
      outcome: {
        status: "unavailable",
        reason: {
          code: input.channel === "record" ? "record-invalid" : "invalid-execution-result"
        }
      }
    },
    {
      checkId: "independent",
      displayName: "independent",
      outcome: { status: "passed", data: { independent: true } }
    }
  ]);
  assert.deepEqual(input.result.snapshot.records, [
    { checkId: "contained", id: "retained", data: { retained: true } }
  ]);
  assert.deepEqual(input.result.checkMessages, []);
}

function assertReporterIsClosed(reporter: ClosedReporter | undefined): void {
  if (reporter === undefined) throw new Error("Contained callback did not expose a reporter");
  assert.throws(() => reporter.report({ id: "late" }, {}), /reporter is closed/);
}

async function assertTrustedInvariantFaultEscapes(): Promise<void> {
  const trustedFailure = new CoreInvariantFailure("Dependency read invariant");
  const throwingDependencies: CheckDependencies = Object.freeze({
    get: () => {
      throw trustedFailure;
    },
    list: () => {
      throw trustedFailure;
    }
  });
  await assert.rejects(
    () =>
      executeCheckCallback({
        artifactDirectory: null,
        check: normalized((context) => {
          context.dependencies.get("source");
          return { status: "passed", data: {} };
        }),
        dependencies: throwingDependencies,
        invocationId: "invocation/v1:direct-check-execution",
        project: PROJECT,
        scope: createCoreCheckSession([
          { definition: { checkId: "direct-check", displayName: "direct-check" } }
        ]).openCheckScope("direct-check"),
        signal: new AbortController().signal
      }),
    (error) => error === trustedFailure
  );
}
