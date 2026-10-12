// One-process bounded operation counts; not a time benchmark or product test.
// Run from repository root with bun run <absolute path>. Prints JSON; writes nothing.
import assert from "node:assert/strict";
import { parseUniqueIdentifiers } from "../../../../src/project-definition/check-tree/collection-authoring.ts";
import { parseCheckTreeAuthoring } from "../../../../src/project-definition/check-tree/authoring.ts";
import { createCoreCheckSession } from "../../../../src/check-settlement/session.ts";
import { normalizeCheckOutcome } from "../../../../src/check-settlement/outcome-normalization.ts";
import { snapshotExactClosedRecord } from "../../../../src/data-boundary/closed-values.ts";
import { canonicalizeJsonObject } from "../../../../src/data-boundary/canonical-data.ts";
import { createSchedulerCriticalPathSnapshot } from "../../../../src/package-tools/learned-critical-path/critical-path-ranking.ts";
import { resolveCheckTree } from "../../../../src/project-definition/check-tree/resolution.ts";
import { inherit } from "../../../../src/check/inherited-collection.ts";

const observations: Record<string, unknown[]> = {};
function countIncludes(action: () => void): number {
  const original = Array.prototype.includes;
  let examined = 0;
  Array.prototype.includes = function (value: unknown, from = 0): boolean {
    for (let index = Math.max(from, 0); index < this.length; index += 1) {
      examined += 1;
      if (this[index] === value || (Number.isNaN(this[index]) && Number.isNaN(value))) return true;
    }
    return false;
  };
  try { action(); } finally { Array.prototype.includes = original; }
  return examined;
}
for (const size of [8, 16, 32, 64]) {
  const ids = Array.from({ length: size }, (_, index) => `id-${index}`);
  const identifiersExamined = countIncludes(() => {
    const parsed = parseUniqueIdentifiers(ids);
    assert.equal(parsed?.length, size);
  });
  (observations.identifiers ??= []).push({ size, identifiersExamined });
  const reasonIdsExamined = countIncludes(() => {
    assert.notEqual(normalizeCheckOutcome({ knownCheckIds: new Set(ids), productOutcome: true,
      value: { status: "unavailable", reason: { code: "blocked", checkIds: ids } } }), undefined);
  });
  (observations.reasonIds ??= []).push({ size, reasonIdsExamined });
  const dynamicKeysExamined = countIncludes(() => {
    assert.notEqual(snapshotExactClosedRecord(Object.fromEntries(ids.map((id) => [id, 1])), ids), undefined);
  });
  (observations.dynamicKeys ??= []).push({ size, dynamicKeysExamined });

  const session = createCoreCheckSession(ids.map((checkId) => ({ definition: { checkId, displayName: checkId } })));
  const originalFind = Array.prototype.find;
  const OriginalSet = globalThis.Set;
  let findExamined = 0, knownIdSetEntries = 0;
  Array.prototype.find = function (predicate, thisArg) {
    return originalFind.call(this, (value, index, array) => {
      findExamined += 1;
      return predicate.call(thisArg, value, index, array);
    });
  };
  globalThis.Set = class extends OriginalSet {
    constructor(values?: Iterable<unknown> | null) {
      if (Array.isArray(values) && values.every((value) => typeof value === "string")) knownIdSetEntries += values.length;
      super(values);
    }
  } as SetConstructor;
  try {
    for (const id of ids) session.openCheckScope(id).settle({ status: "passed", data: {} });
    assert.equal(session.freeze().checks.length, size);
  } finally { Array.prototype.find = originalFind; globalThis.Set = OriginalSet; }
  (observations.session ??= []).push({ size, findExamined, knownIdSetEntries });

  let predictionFindExamined = 0;
  const graph = { resourceCapacities: [], scopes: [], tasks: ids.map((taskId) => ({ taskId, admissionPriority: 0,
    dependsOn: [], observes: [], mutex: [], resourceClaims: [], scopeId: null })) };
  const prediction = { predictions: ids.map((taskId) => ({ taskId, estimatedDurationMs: 1 })) };
  Array.prototype.find = function (predicate, thisArg) {
    return originalFind.call(this, (value, index, array) => {
      predictionFindExamined += 1;
      return predicate.call(thisArg, value, index, array);
    });
  };
  try { assert.equal(createSchedulerCriticalPathSnapshot(graph, prediction).scores.length, size); }
  finally { Array.prototype.find = originalFind; }
  (observations.criticalPath ??= []).push({ size, edges: 0, predictionFindExamined });

  let chain: object = { checkId: "only-leaf", displayName: "leaf", execute: () => ({ status: "passed", data: {} }) };
  for (let level = 0; level < size; level += 1) chain = { checkId: `container-${level}`, displayName: "container",
    checks: [chain], mutex: inherit({ add: [`mutex-${level}`] }) };
  let inheritedSetEntries = 0;
  globalThis.Set = class extends OriginalSet {
    constructor(values?: Iterable<unknown> | null) {
      if (Array.isArray(values) && values.every((value) => typeof value === "string")) inheritedSetEntries += values.length;
      super(values);
    }
  } as SetConstructor;
  try { assert.equal(resolveCheckTree([chain], 4)?.leaves[0]?.mutex.length, size); }
  finally { globalThis.Set = OriginalSet; }
  (observations.inheritedChain ??= []).push({ containers: size, executableLeaves: 1, finalMutexIds: size, inheritedSetEntries });
}
for (const depth of [4, 6, 8, 10]) {
  let ownKeyCalls = 0;
  let node: object = { checkId: "leaf", displayName: "leaf", execute: () => ({ status: "passed", data: {} }) };
  const wrap = (target: object) => new Proxy(target, { ownKeys(value) { ownKeyCalls += 1; return Reflect.ownKeys(value); } });
  node = wrap(node);
  for (let level = 1; level <= depth; level += 1) node = wrap({ checkId: `level-${level}`, displayName: "container", checks: [node, node] });
  assert.notEqual(parseCheckTreeAuthoring([node]), undefined);
  (observations.sharedCheckDag ??= []).push({ depth, distinctNodes: depth + 1, ownKeyCalls });

  let json: object = { value: 1 };
  for (let level = 0; level < depth; level += 1) json = { left: json, right: json };
  const canonical = canonicalizeJsonObject(json);
  assert.notEqual(canonical, undefined);
  let expandedObjects = 0;
  function visit(value: unknown): void {
    if (typeof value !== "object" || value === null) return;
    expandedObjects += 1;
    for (const child of Object.values(value)) visit(child);
  }
  visit(canonical);
  (observations.canonicalAliasExpansion ??= []).push({ depth, distinctNodes: depth + 1, expandedObjects });
}
console.log(JSON.stringify({ runtime: { bun: Bun.version, nodeCompatibility: process.versions.node },
  method: "bounded operation counts, instrumented includes/find/Set and Proxy ownKeys; no elapsed-time claims", observations }, null, 2));
