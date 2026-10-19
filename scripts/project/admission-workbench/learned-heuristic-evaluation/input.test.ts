import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { loadProtocol, parseEvaluationProtocol } from "./input.ts";

test("learned heuristic protocol validates consumed fields before replay without rewriting frozen bytes", async () => {
  const source = readFileSync(new URL("./protocol.json", import.meta.url), "utf8");
  const loaded = await loadProtocol();
  assert.equal(loaded.sha256, `sha256:${createHash("sha256").update(source).digest("hex")}`);
  assert.equal(loaded.protocol.scenarioInputs.length, 13);

  const valid = {
    schemaVersion: 2,
    protocolId: "test-protocol",
    scenarioInputs: [{ fixtureId: "single" }, { path: "scenario.json" }],
    hostCost: { corpusIterations: 1, samples: 1, warmups: 0 },
    virtualComparison: {
      replicates: 1,
      seed: 0,
      secondary: { improvementEligibleScenarioIds: ["single"] }
    }
  };
  assert.deepEqual(parseEvaluationProtocol(valid), valid);

  for (const scenarioInputs of [
    [],
    [{}],
    [{ fixtureId: "single", path: "scenario.json" }],
    [{ fixtureId: 123, path: "scenario.json" }],
    [{ fixtureId: "single", path: 123 }],
    [{ fixtureId: "" }],
    [{ path: "" }]
  ]) {
    assert.throws(
      () => parseEvaluationProtocol({ ...valid, scenarioInputs }),
      /protocol\.scenarioInputs/
    );
  }

  for (const field of ["corpusIterations", "samples", "warmups"] as const) {
    const invalidCounts = [
      -1,
      0.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1
    ];
    if (field !== "warmups") invalidCounts.push(0);
    for (const count of invalidCounts) {
      assert.throws(
        () =>
          parseEvaluationProtocol({ ...valid, hostCost: { ...valid.hostCost, [field]: count } }),
        {
          message: `protocol.hostCost.${field} must be a safe integer >= ${field === "warmups" ? 0 : 1}`
        }
      );
    }
  }

  for (const field of ["replicates", "seed"] as const) {
    const invalidCounts = [-1, 0.5, Number.MAX_SAFE_INTEGER + 1];
    if (field === "replicates") invalidCounts.push(0);
    for (const count of invalidCounts) {
      assert.throws(
        () =>
          parseEvaluationProtocol({
            ...valid,
            virtualComparison: { ...valid.virtualComparison, [field]: count }
          }),
        {
          message: `protocol.virtualComparison.${field} must be a safe integer >= ${field === "seed" ? 0 : 1}`
        }
      );
    }
  }

  assert.throws(
    () =>
      parseEvaluationProtocol({
        ...valid,
        virtualComparison: {
          ...valid.virtualComparison,
          secondary: { improvementEligibleScenarioIds: [123] }
        }
      }),
    /protocol\.virtualComparison\.secondary\.improvementEligibleScenarioIds must be a string array/
  );
});
