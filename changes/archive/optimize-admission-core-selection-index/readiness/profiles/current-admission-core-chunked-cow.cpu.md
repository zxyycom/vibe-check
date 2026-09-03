# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 452.4ms | 327 | 1.0ms | 242 |

**Top 10:** `(anonymous)` 28.8%, `freeze` 19.5%, `anonymous` 12.5%, `gc` 7.8%, `numberFor` 2.8%, `statusForStore` 1.6%, `catalogForCore` 1.5%, `arrayIteratorNextHelper` 1.5%, `scopeCapacityBlockerFor` 1.5%, `scopeCapacityBlockerFor` 1.3%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 28.8% | 130.4ms | 87.2% | 394.6ms | `(anonymous)` | `[native code]` |
| 19.5% | 88.4ms | 19.5% | 88.4ms | `freeze` | `[native code]` |
| 12.5% | 56.6ms | 30.1% | 136.5ms | `anonymous` | `[native code]` |
| 7.8% | 35.4ms | 7.8% | 35.4ms | `gc` | `[native code]` |
| 2.8% | 12.6ms | 2.8% | 12.6ms | `numberFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1537` |
| 1.6% | 7.4ms | 1.6% | 7.4ms | `statusForStore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1505` |
| 1.5% | 7.2ms | 1.5% | 7.2ms | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:669` |
| 1.5% | 7.2ms | 1.5% | 7.2ms | `arrayIteratorNextHelper` | `[native code]` |
| 1.5% | 6.9ms | 1.5% | 6.9ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:839` |
| 1.3% | 6.2ms | 1.3% | 6.2ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:832` |
| 1.1% | 5.3ms | 1.1% | 5.3ms | `spawnSync` | `[native code]` |
| 1.1% | 5.0ms | 1.1% | 5.0ms | `bound` | `node:os` |
| 1.0% | 4.9ms | 1.0% | 4.9ms | `push` | `[native code]` |
| 0.8% | 3.6ms | 0.8% | 3.6ms | `taskId` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:125` |
| 0.8% | 3.6ms | 1.9% | 8.7ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:451` |
| 0.7% | 3.5ms | 5.4% | 24.6ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:454` |
| 0.5% | 2.6ms | 1.8% | 8.3ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:453` |
| 0.5% | 2.5ms | 3.3% | 15.0ms | `map` | `[native code]` |
| 0.5% | 2.3ms | 0.5% | 2.3ms | `semanticSelectionFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1182` |
| 0.5% | 2.3ms | 0.5% | 2.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.5% | 2.3ms | 0.5% | 2.3ms | `populate` | `node:os:20` |
| 0.4% | 2.2ms | 0.4% | 2.2ms | `record` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:188` |
| 0.3% | 1.4ms | 0.3% | 1.4ms | `resolve` | `[native code]` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:73` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `get` | `[native code]` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:190` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `ownKeys` | `[native code]` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `sampleSync` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:287` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:102` |
| 0.3% | 1.3ms | 17.9% | 81.0ms | `from` | `[native code]` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `record` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `add` | `[native code]` |
| 0.2% | 1.3ms | 18.2% | 82.7ms | `require` | `[native code]` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `selectionRejectionForPendingTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:737` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `validateRelatedTaskIds` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:54` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `stream` | `[native code]` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `(anonymous)` | `internal:primordials` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `withStatusAt` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1520` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `compareText` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1697` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `(program)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/index.js:1` |
| 0.2% | 1.2ms | 1.7% | 7.9ms | `blockerStageFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:752` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `getSpecialCharRegExp` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/execa@9.6.1/node_modules/execa/lib/arguments/escape.js` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `buildSemanticSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1249` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `retainedBranchObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:752` |
| 0.2% | 1.2ms | 85.0% | 384.5ms | `processTicksAndRejections` | `[native code]` |
| 0.2% | 1.2ms | 0.5% | 2.5ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:267` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `callbackify` | `node:util` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `CanInstantiate` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/type/engine/instantiate.mjs` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `clearBuffer` | `internal:streams/writable` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `stringList` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:212` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `stringList` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/system/hashing/hash.mjs` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `buildSemanticSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1323` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `exactRecord` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:618` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `stringArray` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:657` |
| 0.2% | 1.1ms | 0.8% | 3.6ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:452` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `transitionSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1055` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `transitionSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `filter` | `[native code]` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `@lazy` | `[native code]` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `requiredTaskForCompiled` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1655` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `performIteration` | `[native code]` |
| 0.2% | 1.0ms | 0.7% | 3.5ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:562` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `statusForStore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1500` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 87.2% | 394.6ms | 28.8% | 130.4ms | `(anonymous)` | `[native code]` |
| 85.0% | 384.5ms | 0.2% | 1.2ms | `processTicksAndRejections` | `[native code]` |
| 37.1% | 168.0ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:707` |
| 30.1% | 136.5ms | 12.5% | 56.6ms | `anonymous` | `[native code]` |
| 19.5% | 88.4ms | 19.5% | 88.4ms | `freeze` | `[native code]` |
| 18.5% | 83.9ms | 0.0% | 0us | `bound require` | `[native code]` |
| 18.2% | 82.7ms | 0.2% | 1.3ms | `require` | `[native code]` |
| 17.9% | 81.0ms | 0.3% | 1.3ms | `from` | `[native code]` |
| 16.5% | 74.9ms | 0.0% | 0us | `measuredSync` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:321` |
| 16.2% | 73.5ms | 0.0% | 0us | `sampleSync` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:282` |
| 13.5% | 61.2ms | 0.0% | 0us | `profiledRows` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:625` |
| 13.2% | 59.8ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:634` |
| 11.6% | 52.5ms | 0.0% | 0us | `profiledRows` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:613` |
| 11.6% | 52.5ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:622` |
| 8.5% | 38.8ms | 0.0% | 0us | `measuredSync` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:320` |
| 7.8% | 35.4ms | 7.8% | 35.4ms | `gc` | `[native code]` |
| 6.9% | 31.4ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:815` |
| 6.2% | 28.4ms | 0.0% | 0us | `profiledRows` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:608` |
| 6.1% | 27.7ms | 0.0% | 0us | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:678` |
| 6.0% | 27.3ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:818` |
| 5.4% | 24.6ms | 0.7% | 3.5ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:454` |
| 4.4% | 20.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js:4` |
| 4.0% | 18.3ms | 0.0% | 0us | `createAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:274` |
| 4.0% | 18.3ms | 0.0% | 0us | `preparedFixture` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:218` |
| 3.9% | 17.7ms | 0.0% | 0us | `retainedBranchObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:759` |
| 3.9% | 17.6ms | 0.0% | 0us | `retainedBranchObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:735` |
| 3.6% | 16.5ms | 0.0% | 0us | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:671` |
| 3.3% | 15.0ms | 0.5% | 2.5ms | `map` | `[native code]` |
| 3.1% | 14.3ms | 0.0% | 0us | `profiledRows` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:609` |
| 2.8% | 12.6ms | 2.8% | 12.6ms | `numberFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1537` |
| 2.5% | 11.5ms | 0.0% | 0us | `profiledRows` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:610` |
| 2.5% | 11.4ms | 0.0% | 0us | `node:util` | `node:util:2` |
| 2.4% | 11.1ms | 0.0% | 0us | `retainedBranchObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:758` |
| 2.3% | 10.6ms | 0.0% | 0us | `selectionRejectionForPendingTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:735` |
| 2.2% | 10.1ms | 0.0% | 0us | `preparedFixture` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:215` |
| 2.1% | 9.6ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js:4` |
| 2.1% | 9.5ms | 0.0% | 0us | `stateAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:239` |
| 1.9% | 8.8ms | 0.0% | 0us | `createInitialAdmissionCoreState` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:285` |
| 1.9% | 8.7ms | 0.8% | 3.6ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:451` |
| 1.8% | 8.5ms | 0.0% | 0us | `hasCapacityForPendingTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:792` |
| 1.8% | 8.5ms | 0.0% | 0us | `prepareTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:71` |
| 1.8% | 8.4ms | 0.0% | 0us | `retainedBranchObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:737` |
| 1.8% | 8.3ms | 0.5% | 2.6ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:453` |
| 1.8% | 8.3ms | 0.0% | 0us | `preparedFixture` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:217` |
| 1.7% | 7.9ms | 0.2% | 1.2ms | `blockerStageFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:752` |
| 1.6% | 7.4ms | 1.6% | 7.4ms | `statusForStore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1505` |
| 1.5% | 7.2ms | 1.5% | 7.2ms | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:669` |
| 1.5% | 7.2ms | 1.5% | 7.2ms | `arrayIteratorNextHelper` | `[native code]` |
| 1.5% | 6.9ms | 1.5% | 6.9ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:839` |
| 1.5% | 6.7ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js:5` |
| 1.4% | 6.7ms | 0.0% | 0us | `gitCommit` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:701` |
| 1.4% | 6.7ms | 0.0% | 0us | `execFileSync` | `node:child_process:264` |
| 1.3% | 6.2ms | 1.3% | 6.2ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:832` |
| 1.3% | 6.1ms | 0.0% | 0us | `compileAdmissionGraphInput` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:554` |
| 1.3% | 6.0ms | 0.0% | 0us | `next` | `[native code]` |
| 1.3% | 5.9ms | 0.0% | 0us | `internal:streams/lazy_transform` | `internal:streams/lazy_transform:2` |
| 1.3% | 5.9ms | 0.0% | 0us | `node:crypto` | `node:crypto:2` |
| 1.3% | 5.9ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 1.3% | 5.9ms | 0.0% | 0us | `internal:streams/transform` | `internal:streams/transform:2` |
| 1.3% | 5.9ms | 0.0% | 0us | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:670` |
| 1.1% | 5.3ms | 0.0% | 0us | `coreAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:252` |
| 1.1% | 5.3ms | 0.0% | 0us | `spawnSync` | `node:child_process:226` |
| 1.1% | 5.3ms | 1.1% | 5.3ms | `spawnSync` | `[native code]` |
| 1.1% | 5.0ms | 1.1% | 5.0ms | `bound` | `node:os` |
| 1.1% | 5.0ms | 0.0% | 0us | `node:os` | `node:os:110` |
| 1.1% | 5.0ms | 0.0% | 0us | `withChunkAt` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1480` |
| 1.0% | 4.9ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:816` |
| 1.0% | 4.9ms | 1.0% | 4.9ms | `push` | `[native code]` |
| 1.0% | 4.8ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/boolSchema.js:4` |
| 1.0% | 4.8ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:4` |
| 1.0% | 4.6ms | 0.0% | 0us | `taskGraphFromSchedulerSnapshot` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:561` |
| 1.0% | 4.6ms | 0.0% | 0us | `compileAdmissionGraphInput` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:553` |
| 1.0% | 4.5ms | 0.0% | 0us | `capacityRejectionFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:803` |
| 0.9% | 4.1ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:842` |
| 0.8% | 3.8ms | 0.0% | 0us | `prepareTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:79` |
| 0.8% | 3.8ms | 0.0% | 0us | `transitionChunkedSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1067` |
| 0.8% | 3.7ms | 0.0% | 0us | `coreAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:250` |
| 0.8% | 3.7ms | 0.0% | 0us | `initialState` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:277` |
| 0.8% | 3.7ms | 0.0% | 0us | `stateAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:237` |
| 0.8% | 3.6ms | 0.0% | 0us | `blockerStageFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:754` |
| 0.8% | 3.6ms | 0.2% | 1.1ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:452` |
| 0.8% | 3.6ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:195` |
| 0.8% | 3.6ms | 0.0% | 0us | `graphFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:194` |
| 0.8% | 3.6ms | 0.0% | 0us | `preparedFixture` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:214` |
| 0.8% | 3.6ms | 0.8% | 3.6ms | `taskId` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:125` |
| 0.7% | 3.5ms | 0.0% | 0us | `node:fs/promises` | `node:fs/promises:2` |
| 0.7% | 3.5ms | 0.0% | 0us | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:673` |
| 0.7% | 3.5ms | 0.0% | 0us | `chunkedPathCopyObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:791` |
| 0.7% | 3.5ms | 0.2% | 1.0ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:562` |
| 0.7% | 3.5ms | 0.0% | 0us | `withSelectedTaskStatus` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:973` |
| 0.7% | 3.5ms | 0.0% | 0us | `selectAdmissionCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:329` |
| 0.7% | 3.3ms | 0.0% | 0us | `get ReadStream` | `node:fs:578` |
| 0.5% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:13` |
| 0.5% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/uri.js:3` |
| 0.5% | 2.6ms | 0.0% | 0us | `schedulerGraphSnapshot` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:101` |
| 0.5% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js:22` |
| 0.5% | 2.5ms | 0.0% | 0us | `summaryMarkdown` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:684` |
| 0.5% | 2.5ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:857` |
| 0.5% | 2.5ms | 0.0% | 0us | `sort` | `[native code]` |
| 0.5% | 2.5ms | 0.2% | 1.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:267` |
| 0.5% | 2.5ms | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:267` |
| 0.5% | 2.5ms | 0.0% | 0us | `withChunkAt` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1477` |
| 0.5% | 2.5ms | 0.0% | 0us | `withStatusAt` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1525` |
| 0.5% | 2.4ms | 0.0% | 0us | `withTaskStatus` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:955` |
| 0.5% | 2.4ms | 0.0% | 0us | `settleRunningAdmissionCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:387` |
| 0.5% | 2.4ms | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:243` |
| 0.5% | 2.3ms | 0.0% | 0us | `normalizeTasks` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:123` |
| 0.5% | 2.3ms | 0.0% | 0us | `bound call` | `[native code]` |
| 0.5% | 2.3ms | 0.5% | 2.3ms | `semanticSelectionFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1182` |
| 0.5% | 2.3ms | 0.0% | 0us | `blockerStageFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:751` |
| 0.5% | 2.3ms | 0.0% | 0us | `normalizeTasks` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:136` |
| 0.5% | 2.3ms | 0.5% | 2.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.5% | 2.3ms | 0.5% | 2.3ms | `populate` | `node:os:20` |
| 0.5% | 2.3ms | 0.0% | 0us | `stringify` | `[native code]` |
| 0.5% | 2.3ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:856` |
| 0.5% | 2.3ms | 0.0% | 0us | `toJSON` | `node:os:57` |
| 0.5% | 2.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:5` |
| 0.5% | 2.2ms | 0.0% | 0us | `blockerStageFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:753` |
| 0.5% | 2.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/errors.js:4` |
| 0.4% | 2.2ms | 0.4% | 2.2ms | `record` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:188` |
| 0.4% | 2.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:4` |
| 0.3% | 1.4ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:27` |
| 0.3% | 1.4ms | 0.3% | 1.4ms | `resolve` | `[native code]` |
| 0.3% | 1.4ms | 0.0% | 0us | `bound resolve` | `[native code]` |
| 0.3% | 1.4ms | 0.0% | 0us | `buildSemanticSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1244` |
| 0.3% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/resolve.js:6` |
| 0.3% | 1.3ms | 0.0% | 0us | `prepareTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:73` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:73` |
| 0.3% | 1.3ms | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:200` |
| 0.3% | 1.3ms | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:266` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `get` | `[native code]` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:190` |
| 0.3% | 1.3ms | 0.0% | 0us | `exactRecord` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:627` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `ownKeys` | `[native code]` |
| 0.3% | 1.3ms | 0.0% | 0us | `retainedBranchObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:745` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `sampleSync` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:287` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:102` |
| 0.3% | 1.3ms | 0.0% | 0us | `chunkedPathCopyObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:792` |
| 0.3% | 1.3ms | 0.0% | 0us | `buildSemanticSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1245` |
| 0.3% | 1.3ms | 0.3% | 1.3ms | `record` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/fast-uri@3.1.3/node_modules/fast-uri/index.js:4` |
| 0.2% | 1.3ms | 0.0% | 0us | `spawnSync` | `node:child_process:203` |
| 0.2% | 1.3ms | 0.0% | 0us | `normalizeSpawnArguments` | `node:child_process:430` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `add` | `[native code]` |
| 0.2% | 1.3ms | 0.0% | 0us | `normalizeTasks` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:128` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:7` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/next.js:4` |
| 0.2% | 1.3ms | 0.0% | 0us | `chunkTreeFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1435` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/errors.js:6` |
| 0.2% | 1.3ms | 0.0% | 0us | `chunkedStatuses` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1416` |
| 0.2% | 1.3ms | 0.0% | 0us | `selectionForSeed` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1011` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `selectionRejectionForPendingTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:737` |
| 0.2% | 1.3ms | 0.0% | 0us | `prepareTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:76` |
| 0.2% | 1.3ms | 0.0% | 0us | `validateTaskRelations` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:37` |
| 0.2% | 1.3ms | 0.0% | 0us | `validatePreparedTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:27` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:106` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `validateRelatedTaskIds` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:54` |
| 0.2% | 1.3ms | 0.0% | 0us | `forEach` | `[native code]` |
| 0.2% | 1.3ms | 0.0% | 0us | `makeSafe` | `internal:primordials:30` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `(anonymous)` | `internal:primordials` |
| 0.2% | 1.3ms | 0.0% | 0us | `internal:primordials` | `internal:primordials:71` |
| 0.2% | 1.3ms | 0.0% | 0us | `internal:validators` | `internal:validators:2` |
| 0.2% | 1.3ms | 0.0% | 0us | `internal:shared` | `internal:shared:2` |
| 0.2% | 1.3ms | 0.0% | 0us | `node:events` | `node:events:9` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `stream` | `[native code]` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `withStatusAt` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1520` |
| 0.2% | 1.3ms | 0.0% | 0us | `coreAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:255` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `compareText` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1697` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/index.js:13` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `(program)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/index.js:1` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `getSpecialCharRegExp` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/execa@9.6.1/node_modules/execa/lib/arguments/escape.js` |
| 0.2% | 1.2ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/execa@9.6.1/node_modules/execa/lib/arguments/escape.js:57` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `buildSemanticSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1249` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `retainedBranchObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:752` |
| 0.2% | 1.2ms | 0.0% | 0us | `normalizeTasks` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:132` |
| 0.2% | 1.2ms | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:248` |
| 0.2% | 1.2ms | 0.0% | 0us | `prepareTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:70` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `callbackify` | `node:util` |
| 0.2% | 1.2ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/execa@9.6.1/node_modules/execa/lib/transform/run-async.js:4` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/lib/util/resolveCommand.js:4` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/lib/parse.js:4` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/isexe@2.0.0/node_modules/isexe/index.js:1` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/which@2.0.2/node_modules/which/which.js:7` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/index.js:4` |
| 0.2% | 1.1ms | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:238` |
| 0.2% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:9` |
| 0.2% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/index.js:4` |
| 0.2% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js:6` |
| 0.2% | 1.1ms | 0.0% | 0us | `buildSemanticSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1305` |
| 0.2% | 1.1ms | 0.0% | 0us | `internal:fs/streams` | `internal:fs/streams:249` |
| 0.2% | 1.1ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/csv-parse@7.0.1/node_modules/csv-parse/lib/api/index.js:22` |
| 0.2% | 1.1ms | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:247` |
| 0.2% | 1.1ms | 0.0% | 0us | `RecordAction` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/type/engine/record/instantiate.mjs:8` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `CanInstantiate` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/type/engine/instantiate.mjs` |
| 0.2% | 1.1ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/machine-output/v4/schema.ts:13` |
| 0.2% | 1.1ms | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:222` |
| 0.2% | 1.1ms | 0.0% | 0us | `bound onceWrapper` | `[native code]` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `clearBuffer` | `internal:streams/writable` |
| 0.2% | 1.1ms | 0.0% | 0us | `(anonymous)` | `internal:streams/writable:197` |
| 0.2% | 1.1ms | 0.0% | 0us | `onConstructed` | `internal:streams/writable:168` |
| 0.2% | 1.1ms | 0.0% | 0us | `onConstruct` | `internal:streams/destroy:144` |
| 0.2% | 1.1ms | 0.0% | 0us | `emit` | `node:events:92` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `stringList` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:212` |
| 0.2% | 1.1ms | 0.0% | 0us | `normalizeTasks` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:137` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `stringList` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts` |
| 0.2% | 1.1ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/system/hashing/hash.mjs:58` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/system/hashing/hash.mjs` |
| 0.2% | 1.1ms | 0.0% | 0us | `getSignalsByName` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:10` |
| 0.2% | 1.1ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:23` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `buildSemanticSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1323` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `exactRecord` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:618` |
| 0.2% | 1.1ms | 0.0% | 0us | `retainedBranchObservation` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:743` |
| 0.2% | 1.1ms | 0.0% | 0us | `buildSemanticSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1280` |
| 0.2% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:578` |
| 0.2% | 1.1ms | 0.0% | 0us | `schedulerGraphSnapshot` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:100` |
| 0.2% | 1.1ms | 0.2% | 1.1ms | `stringArray` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:657` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js` |
| 0.2% | 1.0ms | 0.0% | 0us | `getSignalsByNumber` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:31` |
| 0.2% | 1.0ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:70` |
| 0.2% | 1.0ms | 0.0% | 0us | `find` | `[native code]` |
| 0.2% | 1.0ms | 0.0% | 0us | `getSignalByNumber` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:38` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `transitionSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1055` |
| 0.2% | 1.0ms | 0.0% | 0us | `coreAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:257` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `transitionSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.2% | 1.0ms | 0.0% | 0us | `stateAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:243` |
| 0.2% | 1.0ms | 0.0% | 0us | `select` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:514` |
| 0.2% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/index.js:8` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `filter` | `[native code]` |
| 0.2% | 1.0ms | 0.0% | 0us | `internal:util/inspect` | `internal:util/inspect:179` |
| 0.2% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/index.js:12` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `@lazy` | `[native code]` |
| 0.2% | 1.0ms | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:234` |
| 0.2% | 1.0ms | 0.0% | 0us | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:672` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `requiredTaskForCompiled` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1655` |
| 0.2% | 1.0ms | 0.0% | 0us | `requiredTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1651` |
| 0.2% | 1.0ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/@humanwhocodes+momoa@3.3.12/node_modules/@humanwhocodes/momoa/dist/momoa.js:105` |
| 0.2% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/index.js:7` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `performIteration` | `[native code]` |
| 0.2% | 1.0ms | 0.2% | 1.0ms | `statusForStore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1500` |
| 0.2% | 997us | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/core/index.js:4` |
| 0.2% | 997us | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:3` |
| 0.2% | 959us | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:208` |

## Function Details

### `(anonymous)`
`[native code]` | Self: 28.8% (130.4ms) | Total: 87.2% (394.6ms) | Samples: 97

**Called by:**
- `processTicksAndRejections` (294)
- `(module)` (1)
- `internal:fs/streams` (1)

**Calls:**
- `(module)` (132)
- `(module)` (25)
- `(module)` (21)
- `(module)` (4)
- `(module)` (3)
- `(module)` (2)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `anonymous` (1)
- `stream` (1)
- `(module)` (1)
- `(anonymous)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(program)` (1)
- `(module)` (1)

### `freeze`
`[native code]` | Self: 19.5% (88.4ms) | Total: 19.5% (88.4ms) | Samples: 71

**Called by:**
- `catalogForCore` (24)
- `(anonymous)` (16)
- `admissionCandidatesForCore` (10)
- `retainedBranchObservation` (6)
- `compilePreparedAdmissionGraph` (2)
- `withChunkAt` (2)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)
- `chunkTreeFor` (1)
- `coreAtDepth` (1)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)
- `normalizeTasks` (1)
- `normalizeTasks` (1)
- `(anonymous)` (1)
- `compilePreparedAdmissionGraph` (1)
- `schedulerGraphSnapshot` (1)

### `anonymous`
`[native code]` | Self: 12.5% (56.6ms) | Total: 30.1% (136.5ms) | Samples: 25

**Called by:**
- `require` (63)
- `node:util` (2)
- `node:fs/promises` (2)
- `get ReadStream` (2)
- `internal:streams/transform` (2)
- `node:crypto` (2)
- `internal:streams/duplex` (2)
- `internal:streams/lazy_transform` (2)
- `(anonymous)` (1)
- `internal:validators` (1)
- `bound require` (1)
- `internal:shared` (1)
- `node:events` (1)

**Calls:**
- `(anonymous)` (8)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `internal:streams/lazy_transform` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `internal:streams/transform` (2)
- `(anonymous)` (2)
- `internal:streams/duplex` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `internal:fs/streams` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:validators` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:shared` (1)
- `(anonymous)` (1)
- `node:events` (1)
- `internal:util/inspect` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:primordials` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `gc`
`[native code]` | Self: 7.8% (35.4ms) | Total: 7.8% (35.4ms) | Samples: 27

