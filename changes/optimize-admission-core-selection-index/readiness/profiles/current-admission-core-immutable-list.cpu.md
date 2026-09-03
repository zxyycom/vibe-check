# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 419.6ms | 301 | 1.0ms | 244 |

**Top 10:** `(anonymous)` 32.7%, `freeze` 18.6%, `anonymous` 12.5%, `gc` 7.7%, `WritableState` 2.2%, `arrayIteratorNextHelper` 1.7%, `admissionCandidatesForCore` 1.3%, `(anonymous)` 1.2%, `spawnSync` 1.2%, `scopeCapacityBlockerFor` 1.2%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 32.7% | 137.5ms | 85.5% | 359.1ms | `(anonymous)` | `[native code]` |
| 18.6% | 78.1ms | 18.6% | 78.1ms | `freeze` | `[native code]` |
| 12.5% | 52.4ms | 39.8% | 167.1ms | `anonymous` | `[native code]` |
| 7.7% | 32.5ms | 7.7% | 32.5ms | `gc` | `[native code]` |
| 2.2% | 9.4ms | 2.2% | 9.4ms | `WritableState` | `internal:streams/writable` |
| 1.7% | 7.4ms | 1.7% | 7.4ms | `arrayIteratorNextHelper` | `[native code]` |
| 1.3% | 5.7ms | 2.0% | 8.4ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:280` |
| 1.2% | 5.4ms | 1.2% | 5.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js` |
| 1.2% | 5.1ms | 1.2% | 5.1ms | `spawnSync` | `[native code]` |
| 1.2% | 5.1ms | 1.2% | 5.1ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:668` |
| 1.0% | 4.4ms | 5.9% | 24.8ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:283` |
| 0.8% | 3.5ms | 0.8% | 3.5ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:661` |
| 0.6% | 2.5ms | 0.6% | 2.5ms | `createWarning` | `node:async_hooks` |
| 0.6% | 2.5ms | 0.6% | 2.5ms | `sort` | `[native code]` |
| 0.5% | 2.4ms | 0.5% | 2.4ms | `readFile` | `[native code]` |
| 0.5% | 2.3ms | 0.8% | 3.7ms | `blockerStageFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:581` |
| 0.5% | 2.3ms | 0.5% | 2.3ms | `push` | `[native code]` |
| 0.5% | 2.2ms | 0.5% | 2.2ms | `graphFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:125` |
| 0.4% | 2.0ms | 0.4% | 2.0ms | `preparedFixture` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `normalizeTasks` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:130` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `listNodeFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js` |
| 0.3% | 1.3ms | 0.5% | 2.5ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:105` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `validateTaskRelationCycles` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:86` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `normalizeTasks` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:137` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `anyFactory` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/unist-util-is@6.0.1/node_modules/unist-util-is/lib/index.js` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/util.js` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `record` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `measuredSync` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `getTailOffset` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `updateVNode` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3984` |
| 0.3% | 1.3ms | 0.9% | 4.0ms | `get` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3510` |
| 0.3% | 1.3ms | 0.8% | 3.5ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:391` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts` |
| 0.3% | 1.2ms | 0.3% | 1.2ms | `Record` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/type/types/record.mjs` |
| 0.3% | 1.2ms | 0.3% | 1.2ms | `assign` | `[native code]` |
| 0.3% | 1.2ms | 0.3% | 1.2ms | `memoryUsage` | `[native code]` |
| 0.3% | 1.2ms | 0.3% | 1.2ms | `internal:util/inspect` | `internal:util/inspect:194` |
| 0.3% | 1.2ms | 0.3% | 1.2ms | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/machine-output/v4/schema.ts:44` |
| 0.3% | 1.2ms | 0.3% | 1.2ms | `requiredTaskForCompiled` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1230` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `isRecord` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:88` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `writeFile` | `[native code]` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `create` | `[native code]` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `forEach` | `[native code]` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts:82` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `stringArray` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:486` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `normalizeSignal` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/signals.js:33` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `quantiles` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `exactRecord` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:447` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `buildSemanticSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:980` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `validatePath` | `node:child_process` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:73` |
| 0.2% | 1.1ms | 0.9% | 3.8ms | `numberFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1142` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `retainedBranchObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `visit` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:75` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `updateList` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3898` |
| 0.2% | 1.0ms | 1.1% | 4.8ms | `hasCapacityForPendingTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:621` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:42` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `ownKeys` | `[native code]` |
| 0.2% | 1.0ms | 1.1% | 4.6ms | `set` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3519` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `stream` | `[native code]` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `record` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:188` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `transitionIndexedSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.2% | 985us | 0.2% | 985us | `get` | `[native code]` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 85.5% | 359.1ms | 32.7% | 137.5ms | `(anonymous)` | `[native code]` |
| 83.0% | 348.6ms | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 39.8% | 167.1ms | 12.5% | 52.4ms | `anonymous` | `[native code]` |
| 31.4% | 131.8ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:707` |
| 18.6% | 78.1ms | 18.6% | 78.1ms | `freeze` | `[native code]` |
| 18.5% | 77.9ms | 0.0% | 0us | `bound require` | `[native code]` |
| 18.5% | 77.9ms | 0.0% | 0us | `require` | `[native code]` |
| 12.2% | 51.3ms | 0.0% | 0us | `from` | `[native code]` |
| 12.2% | 51.3ms | 0.0% | 0us | `measuredSync` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:317` |
| 11.9% | 50.2ms | 0.0% | 0us | `sampleSync` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:278` |
| 10.8% | 45.6ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:630` |
| 10.8% | 45.6ms | 0.0% | 0us | `profiledRows` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:621` |
| 8.0% | 33.8ms | 0.0% | 0us | `profiledRows` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:609` |
| 7.7% | 32.6ms | 0.0% | 0us | `profiledRows` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:604` |
| 7.7% | 32.5ms | 7.7% | 32.5ms | `gc` | `[native code]` |
| 7.2% | 30.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:618` |
| 6.7% | 28.4ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:833` |
| 6.1% | 25.6ms | 0.0% | 0us | `measuredSync` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:316` |
| 6.0% | 25.4ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:830` |
| 5.9% | 24.8ms | 1.0% | 4.4ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:283` |
| 4.8% | 20.4ms | 0.0% | 0us | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:507` |
| 4.3% | 18.4ms | 0.0% | 0us | `createAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:103` |
| 4.3% | 18.4ms | 0.0% | 0us | `preparedFixture` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:214` |
| 4.3% | 18.4ms | 0.0% | 0us | `retainedBranchObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:735` |
| 3.9% | 16.6ms | 0.0% | 0us | `map` | `[native code]` |
| 3.8% | 16.0ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js:4` |
| 3.3% | 14.1ms | 0.0% | 0us | `retainedBranchObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:759` |
| 2.9% | 12.4ms | 0.0% | 0us | `node:crypto` | `node:crypto:2` |
| 2.8% | 11.7ms | 0.0% | 0us | `node:util` | `node:util:2` |
| 2.7% | 11.7ms | 0.0% | 0us | `retainedBranchObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:758` |
| 2.7% | 11.4ms | 0.0% | 0us | `internal:streams/lazy_transform` | `internal:streams/lazy_transform:2` |
| 2.7% | 11.4ms | 0.0% | 0us | `internal:streams/transform` | `internal:streams/transform:2` |
| 2.7% | 11.4ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 2.5% | 10.8ms | 0.0% | 0us | `profiledRows` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:605` |
| 2.4% | 10.1ms | 0.0% | 0us | `preparedFixture` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:211` |
| 2.3% | 9.8ms | 0.0% | 0us | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:500` |
| 2.2% | 9.4ms | 0.0% | 0us | `preparedFixture` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:213` |
| 2.2% | 9.4ms | 2.2% | 9.4ms | `WritableState` | `internal:streams/writable` |
| 2.2% | 9.4ms | 0.0% | 0us | `WriteStream` | `internal:fs/streams:245` |
| 2.2% | 9.4ms | 0.0% | 0us | `Writable` | `internal:streams/writable:181` |
| 2.1% | 8.8ms | 0.0% | 0us | `profiledRows` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:606` |
| 2.0% | 8.5ms | 0.0% | 0us | `createInitialAdmissionCoreState` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:114` |
| 2.0% | 8.4ms | 1.3% | 5.7ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:280` |
| 1.9% | 8.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js:4` |
| 1.7% | 7.4ms | 1.7% | 7.4ms | `arrayIteratorNextHelper` | `[native code]` |
| 1.7% | 7.4ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js:5` |
| 1.6% | 6.9ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3488` |
| 1.5% | 6.6ms | 0.0% | 0us | `coreAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:248` |
| 1.5% | 6.3ms | 0.0% | 0us | `gitCommit` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:701` |
| 1.5% | 6.3ms | 0.0% | 0us | `execFileSync` | `node:child_process:264` |
| 1.4% | 6.0ms | 0.0% | 0us | `compileAdmissionGraphInput` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:382` |
| 1.4% | 5.8ms | 0.0% | 0us | `retainedBranchObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:737` |
| 1.3% | 5.8ms | 0.0% | 0us | `prepareTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:79` |
| 1.3% | 5.6ms | 0.0% | 0us | `compileAdmissionGraphInput` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:383` |
| 1.2% | 5.4ms | 1.2% | 5.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js` |
| 1.2% | 5.4ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:28` |
| 1.2% | 5.4ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:26` |
| 1.2% | 5.1ms | 0.0% | 0us | `spawnSync` | `node:child_process:226` |
| 1.2% | 5.1ms | 1.2% | 5.1ms | `spawnSync` | `[native code]` |
| 1.2% | 5.1ms | 1.2% | 5.1ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:668` |
| 1.1% | 4.9ms | 0.0% | 0us | `stateAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:233` |
| 1.1% | 4.9ms | 0.0% | 0us | `initialState` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:106` |
| 1.1% | 4.9ms | 0.0% | 0us | `capacityRejectionFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:632` |
| 1.1% | 4.9ms | 0.0% | 0us | `prepareTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:71` |
| 1.1% | 4.8ms | 0.0% | 0us | `selectionRejectionForPendingTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:564` |
| 1.1% | 4.8ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/boolSchema.js:4` |
| 1.1% | 4.8ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:4` |
| 1.1% | 4.8ms | 0.2% | 1.0ms | `hasCapacityForPendingTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:621` |
| 1.1% | 4.8ms | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:96` |
| 1.1% | 4.7ms | 0.0% | 0us | `node:stream` | `node:stream:2` |
| 1.1% | 4.7ms | 0.0% | 0us | `get ReadStream` | `node:fs:578` |
| 1.1% | 4.7ms | 0.0% | 0us | `internal:stream` | `internal:stream:2` |
| 1.1% | 4.7ms | 0.0% | 0us | `internal:fs/streams` | `internal:fs/streams:2` |
| 1.1% | 4.7ms | 0.0% | 0us | `taskGraphFromSchedulerSnapshot` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:390` |
| 1.1% | 4.6ms | 0.2% | 1.0ms | `set` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3519` |
| 0.9% | 4.0ms | 0.3% | 1.3ms | `get` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3510` |
| 0.9% | 4.0ms | 0.0% | 0us | `next` | `[native code]` |
| 0.9% | 3.8ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:864` |
| 0.9% | 3.8ms | 0.0% | 0us | `schedulerGraphSnapshot` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:101` |
| 0.9% | 3.8ms | 0.2% | 1.1ms | `numberFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1142` |
| 0.9% | 3.7ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:831` |
| 0.9% | 3.7ms | 0.0% | 0us | `persistentVectorObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:775` |
| 0.8% | 3.7ms | 0.5% | 2.3ms | `blockerStageFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:581` |
| 0.8% | 3.6ms | 0.0% | 0us | `stateAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:235` |
| 0.8% | 3.5ms | 0.8% | 3.5ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:661` |
| 0.8% | 3.5ms | 0.3% | 1.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:391` |
| 0.8% | 3.4ms | 0.0% | 0us | `List` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3486` |
| 0.8% | 3.4ms | 0.0% | 0us | `withMutations` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:2417` |
| 0.8% | 3.4ms | 0.0% | 0us | `forEach` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:5401` |
| 0.8% | 3.4ms | 0.0% | 0us | `__iterate` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:568` |
| 0.6% | 2.5ms | 0.6% | 2.5ms | `createWarning` | `node:async_hooks` |
| 0.6% | 2.5ms | 0.0% | 0us | `node:async_hooks` | `node:async_hooks:179` |
| 0.6% | 2.5ms | 0.6% | 2.5ms | `sort` | `[native code]` |
| 0.6% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js:22` |
| 0.6% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/uri.js:3` |
| 0.6% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/index.js:4` |
| 0.5% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:5` |
| 0.5% | 2.5ms | 0.3% | 1.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:105` |
| 0.5% | 2.4ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:70` |
| 0.5% | 2.4ms | 0.5% | 2.4ms | `readFile` | `[native code]` |
| 0.5% | 2.4ms | 0.0% | 0us | `bound readFile` | `[native code]` |
| 0.5% | 2.4ms | 0.0% | 0us | `async readFile` | `node:fs/promises:108` |
| 0.5% | 2.4ms | 0.0% | 0us | `async selectedImplementationFingerprint` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:819` |
| 0.5% | 2.4ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:879` |
| 0.5% | 2.4ms | 0.0% | 0us | `summaryMarkdown` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:680` |
| 0.5% | 2.4ms | 0.0% | 0us | `validatePreparedTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:28` |
| 0.5% | 2.4ms | 0.0% | 0us | `prepareTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:76` |
| 0.5% | 2.4ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/errors.js:4` |
| 0.5% | 2.4ms | 0.0% | 0us | `persistentNumbersFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1122` |
| 0.5% | 2.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:4` |
| 0.5% | 2.3ms | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:88` |
| 0.5% | 2.3ms | 0.0% | 0us | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:502` |
| 0.5% | 2.3ms | 0.5% | 2.3ms | `push` | `[native code]` |
| 0.5% | 2.2ms | 0.0% | 0us | `preparedFixture` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:210` |
| 0.5% | 2.2ms | 0.5% | 2.2ms | `graphFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:125` |
| 0.5% | 2.2ms | 0.0% | 0us | `selectionForSeed` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:826` |
| 0.5% | 2.2ms | 0.0% | 0us | `persistentStatuses` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1118` |
| 0.5% | 2.2ms | 0.0% | 0us | `internal:validators` | `internal:validators:2` |
| 0.5% | 2.2ms | 0.0% | 0us | `internal:streams/legacy` | `internal:streams/legacy:2` |
| 0.5% | 2.2ms | 0.0% | 0us | `node:events` | `node:events:9` |
| 0.5% | 2.2ms | 0.0% | 0us | `stateAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:239` |
| 0.5% | 2.2ms | 0.0% | 0us | `select` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:343` |
| 0.5% | 2.2ms | 0.0% | 0us | `selectAdmissionCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:158` |
| 0.5% | 2.2ms | 0.0% | 0us | `withSelectedTaskStatus` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:802` |
| 0.5% | 2.2ms | 0.0% | 0us | `coreAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:246` |
| 0.4% | 2.0ms | 0.4% | 2.0ms | `preparedFixture` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` |
| 0.4% | 2.0ms | 0.0% | 0us | `schedulerGraphSnapshot` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:100` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `normalizeTasks` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:130` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `listNodeFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js` |
| 0.3% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js:13` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `validateTaskRelationCycles` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:86` |
| 0.3% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:7` |
| 0.3% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/next.js:3` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `normalizeTasks` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:137` |
| 0.3% | 1.3ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/mdast-util-phrasing@4.1.0/node_modules/mdast-util-phrasing/lib/index.js:22` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `anyFactory` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/unist-util-is@6.0.1/node_modules/unist-util-is/lib/index.js` |
| 0.3% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/not.js:3` |
| 0.3% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/index.js:13` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/util.js` |
| 0.3% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/errors.js:5` |
| 0.3% | 1.3ms | 0.0% | 0us | `prepareTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:70` |
| 0.3% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/util.js:152` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `record` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `measuredSync` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` |
| 0.3% | 1.3ms | 0.0% | 0us | `statusForStore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1130` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `getTailOffset` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js` |
| 0.3% | 1.3ms | 0.0% | 0us | `buildSemanticSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:961` |
| 0.3% | 1.3ms | 0.0% | 0us | `listNodeFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:4005` |
| 0.3% | 1.3ms | 0.0% | 0us | `updateList` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3921` |
| 0.3% | 1.3ms | 0.0% | 0us | `retainedBranchObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:738` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `updateVNode` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3984` |
| 0.3% | 1.3ms | 0.0% | 0us | `buildSemanticSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:991` |
| 0.3% | 1.3ms | 0.0% | 0us | `buildSemanticSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1034` |
| 0.3% | 1.3ms | 0.0% | 0us | `updateVNode` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3956` |
| 0.3% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/fast-uri@3.1.3/node_modules/fast-uri/index.js:4` |
| 0.3% | 1.3ms | 0.0% | 0us | `blockerStageFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:582` |
| 0.3% | 1.3ms | 0.0% | 0us | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:282` |
| 0.3% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:106` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts` |
| 0.3% | 1.3ms | 0.0% | 0us | `(anonymous)` | `node:tty:74` |
| 0.3% | 1.3ms | 0.0% | 0us | `(anonymous)` | `node:tty:66` |
| 0.3% | 1.3ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/yoctocolors@2.1.2/node_modules/yoctocolors/base.js:6` |
| 0.3% | 1.2ms | 0.3% | 1.2ms | `Record` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/type/types/record.mjs` |
| 0.3% | 1.2ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/machine-output/v4/schema.ts:13` |
| 0.3% | 1.2ms | 0.3% | 1.2ms | `assign` | `[native code]` |
| 0.3% | 1.2ms | 0.0% | 0us | `taskGraphFromSchedulerSnapshot` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:439` |
| 0.3% | 1.2ms | 0.3% | 1.2ms | `memoryUsage` | `[native code]` |
| 0.3% | 1.2ms | 0.0% | 0us | `retainedBranchObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:760` |
| 0.3% | 1.2ms | 0.3% | 1.2ms | `internal:util/inspect` | `internal:util/inspect:194` |
| 0.3% | 1.2ms | 0.3% | 1.2ms | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/machine-output/v4/schema.ts:44` |
| 0.3% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/lib/parse.js:6` |
| 0.3% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/lib/util/readShebang.js:4` |
| 0.3% | 1.2ms | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:98` |
| 0.3% | 1.2ms | 0.0% | 0us | `internal:streams/readable` | `internal:streams/readable:2` |
| 0.3% | 1.2ms | 0.0% | 0us | `requiredTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1226` |
| 0.3% | 1.2ms | 0.3% | 1.2ms | `requiredTaskForCompiled` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1230` |
| 0.3% | 1.2ms | 0.0% | 0us | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:501` |
| 0.2% | 1.2ms | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:113` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/index.js:5` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/lib/parse.js:4` |
| 0.2% | 1.2ms | 0.0% | 0us | `IndexedSeq` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:492` |
| 0.2% | 1.2ms | 0.0% | 0us | `IndexedCollection` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:132` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `isRecord` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js` |
| 0.2% | 1.2ms | 0.0% | 0us | `List` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3474` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:88` |
| 0.2% | 1.2ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:878` |
| 0.2% | 1.2ms | 0.0% | 0us | `async writeFile` | `node:fs/promises:113` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `writeFile` | `[native code]` |
| 0.2% | 1.2ms | 0.0% | 0us | `bound writeFile` | `[native code]` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:8` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `create` | `[native code]` |
| 0.2% | 1.2ms | 0.0% | 0us | `makeList` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3880` |
| 0.2% | 1.2ms | 0.0% | 0us | `withStatusAt` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1138` |
| 0.2% | 1.2ms | 0.0% | 0us | `updateList` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3942` |
| 0.2% | 1.2ms | 0.0% | 0us | `transitionIndexedSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:851` |
| 0.2% | 1.2ms | 0.0% | 0us | `bound call` | `[native code]` |
| 0.2% | 1.2ms | 0.0% | 0us | `internal:shared` | `internal:shared:2` |
| 0.2% | 1.2ms | 0.0% | 0us | `makeSafe` | `internal:primordials:30` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `forEach` | `[native code]` |
| 0.2% | 1.2ms | 0.0% | 0us | `internal:primordials` | `internal:primordials:78` |
| 0.2% | 1.2ms | 0.0% | 0us | `caseInsensitiveExtensionPattern` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts:81` |
| 0.2% | 1.2ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts:66` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts:67` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts:82` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:409` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `stringArray` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:486` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/index.js:3` |
| 0.2% | 1.1ms | 0.0% | 0us | `getSignalsByNumber` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:29` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `normalizeSignal` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/signals.js:33` |
| 0.2% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/uniqueItems.js:6` |
| 0.2% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/index.js:10` |
| 0.2% | 1.1ms | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:53` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `quantiles` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` |
| 0.2% | 1.1ms | 0.0% | 0us | `measuredSync` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:328` |
| 0.2% | 1.1ms | 0.0% | 0us | `normalizeTasks` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:122` |
| 0.2% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/index.js:7` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `exactRecord` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:447` |
| 0.2% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:10` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `buildSemanticSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:980` |
| 0.2% | 1.1ms | 0.0% | 0us | `getValidatedPath` | `node:child_process:983` |
| 0.2% | 1.1ms | 0.0% | 0us | `normalizeSpawnArguments` | `node:child_process:399` |
| 0.2% | 1.1ms | 0.0% | 0us | `spawnSync` | `node:child_process:203` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `validatePath` | `node:child_process` |
| 0.2% | 1.1ms | 0.0% | 0us | `prepareTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:73` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:73` |
| 0.2% | 1.1ms | 0.0% | 0us | `blockerStageFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:583` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `retainedBranchObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` |
| 0.2% | 1.0ms | 0.0% | 0us | `validateTaskRelationCycles` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:87` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `visit` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:75` |
| 0.2% | 1.0ms | 0.0% | 0us | `buildSemanticSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1033` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `updateList` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3898` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` |
| 0.2% | 1.0ms | 0.0% | 0us | `internal:promisify` | `internal:promisify:53` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:42` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `ownKeys` | `[native code]` |
| 0.2% | 1.0ms | 0.0% | 0us | `exactRecord` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:456` |
| 0.2% | 1.0ms | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:58` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `stream` | `[native code]` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `record` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:188` |
| 0.2% | 1.0ms | 0.0% | 0us | `normalizeTasks` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:123` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `transitionIndexedSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.2% | 985us | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:115` |
| 0.2% | 985us | 0.2% | 985us | `get` | `[native code]` |
| 0.2% | 984us | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:84` |

## Function Details

### `(anonymous)`
`[native code]` | Self: 32.7% (137.5ms) | Total: 85.5% (359.1ms) | Samples: 98

**Called by:**
- `processTicksAndRejections` (270)

**Calls:**
- `(module)` (110)
- `(module)` (22)
- `(module)` (21)
- `(module)` (3)
- `(module)` (3)
- `(module)` (2)
- `(module)` (2)
- `(anonymous)` (2)
- `(module)` (1)
- `(module)` (1)
- `WriteStream` (1)
- `(module)` (1)
- `stream` (1)
- `(module)` (1)
- `async selectedImplementationFingerprint` (1)
- `(module)` (1)
- `(module)` (1)

### `freeze`
`[native code]` | Self: 18.6% (78.1ms) | Total: 18.6% (78.1ms) | Samples: 66

**Called by:**
- `(anonymous)` (17)
- `catalogForCore` (17)
- `admissionCandidatesForCore` (13)
- `retainedBranchObservation` (7)
- `compilePreparedAdmissionGraph` (2)
- `schedulerGraphSnapshot` (2)
- `(anonymous)` (1)
- `taskGraphFromSchedulerSnapshot` (1)
- `map` (1)
- `compilePreparedAdmissionGraph` (1)
- `coreAtDepth` (1)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)
- `(anonymous)` (1)

### `anonymous`
`[native code]` | Self: 12.5% (52.4ms) | Total: 39.8% (167.1ms) | Samples: 27

**Called by:**
- `require` (61)
- `node:crypto` (6)
- `internal:streams/transform` (5)
- `internal:streams/duplex` (5)
- `internal:streams/lazy_transform` (5)
- `node:util` (3)
- `internal:validators` (2)
- `internal:streams/legacy` (2)
- `node:events` (2)
- `node:stream` (1)
- `get ReadStream` (1)
- `(anonymous)` (1)
- `internal:stream` (1)
- `internal:fs/streams` (1)
- `internal:promisify` (1)
- `internal:streams/readable` (1)
- `internal:shared` (1)

**Calls:**
- `(anonymous)` (7)
- `internal:streams/lazy_transform` (5)
- `internal:streams/duplex` (5)
- `internal:streams/transform` (5)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (2)
- `internal:validators` (2)
- `(anonymous)` (2)
- `internal:streams/legacy` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `node:events` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:util/inspect` (1)
- `internal:shared` (1)
- `(anonymous)` (1)
- `internal:fs/streams` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:streams/readable` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:promisify` (1)
- `internal:stream` (1)
- `(anonymous)` (1)
- `internal:primordials` (1)
- `node:stream` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `gc`
`[native code]` | Self: 7.7% (32.5ms) | Total: 7.7% (32.5ms) | Samples: 25

