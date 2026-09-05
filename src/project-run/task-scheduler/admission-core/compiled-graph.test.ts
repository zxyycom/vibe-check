import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { compilePreparedAdmissionGraph } from "./compiled-graph.ts";
import { prepareTaskGraph } from "../graph.ts";

describe("prepared admission graph compiler", () => {
  it("compiles static indexes from a prepared graph without rematerializing it", () => {
    const graph = prepareTaskGraph(
      {
        scopes: [
          {
            activationTaskIds: ["a-dependent"],
            id: "later-scope",
            maxParallel: 2,
            terminalTaskId: "terminal-later"
          },
          {
            activationTaskIds: ["m-observer"],
            id: "first-scope",
            maxParallel: 1,
            terminalTaskId: "terminal-first"
          }
        ],
        tasks: [
          { id: "z-source", mutex: ["mutex-two", "mutex-one", "mutex-two"] },
          {
            dependsOn: ["z-source", "z-source"],
            id: "a-dependent",
            mutex: ["mutex-one"],
            scopeId: "later-scope"
          },
          {
            id: "m-observer",
            mutex: ["mutex-three"],
            observes: ["z-source", "z-source"],
            scopeId: "first-scope"
          },
          { dependsOn: ["m-observer"], id: "terminal-first", scopeId: "first-scope" },
          { dependsOn: ["a-dependent"], id: "terminal-later", scopeId: "later-scope" }
        ]
      },
      3
    );

    assert.throws(
      () => compilePreparedAdmissionGraph(graph, 0),
      /task engine maxParallel must be a positive safe integer/
    );

    const compiled = compilePreparedAdmissionGraph(graph, 3);

    assert.equal(compiled.graph, graph);
    assert.equal(compiled.graph.schedulerGraphSnapshot, graph.schedulerGraphSnapshot);
    assert.equal(compiled.taskById.get("a-dependent"), graph.tasks[1]);
    assert.equal(compiled.scopesById.get("first-scope"), graph.scopes[1]);
    assert.deepEqual(
      [...compiled.taskSlotsById],
      [
        ["z-source", 0],
        ["a-dependent", 1],
        ["m-observer", 2],
        ["terminal-first", 3],
        ["terminal-later", 4]
      ]
    );
    assert.deepEqual(
      [...compiled.scopeSlotById],
      [
        ["later-scope", 0],
        ["first-scope", 1]
      ]
    );
    assert.deepEqual(
      [...compiled.mutexSlotById],
      [
        ["mutex-two", 0],
        ["mutex-one", 1],
        ["mutex-three", 2]
      ]
    );
    assert.deepEqual(compiled.taskMutexSlots, [[0, 1, 0], [1], [2], [], []]);
    assert.deepEqual(compiled.relationIndexes.reverseMutexOccurrences, [[0, 0], [0, 1], [2]]);
    assert.deepEqual(compiled.relationIndexes.reverseDependencies, [[1, 1], [4], [3], [], []]);
    assert.deepEqual(compiled.relationIndexes.reverseObservations, [[2, 2], [], [], [], []]);
    assert.deepEqual(compiled.scopeSlotsByTerminalTaskSlot, [[], [], [], [1], [0]]);
    assert.deepEqual(compiled.taskScopeSlots, [undefined, 0, 1, 1, 0]);
    assert.deepEqual(compiled.taskActivatesScope, [false, true, true, false, false]);
    assert.deepEqual(compiled.taskIdsInPublicOrder, [
      "a-dependent",
      "m-observer",
      "terminal-first",
      "terminal-later",
      "z-source"
    ]);
    assert.deepEqual(compiled.taskSlotsInPublicOrder, [1, 2, 3, 4, 0]);
    assert.equal(Object.isFrozen(compiled), true);
    assert.equal(Object.isFrozen(compiled.relationIndexes), true);
    assert.equal(Object.isFrozen(compiled.taskMutexSlots), true);
    assert.equal(Object.isFrozen(compiled.taskMutexSlots[0]), true);
  });
});