**Called by:**
- `retainedBranchObservation` (14)
- `retainedBranchObservation` (13)

### `numberFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1537` | Self: 2.8% (12.6ms) | Total: 2.8% (12.6ms) | Samples: 11

**Called by:**
- `blockerStageFor` (6)
- `blockerStageFor` (3)
- `blockerStageFor` (2)

### `statusForStore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1505` | Self: 1.6% (7.4ms) | Total: 1.6% (7.4ms) | Samples: 4

**Called by:**
- `catalogForCore` (2)
- `admissionCandidatesForCore` (2)

### `catalogForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:669` | Self: 1.5% (7.2ms) | Total: 1.5% (7.2ms) | Samples: 6

**Called by:**
- `(anonymous)` (5)
- `stateAtDepth` (1)

### `arrayIteratorNextHelper`
`[native code]` | Self: 1.5% (7.2ms) | Total: 1.5% (7.2ms) | Samples: 6

**Called by:**
- `next` (5)
- `buildSemanticSelection` (1)

### `scopeCapacityBlockerFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:839` | Self: 1.5% (6.9ms) | Total: 1.5% (6.9ms) | Samples: 6

**Called by:**
- `hasCapacityForPendingTask` (4)
- `capacityRejectionFor` (2)

### `scopeCapacityBlockerFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:832` | Self: 1.3% (6.2ms) | Total: 1.3% (6.2ms) | Samples: 5

