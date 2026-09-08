import assert from "node:assert/strict";
import { access, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { test } from "node:test";

import type { AdmissionPolicy, AdmissionPolicyContext } from "@zxyycom/vibe-check";

import {
  prepareLearnedPolicy,
  preparePolicyDefinition,
  staticIdentity,
  type LearnedPolicyFixture,
  type PolicyIdentity
} from "./policy.ts";
import { FIXTURES } from "./fixture-registry.ts";
import { simulate } from "./simulate.ts";

const emptyHistory = Object.freeze({
  files: Object.freeze({
    "scheduler-history.json":
      '{"envelopeVersion":"scheduler-history-envelope-v1","latestObservationSequence":0,"modelVersion":"scheduler-duration-model-v1","series":[]}\n'
  }),
  snapshotId: "empty-valid-history-v1"
});

function learnedFixture(overrides: Partial<LearnedPolicyFixture> = {}): LearnedPolicyFixture {
  return {
    expectedFallbackType: "cold-start",
    historySnapshot: emptyHistory,
    identityForTask: (task) => ({ taskId: task.taskId }),
    identityProjectionId: "task-id-v1",
    policyId: "learned-fixture",
    ...overrides
  };
}

test("prepared learned policy copies fixed history into isolated absolute state and keeps identity stable", async () => {
  const first = await prepareLearnedPolicy(learnedFixture(), FIXTURES.chain.graph.graph);
  const second = await prepareLearnedPolicy(learnedFixture(), FIXTURES.chain.graph.graph);
  try {
    assert.ok(first.stateDirectory);
    assert.ok(second.stateDirectory);
    assert.equal(isAbsolute(first.stateDirectory), true);
    assert.equal(isAbsolute(second.stateDirectory), true);
    assert.notEqual(first.stateDirectory, second.stateDirectory);
    assert.deepEqual(first.identity, second.identity);
    assert.notEqual(first.identity.historySnapshotSha256, null);
    assert.equal(
      await readFile(join(first.stateDirectory, "scheduler-history.json"), "utf8"),
      emptyHistory.files["scheduler-history.json"]
    );
    await writeFile(join(first.stateDirectory, "replicate-only.txt"), "first");
    await assert.rejects(access(join(second.stateDirectory, "replicate-only.txt")));
  } finally {
    await first.dispose();
    await second.dispose();
  }
});

test("prepared learned policy invalidates identity and setup fallback instead of scoring it", async () => {
  await assert.rejects(
    prepareLearnedPolicy(learnedFixture({ identityForTask: () => 1n }), FIXTURES.chain.graph.graph),
    /fallback invalidates this comparison/
  );
});

test("formal simple and prepared adapters prepare once and never complete virtual observations", async () => {
  let prepareCount = 0;
  let completeCount = 0;
  const policy: AdmissionPolicy = Object.freeze({
    kind: "custom",
    strategy: Object.freeze({
      kind: "prepared",
      prepare: () => {
        prepareCount += 1;
        return Object.freeze({
          complete: () => {
            completeCount += 1;
          },
          decide: (context: AdmissionPolicyContext) => {
            const selected = context.candidates.find(({ canAdmit }) => canAdmit);
            return selected === undefined
              ? Object.freeze({ kind: "wait" as const })
              : Object.freeze({ kind: "select" as const, taskId: selected.taskId });
          }
        });
      }
    })
  });
  const identity: PolicyIdentity = Object.freeze({
    expectedFallbackType: "none",
    historySnapshotSha256: "sha256:fixture",
    identityProjectionId: "fixture-v1",
    kind: "prepared",
    modelOptions: Object.freeze({
      coldStartDurationMs: 1,
      maxHistorySeries: 1,
      sampleWindow: 1
    }),
    policyId: "prepared-fixture",
    policyVersion: 1
  });
  const handle = await preparePolicyDefinition(policy, identity, FIXTURES.chain.graph.graph);
  simulate(FIXTURES.chain, handle.decide, 0, 0, staticIdentity("static"));
  await handle.dispose();
  assert.equal(prepareCount, 1);
  assert.equal(completeCount, 0);
});
