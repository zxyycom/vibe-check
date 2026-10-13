import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defineConfig,
  normalizeProjectDefinition,
  createDeclarativeFingerprint
} from "./project-definition.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";
import {
  snapshotSchedulerContextCallback,
  normalizeSchedulerContextCallback
} from "./scheduler-context-validation.ts";

describe("Scheduler context declaration validation", () => {
  it("snapshots closed phase needs without invoking accessors and rejects malformed grammar", () => {
    const callback = () => undefined;
    const needs = ["graph", "graph"];
    const snapshot = snapshotSchedulerContextCallback("terminal", {
      callback,
      contextNeeds: needs
    });
    assert.notEqual(snapshot, undefined);
    assert.equal(typeof snapshot, "object");
    if (snapshot === undefined || typeof snapshot === "function")
      assert.fail("expected descriptor");
    assert.equal(snapshot.callback, callback);
    assert.deepEqual(snapshot.contextNeeds, ["graph"]);
    needs.push("rawMeasurement");
    assert.deepEqual(snapshot.contextNeeds, ["graph"]);
    assert.equal(Object.isFrozen(snapshot), true);
    assert.equal(Object.isFrozen(snapshot.contextNeeds), true);
    let getterCalls = 0;
    const accessor = {
      callback,
      get contextNeeds() {
        getterCalls++;
        return [];
      }
    };
    const hole = new Array(1);
    const arrayAccessor: unknown[] = [];
    Object.defineProperty(arrayAccessor, "0", {
      get() {
        getterCalls++;
        return "graph";
      },
      enumerable: true
    });
    const malformed: readonly unknown[] = [
      { callback, unsupported: true },
      { callback: 1 },
      { contextNeeds: [] },
      { callback, contextNeeds: ["runtime"] },
      { callback, contextNeeds: [1] },
      { callback, contextNeeds: "graph" },
      { callback, contextNeeds: hole },
      { callback, contextNeeds: arrayAccessor },
      accessor,
      { callback, contextNeeds: [], [Symbol("unknown")]: true }
    ];
    for (const value of malformed)
      assert.equal(snapshotSchedulerContextCallback("terminal", value), undefined);
    assert.equal(getterCalls, 0);
    assert.deepEqual(normalizeSchedulerContextCallback("terminal", callback)?.contextNeeds, [
      "execution",
      "graph",
      "rawMeasurement"
    ]);
    assert.deepEqual(
      normalizeSchedulerContextCallback("terminal", { callback, contextNeeds: undefined })
        ?.contextNeeds,
      ["execution", "graph", "rawMeasurement"]
    );
    assert.deepEqual(
      normalizeSchedulerContextCallback("terminal", { callback, contextNeeds: [] })?.contextNeeds,
      []
    );
  });

  it("validates Definition descriptors before callbacks and excludes needs from the declarative fingerprint", () => {
    let calls = 0;
    const callback = () => {
      calls++;
    };
    const valid = defineConfig({
      scheduler: { terminalEffects: [{ contextNeeds: [], callback }] }
    });
    assert.equal(validateProjectDefinition(valid).ok, true);
    const invalid = {
      ...valid,
      scheduler: { ...valid.scheduler, terminalEffects: [{ contextNeeds: ["runtime"], callback }] }
    };
    assert.equal(validateProjectDefinition(invalid).ok, false);
    const full = defineConfig({ scheduler: { terminalEffects: [callback] } });
    assert.equal(
      createDeclarativeFingerprint(normalizeProjectDefinition(valid).declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(full).declarative)
    );
    assert.equal(calls, 0);
  });
});