**Called by:**
- `hasCapacityForPendingTask` (3)
- `capacityRejectionFor` (2)

### `spawnSync`
`[native code]` | Self: 1.1% (5.3ms) | Total: 1.1% (5.3ms) | Samples: 4

**Called by:**
- `spawnSync` (4)

### `bound`
`node:os` | Self: 1.1% (5.0ms) | Total: 1.1% (5.0ms) | Samples: 1

**Called by:**
- `node:os` (1)

### `push`
`[native code]` | Self: 1.0% (4.9ms) | Total: 1.0% (4.9ms) | Samples: 4

**Called by:**
- `catalogForCore` (3)
- `normalizeSpawnArguments` (1)

### `taskId`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:125` | Self: 0.8% (3.6ms) | Total: 0.8% (3.6ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `admissionCandidatesForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:451` | Self: 0.8% (3.6ms) | Total: 1.9% (8.7ms) | Samples: 3

**Called by:**
- `(anonymous)` (7)

**Calls:**
- `next` (4)

### `admissionCandidatesForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:454` | Self: 0.7% (3.5ms) | Total: 5.4% (24.6ms) | Samples: 3

**Called by:**
- `(anonymous)` (17)
- `retainedBranchObservation` (2)
- `coreAtDepth` (1)

**Calls:**
- `freeze` (10)
- `hasCapacityForPendingTask` (7)

