import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { compilePreparedAdmissionGraph } from "./compiled-graph.ts";
import { prepareTaskGraph } from "../graph.ts";

describe("prepared admission graph compiler", () => {
  it("compiles static indexes from a prepared graph without rematerializing it", () => {
    const graph = prepareTaskGraph(
      {
        resourceCapacities: { browser: 2, memory: 4 },
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
          {
            id: "z-source",
            mutex: ["mutex-two", "mutex-one", "mutex-two"],
            resourceClaims: { memory: 2, browser: 1 }
          },
          {
            dependsOn: ["z-source", "z-source"],
            id: "a-dependent",
            mutex: ["mutex-one"],
            resourceClaims: { browser: 2 },
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
    assert.deepEqual(
      [...compiled.resourceSlotById],
      [
        ["browser", 0],
        ["memory", 1]
      ]
    );
    assert.deepEqual(compiled.resourceCapacityBySlot, [2, 4]);
    assert.deepEqual(compiled.taskResourceClaims, [
      [
        { resourceSlot: 0, units: 1 },
        { resourceSlot: 1, units: 2 }
      ],
      [{ resourceSlot: 0, units: 2 }],
      [],
      [],
      []
    ]);
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
    assert.deepEqual(compiled.taskPublicRanksBySlot, [4, 0, 1, 2, 3]);
    assert.equal(Object.isFrozen(compiled), true);
    assert.equal(Object.isFrozen(compiled.relationIndexes), true);
    assert.equal(Object.isFrozen(compiled.taskMutexSlots), true);
    assert.equal(Object.isFrozen(compiled.taskMutexSlots[0]), true);
    assert.equal(Object.isFrozen(compiled.taskResourceClaims), true);
    assert.equal(Object.isFrozen(compiled.taskResourceClaims[0]), true);

    const width = 128;
    const wideTasks = Array.from({ length: width }, (_, slot) => ({
      id: `wide-${slot}`,
      scopeId: "wide"
    }));
    const wide = prepareTaskGraph(
      {
        tasks: [
          ...wideTasks,
          { id: "end", scopeId: "wide", observes: wideTasks.map((task) => task.id) }
        ],
        scopes: [
          {
            id: "wide",
            maxParallel: 3,
            activationTaskIds: wideTasks.map((task) => task.id),
            terminalTaskId: "end"
          }
        ]
      },
      3
    );
    const scope = wide.scopes[0];
    if (scope === undefined) assert.fail("wide scope is missing");
    let activationOccurrences = 0;
    const activationTaskIds = new Proxy(scope.activationTaskIds, {
      get(target, key, receiver): unknown {
        if (key === "includes") assert.fail("compiler repeatedly searched activation IDs per Task");
        if (key === Symbol.iterator)
          return () => {
            const iterator = target.values();
            return {
              next() {
                const next = iterator.next();
                if (next.done !== true) activationOccurrences += 1;
                return next;
              }
            };
          };
        return Reflect.get(target, key, receiver);
      }
    });
    const indexed = compilePreparedAdmissionGraph(
      Object.freeze({
        ...wide,
        scopes: Object.freeze([Object.freeze({ ...scope, activationTaskIds })])
      }),
      3
    );
    assert.equal(activationOccurrences, width);
    assert.deepEqual(indexed.taskActivatesScope, [...wideTasks.map(() => true), false]);
  });
});