**Called by:**
- `retainedBranchObservation` (13)
- `retainedBranchObservation` (12)

### `WritableState`
`internal:streams/writable` | Self: 2.2% (9.4ms) | Total: 2.2% (9.4ms) | Samples: 1

**Called by:**
- `Writable` (1)

### `arrayIteratorNextHelper`
`[native code]` | Self: 1.7% (7.4ms) | Total: 1.7% (7.4ms) | Samples: 6

**Called by:**
- `next` (3)
- `normalizeTasks` (1)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)

### `admissionCandidatesForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:280` | Self: 1.3% (5.7ms) | Total: 2.0% (8.4ms) | Samples: 5

**Called by:**
- `(anonymous)` (4)
- `coreAtDepth` (2)
- `retainedBranchObservation` (1)

**Calls:**
- `next` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js` | Self: 1.2% (5.4ms) | Total: 1.2% (5.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `spawnSync`
`[native code]` | Self: 1.2% (5.1ms) | Total: 1.2% (5.1ms) | Samples: 4

**Called by:**
- `spawnSync` (4)

### `scopeCapacityBlockerFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:668` | Self: 1.2% (5.1ms) | Total: 1.2% (5.1ms) | Samples: 4

**Called by:**
- `capacityRejectionFor` (3)
- `hasCapacityForPendingTask` (1)

### `admissionCandidatesForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:283` | Self: 1.0% (4.4ms) | Total: 5.9% (24.8ms) | Samples: 4

**Called by:**
- `(anonymous)` (18)
- `coreAtDepth` (2)
- `retainedBranchObservation` (1)

**Calls:**
- `freeze` (13)
- `hasCapacityForPendingTask` (4)

### `scopeCapacityBlockerFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:661` | Self: 0.8% (3.5ms) | Total: 0.8% (3.5ms) | Samples: 3

**Called by:**
- `hasCapacityForPendingTask` (2)
- `capacityRejectionFor` (1)

### `createWarning`
`node:async_hooks` | Self: 0.6% (2.5ms) | Total: 0.6% (2.5ms) | Samples: 1

**Called by:**
- `node:async_hooks` (1)

### `sort`
`[native code]` | Self: 0.6% (2.5ms) | Total: 0.6% (2.5ms) | Samples: 2

**Called by:**
- `compilePreparedAdmissionGraph` (2)

### `readFile`
`[native code]` | Self: 0.5% (2.4ms) | Total: 0.5% (2.4ms) | Samples: 1

**Called by:**
- `bound readFile` (1)

### `blockerStageFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:581` | Self: 0.5% (2.3ms) | Total: 0.8% (3.7ms) | Samples: 2

**Called by:**
- `selectionRejectionForPendingTask` (3)

**Calls:**
- `numberFor` (1)

### `push`
`[native code]` | Self: 0.5% (2.3ms) | Total: 0.5% (2.3ms) | Samples: 2

**Called by:**
- `catalogForCore` (2)

### `graphFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:125` | Self: 0.5% (2.2ms) | Total: 0.5% (2.2ms) | Samples: 2

**Called by:**
- `preparedFixture` (2)

### `preparedFixture`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` | Self: 0.4% (2.0ms) | Total: 0.4% (2.0ms) | Samples: 1