### `admissionCandidatesForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:453` | Self: 0.5% (2.6ms) | Total: 1.8% (8.3ms) | Samples: 2

**Called by:**
- `(anonymous)` (6)
- `retainedBranchObservation` (1)

**Calls:**
- `blockerStageFor` (5)

### `map`
`[native code]` | Self: 0.5% (2.5ms) | Total: 3.3% (15.0ms) | Samples: 2

**Called by:**
- `taskGraphFromSchedulerSnapshot` (4)
- `schedulerGraphSnapshot` (2)
- `compilePreparedAdmissionGraph` (1)
- `getSignalsByName` (1)
- `compilePreparedAdmissionGraph` (1)
- `prepareTaskGraph` (1)
- `buildSemanticSelection` (1)
- `buildSemanticSelection` (1)

**Calls:**
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `get` (1)

### `semanticSelectionFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1182` | Self: 0.5% (2.3ms) | Total: 0.5% (2.3ms) | Samples: 1

**Called by:**
- `blockerStageFor` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` | Self: 0.5% (2.3ms) | Total: 0.5% (2.3ms) | Samples: 2

**Called by:**
- `map` (2)

### `populate`
`node:os:20` | Self: 0.5% (2.3ms) | Total: 0.5% (2.3ms) | Samples: 1

**Called by:**
- `toJSON` (1)

### `record`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:188` | Self: 0.4% (2.2ms) | Total: 0.4% (2.2ms) | Samples: 2

**Called by:**
- `normalizeTasks` (1)
- `prepareTaskGraph` (1)

### `resolve`
`[native code]` | Self: 0.3% (1.4ms) | Total: 0.3% (1.4ms) | Samples: 1

**Called by:**
- `bound resolve` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:73` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `map` (1)

### `get`
`[native code]` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `map` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:190` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `preparedFixture` (1)

### `ownKeys`
`[native code]` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `exactRecord` (1)

### `sampleSync`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:287` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `from` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:102` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `map` (1)

### `from`
`[native code]` | Self: 0.3% (1.3ms) | Total: 17.9% (81.0ms) | Samples: 1

**Called by:**
- `measuredSync` (63)
- `graphFor` (1)
- `buildSemanticSelection` (1)
- `getSignalsByNumber` (1)

**Calls:**
- `sampleSync` (62)
- `getSignalByNumber` (1)
- `(anonymous)` (1)
- `sampleSync` (1)

### `record`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts` | Self: 0.3% (1.3ms) | Total: 0.3% (1.3ms) | Samples: 1

**Called by:**
- `normalizeTasks` (1)

### `add`
`[native code]` | Self: 0.2% (1.3ms) | Total: 0.2% (1.3ms) | Samples: 1

**Called by:**
- `normalizeTasks` (1)

### `require`
`[native code]` | Self: 0.2% (1.3ms) | Total: 18.2% (82.7ms) | Samples: 1

**Called by:**
- `bound require` (64)

**Calls:**
- `anonymous` (63)

### `selectionRejectionForPendingTask`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:737` | Self: 0.2% (1.3ms) | Total: 0.2% (1.3ms) | Samples: 1

**Called by:**
- `catalogForCore` (1)

### `validateRelatedTaskIds`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:54` | Self: 0.2% (1.3ms) | Total: 0.2% (1.3ms) | Samples: 1

**Called by:**
- `validateTaskRelations` (1)

