import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Locate the owning checkout so moving this evidence under formal report resources preserves imports.
let root = import.meta.dir;
while (!existsSync(join(root, 'src/index.ts'))) {
  const parent = dirname(root);
  if (parent === root) throw new Error('could not locate owning Product checkout');
  root = parent;
}
const { canonicalizeJsonValue, canonicalJsonText, createProjectFileRegionIndex } = await import(join(root, 'src/index.ts'));
const { validatePreparedTaskGraph } = await import(join(root, 'src/project-run/task-scheduler/graph-validation.ts'));
const { capacityFor } = await import(join(root, 'src/project-run/task-scheduler/scheduler-decision-inspection.ts'));

const capacityCounts = [8, 16, 32, 64].map((size) => {
  const scopes = Array.from({ length: size }, (_, index) => ({ id: `scope-${index}`, maxParallel: size, activationTaskIds: [], terminalTaskId: `task-${index}` }));
  let arrayIndexReads = 0;
  for (let admitted = 0; admitted < size; admitted += 1) {
    const activeScopeIds = new Proxy(scopes.slice(0, admitted).map((scope) => scope.id), {
      get(target, key, receiver) {
        if (typeof key === 'string' && /^\d+$/u.test(key)) arrayIndexReads += 1;
        return Reflect.get(target, key, receiver);
      }
    });
    capacityFor({ activeScopeIds, maxParallel: size, runningTaskIds: [], pendingTasks: [], settledTasks: [], runningMutexes: [], resources: [], graph: { scopes, tasks: [], resourceCapacities: [] }, isAbortRequested: false, isCancelled: false });
  }
  return { size, arrayIndexReads, expectedReads: (size ** 3 - size) / 3 };
});

const graphCounts = [16, 32, 64, 128].map((size) => {
  const tasks = Array.from({ length: size }, (_, i) => ({
    id: `task-${i}`, admissionPriority: 0,
    dependsOn: i === 0 ? [] : [`task-${i - 1}`], observes: [], mutex: [], resourceClaims: [], scopeId: 'scope'
  }));
  let reads = 0;
  class CountingMap extends Map<string, (typeof tasks)[number]> {
    override get(key: string) { reads += 1; return super.get(key); }
  }
  const taskById = new CountingMap(tasks.map((task) => [task.id, task]));
  const scopes = [{ id: 'scope', maxParallel: 1, activationTaskIds: ['task-0'], terminalTaskId: `task-${size - 1}` }];
  validatePreparedTaskGraph({ tasks, taskById, scopes, scopeById: new Map(scopes.map((scope) => [scope.id, scope])), resourceCapacities: [], rootMaxParallel: 1 });
  return { size, mapGetCount: reads, expectedCount: (size * (size + 1)) / 2 + 1 };
});

const dagCounts = [6, 8, 10, 12].map((depth) => {
  let ownKeyReads = 0;
  const counted = (value: object) => new Proxy(value, { ownKeys(target) { ownKeyReads += 1; return Reflect.ownKeys(target); } });
  let value = counted({ leaf: 0 });
  for (let index = 0; index < depth; index += 1) value = counted({ a: value, b: value });
  const result = canonicalizeJsonValue(value);
  if (result === undefined || typeof result !== 'object' || result === null || Array.isArray(result)) throw new Error('expected object');
  return { depth, uniqueInputObjects: depth + 1, ownKeyReads, expectedReads: 2 ** (depth + 1) - 1, outputRootFrozen: Object.isFrozen(result), outputAliasesRetained: result.a === result.b };
});

let incremental = createProjectFileRegionIndex({ regionSources: [[{ id: 'miss', kind: 'patterns', patterns: ['never/**'] }]] });
const paths = Array.from({ length: 32 }, (_, index) => `src/file-${index}.ts`);
for (const path of paths) incremental = incremental.appendSources({ fileSources: [[path]] });
const batched = createProjectFileRegionIndex({ fileSources: [paths], regionSources: [[{ id: 'miss', kind: 'patterns', patterns: ['never/**'] }]] });
const fileIndex = { count: paths.length, serialFinalMatchesBatch: canonicalJsonText(incremental.filePaths) === canonicalJsonText(batched.filePaths), relationEdges: incremental.filesForRegion('miss')?.length, conceptualSerialMatcherCandidates: (paths.length * (paths.length + 1)) / 2, conceptualBatchMatcherCandidates: paths.length };
console.log(JSON.stringify({ capacityCounts, graphCounts, dagCounts, fileIndex }, null, 2));