**Called by:**
- `profiledRows` (1)

### `normalizeTasks`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:130` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `prepareTaskGraph` (1)

### `listNodeFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `get` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:105` | Self: 0.3% (1.3ms) | Total: 0.5% (2.5ms) | Samples: 1

**Called by:**
- `map` (2)

**Calls:**
- `freeze` (1)

### `validateTaskRelationCycles`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:86` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `validatePreparedTaskGraph` (1)

### `normalizeTasks`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:137` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `prepareTaskGraph` (1)

### `anyFactory`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/unist-util-is@6.0.1/node_modules/unist-util-is/lib/index.js` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/util.js` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `record`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `prepareTaskGraph` (1)

### `measuredSync`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `profiledRows` (1)

### `getTailOffset`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `listNodeFor` (1)

### `updateVNode`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3984` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `updateVNode` (1)

### `get`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3510` | Self: 0.3% (1.3ms) | Total: 0.9% (4.0ms) | Samples: 1

**Called by:**
- `numberFor` (2)
- `statusForStore` (1)

**Calls:**
- `listNodeFor` (1)
- `listNodeFor` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:391` | Self: 0.3% (1.3ms) | Total: 0.8% (3.5ms) | Samples: 1

**Called by:**
- `map` (3)

**Calls:**
- `exactRecord` (1)
- `exactRecord` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `preparedFixture` (1)

### `Record`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/type/types/record.mjs` | Self: 0.3% (1.2ms) | Total: 0.3% (1.2ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `assign`
`[native code]` | Self: 0.3% (1.2ms) | Total: 0.3% (1.2ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `memoryUsage`
`[native code]` | Self: 0.3% (1.2ms) | Total: 0.3% (1.2ms) | Samples: 1

**Called by:**
- `retainedBranchObservation` (1)

### `internal:util/inspect`
`internal:util/inspect:194` | Self: 0.3% (1.2ms) | Total: 0.3% (1.2ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/machine-output/v4/schema.ts:44` | Self: 0.3% (1.2ms) | Total: 0.3% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `requiredTaskForCompiled`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1230` | Self: 0.3% (1.2ms) | Total: 0.3% (1.2ms) | Samples: 1

**Called by:**
- `requiredTask` (1)

### `isRecord`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js` | Self: 0.2% (1.2ms) | Total: 0.2% (1.2ms) | Samples: 1

**Called by:**
- `IndexedSeq` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:88` | Self: 0.2% (1.2ms) | Total: 0.2% (1.2ms) | Samples: 1

**Called by:**
- `map` (1)

### `writeFile`
`[native code]` | Self: 0.2% (1.2ms) | Total: 0.2% (1.2ms) | Samples: 1

**Called by:**
- `bound writeFile` (1)

### `create`
`[native code]` | Self: 0.2% (1.2ms) | Total: 0.2% (1.2ms) | Samples: 1

**Called by:**
- `makeList` (1)

### `forEach`
`[native code]` | Self: 0.2% (1.2ms) | Total: 0.2% (1.2ms) | Samples: 1

**Called by:**
- `bound call` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts:82` | Self: 0.2% (1.2ms) | Total: 0.2% (1.2ms) | Samples: 1

**Called by:**
- `map` (1)

### `stringArray`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:486` | Self: 0.2% (1.2ms) | Total: 0.2% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `normalizeSignal`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/signals.js:33` | Self: 0.2% (1.1ms) | Total: 0.2% (1.1ms) | Samples: 1

**Called by:**
- `map` (1)

### `quantiles`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` | Self: 0.2% (1.1ms) | Total: 0.2% (1.1ms) | Samples: 1

**Called by:**
- `measuredSync` (1)

### `exactRecord`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:447` | Self: 0.2% (1.1ms) | Total: 0.2% (1.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `buildSemanticSelection`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:980` | Self: 0.2% (1.1ms) | Total: 0.2% (1.1ms) | Samples: 1

**Called by:**
- `createInitialAdmissionCoreState` (1)

### `validatePath`
`node:child_process` | Self: 0.2% (1.1ms) | Total: 0.2% (1.1ms) | Samples: 1

**Called by:**
- `getValidatedPath` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:73` | Self: 0.2% (1.1ms) | Total: 0.2% (1.1ms) | Samples: 1

**Called by:**
- `map` (1)

### `numberFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1142` | Self: 0.2% (1.1ms) | Total: 0.9% (3.8ms) | Samples: 1

**Called by:**
- `blockerStageFor` (1)
- `blockerStageFor` (1)
- `blockerStageFor` (1)

**Calls:**
- `get` (2)

### `retainedBranchObservation`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` | Self: 0.2% (1.0ms) | Total: 0.2% (1.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `visit`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:75` | Self: 0.2% (1.0ms) | Total: 0.2% (1.0ms) | Samples: 1

**Called by:**
- `validateTaskRelationCycles` (1)

### `updateList`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3898` | Self: 0.2% (1.0ms) | Total: 0.2% (1.0ms) | Samples: 1

**Called by:**
- `set` (1)

### `hasCapacityForPendingTask`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:621` | Self: 0.2% (1.0ms) | Total: 1.1% (4.8ms) | Samples: 1

**Called by:**
- `admissionCandidatesForCore` (4)

**Calls:**
- `scopeCapacityBlockerFor` (2)
- `scopeCapacityBlockerFor` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` | Self: 0.2% (1.0ms) | Total: 0.2% (1.0ms) | Samples: 1

**Called by:**
- `from` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:42` | Self: 0.2% (1.0ms) | Total: 0.2% (1.0ms) | Samples: 1

**Called by:**
- `preparedFixture` (1)

### `ownKeys`
`[native code]` | Self: 0.2% (1.0ms) | Total: 0.2% (1.0ms) | Samples: 1

**Called by:**
- `exactRecord` (1)

### `set`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3519` | Self: 0.2% (1.0ms) | Total: 1.1% (4.6ms) | Samples: 1

**Called by:**
- `(anonymous)` (3)
- `withStatusAt` (1)

**Calls:**
- `updateList` (1)
- `updateList` (1)
- `updateList` (1)

### `stream`
`[native code]` | Self: 0.2% (1.0ms) | Total: 0.2% (1.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `record`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:188` | Self: 0.2% (1.0ms) | Total: 0.2% (1.0ms) | Samples: 1

**Called by:**
- `normalizeTasks` (1)

### `transitionIndexedSelection`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` | Self: 0.2% (1.0ms) | Total: 0.2% (1.0ms) | Samples: 1

**Called by:**
- `withSelectedTaskStatus` (1)

### `get`
`[native code]` | Self: 0.2% (985us) | Total: 0.2% (985us) | Samples: 1

**Called by:**
- `map` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:98` | Self: 0.0% (0us) | Total: 0.3% (1.2ms) | Samples: 0

**Called by:**
- `preparedFixture` (1)

**Calls:**
- `freeze` (1)

### `internal:streams/readable`
`internal:streams/readable:2` | Self: 0.0% (0us) | Total: 0.3% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `catalogForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:507` | Self: 0.0% (0us) | Total: 4.8% (20.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (16)
- `stateAtDepth` (1)

**Calls:**
- `freeze` (17)

### `measuredSync`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:317` | Self: 0.0% (0us) | Total: 12.2% (51.3ms) | Samples: 0

**Called by:**
- `profiledRows` (24)
- `profiledRows` (19)

**Calls:**
- `from` (43)

### `statusForStore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1130` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `buildSemanticSelection` (1)

**Calls:**
- `get` (1)

### `retainedBranchObservation`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:738` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `createInitialAdmissionCoreState` (1)

### `require`
`[native code]` | Self: 0.0% (0us) | Total: 18.5% (77.9ms) | Samples: 0

**Called by:**
- `bound require` (61)

**Calls:**
- `anonymous` (61)

### `next`
`[native code]` | Self: 0.0% (0us) | Total: 0.9% (4.0ms) | Samples: 0

**Called by:**
- `admissionCandidatesForCore` (2)
- `buildSemanticSelection` (1)

**Calls:**
- `arrayIteratorNextHelper` (3)

### `caseInsensitiveExtensionPattern`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts:81` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `getSignalsByNumber`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:29` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`node:tty:66` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `anonymous` (1)

### `List`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3486` | Self: 0.0% (0us) | Total: 0.8% (3.4ms) | Samples: 0

**Called by:**
- `persistentNumbersFor` (2)
- `persistentStatuses` (1)

**Calls:**
- `withMutations` (3)

### `retainedBranchObservation`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:758` | Self: 0.0% (0us) | Total: 2.7% (11.7ms) | Samples: 0

**Called by:**
- `(module)` (5)
- `(module)` (5)

**Calls:**
- `freeze` (7)
- `admissionCandidatesForCore` (1)
- `admissionCandidatesForCore` (1)
- `admissionCandidatesForCore` (1)

### `validateTaskRelationCycles`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:87` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `validatePreparedTaskGraph` (1)

**Calls:**
- `visit` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:53` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `createAdmissionGraph` (1)

**Calls:**
- `arrayIteratorNextHelper` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:8` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `node:util`
`node:util:2` | Self: 0.0% (0us) | Total: 2.8% (11.7ms) | Samples: 0

**Calls:**
- `anonymous` (3)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:707` | Self: 0.0% (0us) | Total: 31.4% (131.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (110)

**Calls:**
- `profiledRows` (39)
- `profiledRows` (28)
- `profiledRows` (27)
- `profiledRows` (9)
- `profiledRows` (7)

### `map`
`[native code]` | Self: 0.0% (0us) | Total: 3.9% (16.6ms) | Samples: 0

**Called by:**
- `taskGraphFromSchedulerSnapshot` (4)
- `schedulerGraphSnapshot` (3)
- `compilePreparedAdmissionGraph` (2)
- `(module)` (1)
- `compilePreparedAdmissionGraph` (1)
- `prepareTaskGraph` (1)
- `caseInsensitiveExtensionPattern` (1)
- `getSignalsByNumber` (1)

**Calls:**
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `normalizeSignal` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `freeze` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `get` (1)

### `compileAdmissionGraphInput`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:382` | Self: 0.0% (0us) | Total: 1.4% (6.0ms) | Samples: 0

**Called by:**
- `createAdmissionGraph` (5)

**Calls:**
- `taskGraphFromSchedulerSnapshot` (4)
- `taskGraphFromSchedulerSnapshot` (1)

### `internal:shared`
`internal:shared:2` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `schedulerGraphSnapshot`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:101` | Self: 0.0% (0us) | Total: 0.9% (3.8ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (3)

**Calls:**
- `map` (3)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:409` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `stringArray` (1)

### `makeSafe`
`internal:primordials:30` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `internal:primordials` (1)

**Calls:**
- `bound call` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:831` | Self: 0.0% (0us) | Total: 0.9% (3.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `persistentVectorObservation` (3)

### `WriteStream`
`internal:fs/streams:245` | Self: 0.0% (0us) | Total: 2.2% (9.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `Writable` (1)

### `transitionIndexedSelection`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:851` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `withSelectedTaskStatus` (1)

**Calls:**
- `withStatusAt` (1)

### `catalogForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:500` | Self: 0.0% (0us) | Total: 2.3% (9.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (6)
- `stateAtDepth` (2)

**Calls:**
- `capacityRejectionFor` (4)
- `selectionRejectionForPendingTask` (4)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:58` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `preparedFixture` (1)

**Calls:**
- `arrayIteratorNextHelper` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:4` | Self: 0.0% (0us) | Total: 1.1% (4.8ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:630` | Self: 0.0% (0us) | Total: 10.8% (45.6ms) | Samples: 0

**Called by:**
- `sampleSync` (24)
- `measuredSync` (15)

**Calls:**
- `admissionCandidatesForCore` (18)
- `freeze` (17)
- `admissionCandidatesForCore` (4)

### `compileAdmissionGraphInput`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:383` | Self: 0.0% (0us) | Total: 1.3% (5.6ms) | Samples: 0

**Called by:**
- `createAdmissionGraph` (5)

**Calls:**
- `prepareTaskGraph` (2)
- `prepareTaskGraph` (2)
- `prepareTaskGraph` (1)

### `blockerStageFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:582` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `admissionCandidatesForCore` (1)

**Calls:**
- `numberFor` (1)

### `preparedFixture`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:211` | Self: 0.0% (0us) | Total: 2.4% (10.1ms) | Samples: 0

**Called by:**
- `profiledRows` (6)
- `retainedBranchObservation` (1)
- `persistentVectorObservation` (1)

**Calls:**
- `prepareTaskGraph` (3)
- `prepareTaskGraph` (2)
- `prepareTaskGraph` (1)
- `prepareTaskGraph` (1)
- `prepareTaskGraph` (1)

### `normalizeSpawnArguments`
`node:child_process:399` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `spawnSync` (1)

**Calls:**
- `getValidatedPath` (1)

### `select`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:343` | Self: 0.0% (0us) | Total: 0.5% (2.2ms) | Samples: 0

**Called by:**
- `stateAtDepth` (2)

**Calls:**
- `selectAdmissionCore` (2)

### `withMutations`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:2417` | Self: 0.0% (0us) | Total: 0.8% (3.4ms) | Samples: 0

**Called by:**
- `List` (3)

**Calls:**
- `(anonymous)` (3)

### `node:stream`
`node:stream:2` | Self: 0.0% (0us) | Total: 1.1% (4.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `stateAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:239` | Self: 0.0% (0us) | Total: 0.5% (2.2ms) | Samples: 0

**Called by:**
- `profiledRows` (2)

**Calls:**
- `select` (2)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:84` | Self: 0.0% (0us) | Total: 0.2% (984us) | Samples: 0

**Called by:**
- `preparedFixture` (1)

**Calls:**
- `freeze` (1)

### `profiledRows`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:604` | Self: 0.0% (0us) | Total: 7.7% (32.6ms) | Samples: 0

**Called by:**
- `(module)` (27)

**Calls:**
- `preparedFixture` (11)
- `preparedFixture` (7)
- `preparedFixture` (6)
- `preparedFixture` (2)
- `preparedFixture` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:88` | Self: 0.0% (0us) | Total: 0.5% (2.3ms) | Samples: 0

**Called by:**
- `createAdmissionGraph` (2)

**Calls:**
- `map` (2)

### `retainedBranchObservation`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:759` | Self: 0.0% (0us) | Total: 3.3% (14.1ms) | Samples: 0

**Called by:**
- `(module)` (6)
- `(module)` (6)

**Calls:**
- `gc` (12)

### `profiledRows`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:621` | Self: 0.0% (0us) | Total: 10.8% (45.6ms) | Samples: 0

**Called by:**
- `(module)` (39)

**Calls:**
- `measuredSync` (24)
- `measuredSync` (15)

### `preparedFixture`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:210` | Self: 0.0% (0us) | Total: 0.5% (2.2ms) | Samples: 0

**Called by:**
- `profiledRows` (2)

**Calls:**
- `graphFor` (2)

### `prepareTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:71` | Self: 0.0% (0us) | Total: 1.1% (4.9ms) | Samples: 0

**Called by:**
- `compileAdmissionGraphInput` (2)
- `preparedFixture` (2)

**Calls:**
- `normalizeTasks` (1)
- `normalizeTasks` (1)
- `normalizeTasks` (1)
- `normalizeTasks` (1)

### `createAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:103` | Self: 0.0% (0us) | Total: 4.3% (18.4ms) | Samples: 0

**Called by:**
- `preparedFixture` (16)

**Calls:**
- `compileAdmissionGraphInput` (5)
- `compileAdmissionGraphInput` (5)
- `compilePreparedAdmissionGraph` (2)
- `compilePreparedAdmissionGraph` (2)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)

### `stateAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:233` | Self: 0.0% (0us) | Total: 1.1% (4.9ms) | Samples: 0

**Called by:**
- `profiledRows` (4)

**Calls:**
- `initialState` (4)

### `async writeFile`
`node:fs/promises:113` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `bound writeFile` (1)

### `async selectedImplementationFingerprint`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:819` | Self: 0.0% (0us) | Total: 0.5% (2.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `async readFile` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/uri.js:3` | Self: 0.0% (0us) | Total: 0.6% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `catalogForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:502` | Self: 0.0% (0us) | Total: 0.5% (2.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `push` (2)

### `createInitialAdmissionCoreState`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:114` | Self: 0.0% (0us) | Total: 2.0% (8.5ms) | Samples: 0

**Called by:**
- `initialState` (4)
- `coreAtDepth` (2)
- `retainedBranchObservation` (1)

**Calls:**
- `selectionForSeed` (2)
- `buildSemanticSelection` (1)
- `buildSemanticSelection` (1)
- `buildSemanticSelection` (1)
- `buildSemanticSelection` (1)
- `buildSemanticSelection` (1)

### `initialState`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:106` | Self: 0.0% (0us) | Total: 1.1% (4.9ms) | Samples: 0

**Called by:**
- `stateAtDepth` (4)

**Calls:**
- `createInitialAdmissionCoreState` (4)

### `selectionRejectionForPendingTask`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:564` | Self: 0.0% (0us) | Total: 1.1% (4.8ms) | Samples: 0

**Called by:**
- `catalogForCore` (4)

**Calls:**
- `blockerStageFor` (3)
- `blockerStageFor` (1)

### `Writable`
`internal:streams/writable:181` | Self: 0.0% (0us) | Total: 2.2% (9.4ms) | Samples: 0

**Called by:**
- `WriteStream` (1)

**Calls:**
- `WritableState` (1)

### `prepareTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:70` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `preparedFixture` (1)

**Calls:**
- `record` (1)

### `__iterate`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:568` | Self: 0.0% (0us) | Total: 0.8% (3.4ms) | Samples: 0

**Called by:**
- `forEach` (3)

**Calls:**
- `(anonymous)` (3)

### `bound writeFile`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `async writeFile` (1)

**Calls:**
- `writeFile` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/lib/parse.js:4` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `node:crypto`
`node:crypto:2` | Self: 0.0% (0us) | Total: 2.9% (12.4ms) | Samples: 0

**Calls:**
- `anonymous` (6)

### `gitCommit`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:701` | Self: 0.0% (0us) | Total: 1.5% (6.3ms) | Samples: 0

**Called by:**
- `(module)` (3)
- `summaryMarkdown` (2)

**Calls:**
- `execFileSync` (5)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:106` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `freeze` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:115` | Self: 0.0% (0us) | Total: 0.2% (985us) | Samples: 0

**Called by:**
- `createAdmissionGraph` (1)

**Calls:**
- `map` (1)

### `updateVNode`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3956` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `updateList` (1)

**Calls:**
- `updateVNode` (1)

### `List`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3474` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `persistentStatuses` (1)

**Calls:**
- `IndexedCollection` (1)

### `internal:streams/lazy_transform`
`internal:streams/lazy_transform:2` | Self: 0.0% (0us) | Total: 2.7% (11.4ms) | Samples: 0

**Called by:**
- `anonymous` (5)

**Calls:**
- `anonymous` (5)

### `prepareTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:76` | Self: 0.0% (0us) | Total: 0.5% (2.4ms) | Samples: 0

**Called by:**
- `compileAdmissionGraphInput` (1)
- `preparedFixture` (1)

**Calls:**
- `validatePreparedTaskGraph` (2)

### `admissionCandidatesForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:282` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `retainedBranchObservation` (1)

**Calls:**
- `blockerStageFor` (1)

### `selectAdmissionCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:158` | Self: 0.0% (0us) | Total: 0.5% (2.2ms) | Samples: 0

**Called by:**
- `select` (2)

**Calls:**
- `withSelectedTaskStatus` (2)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:879` | Self: 0.0% (0us) | Total: 0.5% (2.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `summaryMarkdown` (2)

### `IndexedCollection`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:132` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `List` (1)

**Calls:**
- `IndexedSeq` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js:5` | Self: 0.0% (0us) | Total: 1.7% (7.4ms) | Samples: 0

**Calls:**
- `bound require` (6)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/util.js:152` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `(anonymous)` (1)

### `withSelectedTaskStatus`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:802` | Self: 0.0% (0us) | Total: 0.5% (2.2ms) | Samples: 0

**Called by:**
- `selectAdmissionCore` (2)

**Calls:**
- `transitionIndexedSelection` (1)
- `transitionIndexedSelection` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3488` | Self: 0.0% (0us) | Total: 1.6% (6.9ms) | Samples: 0

**Called by:**
- `__iterate` (3)
- `withMutations` (3)

**Calls:**
- `set` (3)
- `forEach` (3)

### `validatePreparedTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:28` | Self: 0.0% (0us) | Total: 0.5% (2.4ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (2)

**Calls:**
- `validateTaskRelationCycles` (1)
- `validateTaskRelationCycles` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/fast-uri@3.1.3/node_modules/fast-uri/index.js:4` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `measuredSync`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:316` | Self: 0.0% (0us) | Total: 6.1% (25.6ms) | Samples: 0

**Called by:**
- `profiledRows` (15)
- `profiledRows` (7)

**Calls:**
- `(anonymous)` (15)
- `(anonymous)` (7)

### `coreAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:248` | Self: 0.0% (0us) | Total: 1.5% (6.6ms) | Samples: 0

**Called by:**
- `profiledRows` (5)

**Calls:**
- `admissionCandidatesForCore` (2)
- `admissionCandidatesForCore` (2)
- `freeze` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/index.js:5` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts:66` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `buildSemanticSelection`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1033` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `createInitialAdmissionCoreState` (1)

**Calls:**
- `persistentNumbersFor` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:878` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `async writeFile` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:864` | Self: 0.0% (0us) | Total: 0.9% (3.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `gitCommit` (3)

### `spawnSync`
`node:child_process:203` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `execFileSync` (1)

**Calls:**
- `normalizeSpawnArguments` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:26` | Self: 0.0% (0us) | Total: 1.2% (5.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/index.js:7` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `node:events`
`node:events:9` | Self: 0.0% (0us) | Total: 0.5% (2.2ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/boolSchema.js:4` | Self: 0.0% (0us) | Total: 1.1% (4.8ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/uniqueItems.js:6` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `sampleSync`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:278` | Self: 0.0% (0us) | Total: 11.9% (50.2ms) | Samples: 0

**Called by:**
- `from` (42)

**Calls:**
- `(anonymous)` (24)
- `(anonymous)` (18)

### `withStatusAt`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1138` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `transitionIndexedSelection` (1)

**Calls:**
- `set` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/lib/parse.js:6` | Self: 0.0% (0us) | Total: 0.3% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `measuredSync`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:328` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `profiledRows` (1)

**Calls:**
- `quantiles` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts:67` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `caseInsensitiveExtensionPattern` (1)

### `exactRecord`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:456` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `ownKeys` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js:13` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `retainedBranchObservation`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:735` | Self: 0.0% (0us) | Total: 4.3% (18.4ms) | Samples: 0

**Called by:**
- `(module)` (7)
- `(module)` (6)

**Calls:**
- `gc` (13)

### `execFileSync`
`node:child_process:264` | Self: 0.0% (0us) | Total: 1.5% (6.3ms) | Samples: 0

**Called by:**
- `gitCommit` (5)

**Calls:**
- `spawnSync` (4)
- `spawnSync` (1)

### `async readFile`
`node:fs/promises:108` | Self: 0.0% (0us) | Total: 0.5% (2.4ms) | Samples: 0

**Called by:**
- `async selectedImplementationFingerprint` (1)

**Calls:**
- `bound readFile` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:10` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `get ReadStream`
`node:fs:578` | Self: 0.0% (0us) | Total: 1.1% (4.7ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `node:async_hooks`
`node:async_hooks:179` | Self: 0.0% (0us) | Total: 0.6% (2.5ms) | Samples: 0

**Calls:**
- `createWarning` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:96` | Self: 0.0% (0us) | Total: 1.1% (4.8ms) | Samples: 0

**Called by:**
- `createAdmissionGraph` (2)
- `preparedFixture` (2)

**Calls:**
- `sort` (2)
- `freeze` (2)

### `IndexedSeq`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:492` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `IndexedCollection` (1)

**Calls:**
- `isRecord` (1)

### `retainedBranchObservation`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:737` | Self: 0.0% (0us) | Total: 1.4% (5.8ms) | Samples: 0

**Called by:**
- `(module)` (3)
- `(module)` (2)

**Calls:**
- `preparedFixture` (3)
- `preparedFixture` (1)
- `preparedFixture` (1)

### `coreAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:246` | Self: 0.0% (0us) | Total: 0.5% (2.2ms) | Samples: 0

**Called by:**
- `profiledRows` (2)

**Calls:**
- `createInitialAdmissionCoreState` (2)

### `buildSemanticSelection`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1034` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `createInitialAdmissionCoreState` (1)

**Calls:**
- `persistentNumbersFor` (1)

### `retainedBranchObservation`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:760` | Self: 0.0% (0us) | Total: 0.3% (1.2ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `memoryUsage` (1)

### `bound readFile`
`[native code]` | Self: 0.0% (0us) | Total: 0.5% (2.4ms) | Samples: 0

**Called by:**
- `async readFile` (1)

**Calls:**
- `readFile` (1)

### `persistentNumbersFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1122` | Self: 0.0% (0us) | Total: 0.5% (2.4ms) | Samples: 0

**Called by:**
- `buildSemanticSelection` (1)
- `buildSemanticSelection` (1)

**Calls:**
- `List` (2)

### `makeList`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3880` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `updateList` (1)

**Calls:**
- `create` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/index.js:4` | Self: 0.0% (0us) | Total: 0.6% (2.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `bound require` (2)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/machine-output/v4/schema.ts:13` | Self: 0.0% (0us) | Total: 0.3% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `Record` (1)

### `schedulerGraphSnapshot`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:100` | Self: 0.0% (0us) | Total: 0.4% (2.0ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (2)

**Calls:**
- `freeze` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:4` | Self: 0.0% (0us) | Total: 0.5% (2.3ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:70` | Self: 0.0% (0us) | Total: 0.5% (2.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `assign` (1)
- `getSignalsByNumber` (1)

### `preparedFixture`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:214` | Self: 0.0% (0us) | Total: 4.3% (18.4ms) | Samples: 0

**Called by:**
- `profiledRows` (11)
- `retainedBranchObservation` (3)
- `persistentVectorObservation` (2)

**Calls:**
- `createAdmissionGraph` (16)

### `stateAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:235` | Self: 0.0% (0us) | Total: 0.8% (3.6ms) | Samples: 0

**Called by:**
- `profiledRows` (3)

**Calls:**
- `catalogForCore` (2)
- `catalogForCore` (1)

### `from`
`[native code]` | Self: 0.0% (0us) | Total: 12.2% (51.3ms) | Samples: 0

**Called by:**
- `measuredSync` (43)

**Calls:**
- `sampleSync` (42)
- `(anonymous)` (1)

### `taskGraphFromSchedulerSnapshot`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:390` | Self: 0.0% (0us) | Total: 1.1% (4.7ms) | Samples: 0

**Called by:**
- `compileAdmissionGraphInput` (4)

**Calls:**
- `map` (4)

### `requiredTask`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1226` | Self: 0.0% (0us) | Total: 0.3% (1.2ms) | Samples: 0

**Called by:**
- `catalogForCore` (1)

**Calls:**
- `requiredTaskForCompiled` (1)

### `catalogForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:501` | Self: 0.0% (0us) | Total: 0.3% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `requiredTask` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 83.0% (348.6ms) | Samples: 0

**Calls:**
- `(anonymous)` (270)

### `bound require`
`[native code]` | Self: 0.0% (0us) | Total: 18.5% (77.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (11)
- `(anonymous)` (7)
- `(anonymous)` (6)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `require` (61)

### `internal:promisify`
`internal:promisify:53` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `forEach`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:5401` | Self: 0.0% (0us) | Total: 0.8% (3.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `__iterate` (3)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/yoctocolors@2.1.2/node_modules/yoctocolors/base.js:6` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `profiledRows`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:606` | Self: 0.0% (0us) | Total: 2.1% (8.8ms) | Samples: 0

**Called by:**
- `(module)` (7)

**Calls:**
- `coreAtDepth` (5)
- `coreAtDepth` (2)

### `preparedFixture`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:213` | Self: 0.0% (0us) | Total: 2.2% (9.4ms) | Samples: 0

**Called by:**
- `profiledRows` (7)
- `retainedBranchObservation` (1)

**Calls:**
- `compilePreparedAdmissionGraph` (2)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts:113` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `preparedFixture` (1)

**Calls:**
- `freeze` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js:22` | Self: 0.0% (0us) | Total: 0.6% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `buildSemanticSelection`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:991` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `createInitialAdmissionCoreState` (1)

**Calls:**
- `next` (1)

### `taskGraphFromSchedulerSnapshot`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:439` | Self: 0.0% (0us) | Total: 0.3% (1.2ms) | Samples: 0

**Called by:**
- `compileAdmissionGraphInput` (1)

**Calls:**
- `freeze` (1)

### `normalizeTasks`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:122` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (1)

**Calls:**
- `arrayIteratorNextHelper` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/mdast-util-phrasing@4.1.0/node_modules/mdast-util-phrasing/lib/index.js:22` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `anyFactory` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:5` | Self: 0.0% (0us) | Total: 0.5% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `internal:primordials`
`internal:primordials:78` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `makeSafe` (1)

### `internal:streams/transform`
`internal:streams/transform:2` | Self: 0.0% (0us) | Total: 2.7% (11.4ms) | Samples: 0

**Called by:**
- `anonymous` (5)

**Calls:**
- `anonymous` (5)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:28` | Self: 0.0% (0us) | Total: 1.2% (5.4ms) | Samples: 0

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/errors.js:4` | Self: 0.0% (0us) | Total: 0.5% (2.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `internal:stream`
`internal:stream:2` | Self: 0.0% (0us) | Total: 1.1% (4.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `persistentVectorObservation`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:775` | Self: 0.0% (0us) | Total: 0.9% (3.7ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `preparedFixture` (2)
- `preparedFixture` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/index.js:3` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:833` | Self: 0.0% (0us) | Total: 6.7% (28.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (22)

**Calls:**
- `retainedBranchObservation` (7)
- `retainedBranchObservation` (6)
- `retainedBranchObservation` (5)
- `retainedBranchObservation` (2)
- `retainedBranchObservation` (1)
- `retainedBranchObservation` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/not.js:3` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `buildSemanticSelection`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:961` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `createInitialAdmissionCoreState` (1)

**Calls:**
- `statusForStore` (1)

### `persistentStatuses`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1118` | Self: 0.0% (0us) | Total: 0.5% (2.2ms) | Samples: 0

**Called by:**
- `selectionForSeed` (2)

**Calls:**
- `List` (1)
- `List` (1)

### `bound call`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `makeSafe` (1)

**Calls:**
- `forEach` (1)

### `summaryMarkdown`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:680` | Self: 0.0% (0us) | Total: 0.5% (2.4ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `gitCommit` (2)

### `getValidatedPath`
`node:child_process:983` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `normalizeSpawnArguments` (1)

**Calls:**
- `validatePath` (1)

### `capacityRejectionFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:632` | Self: 0.0% (0us) | Total: 1.1% (4.9ms) | Samples: 0

**Called by:**
- `catalogForCore` (4)

**Calls:**
- `scopeCapacityBlockerFor` (3)
- `scopeCapacityBlockerFor` (1)

### `prepareTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:73` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `preparedFixture` (1)

**Calls:**
- `map` (1)

### `profiledRows`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:605` | Self: 0.0% (0us) | Total: 2.5% (10.8ms) | Samples: 0

**Called by:**
- `(module)` (9)

**Calls:**
- `stateAtDepth` (4)
- `stateAtDepth` (3)
- `stateAtDepth` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:7` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `blockerStageFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:583` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `selectionRejectionForPendingTask` (1)

**Calls:**
- `numberFor` (1)

### `normalizeTasks`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:123` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (1)

**Calls:**
- `record` (1)

### `spawnSync`
`node:child_process:226` | Self: 0.0% (0us) | Total: 1.2% (5.1ms) | Samples: 0

**Called by:**
- `execFileSync` (4)

**Calls:**
- `spawnSync` (4)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/index.js:13` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/next.js:3` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js:4` | Self: 0.0% (0us) | Total: 1.9% (8.3ms) | Samples: 0

**Called by:**
- `anonymous` (7)

**Calls:**
- `bound require` (7)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:618` | Self: 0.0% (0us) | Total: 7.2% (30.2ms) | Samples: 0

**Called by:**
- `sampleSync` (18)
- `measuredSync` (7)

**Calls:**
- `catalogForCore` (16)
- `catalogForCore` (6)
- `catalogForCore` (2)
- `catalogForCore` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js:4` | Self: 0.0% (0us) | Total: 3.8% (16.0ms) | Samples: 0

**Calls:**
- `bound require` (11)

### `listNodeFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:4005` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `get` (1)

**Calls:**
- `getTailOffset` (1)

### `internal:validators`
`internal:validators:2` | Self: 0.0% (0us) | Total: 0.5% (2.2ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `updateList`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3942` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `set` (1)

**Calls:**
- `makeList` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/errors.js:5` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `prepareTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:79` | Self: 0.0% (0us) | Total: 1.3% (5.8ms) | Samples: 0

**Called by:**
- `preparedFixture` (3)
- `compileAdmissionGraphInput` (2)

**Calls:**
- `schedulerGraphSnapshot` (3)
- `schedulerGraphSnapshot` (2)

### `updateList`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js:3921` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `set` (1)

**Calls:**
- `updateVNode` (1)

### `internal:fs/streams`
`internal:fs/streams:2` | Self: 0.0% (0us) | Total: 1.1% (4.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `internal:streams/legacy`
`internal:streams/legacy:2` | Self: 0.0% (0us) | Total: 0.5% (2.2ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/lib/util/readShebang.js:4` | Self: 0.0% (0us) | Total: 0.3% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `profiledRows`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:609` | Self: 0.0% (0us) | Total: 8.0% (33.8ms) | Samples: 0

**Called by:**
- `(module)` (28)

**Calls:**
- `measuredSync` (19)
- `measuredSync` (7)
- `measuredSync` (1)
- `measuredSync` (1)

### `(anonymous)`
`node:tty:74` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `(anonymous)` (1)

### `selectionForSeed`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:826` | Self: 0.0% (0us) | Total: 0.5% (2.2ms) | Samples: 0

**Called by:**
- `createInitialAdmissionCoreState` (2)

**Calls:**
- `persistentStatuses` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/index.js:10` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:830` | Self: 0.0% (0us) | Total: 6.0% (25.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (21)

**Calls:**
- `retainedBranchObservation` (6)
- `retainedBranchObservation` (6)
- `retainedBranchObservation` (5)
- `retainedBranchObservation` (3)
- `retainedBranchObservation` (1)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 2.7% (11.4ms) | Samples: 0

**Called by:**
- `anonymous` (5)

**Calls:**
- `anonymous` (5)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 78.6% | 329.9ms | `[native code]` |
| 7.2% | 30.5ms | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 3.3% | 14.1ms | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/immutable@5.1.9/node_modules/immutable/dist/immutable.js` |
| 2.2% | 9.4ms | `internal:streams/writable` |
| 2.1% | 9.0ms | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` |
| 1.8% | 7.6ms | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts` |
| 0.8% | 3.6ms | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core-compiled-graph.ts` |
| 0.6% | 2.5ms | `node:async_hooks` |
| 0.5% | 2.4ms | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts` |
| 0.3% | 1.3ms | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/unist-util-is@6.0.1/node_modules/unist-util-is/lib/index.js` |
| 0.3% | 1.3ms | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/util.js` |
| 0.3% | 1.2ms | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/type/types/record.mjs` |
| 0.3% | 1.2ms | `internal:util/inspect` |
| 0.3% | 1.2ms | `/home/dev/.codex/worktrees/4a40/vibe-check/src/machine-output/v4/schema.ts` |
| 0.2% | 1.2ms | `/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts` |
| 0.2% | 1.1ms | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/signals.js` |
| 0.2% | 1.1ms | `node:child_process` |