### `stream`
`[native code]` | Self: 0.2% (1.3ms) | Total: 0.2% (1.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`internal:primordials` | Self: 0.2% (1.3ms) | Total: 0.2% (1.3ms) | Samples: 1

**Called by:**
- `forEach` (1)

### `withStatusAt`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1520` | Self: 0.2% (1.3ms) | Total: 0.2% (1.3ms) | Samples: 1

**Called by:**
- `transitionChunkedSelection` (1)

### `compareText`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1697` | Self: 0.2% (1.3ms) | Total: 0.2% (1.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(program)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/index.js:1` | Self: 0.2% (1.2ms) | Total: 0.2% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `blockerStageFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:752` | Self: 0.2% (1.2ms) | Total: 1.7% (7.9ms) | Samples: 1

**Called by:**
- `admissionCandidatesForCore` (5)
- `selectionRejectionForPendingTask` (2)

**Calls:**
- `numberFor` (6)

### `getSpecialCharRegExp`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/execa@9.6.1/node_modules/execa/lib/arguments/escape.js` | Self: 0.2% (1.2ms) | Total: 0.2% (1.2ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `buildSemanticSelection`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1249` | Self: 0.2% (1.2ms) | Total: 0.2% (1.2ms) | Samples: 1

**Called by:**
- `createInitialAdmissionCoreState` (1)

### `retainedBranchObservation`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:752` | Self: 0.2% (1.2ms) | Total: 0.2% (1.2ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.2% (1.2ms) | Total: 85.0% (384.5ms) | Samples: 1

**Calls:**
- `(anonymous)` (294)
- `onConstruct` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:267` | Self: 0.2% (1.2ms) | Total: 0.5% (2.5ms) | Samples: 1

**Called by:**
- `sort` (2)

**Calls:**
- `compareText` (1)

### `callbackify`
`node:util` | Self: 0.2% (1.2ms) | Total: 0.2% (1.2ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `CanInstantiate`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/type/engine/instantiate.mjs` | Self: 0.2% (1.1ms) | Total: 0.2% (1.1ms) | Samples: 1

**Called by:**
- `RecordAction` (1)

### `clearBuffer`
`internal:streams/writable` | Self: 0.2% (1.1ms) | Total: 0.2% (1.1ms) | Samples: 1

**Called by:**
- `onConstructed` (1)

### `stringList`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:212` | Self: 0.2% (1.1ms) | Total: 0.2% (1.1ms) | Samples: 1

**Called by:**
- `normalizeTasks` (1)

### `stringList`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts` | Self: 0.2% (1.1ms) | Total: 0.2% (1.1ms) | Samples: 1

**Called by:**
- `normalizeTasks` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/system/hashing/hash.mjs` | Self: 0.2% (1.1ms) | Total: 0.2% (1.1ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `buildSemanticSelection`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1323` | Self: 0.2% (1.1ms) | Total: 0.2% (1.1ms) | Samples: 1

**Called by:**
- `createInitialAdmissionCoreState` (1)

### `exactRecord`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:618` | Self: 0.2% (1.1ms) | Total: 0.2% (1.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `stringArray`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:657` | Self: 0.2% (1.1ms) | Total: 0.2% (1.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `admissionCandidatesForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:452` | Self: 0.2% (1.1ms) | Total: 0.8% (3.6ms) | Samples: 1

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `statusForStore` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js` | Self: 0.2% (1.0ms) | Total: 0.2% (1.0ms) | Samples: 1

**Called by:**
- `find` (1)

### `transitionSelection`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1055` | Self: 0.2% (1.0ms) | Total: 0.2% (1.0ms) | Samples: 1

**Called by:**
- `withTaskStatus` (1)

### `transitionSelection`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` | Self: 0.2% (1.0ms) | Total: 0.2% (1.0ms) | Samples: 1

**Called by:**
- `withSelectedTaskStatus` (1)

### `filter`
`[native code]` | Self: 0.2% (1.0ms) | Total: 0.2% (1.0ms) | Samples: 1

**Called by:**
- `bound call` (1)

### `@lazy`
`[native code]` | Self: 0.2% (1.0ms) | Total: 0.2% (1.0ms) | Samples: 1

**Called by:**
- `node:fs/promises` (1)

### `requiredTaskForCompiled`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1655` | Self: 0.2% (1.0ms) | Total: 0.2% (1.0ms) | Samples: 1

**Called by:**
- `requiredTask` (1)

### `performIteration`
`[native code]` | Self: 0.2% (1.0ms) | Total: 0.2% (1.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:562` | Self: 0.2% (1.0ms) | Total: 0.7% (3.5ms) | Samples: 1

**Called by:**
- `map` (3)

**Calls:**
- `exactRecord` (1)
- `exactRecord` (1)

### `statusForStore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1500` | Self: 0.2% (1.0ms) | Total: 0.2% (1.0ms) | Samples: 1

**Called by:**
- `catalogForCore` (1)

### `node:util`
`node:util:2` | Self: 0.0% (0us) | Total: 2.5% (11.4ms) | Samples: 0

**Calls:**
- `anonymous` (2)

### `sampleSync`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:282` | Self: 0.0% (0us) | Total: 16.2% (73.5ms) | Samples: 0

**Called by:**
- `from` (62)

**Calls:**
- `(anonymous)` (32)
- `(anonymous)` (30)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/index.js:12` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:195` | Self: 0.0% (0us) | Total: 0.8% (3.6ms) | Samples: 0

**Called by:**
- `from` (1)

**Calls:**
- `taskId` (1)

### `normalizeTasks`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:132` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (1)

**Calls:**
- `freeze` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/execa@9.6.1/node_modules/execa/lib/arguments/escape.js:57` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `getSpecialCharRegExp` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:816` | Self: 0.0% (0us) | Total: 1.0% (4.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `chunkedPathCopyObservation` (3)
- `chunkedPathCopyObservation` (1)

### `next`
`[native code]` | Self: 0.0% (0us) | Total: 1.3% (6.0ms) | Samples: 0

**Called by:**
- `admissionCandidatesForCore` (4)
- `compilePreparedAdmissionGraph` (1)

**Calls:**
- `arrayIteratorNextHelper` (5)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/system/hashing/hash.mjs:58` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:707` | Self: 0.0% (0us) | Total: 37.1% (168.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (132)

**Calls:**
- `profiledRows` (50)
- `profiledRows` (43)
- `profiledRows` (21)
- `profiledRows` (11)
- `profiledRows` (7)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:266` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `createAdmissionGraph` (1)

**Calls:**
- `map` (1)

### `chunkedStatuses`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1416` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `selectionForSeed` (1)

**Calls:**
- `chunkTreeFor` (1)

### `summaryMarkdown`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:684` | Self: 0.0% (0us) | Total: 0.5% (2.5ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `gitCommit` (2)

### `makeSafe`
`internal:primordials:30` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `internal:primordials` (1)

**Calls:**
- `bound call` (1)

### `onConstructed`
`internal:streams/writable:168` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `clearBuffer` (1)

### `node:fs/promises`
`node:fs/promises:2` | Self: 0.0% (0us) | Total: 0.7% (3.5ms) | Samples: 0

**Calls:**
- `anonymous` (2)
- `@lazy` (1)

### `normalizeTasks`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:128` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (1)

**Calls:**
- `add` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:267` | Self: 0.0% (0us) | Total: 0.5% (2.5ms) | Samples: 0

**Called by:**
- `createAdmissionGraph` (1)
- `preparedFixture` (1)

**Calls:**
- `sort` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/which@2.0.2/node_modules/which/which.js:7` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:208` | Self: 0.0% (0us) | Total: 0.2% (959us) | Samples: 0

**Called by:**
- `preparedFixture` (1)

**Calls:**
- `next` (1)

### `profiledRows`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:610` | Self: 0.0% (0us) | Total: 2.5% (11.5ms) | Samples: 0

**Called by:**
- `(module)` (7)

**Calls:**
- `coreAtDepth` (3)
- `coreAtDepth` (2)
- `coreAtDepth` (1)
- `coreAtDepth` (1)

### `chunkTreeFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1435` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `chunkedStatuses` (1)

**Calls:**
- `freeze` (1)

### `prepareTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:71` | Self: 0.0% (0us) | Total: 1.8% (8.5ms) | Samples: 0

**Called by:**
- `preparedFixture` (5)
- `compileAdmissionGraphInput` (2)

**Calls:**
- `normalizeTasks` (2)
- `normalizeTasks` (2)
- `normalizeTasks` (1)
- `normalizeTasks` (1)
- `normalizeTasks` (1)

### `stateAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:237` | Self: 0.0% (0us) | Total: 0.8% (3.7ms) | Samples: 0

**Called by:**
- `profiledRows` (3)

**Calls:**
- `initialState` (3)

### `createInitialAdmissionCoreState`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:285` | Self: 0.0% (0us) | Total: 1.9% (8.8ms) | Samples: 0

**Called by:**
- `initialState` (3)
- `coreAtDepth` (3)
- `chunkedPathCopyObservation` (1)

**Calls:**
- `buildSemanticSelection` (1)
- `buildSemanticSelection` (1)
- `buildSemanticSelection` (1)
- `buildSemanticSelection` (1)
- `buildSemanticSelection` (1)
- `selectionForSeed` (1)
- `buildSemanticSelection` (1)

### `retainedBranchObservation`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:758` | Self: 0.0% (0us) | Total: 2.4% (11.1ms) | Samples: 0

**Called by:**
- `(module)` (5)
- `(module)` (4)

**Calls:**
- `freeze` (6)
- `admissionCandidatesForCore` (2)
- `admissionCandidatesForCore` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:815` | Self: 0.0% (0us) | Total: 6.9% (31.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (25)

**Calls:**
- `retainedBranchObservation` (9)
- `retainedBranchObservation` (6)
- `retainedBranchObservation` (5)
- `retainedBranchObservation` (4)
- `retainedBranchObservation` (1)

### `retainedBranchObservation`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:759` | Self: 0.0% (0us) | Total: 3.9% (17.7ms) | Samples: 0

**Called by:**
- `(module)` (9)
- `(module)` (5)

**Calls:**
- `gc` (14)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:818` | Self: 0.0% (0us) | Total: 6.0% (27.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (21)

**Calls:**
- `retainedBranchObservation` (7)
- `retainedBranchObservation` (5)
- `retainedBranchObservation` (4)
- `retainedBranchObservation` (3)
- `retainedBranchObservation` (1)
- `retainedBranchObservation` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:200` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `createAdmissionGraph` (1)

**Calls:**
- `freeze` (1)

### `graphFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:194` | Self: 0.0% (0us) | Total: 0.8% (3.6ms) | Samples: 0

**Called by:**
- `preparedFixture` (1)

**Calls:**
- `from` (1)

### `stringify`
`[native code]` | Self: 0.0% (0us) | Total: 0.5% (2.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `toJSON` (1)

### `select`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:514` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `stateAtDepth` (1)

**Calls:**
- `selectAdmissionCore` (1)

### `validateTaskRelations`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:37` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `validatePreparedTaskGraph` (1)

**Calls:**
- `validateRelatedTaskIds` (1)

### `internal:primordials`
`internal:primordials:71` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `makeSafe` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/uri.js:3` | Self: 0.0% (0us) | Total: 0.5% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `blockerStageFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:753` | Self: 0.0% (0us) | Total: 0.5% (2.2ms) | Samples: 0

**Called by:**
- `selectionRejectionForPendingTask` (2)

**Calls:**
- `numberFor` (2)

### `normalizeTasks`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:136` | Self: 0.0% (0us) | Total: 0.5% (2.3ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (2)

**Calls:**
- `stringList` (1)
- `freeze` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:27` | Self: 0.0% (0us) | Total: 0.3% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `bound resolve` (1)

### `coreAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:252` | Self: 0.0% (0us) | Total: 1.1% (5.3ms) | Samples: 0

**Called by:**
- `profiledRows` (2)

**Calls:**
- `admissionCandidatesForCore` (1)
- `freeze` (1)

### `withStatusAt`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1525` | Self: 0.0% (0us) | Total: 0.5% (2.5ms) | Samples: 0

**Called by:**
- `transitionChunkedSelection` (2)

**Calls:**
- `withChunkAt` (2)

### `prepareTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:70` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `compileAdmissionGraphInput` (1)

**Calls:**
- `record` (1)

### `find`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `getSignalByNumber` (1)

**Calls:**
- `(anonymous)` (1)

### `node:events`
`node:events:9` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`internal:streams/writable:197` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `bound onceWrapper` (1)

**Calls:**
- `onConstructed` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/@humanwhocodes+momoa@3.3.12/node_modules/@humanwhocodes/momoa/dist/momoa.js:105` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `performIteration` (1)

### `preparedFixture`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:217` | Self: 0.0% (0us) | Total: 1.8% (8.3ms) | Samples: 0

**Called by:**
- `profiledRows` (5)
- `chunkedPathCopyObservation` (1)
- `retainedBranchObservation` (1)

**Calls:**
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)

### `gitCommit`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:701` | Self: 0.0% (0us) | Total: 1.4% (6.7ms) | Samples: 0

**Called by:**
- `(module)` (3)
- `summaryMarkdown` (2)

**Calls:**
- `execFileSync` (5)

### `preparedFixture`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:215` | Self: 0.0% (0us) | Total: 2.2% (10.1ms) | Samples: 0

**Called by:**
- `profiledRows` (5)
- `retainedBranchObservation` (2)
- `chunkedPathCopyObservation` (1)

**Calls:**
- `prepareTaskGraph` (5)
- `prepareTaskGraph` (2)
- `prepareTaskGraph` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:106` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `freeze` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:23` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `getSignalsByName` (1)

### `taskGraphFromSchedulerSnapshot`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:561` | Self: 0.0% (0us) | Total: 1.0% (4.6ms) | Samples: 0

**Called by:**
- `compileAdmissionGraphInput` (4)

**Calls:**
- `map` (4)

### `measuredSync`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:320` | Self: 0.0% (0us) | Total: 8.5% (38.8ms) | Samples: 0

**Called by:**
- `profiledRows` (17)
- `profiledRows` (13)

**Calls:**
- `(anonymous)` (17)
- `(anonymous)` (13)

### `internal:streams/lazy_transform`
`internal:streams/lazy_transform:2` | Self: 0.0% (0us) | Total: 1.3% (5.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `prepareTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:76` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `preparedFixture` (1)

**Calls:**
- `validatePreparedTaskGraph` (1)

### `onConstruct`
`internal:streams/destroy:144` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `processTicksAndRejections` (1)

**Calls:**
- `emit` (1)

### `getSignalsByNumber`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:31` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `from` (1)

### `retainedBranchObservation`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:743` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `selectAdmissionCore` (1)

### `schedulerGraphSnapshot`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:101` | Self: 0.0% (0us) | Total: 0.5% (2.6ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (2)

**Calls:**
- `map` (2)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:857` | Self: 0.0% (0us) | Total: 0.5% (2.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `summaryMarkdown` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js:5` | Self: 0.0% (0us) | Total: 1.5% (6.7ms) | Samples: 0

**Calls:**
- `bound require` (6)

### `measuredSync`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:321` | Self: 0.0% (0us) | Total: 16.5% (74.9ms) | Samples: 0

**Called by:**
- `profiledRows` (33)
- `profiledRows` (30)

**Calls:**
- `from` (63)

### `compileAdmissionGraphInput`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:554` | Self: 0.0% (0us) | Total: 1.3% (6.1ms) | Samples: 0

**Called by:**
- `createAdmissionGraph` (5)

**Calls:**
- `prepareTaskGraph` (2)
- `prepareTaskGraph` (1)
- `prepareTaskGraph` (1)
- `prepareTaskGraph` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:13` | Self: 0.0% (0us) | Total: 0.5% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:247` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `preparedFixture` (1)

**Calls:**
- `freeze` (1)

### `buildSemanticSelection`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1244` | Self: 0.0% (0us) | Total: 0.3% (1.4ms) | Samples: 0

**Called by:**
- `createInitialAdmissionCoreState` (1)

**Calls:**
- `map` (1)

### `coreAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:257` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `profiledRows` (1)

**Calls:**
- `settleRunningAdmissionCore` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/lib/parse.js:4` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `node:crypto`
`node:crypto:2` | Self: 0.0% (0us) | Total: 1.3% (5.9ms) | Samples: 0

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/fast-uri@3.1.3/node_modules/fast-uri/index.js:4` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `preparedFixture`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:218` | Self: 0.0% (0us) | Total: 4.0% (18.3ms) | Samples: 0

**Called by:**
- `profiledRows` (10)
- `retainedBranchObservation` (4)
- `chunkedPathCopyObservation` (1)

**Calls:**
- `createAdmissionGraph` (15)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:578` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `stringArray` (1)

### `capacityRejectionFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:803` | Self: 0.0% (0us) | Total: 1.0% (4.5ms) | Samples: 0

**Called by:**
- `catalogForCore` (4)

**Calls:**
- `scopeCapacityBlockerFor` (2)
- `scopeCapacityBlockerFor` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/lib/util/resolveCommand.js:4` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `normalizeTasks`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:137` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (1)

**Calls:**
- `stringList` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/index.js:7` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js:6` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Calls:**
- `bound require` (1)

### `spawnSync`
`node:child_process:203` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `execFileSync` (1)

**Calls:**
- `normalizeSpawnArguments` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:70` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `getSignalsByNumber` (1)

### `withSelectedTaskStatus`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:973` | Self: 0.0% (0us) | Total: 0.7% (3.5ms) | Samples: 0

**Called by:**
- `selectAdmissionCore` (3)

**Calls:**
- `transitionChunkedSelection` (2)
- `transitionSelection` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/execa@9.6.1/node_modules/execa/lib/transform/run-async.js:4` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `callbackify` (1)

### `profiledRows`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:613` | Self: 0.0% (0us) | Total: 11.6% (52.5ms) | Samples: 0

**Called by:**
- `(module)` (43)

**Calls:**
- `measuredSync` (30)
- `measuredSync` (13)

### `bound require`
`[native code]` | Self: 0.0% (0us) | Total: 18.5% (83.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (12)
- `(anonymous)` (8)
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
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `require` (64)
- `anonymous` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/machine-output/v4/schema.ts:13` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `RecordAction` (1)

### `prepareTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:79` | Self: 0.0% (0us) | Total: 0.8% (3.8ms) | Samples: 0

**Called by:**
- `preparedFixture` (2)
- `compileAdmissionGraphInput` (1)

**Calls:**
- `schedulerGraphSnapshot` (2)
- `schedulerGraphSnapshot` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:238` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `preparedFixture` (1)

**Calls:**
- `freeze` (1)

### `profiledRows`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:625` | Self: 0.0% (0us) | Total: 13.5% (61.2ms) | Samples: 0

**Called by:**
- `(module)` (50)

**Calls:**
- `measuredSync` (33)
- `measuredSync` (17)

### `schedulerGraphSnapshot`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:100` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (1)

**Calls:**
- `freeze` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:622` | Self: 0.0% (0us) | Total: 11.6% (52.5ms) | Samples: 0

**Called by:**
- `sampleSync` (30)
- `measuredSync` (13)

**Calls:**
- `catalogForCore` (22)
- `catalogForCore` (11)
- `catalogForCore` (5)
- `catalogForCore` (3)
- `catalogForCore` (1)
- `catalogForCore` (1)

### `withChunkAt`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1477` | Self: 0.0% (0us) | Total: 0.5% (2.5ms) | Samples: 0

**Called by:**
- `withChunkAt` (2)

**Calls:**
- `freeze` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:4` | Self: 0.0% (0us) | Total: 0.4% (2.1ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `forEach`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `bound call` (1)

**Calls:**
- `(anonymous)` (1)

### `preparedFixture`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:214` | Self: 0.0% (0us) | Total: 0.8% (3.6ms) | Samples: 0

**Called by:**
- `profiledRows` (1)

**Calls:**
- `graphFor` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/csv-parse@7.0.1/node_modules/csv-parse/lib/api/index.js:22` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `blockerStageFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:754` | Self: 0.0% (0us) | Total: 0.8% (3.6ms) | Samples: 0

**Called by:**
- `selectionRejectionForPendingTask` (3)

**Calls:**
- `numberFor` (3)

### `withChunkAt`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1480` | Self: 0.0% (0us) | Total: 1.1% (5.0ms) | Samples: 0

**Called by:**
- `withStatusAt` (2)
- `withChunkAt` (2)

**Calls:**
- `withChunkAt` (2)
- `withChunkAt` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/index.js:4` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `bound require` (1)

### `validatePreparedTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:27` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (1)

**Calls:**
- `validateTaskRelations` (1)

### `blockerStageFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:751` | Self: 0.0% (0us) | Total: 0.5% (2.3ms) | Samples: 0

**Called by:**
- `selectionRejectionForPendingTask` (1)

**Calls:**
- `semanticSelectionFor` (1)

### `withTaskStatus`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:955` | Self: 0.0% (0us) | Total: 0.5% (2.4ms) | Samples: 0

**Called by:**
- `settleRunningAdmissionCore` (2)

**Calls:**
- `transitionChunkedSelection` (1)
- `transitionSelection` (1)

### `chunkedPathCopyObservation`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:791` | Self: 0.0% (0us) | Total: 0.7% (3.5ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `preparedFixture` (1)
- `preparedFixture` (1)
- `preparedFixture` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js:22` | Self: 0.0% (0us) | Total: 0.5% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/boolSchema.js:4` | Self: 0.0% (0us) | Total: 1.0% (4.8ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `catalogForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:678` | Self: 0.0% (0us) | Total: 6.1% (27.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (22)
- `stateAtDepth` (2)

**Calls:**
- `freeze` (24)

### `buildSemanticSelection`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1280` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `createInitialAdmissionCoreState` (1)

**Calls:**
- `arrayIteratorNextHelper` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:9` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `chunkedPathCopyObservation`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:792` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `createInitialAdmissionCoreState` (1)

### `internal:shared`
`internal:shared:2` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `requiredTask`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1651` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `catalogForCore` (1)

**Calls:**
- `requiredTaskForCompiled` (1)

### `stateAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:239` | Self: 0.0% (0us) | Total: 2.1% (9.5ms) | Samples: 0

**Called by:**
- `profiledRows` (7)

**Calls:**
- `catalogForCore` (2)
- `catalogForCore` (2)
- `catalogForCore` (2)
- `catalogForCore` (1)

### `node:os`
`node:os:110` | Self: 0.0% (0us) | Total: 1.1% (5.0ms) | Samples: 0

**Calls:**
- `bound` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:4` | Self: 0.0% (0us) | Total: 1.0% (4.8ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `bound call`
`[native code]` | Self: 0.0% (0us) | Total: 0.5% (2.3ms) | Samples: 0

**Called by:**
- `makeSafe` (1)
- `internal:util/inspect` (1)

**Calls:**
- `forEach` (1)
- `filter` (1)

### `toJSON`
`node:os:57` | Self: 0.0% (0us) | Total: 0.5% (2.3ms) | Samples: 0

**Called by:**
- `stringify` (1)

**Calls:**
- `populate` (1)

### `settleRunningAdmissionCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:387` | Self: 0.0% (0us) | Total: 0.5% (2.4ms) | Samples: 0

**Called by:**
- `retainedBranchObservation` (1)
- `coreAtDepth` (1)

**Calls:**
- `withTaskStatus` (2)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 1.3% (5.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `get ReadStream`
`node:fs:578` | Self: 0.0% (0us) | Total: 0.7% (3.3ms) | Samples: 0

**Calls:**
- `anonymous` (2)

### `stateAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:243` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `profiledRows` (1)

**Calls:**
- `select` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:842` | Self: 0.0% (0us) | Total: 0.9% (4.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `gitCommit` (3)

### `profiledRows`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:609` | Self: 0.0% (0us) | Total: 3.1% (14.3ms) | Samples: 0

**Called by:**
- `(module)` (11)

**Calls:**
- `stateAtDepth` (7)
- `stateAtDepth` (3)
- `stateAtDepth` (1)

### `retainedBranchObservation`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:745` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `settleRunningAdmissionCore` (1)

### `retainedBranchObservation`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:737` | Self: 0.0% (0us) | Total: 1.8% (8.4ms) | Samples: 0

**Called by:**
- `(module)` (4)
- `(module)` (3)

**Calls:**
- `preparedFixture` (4)
- `preparedFixture` (2)
- `preparedFixture` (1)

### `execFileSync`
`node:child_process:264` | Self: 0.0% (0us) | Total: 1.4% (6.7ms) | Samples: 0

**Called by:**
- `gitCommit` (5)

**Calls:**
- `spawnSync` (4)
- `spawnSync` (1)

### `initialState`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:277` | Self: 0.0% (0us) | Total: 0.8% (3.7ms) | Samples: 0

**Called by:**
- `stateAtDepth` (3)

**Calls:**
- `createInitialAdmissionCoreState` (3)

### `selectionRejectionForPendingTask`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:735` | Self: 0.0% (0us) | Total: 2.3% (10.6ms) | Samples: 0

**Called by:**
- `catalogForCore` (8)

**Calls:**
- `blockerStageFor` (3)
- `blockerStageFor` (2)
- `blockerStageFor` (2)
- `blockerStageFor` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:856` | Self: 0.0% (0us) | Total: 0.5% (2.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `stringify` (1)

### `emit`
`node:events:92` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `onConstruct` (1)

**Calls:**
- `bound onceWrapper` (1)

### `bound resolve`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (1.4ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `resolve` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/next.js:4` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js:4` | Self: 0.0% (0us) | Total: 2.1% (9.6ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js:4` | Self: 0.0% (0us) | Total: 4.4% (20.2ms) | Samples: 0

**Calls:**
- `bound require` (12)

### `internal:validators`
`internal:validators:2` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `normalizeTasks`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:123` | Self: 0.0% (0us) | Total: 0.5% (2.3ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (2)

**Calls:**
- `record` (1)
- `record` (1)

### `getSignalsByName`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:10` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `map` (1)

### `buildSemanticSelection`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1245` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `createInitialAdmissionCoreState` (1)

**Calls:**
- `from` (1)

### `normalizeSpawnArguments`
`node:child_process:430` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `spawnSync` (1)

**Calls:**
- `push` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/index.js:8` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `compileAdmissionGraphInput`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:553` | Self: 0.0% (0us) | Total: 1.0% (4.6ms) | Samples: 0

**Called by:**
- `createAdmissionGraph` (4)

**Calls:**
- `taskGraphFromSchedulerSnapshot` (4)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:634` | Self: 0.0% (0us) | Total: 13.2% (59.8ms) | Samples: 0

**Called by:**
- `sampleSync` (32)
- `measuredSync` (17)

**Calls:**
- `admissionCandidatesForCore` (17)
- `freeze` (16)
- `admissionCandidatesForCore` (7)
- `admissionCandidatesForCore` (6)
- `admissionCandidatesForCore` (3)

### `RecordAction`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/type/engine/record/instantiate.mjs:8` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `CanInstantiate` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:5` | Self: 0.0% (0us) | Total: 0.5% (2.3ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `internal:util/inspect`
`internal:util/inspect:179` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound call` (1)

### `coreAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:250` | Self: 0.0% (0us) | Total: 0.8% (3.7ms) | Samples: 0

**Called by:**
- `profiledRows` (3)

**Calls:**
- `createInitialAdmissionCoreState` (3)

### `internal:streams/transform`
`internal:streams/transform:2` | Self: 0.0% (0us) | Total: 1.3% (5.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/errors.js:4` | Self: 0.0% (0us) | Total: 0.5% (2.2ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/isexe@2.0.0/node_modules/isexe/index.js:1` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:3` | Self: 0.0% (0us) | Total: 0.2% (997us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:243` | Self: 0.0% (0us) | Total: 0.5% (2.4ms) | Samples: 0

**Called by:**
- `createAdmissionGraph` (2)

**Calls:**
- `freeze` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/errors.js:6` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `prepareTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:73` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `compileAdmissionGraphInput` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:7` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `catalogForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:673` | Self: 0.0% (0us) | Total: 0.7% (3.5ms) | Samples: 0

**Called by:**
- `stateAtDepth` (2)
- `(anonymous)` (1)

**Calls:**
- `push` (3)

### `createAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:274` | Self: 0.0% (0us) | Total: 4.0% (18.3ms) | Samples: 0

**Called by:**
- `preparedFixture` (15)

**Calls:**
- `compileAdmissionGraphInput` (5)
- `compileAdmissionGraphInput` (4)
- `compilePreparedAdmissionGraph` (2)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)
- `compilePreparedAdmissionGraph` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/index.js:4` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:234` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `createAdmissionGraph` (1)

**Calls:**
- `freeze` (1)

### `hasCapacityForPendingTask`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:792` | Self: 0.0% (0us) | Total: 1.8% (8.5ms) | Samples: 0

**Called by:**
- `admissionCandidatesForCore` (7)

**Calls:**
- `scopeCapacityBlockerFor` (4)
- `scopeCapacityBlockerFor` (3)

### `bound onceWrapper`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `emit` (1)

**Calls:**
- `(anonymous)` (1)

### `coreAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:255` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `profiledRows` (1)

**Calls:**
- `selectAdmissionCore` (1)

### `retainedBranchObservation`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:735` | Self: 0.0% (0us) | Total: 3.9% (17.6ms) | Samples: 0

**Called by:**
- `(module)` (7)
- `(module)` (6)

**Calls:**
- `gc` (13)

### `catalogForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:671` | Self: 0.0% (0us) | Total: 3.6% (16.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (11)
- `stateAtDepth` (2)

**Calls:**
- `selectionRejectionForPendingTask` (8)
- `capacityRejectionFor` (4)
- `selectionRejectionForPendingTask` (1)

### `getSignalByNumber`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:38` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `from` (1)

**Calls:**
- `find` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/core/index.js:4` | Self: 0.0% (0us) | Total: 0.2% (997us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `sort`
`[native code]` | Self: 0.0% (0us) | Total: 0.5% (2.5ms) | Samples: 0

**Called by:**
- `compilePreparedAdmissionGraph` (2)

**Calls:**
- `(anonymous)` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/resolve.js:6` | Self: 0.0% (0us) | Total: 0.3% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `transitionChunkedSelection`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1067` | Self: 0.0% (0us) | Total: 0.8% (3.8ms) | Samples: 0

**Called by:**
- `withSelectedTaskStatus` (2)
- `withTaskStatus` (1)

**Calls:**
- `withStatusAt` (2)
- `withStatusAt` (1)

### `catalogForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:670` | Self: 0.0% (0us) | Total: 1.3% (5.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `statusForStore` (2)
- `statusForStore` (1)

### `profiledRows`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:608` | Self: 0.0% (0us) | Total: 6.2% (28.4ms) | Samples: 0

**Called by:**
- `(module)` (21)

**Calls:**
- `preparedFixture` (10)
- `preparedFixture` (5)
- `preparedFixture` (5)
- `preparedFixture` (1)

### `catalogForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:672` | Self: 0.0% (0us) | Total: 0.2% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `requiredTask` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:222` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `preparedFixture` (1)

**Calls:**
- `map` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:248` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `preparedFixture` (1)

**Calls:**
- `freeze` (1)

### `selectionForSeed`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1011` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `createInitialAdmissionCoreState` (1)

**Calls:**
- `chunkedStatuses` (1)

### `internal:fs/streams`
`internal:fs/streams:249` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `(anonymous)` (1)

### `spawnSync`
`node:child_process:226` | Self: 0.0% (0us) | Total: 1.1% (5.3ms) | Samples: 0

**Called by:**
- `execFileSync` (4)

**Calls:**
- `spawnSync` (4)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/index.js:13` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `selectAdmissionCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:329` | Self: 0.0% (0us) | Total: 0.7% (3.5ms) | Samples: 0

**Called by:**
- `coreAtDepth` (1)
- `retainedBranchObservation` (1)
- `select` (1)

**Calls:**
- `withSelectedTaskStatus` (3)

### `buildSemanticSelection`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:1305` | Self: 0.0% (0us) | Total: 0.2% (1.1ms) | Samples: 0

**Called by:**
- `createInitialAdmissionCoreState` (1)

**Calls:**
- `map` (1)

### `exactRecord`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:627` | Self: 0.0% (0us) | Total: 0.3% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `ownKeys` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 76.2% | 345.0ms | `[native code]` |
| 16.3% | 73.9ms | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 1.9% | 8.6ms | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts` |
| 1.6% | 7.3ms | `node:os` |
| 1.3% | 6.2ms | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` |
| 0.2% | 1.3ms | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts` |
| 0.2% | 1.3ms | `internal:primordials` |
| 0.2% | 1.2ms | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/index.js` |
| 0.2% | 1.2ms | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/execa@9.6.1/node_modules/execa/lib/arguments/escape.js` |
| 0.2% | 1.2ms | `node:util` |
| 0.2% | 1.1ms | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/type/engine/instantiate.mjs` |
| 0.2% | 1.1ms | `internal:streams/writable` |
| 0.2% | 1.1ms | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/system/hashing/hash.mjs` |
| 0.2% | 1.0ms | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js` |
