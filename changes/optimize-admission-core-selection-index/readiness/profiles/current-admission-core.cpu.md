# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 10.91s | 9072 | 1.0ms | 209 |

**Top 10:** `filter` 95.2%, `(anonymous)` 1.1%, `freeze` 0.9%, `anonymous` 0.4%, `catalogForCore` 0.2%, `requiredTask` 0.2%, `push` 0.1%, `runningCount` 0.1%, `Writable` 0.0%, `relationOrMutexRejectionFor` 0.0%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 95.2% | 10.39s | 95.3% | 10.40s | `filter` | `[native code]` |
| 1.1% | 121.9ms | 99.4% | 10.85s | `(anonymous)` | `[native code]` |
| 0.9% | 104.2ms | 0.9% | 104.2ms | `freeze` | `[native code]` |
| 0.4% | 50.4ms | 1.4% | 154.4ms | `anonymous` | `[native code]` |
| 0.2% | 27.4ms | 0.2% | 27.4ms | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:500` |
| 0.2% | 24.0ms | 0.2% | 24.0ms | `requiredTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.1% | 16.8ms | 0.1% | 16.8ms | `push` | `[native code]` |
| 0.1% | 16.2ms | 94.5% | 10.31s | `runningCount` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:726` |
| 0.0% | 10.4ms | 0.0% | 10.4ms | `Writable` | `internal:streams/writable` |
| 0.0% | 8.3ms | 0.0% | 8.3ms | `relationOrMutexRejectionFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.0% | 7.4ms | 0.0% | 7.4ms | `taskStatusFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.0% | 7.0ms | 0.2% | 21.9ms | `relationOrMutexRejectionFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:569` |
| 0.0% | 6.2ms | 0.0% | 6.2ms | `stringify` | `[native code]` |
| 0.0% | 5.8ms | 0.0% | 5.8ms | `spawnSync` | `[native code]` |
| 0.0% | 5.1ms | 0.0% | 5.1ms | `bound` | `node:os` |
| 0.0% | 4.9ms | 0.0% | 7.2ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:627` |
| 0.0% | 4.8ms | 0.2% | 26.7ms | `activeScopesFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:680` |
| 0.0% | 4.4ms | 0.0% | 4.4ms | `memoryUsage` | `[native code]` |
| 0.0% | 3.9ms | 0.0% | 3.9ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.0% | 3.8ms | 0.2% | 30.6ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:615` |
| 0.0% | 3.5ms | 0.0% | 10.7ms | `map` | `[native code]` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `createWarning` | `node:async_hooks` |
| 0.0% | 3.5ms | 0.2% | 28.4ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:272` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:173` |
| 0.0% | 3.5ms | 47.2% | 5.15s | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:273` |
| 0.0% | 2.6ms | 0.1% | 14.4ms | `relationOrMutexRejectionFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:581` |
| 0.0% | 2.6ms | 0.0% | 3.9ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:267` |
| 0.0% | 2.5ms | 48.3% | 5.27s | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:503` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `sort` | `[native code]` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `FromValue` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/system/memory/clone.mjs:92` |
| 0.0% | 2.3ms | 0.1% | 11.0ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:271` |
| 0.0% | 2.3ms | 0.3% | 39.7ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:269` |
| 0.0% | 2.1ms | 46.9% | 5.12s | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:586` |
| 0.0% | 2.1ms | 0.0% | 3.3ms | `requiredTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:838` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `stringArray` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:488` |
| 0.0% | 1.3ms | 0.0% | 8.2ms | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:504` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `async writeFile` | `node:fs/promises` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:625` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `capacityRejectionFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.0% | 1.3ms | 0.2% | 31.1ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:626` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `forcedBlockedTaskFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:669` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `initializeFactory` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/micromark@4.0.2/node_modules/micromark/lib/initialize/text.js` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/yoctocolors@2.1.2/node_modules/yoctocolors/base.js:6` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/code.js:69` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `selectAdmissionCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:152` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `internal:util/inspect:179` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `taskStatusFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:740` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `get` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:32` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:727` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `arrayIteratorNextHelper` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `forcedBlockedTaskFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:670` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `relatedTaskIds` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:199` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `getSignalByName` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js` |
| 0.0% | 1.1ms | 0.6% | 75.4ms | `capacityRejectionFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:592` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `stringList` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:212` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `selectAdmissionCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:150` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `selectionRejectionForPendingTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `forEach` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `Map` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `normalizeExecFileArgs` | `node:child_process` |
| 0.0% | 1.0ms | 0.0% | 2.2ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:268` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `toUpperCase` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 2.1ms | `validateTaskRelationCycles` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:87` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `spawnSync` | `node:child_process:227` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `requiredTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:840` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `keys` | `[native code]` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 99.4% | 10.85s | 1.1% | 121.9ms | `(anonymous)` | `[native code]` |
| 99.3% | 10.84s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 97.9% | 10.69s | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:670` |
| 95.3% | 10.40s | 95.2% | 10.39s | `filter` | `[native code]` |
| 94.5% | 10.31s | 0.1% | 16.2ms | `runningCount` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:726` |
| 94.5% | 10.31s | 0.0% | 0us | `capacityRejectionFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:591` |
| 66.2% | 7.23s | 0.0% | 0us | `from` | `[native code]` |
| 66.2% | 7.22s | 0.0% | 0us | `measuredSync` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:325` |
| 66.1% | 7.22s | 0.0% | 0us | `sampleSync` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:285` |
| 48.3% | 5.27s | 0.0% | 2.5ms | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:503` |
| 47.2% | 5.15s | 0.0% | 3.5ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:273` |
| 47.0% | 5.13s | 0.0% | 0us | `profiledRows` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:577` |
| 46.9% | 5.12s | 0.0% | 2.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:586` |
| 45.9% | 5.01s | 0.0% | 0us | `profiledRows` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:589` |
| 45.9% | 5.01s | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:598` |
| 26.7% | 2.91s | 0.0% | 0us | `measuredSync` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:324` |
| 2.4% | 264.3ms | 0.0% | 0us | `profiledRows` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:573` |
| 2.4% | 263.8ms | 0.0% | 0us | `profiledRows` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:574` |
| 2.3% | 260.9ms | 0.0% | 0us | `stateAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:224` |
| 2.3% | 259.0ms | 0.0% | 0us | `coreAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:242` |
| 1.4% | 154.4ms | 0.4% | 50.4ms | `anonymous` | `[native code]` |
| 0.9% | 104.2ms | 0.9% | 104.2ms | `freeze` | `[native code]` |
| 0.7% | 81.1ms | 0.0% | 0us | `bound require` | `[native code]` |
| 0.7% | 81.1ms | 0.0% | 0us | `require` | `[native code]` |
| 0.6% | 75.4ms | 0.0% | 1.1ms | `capacityRejectionFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:592` |
| 0.3% | 39.7ms | 0.0% | 2.3ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:269` |
| 0.3% | 36.1ms | 0.0% | 0us | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:509` |
| 0.2% | 31.1ms | 0.0% | 1.3ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:626` |
| 0.2% | 30.6ms | 0.0% | 3.8ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:615` |
| 0.2% | 29.3ms | 0.0% | 0us | `selectionRejectionForPendingTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:562` |
| 0.2% | 28.4ms | 0.0% | 3.5ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:272` |
| 0.2% | 28.3ms | 0.0% | 0us | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:502` |
| 0.2% | 27.4ms | 0.2% | 27.4ms | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:500` |
| 0.2% | 26.7ms | 0.0% | 4.8ms | `activeScopesFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:680` |
| 0.2% | 24.0ms | 0.2% | 24.0ms | `requiredTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.2% | 21.9ms | 0.0% | 7.0ms | `relationOrMutexRejectionFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:569` |
| 0.2% | 21.9ms | 0.0% | 0us | `relationOrMutexRejectionFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:575` |
| 0.1% | 18.6ms | 0.0% | 0us | `profiledRows` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:572` |
| 0.1% | 16.8ms | 0.1% | 16.8ms | `push` | `[native code]` |
| 0.1% | 15.4ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js:4` |
| 0.1% | 14.4ms | 0.0% | 2.6ms | `relationOrMutexRejectionFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:581` |
| 0.1% | 13.5ms | 0.0% | 0us | `node:util` | `node:util:2` |
| 0.1% | 11.0ms | 0.0% | 2.3ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:271` |
| 0.0% | 10.7ms | 0.0% | 3.5ms | `map` | `[native code]` |
| 0.0% | 10.4ms | 0.0% | 0us | `WriteStream` | `internal:fs/streams:245` |
| 0.0% | 10.4ms | 0.0% | 10.4ms | `Writable` | `internal:streams/writable` |
| 0.0% | 9.8ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js:4` |
| 0.0% | 8.3ms | 0.0% | 8.3ms | `relationOrMutexRejectionFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.0% | 8.2ms | 0.0% | 1.3ms | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:504` |
| 0.0% | 7.9ms | 0.0% | 0us | `gitCommit` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:663` |
| 0.0% | 7.9ms | 0.0% | 0us | `preparedFixture` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:199` |
| 0.0% | 7.9ms | 0.0% | 0us | `createAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:97` |
| 0.0% | 7.6ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:718` |
| 0.0% | 7.4ms | 0.0% | 0us | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:501` |
| 0.0% | 7.4ms | 0.0% | 7.4ms | `taskStatusFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.0% | 7.2ms | 0.0% | 4.9ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:627` |
| 0.0% | 7.0ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js:5` |
| 0.0% | 6.9ms | 0.0% | 0us | `node:crypto` | `node:crypto:2` |
| 0.0% | 6.9ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.0% | 6.9ms | 0.0% | 0us | `internal:streams/transform` | `internal:streams/transform:2` |
| 0.0% | 6.9ms | 0.0% | 0us | `internal:streams/lazy_transform` | `internal:streams/lazy_transform:2` |
| 0.0% | 6.8ms | 0.0% | 0us | `execFileSync` | `node:child_process:264` |
| 0.0% | 6.2ms | 0.0% | 6.2ms | `stringify` | `[native code]` |
| 0.0% | 6.1ms | 0.0% | 0us | `preparedFixture` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:196` |
| 0.0% | 5.8ms | 0.0% | 0us | `spawnSync` | `node:child_process:226` |
| 0.0% | 5.8ms | 0.0% | 5.8ms | `spawnSync` | `[native code]` |
| 0.0% | 5.6ms | 0.0% | 0us | `internal:streams/add-abort-signal` | `internal:streams/add-abort-signal:2` |
| 0.0% | 5.6ms | 0.0% | 0us | `internal:streams/readable` | `internal:streams/readable:2` |
| 0.0% | 5.1ms | 0.0% | 0us | `node:os` | `node:os:110` |
| 0.0% | 5.1ms | 0.0% | 5.1ms | `bound` | `node:os` |
| 0.0% | 4.6ms | 0.0% | 0us | `reconcileForcedBlocks` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:641` |
| 0.0% | 4.6ms | 0.0% | 0us | `settleRunningAdmissionCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:211` |
| 0.0% | 4.5ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/boolSchema.js:4` |
| 0.0% | 4.5ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:4` |
| 0.0% | 4.4ms | 0.0% | 4.4ms | `memoryUsage` | `[native code]` |
| 0.0% | 4.4ms | 0.0% | 0us | `prepareTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:71` |
| 0.0% | 4.4ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:705` |
| 0.0% | 4.2ms | 0.0% | 0us | `compileAdmissionGraphInput` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:385` |
| 0.0% | 3.9ms | 0.0% | 2.6ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:267` |
| 0.0% | 3.9ms | 0.0% | 3.9ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.0% | 3.6ms | 0.0% | 0us | `compileAdmissionGraphInput` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:384` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `createWarning` | `node:async_hooks` |
| 0.0% | 3.5ms | 0.0% | 0us | `node:async_hooks` | `node:async_hooks:179` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:173` |
| 0.0% | 3.5ms | 0.0% | 0us | `graphFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:172` |
| 0.0% | 3.5ms | 0.0% | 0us | `preparedFixture` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:195` |
| 0.0% | 3.5ms | 0.0% | 0us | `summaryMarkdown` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:649` |
| 0.0% | 3.5ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:719` |
| 0.0% | 3.4ms | 0.0% | 0us | `node:events` | `node:events:9` |
| 0.0% | 3.4ms | 0.0% | 0us | `node:fs/promises` | `node:fs/promises:2` |
| 0.0% | 3.4ms | 0.0% | 0us | `sampleSync` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:288` |
| 0.0% | 3.3ms | 0.0% | 2.1ms | `requiredTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:838` |
| 0.0% | 2.6ms | 0.0% | 0us | `taskGraphFromSchedulerSnapshot` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:392` |
| 0.0% | 2.6ms | 0.0% | 0us | `node:stream` | `node:stream:2` |
| 0.0% | 2.6ms | 0.0% | 0us | `internal:fs/streams` | `internal:fs/streams:2` |
| 0.0% | 2.6ms | 0.0% | 0us | `get ReadStream` | `node:fs:578` |
| 0.0% | 2.6ms | 0.0% | 0us | `internal:stream` | `internal:stream:2` |
| 0.0% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/index.js:4` |
| 0.0% | 2.4ms | 0.0% | 0us | `coreAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:249` |
| 0.0% | 2.4ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:4` |
| 0.0% | 2.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/errors.js:4` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `sort` | `[native code]` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `FromValue` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/system/memory/clone.mjs:92` |
| 0.0% | 2.3ms | 0.0% | 0us | `AddOptionalAction` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/type/engine/optional/instantiate_add.mjs:8` |
| 0.0% | 2.3ms | 0.0% | 0us | `FromTypeObject` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/system/memory/clone.mjs:33` |
| 0.0% | 2.3ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/machine-output/v4/schema.ts:33` |
| 0.0% | 2.3ms | 0.0% | 0us | `Update` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/system/memory/update.mjs:12` |
| 0.0% | 2.3ms | 0.0% | 0us | `coreAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:252` |
| 0.0% | 2.3ms | 0.0% | 0us | `settle` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:351` |
| 0.0% | 2.3ms | 0.0% | 0us | `stateAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:231` |
| 0.0% | 2.3ms | 0.0% | 0us | `bound call` | `[native code]` |
| 0.0% | 2.2ms | 0.0% | 1.0ms | `admissionCandidatesForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:268` |
| 0.0% | 2.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/uri.js:3` |
| 0.0% | 2.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js:22` |
| 0.0% | 2.1ms | 0.0% | 0us | `prepareTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:76` |
| 0.0% | 2.1ms | 0.0% | 0us | `forcedBlockedTaskFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:666` |
| 0.0% | 2.1ms | 0.0% | 1.0ms | `validateTaskRelationCycles` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:87` |
| 0.0% | 2.1ms | 0.0% | 0us | `validatePreparedTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:28` |
| 0.0% | 2.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:5` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:409` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `stringArray` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:488` |
| 0.0% | 1.3ms | 0.0% | 0us | `prepareTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:73` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/dataType.js:5` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:5` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `async writeFile` | `node:fs/promises` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `scopeCapacityBlockerFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:625` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:13` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/resolve.js:6` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `capacityRejectionFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `forcedBlockedTaskFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:669` |
| 0.0% | 1.2ms | 0.0% | 0us | `schedulerGraphSnapshot` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:101` |
| 0.0% | 1.2ms | 0.0% | 0us | `prepareTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:79` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:104` |
| 0.0% | 1.2ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/micromark@4.0.2/node_modules/micromark/lib/initialize/text.js:15` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `initializeFactory` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/micromark@4.0.2/node_modules/micromark/lib/initialize/text.js` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/yoctocolors@2.1.2/node_modules/yoctocolors/base.js:6` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.0% | 1.2ms | 0.0% | 0us | `every` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 0us | `validateAdmissionCoreSelection` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:244` |
| 0.0% | 1.2ms | 0.0% | 0us | `selectAdmissionCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:147` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/uniqueItems.js:6` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/index.js:10` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/index.js:4` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:6` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/index.js:5` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/index.js:4` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:9` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/code.js:69` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/keyword.js:6` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:412` |
| 0.0% | 1.2ms | 0.0% | 0us | `internal:util/inspect` | `internal:util/inspect:179` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `selectAdmissionCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:152` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `internal:util/inspect:179` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `taskStatusFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:740` |
| 0.0% | 1.1ms | 0.0% | 0us | `normalizeTasks` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:132` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/index.js:6` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `get` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:70` |
| 0.0% | 1.1ms | 0.0% | 0us | `getSignalsByNumber` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:31` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:32` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/errors.js:5` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:727` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/format/index.js:3` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:9` |
| 0.0% | 1.1ms | 0.0% | 0us | `normalizeTasks` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:122` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `arrayIteratorNextHelper` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `forcedBlockedTaskFor` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:670` |
| 0.0% | 1.1ms | 0.0% | 0us | `visit` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:75` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `relatedTaskIds` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:199` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/which@2.0.2/node_modules/which/which.js:7` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/lib/util/resolveCommand.js:4` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/lib/parse.js:4` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `getSignalByName` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js` |
| 0.0% | 1.1ms | 0.0% | 0us | `getSignalsByName` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:10` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:23` |
| 0.0% | 1.1ms | 0.0% | 0us | `catalogForCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:508` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `stringList` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:212` |
| 0.0% | 1.1ms | 0.0% | 0us | `normalizeTasks` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:135` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `selectAdmissionCore` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:150` |
| 0.0% | 1.0ms | 0.0% | 0us | `stateAtDepth` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:230` |
| 0.0% | 1.0ms | 0.0% | 0us | `select` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:338` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `selectionRejectionForPendingTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.0% | 1.0ms | 0.0% | 0us | `internal:validators` | `internal:validators:2` |
| 0.0% | 1.0ms | 0.0% | 0us | `internal:primordials` | `internal:primordials:78` |
| 0.0% | 1.0ms | 0.0% | 0us | `makeSafe` | `internal:primordials:30` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `forEach` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `internal:shared` | `internal:shared:2` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `Map` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `compilePreparedAdmissionGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:90` |
| 0.0% | 1.0ms | 0.0% | 0us | `preparedFixture` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:198` |
| 0.0% | 1.0ms | 0.0% | 0us | `sampleSync` | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:283` |
| 0.0% | 1.0ms | 0.0% | 0us | `execFileSync` | `node:child_process:263` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `normalizeExecFileArgs` | `node:child_process` |
| 0.0% | 1.0ms | 0.0% | 0us | `prepareTaskGraph` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:80` |
| 0.0% | 1.0ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts:66` |
| 0.0% | 1.0ms | 0.0% | 0us | `caseInsensitiveExtensionPattern` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts:81` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `toUpperCase` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts:67` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts:82` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `spawnSync` | `node:child_process:227` |
| 0.0% | 1.0ms | 0.0% | 0us | `node:v8` | `node:v8:2` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `requiredTask` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:840` |
| 0.0% | 1.0ms | 0.0% | 0us | `normalizeTasks` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:123` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `keys` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `record` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:188` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/fast-uri@3.1.3/node_modules/fast-uri/index.js:3` |
| 0.0% | 993us | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/index.js:11` |
| 0.0% | 986us | 0.0% | 0us | `taskGraphFromSchedulerSnapshot` | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:441` |

## Function Details

### `filter`
`[native code]` | Self: 95.2% (10.39s) | Total: 95.3% (10.40s) | Samples: 8696

**Called by:**
- `runningCount` (8616)
- `scopeCapacityBlockerFor` (24)
- `activeScopesFor` (19)
- `relationOrMutexRejectionFor` (16)
- `relationOrMutexRejectionFor` (13)
- `relationOrMutexRejectionFor` (9)
- `bound call` (1)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)

### `(anonymous)`
`[native code]` | Self: 1.1% (121.9ms) | Total: 99.4% (10.85s) | Samples: 91

**Called by:**
- `processTicksAndRejections` (9043)

**Calls:**
- `(module)` (8933)
- `(module)` (4)
- `(module)` (4)
- `(module)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `WriteStream` (1)
- `(module)` (1)
- `node:v8` (1)
- `(module)` (1)
- `(module)` (1)

### `freeze`
`[native code]` | Self: 0.9% (104.2ms) | Total: 0.9% (104.2ms) | Samples: 85

**Called by:**
- `catalogForCore` (29)
- `(anonymous)` (29)
- `admissionCandidatesForCore` (21)
- `(anonymous)` (1)
- `normalizeTasks` (1)
- `taskGraphFromSchedulerSnapshot` (1)
- `catalogForCore` (1)
- `prepareTaskGraph` (1)
- `(anonymous)` (1)

### `anonymous`
`[native code]` | Self: 0.4% (50.4ms) | Total: 1.4% (154.4ms) | Samples: 26

**Called by:**
- `require` (66)
- `node:util` (3)
- `node:events` (2)
- `internal:streams/lazy_transform` (2)
- `internal:streams/duplex` (2)
- `node:crypto` (2)
- `internal:streams/transform` (2)
- `node:fs/promises` (2)
- `internal:stream` (1)
- `internal:validators` (1)
- `get ReadStream` (1)
- `internal:fs/streams` (1)
- `internal:streams/add-abort-signal` (1)
- `node:v8` (1)
- `internal:streams/readable` (1)
- `internal:shared` (1)
- `node:stream` (1)

**Calls:**
- `(anonymous)` (8)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `internal:streams/duplex` (2)
- `(anonymous)` (2)
- `internal:streams/transform` (2)
- `(anonymous)` (2)
- `internal:streams/lazy_transform` (2)
- `node:events` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:fs/streams` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:validators` (1)
- `(anonymous)` (1)
- `internal:shared` (1)
- `(anonymous)` (1)
- `internal:util/inspect` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `node:stream` (1)
- `(anonymous)` (1)
- `internal:streams/add-abort-signal` (1)
- `(anonymous)` (1)
- `internal:primordials` (1)
- `internal:stream` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:streams/readable` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `catalogForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:500` | Self: 0.2% (27.4ms) | Total: 0.2% (27.4ms) | Samples: 22

**Called by:**
- `(anonymous)` (21)
- `stateAtDepth` (1)

### `requiredTask`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` | Self: 0.2% (24.0ms) | Total: 0.2% (24.0ms) | Samples: 20

**Called by:**
- `catalogForCore` (20)

### `push`
`[native code]` | Self: 0.1% (16.8ms) | Total: 0.1% (16.8ms) | Samples: 14

**Called by:**
- `admissionCandidatesForCore` (7)
- `catalogForCore` (6)
- `admissionCandidatesForCore` (1)

### `runningCount`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:726` | Self: 0.1% (16.2ms) | Total: 94.5% (10.31s) | Samples: 10

**Called by:**
- `capacityRejectionFor` (8626)

**Calls:**
- `filter` (8616)

### `Writable`
`internal:streams/writable` | Self: 0.0% (10.4ms) | Total: 0.0% (10.4ms) | Samples: 1

**Called by:**
- `WriteStream` (1)

### `relationOrMutexRejectionFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` | Self: 0.0% (8.3ms) | Total: 0.0% (8.3ms) | Samples: 7

**Called by:**
- `admissionCandidatesForCore` (4)
- `selectionRejectionForPendingTask` (3)

### `taskStatusFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` | Self: 0.0% (7.4ms) | Total: 0.0% (7.4ms) | Samples: 6

**Called by:**
- `catalogForCore` (6)

### `relationOrMutexRejectionFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:569` | Self: 0.0% (7.0ms) | Total: 0.2% (21.9ms) | Samples: 6

**Called by:**
- `admissionCandidatesForCore` (10)
- `selectionRejectionForPendingTask` (9)

**Calls:**
- `filter` (13)

### `stringify`
`[native code]` | Self: 0.0% (6.2ms) | Total: 0.0% (6.2ms) | Samples: 3

**Called by:**
- `(module)` (3)

### `spawnSync`
`[native code]` | Self: 0.0% (5.8ms) | Total: 0.0% (5.8ms) | Samples: 4

**Called by:**
- `spawnSync` (4)

### `bound`
`node:os` | Self: 0.0% (5.1ms) | Total: 0.0% (5.1ms) | Samples: 1

**Called by:**
- `node:os` (1)

### `scopeCapacityBlockerFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:627` | Self: 0.0% (4.9ms) | Total: 0.0% (7.2ms) | Samples: 4

**Called by:**
- `capacityRejectionFor` (6)

**Calls:**
- `sort` (2)

### `activeScopesFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:680` | Self: 0.0% (4.8ms) | Total: 0.2% (26.7ms) | Samples: 3

**Called by:**
- `scopeCapacityBlockerFor` (22)

**Calls:**
- `filter` (19)

### `memoryUsage`
`[native code]` | Self: 0.0% (4.4ms) | Total: 0.0% (4.4ms) | Samples: 4

**Called by:**
- `sampleSync` (3)
- `sampleSync` (1)

### `scopeCapacityBlockerFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` | Self: 0.0% (3.9ms) | Total: 0.0% (3.9ms) | Samples: 3

**Called by:**
- `capacityRejectionFor` (3)

### `scopeCapacityBlockerFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:615` | Self: 0.0% (3.8ms) | Total: 0.2% (30.6ms) | Samples: 2

**Called by:**
- `capacityRejectionFor` (24)

**Calls:**
- `activeScopesFor` (22)

### `map`
`[native code]` | Self: 0.0% (3.5ms) | Total: 0.0% (10.7ms) | Samples: 3

**Called by:**
- `forcedBlockedTaskFor` (2)
- `taskGraphFromSchedulerSnapshot` (2)
- `(module)` (1)
- `getSignalsByName` (1)
- `prepareTaskGraph` (1)
- `caseInsensitiveExtensionPattern` (1)
- `schedulerGraphSnapshot` (1)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)
- `getSignalByName` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `createWarning`
`node:async_hooks` | Self: 0.0% (3.5ms) | Total: 0.0% (3.5ms) | Samples: 1

**Called by:**
- `node:async_hooks` (1)

### `admissionCandidatesForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:272` | Self: 0.0% (3.5ms) | Total: 0.2% (28.4ms) | Samples: 3

**Called by:**
- `(anonymous)` (20)
- `coreAtDepth` (4)

**Calls:**
- `freeze` (21)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:173` | Self: 0.0% (3.5ms) | Total: 0.0% (3.5ms) | Samples: 2

**Called by:**
- `from` (2)

### `admissionCandidatesForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:273` | Self: 0.0% (3.5ms) | Total: 47.2% (5.15s) | Samples: 3

**Called by:**
- `(anonymous)` (4104)
- `coreAtDepth` (208)

**Calls:**
- `capacityRejectionFor` (4275)
- `capacityRejectionFor` (33)
- `capacityRejectionFor` (1)

### `relationOrMutexRejectionFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:581` | Self: 0.0% (2.6ms) | Total: 0.1% (14.4ms) | Samples: 2

**Called by:**
- `admissionCandidatesForCore` (9)
- `selectionRejectionForPendingTask` (2)

**Calls:**
- `filter` (9)

### `admissionCandidatesForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:267` | Self: 0.0% (2.6ms) | Total: 0.0% (3.9ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)
- `coreAtDepth` (1)

**Calls:**
- `push` (1)

### `catalogForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:503` | Self: 0.0% (2.5ms) | Total: 48.3% (5.27s) | Samples: 2

**Called by:**
- `(anonymous)` (4189)
- `stateAtDepth` (214)

**Calls:**
- `capacityRejectionFor` (4351)
- `capacityRejectionFor` (27)
- `selectionRejectionForPendingTask` (22)
- `selectionRejectionForPendingTask` (1)

### `sort`
`[native code]` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 2

**Called by:**
- `scopeCapacityBlockerFor` (2)

### `FromValue`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/system/memory/clone.mjs:92` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 1

**Called by:**
- `FromTypeObject` (1)

### `admissionCandidatesForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:271` | Self: 0.0% (2.3ms) | Total: 0.1% (11.0ms) | Samples: 2

**Called by:**
- `(anonymous)` (9)

**Calls:**
- `push` (7)

### `admissionCandidatesForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:269` | Self: 0.0% (2.3ms) | Total: 0.3% (39.7ms) | Samples: 2

**Called by:**
- `(anonymous)` (27)
- `coreAtDepth` (6)

**Calls:**
- `relationOrMutexRejectionFor` (10)
- `relationOrMutexRejectionFor` (9)
- `relationOrMutexRejectionFor` (8)
- `relationOrMutexRejectionFor` (4)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:586` | Self: 0.0% (2.1ms) | Total: 46.9% (5.12s) | Samples: 2

**Called by:**
- `sampleSync` (3028)
- `measuredSync` (1247)

**Calls:**
- `catalogForCore` (4189)
- `catalogForCore` (28)
- `catalogForCore` (22)
- `catalogForCore` (21)
- `catalogForCore` (7)
- `catalogForCore` (6)

### `requiredTask`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:838` | Self: 0.0% (2.1ms) | Total: 0.0% (3.3ms) | Samples: 2

**Called by:**
- `catalogForCore` (3)

**Calls:**
- `get` (1)

### `stringArray`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:488` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `catalogForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:504` | Self: 0.0% (1.3ms) | Total: 0.0% (8.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (7)

**Calls:**
- `push` (6)

### `async writeFile`
`node:fs/promises` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `scopeCapacityBlockerFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:625` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `capacityRejectionFor` (1)

### `capacityRejectionFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `admissionCandidatesForCore` (1)

### `scopeCapacityBlockerFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:626` | Self: 0.0% (1.3ms) | Total: 0.2% (31.1ms) | Samples: 1

**Called by:**
- `capacityRejectionFor` (25)

**Calls:**
- `filter` (24)

### `forcedBlockedTaskFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:669` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `reconcileForcedBlocks` (1)

### `initializeFactory`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/micromark@4.0.2/node_modules/micromark/lib/initialize/text.js` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/yoctocolors@2.1.2/node_modules/yoctocolors/base.js:6` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `every` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/code.js:69` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `selectAdmissionCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:152` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `coreAtDepth` (1)

### `(anonymous)`
`internal:util/inspect:179` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `filter` (1)

### `taskStatusFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:740` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `admissionCandidatesForCore` (1)

### `get`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `requiredTask` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:32` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `from` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:727` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `filter` (1)

### `arrayIteratorNextHelper`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `normalizeTasks` (1)

### `forcedBlockedTaskFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:670` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `reconcileForcedBlocks` (1)

### `relatedTaskIds`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:199` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `visit` (1)

### `getSignalByName`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `map` (1)

### `capacityRejectionFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:592` | Self: 0.0% (1.1ms) | Total: 0.6% (75.4ms) | Samples: 1

**Called by:**
- `admissionCandidatesForCore` (33)
- `catalogForCore` (27)

**Calls:**
- `scopeCapacityBlockerFor` (25)
- `scopeCapacityBlockerFor` (24)
- `scopeCapacityBlockerFor` (6)
- `scopeCapacityBlockerFor` (3)
- `scopeCapacityBlockerFor` (1)

### `stringList`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:212` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `normalizeTasks` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `from` (1)

### `selectAdmissionCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:150` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `select` (1)

### `selectionRejectionForPendingTask`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `catalogForCore` (1)

### `forEach`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `bound call` (1)

### `Map`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `compilePreparedAdmissionGraph` (1)

### `normalizeExecFileArgs`
`node:child_process` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `execFileSync` (1)

### `admissionCandidatesForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:268` | Self: 0.0% (1.0ms) | Total: 0.0% (2.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `taskStatusFor` (1)

### `toUpperCase`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `validateTaskRelationCycles`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:87` | Self: 0.0% (1.0ms) | Total: 0.0% (2.1ms) | Samples: 1

**Called by:**
- `validatePreparedTaskGraph` (2)

**Calls:**
- `visit` (1)

### `spawnSync`
`node:child_process:227` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `execFileSync` (1)

### `requiredTask`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:840` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `catalogForCore` (1)

### `keys`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `record` (1)

### `profiledRows`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:589` | Self: 0.0% (0us) | Total: 45.9% (5.01s) | Samples: 0

**Called by:**
- `(module)` (4195)

**Calls:**
- `measuredSync` (2993)
- `measuredSync` (1202)

### `FromTypeObject`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/system/memory/clone.mjs:33` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `Update` (1)

**Calls:**
- `FromValue` (1)

### `node:stream`
`node:stream:2` | Self: 0.0% (0us) | Total: 0.0% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `makeSafe`
`internal:primordials:30` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `internal:primordials` (1)

**Calls:**
- `bound call` (1)

### `prepareTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:80` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `compileAdmissionGraphInput` (1)

**Calls:**
- `freeze` (1)

### `measuredSync`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:324` | Self: 0.0% (0us) | Total: 26.7% (2.91s) | Samples: 0

**Called by:**
- `profiledRows` (1247)
- `profiledRows` (1202)

**Calls:**
- `(anonymous)` (1247)
- `(anonymous)` (1202)

### `WriteStream`
`internal:fs/streams:245` | Self: 0.0% (0us) | Total: 0.0% (10.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `Writable` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/index.js:6` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `compilePreparedAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:90` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `preparedFixture` (1)

**Calls:**
- `Map` (1)

### `prepareTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:73` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `preparedFixture` (1)

**Calls:**
- `map` (1)

### `gitCommit`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:663` | Self: 0.0% (0us) | Total: 0.0% (7.9ms) | Samples: 0

**Called by:**
- `(module)` (4)
- `summaryMarkdown` (2)

**Calls:**
- `execFileSync` (5)
- `execFileSync` (1)

### `sampleSync`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:285` | Self: 0.0% (0us) | Total: 66.1% (7.22s) | Samples: 0

**Called by:**
- `from` (6019)

**Calls:**
- `(anonymous)` (3028)
- `(anonymous)` (2991)

### `profiledRows`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:572` | Self: 0.0% (0us) | Total: 0.1% (18.6ms) | Samples: 0

**Called by:**
- `(module)` (15)

**Calls:**
- `preparedFixture` (7)
- `preparedFixture` (5)
- `preparedFixture` (2)
- `preparedFixture` (1)

### `profiledRows`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:573` | Self: 0.0% (0us) | Total: 2.4% (264.3ms) | Samples: 0

**Called by:**
- `(module)` (222)

**Calls:**
- `stateAtDepth` (219)
- `stateAtDepth` (2)
- `stateAtDepth` (1)

### `select`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:338` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `stateAtDepth` (1)

**Calls:**
- `selectAdmissionCore` (1)

### `normalizeTasks`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:122` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (1)

**Calls:**
- `arrayIteratorNextHelper` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:705` | Self: 0.0% (0us) | Total: 0.0% (4.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `gitCommit` (4)

### `visit`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:75` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `validateTaskRelationCycles` (1)

**Calls:**
- `relatedTaskIds` (1)

### `stateAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:224` | Self: 0.0% (0us) | Total: 2.3% (260.9ms) | Samples: 0

**Called by:**
- `profiledRows` (219)

**Calls:**
- `catalogForCore` (214)
- `catalogForCore` (2)
- `catalogForCore` (1)
- `catalogForCore` (1)
- `catalogForCore` (1)

### `every`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `validateAdmissionCoreSelection` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/lib/util/resolveCommand.js:4` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `stateAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:231` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `profiledRows` (2)

**Calls:**
- `settle` (2)

### `node:events`
`node:events:9` | Self: 0.0% (0us) | Total: 0.0% (3.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/uri.js:3` | Self: 0.0% (0us) | Total: 0.0% (2.2ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `stateAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:230` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `profiledRows` (1)

**Calls:**
- `select` (1)

### `preparedFixture`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:199` | Self: 0.0% (0us) | Total: 0.0% (7.9ms) | Samples: 0

**Called by:**
- `profiledRows` (7)

**Calls:**
- `createAdmissionGraph` (7)

### `coreAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:252` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `profiledRows` (2)

**Calls:**
- `settleRunningAdmissionCore` (2)

### `catalogForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:508` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `stateAtDepth` (1)

**Calls:**
- `freeze` (1)

### `catalogForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:502` | Self: 0.0% (0us) | Total: 0.2% (28.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (22)
- `stateAtDepth` (2)

**Calls:**
- `requiredTask` (20)
- `requiredTask` (3)
- `requiredTask` (1)

### `validateAdmissionCoreSelection`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:244` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `selectAdmissionCore` (1)

**Calls:**
- `every` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:719` | Self: 0.0% (0us) | Total: 0.0% (3.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `summaryMarkdown` (2)

### `catalogForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:509` | Self: 0.0% (0us) | Total: 0.3% (36.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (28)
- `stateAtDepth` (1)

**Calls:**
- `freeze` (29)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:23` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `getSignalsByName` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:5` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `internal:streams/lazy_transform`
`internal:streams/lazy_transform:2` | Self: 0.0% (0us) | Total: 0.0% (6.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `preparedFixture`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:196` | Self: 0.0% (0us) | Total: 0.0% (6.1ms) | Samples: 0

**Called by:**
- `profiledRows` (5)

**Calls:**
- `prepareTaskGraph` (2)
- `prepareTaskGraph` (1)
- `prepareTaskGraph` (1)
- `prepareTaskGraph` (1)

### `getSignalsByNumber`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:31` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `from` (1)

### `compileAdmissionGraphInput`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:385` | Self: 0.0% (0us) | Total: 0.0% (4.2ms) | Samples: 0

**Called by:**
- `createAdmissionGraph` (4)

**Calls:**
- `prepareTaskGraph` (2)
- `prepareTaskGraph` (1)
- `prepareTaskGraph` (1)

### `internal:streams/readable`
`internal:streams/readable:2` | Self: 0.0% (0us) | Total: 0.0% (5.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `coreAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:249` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `profiledRows` (2)

**Calls:**
- `selectAdmissionCore` (1)
- `selectAdmissionCore` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/which@2.0.2/node_modules/which/which.js:7` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `caseInsensitiveExtensionPattern`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts:81` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `normalizeTasks`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:132` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (1)

**Calls:**
- `freeze` (1)

### `node:util`
`node:util:2` | Self: 0.0% (0us) | Total: 0.1% (13.5ms) | Samples: 0

**Calls:**
- `anonymous` (3)

### `internal:fs/streams`
`internal:fs/streams:2` | Self: 0.0% (0us) | Total: 0.0% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `node:fs/promises`
`node:fs/promises:2` | Self: 0.0% (0us) | Total: 0.0% (3.4ms) | Samples: 0

**Calls:**
- `anonymous` (2)

### `schedulerGraphSnapshot`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:101` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (1)

**Calls:**
- `map` (1)

### `settleRunningAdmissionCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:211` | Self: 0.0% (0us) | Total: 0.0% (4.6ms) | Samples: 0

**Called by:**
- `settle` (2)
- `coreAtDepth` (2)

**Calls:**
- `reconcileForcedBlocks` (4)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js:5` | Self: 0.0% (0us) | Total: 0.0% (7.0ms) | Samples: 0

**Calls:**
- `bound require` (6)

### `preparedFixture`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:198` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `profiledRows` (1)

**Calls:**
- `compilePreparedAdmissionGraph` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:13` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/index.js:4` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `validatePreparedTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts:28` | Self: 0.0% (0us) | Total: 0.0% (2.1ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (2)

**Calls:**
- `validateTaskRelationCycles` (2)

### `capacityRejectionFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:591` | Self: 0.0% (0us) | Total: 94.5% (10.31s) | Samples: 0

**Called by:**
- `catalogForCore` (4351)
- `admissionCandidatesForCore` (4275)

**Calls:**
- `runningCount` (8626)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:4` | Self: 0.0% (0us) | Total: 0.0% (4.5ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `bound call`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `makeSafe` (1)
- `internal:util/inspect` (1)

**Calls:**
- `forEach` (1)
- `filter` (1)

### `internal:stream`
`internal:stream:2` | Self: 0.0% (0us) | Total: 0.0% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `graphFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:172` | Self: 0.0% (0us) | Total: 0.0% (3.5ms) | Samples: 0

**Called by:**
- `preparedFixture` (2)

**Calls:**
- `from` (2)

### `selectAdmissionCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:147` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `coreAtDepth` (1)

**Calls:**
- `validateAdmissionCoreSelection` (1)

### `preparedFixture`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:195` | Self: 0.0% (0us) | Total: 0.0% (3.5ms) | Samples: 0

**Called by:**
- `profiledRows` (2)

**Calls:**
- `graphFor` (2)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.0% (6.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/index.js:10` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/errors.js:5` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `sampleSync`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:288` | Self: 0.0% (0us) | Total: 0.0% (3.4ms) | Samples: 0

**Called by:**
- `from` (3)

**Calls:**
- `memoryUsage` (3)

### `node:os`
`node:os:110` | Self: 0.0% (0us) | Total: 0.0% (5.1ms) | Samples: 0

**Calls:**
- `bound` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:9` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `node:async_hooks`
`node:async_hooks:179` | Self: 0.0% (0us) | Total: 0.0% (3.5ms) | Samples: 0

**Calls:**
- `createWarning` (1)

### `taskGraphFromSchedulerSnapshot`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:392` | Self: 0.0% (0us) | Total: 0.0% (2.6ms) | Samples: 0

**Called by:**
- `compileAdmissionGraphInput` (2)

**Calls:**
- `map` (2)

### `execFileSync`
`node:child_process:264` | Self: 0.0% (0us) | Total: 0.0% (6.8ms) | Samples: 0

**Called by:**
- `gitCommit` (5)

**Calls:**
- `spawnSync` (4)
- `spawnSync` (1)

### `bound require`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (81.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (11)
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
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `require` (66)

### `profiledRows`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:574` | Self: 0.0% (0us) | Total: 2.4% (263.8ms) | Samples: 0

**Called by:**
- `(module)` (223)

**Calls:**
- `coreAtDepth` (219)
- `coreAtDepth` (2)
- `coreAtDepth` (2)

### `prepareTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:79` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `preparedFixture` (1)

**Calls:**
- `schedulerGraphSnapshot` (1)

### `measuredSync`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:325` | Self: 0.0% (0us) | Total: 66.2% (7.22s) | Samples: 0

**Called by:**
- `profiledRows` (3031)
- `profiledRows` (2993)

**Calls:**
- `from` (6024)

### `record`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:188` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `normalizeTasks` (1)

**Calls:**
- `keys` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/dataType.js:5` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `reconcileForcedBlocks`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:641` | Self: 0.0% (0us) | Total: 0.0% (4.6ms) | Samples: 0

**Called by:**
- `settleRunningAdmissionCore` (4)

**Calls:**
- `forcedBlockedTaskFor` (2)
- `forcedBlockedTaskFor` (1)
- `forcedBlockedTaskFor` (1)

### `normalizeTasks`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:135` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (1)

**Calls:**
- `stringList` (1)

### `settle`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:351` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `stateAtDepth` (2)

**Calls:**
- `settleRunningAdmissionCore` (2)

### `node:crypto`
`node:crypto:2` | Self: 0.0% (0us) | Total: 0.0% (6.9ms) | Samples: 0

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/lib/parse.js:4` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `prepareTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:71` | Self: 0.0% (0us) | Total: 0.0% (4.4ms) | Samples: 0

**Called by:**
- `compileAdmissionGraphInput` (2)
- `preparedFixture` (2)

**Calls:**
- `normalizeTasks` (1)
- `normalizeTasks` (1)
- `normalizeTasks` (1)
- `normalizeTasks` (1)

### `taskGraphFromSchedulerSnapshot`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:441` | Self: 0.0% (0us) | Total: 0.0% (986us) | Samples: 0

**Called by:**
- `compileAdmissionGraphInput` (1)

**Calls:**
- `freeze` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/fast-uri@3.1.3/node_modules/fast-uri/index.js:3` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `createAdmissionGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:97` | Self: 0.0% (0us) | Total: 0.0% (7.9ms) | Samples: 0

**Called by:**
- `preparedFixture` (7)

**Calls:**
- `compileAdmissionGraphInput` (4)
- `compileAdmissionGraphInput` (3)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/boolSchema.js:4` | Self: 0.0% (0us) | Total: 0.0% (4.5ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/index.js:5` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:4` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `selectionRejectionForPendingTask`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:562` | Self: 0.0% (0us) | Total: 0.2% (29.3ms) | Samples: 0

**Called by:**
- `catalogForCore` (22)

**Calls:**
- `relationOrMutexRejectionFor` (9)
- `relationOrMutexRejectionFor` (8)
- `relationOrMutexRejectionFor` (3)
- `relationOrMutexRejectionFor` (2)

### `summaryMarkdown`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:649` | Self: 0.0% (0us) | Total: 0.0% (3.5ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `gitCommit` (2)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:670` | Self: 0.0% (0us) | Total: 97.9% (10.69s) | Samples: 0

**Called by:**
- `(anonymous)` (8933)

**Calls:**
- `profiledRows` (4278)
- `profiledRows` (4195)
- `profiledRows` (223)
- `profiledRows` (222)
- `profiledRows` (15)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:412` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `freeze` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js:9` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts:66` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:409` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `stringArray` (1)

### `internal:shared`
`internal:shared:2` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:718` | Self: 0.0% (0us) | Total: 0.0% (7.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `stringify` (3)
- `async writeFile` (1)

### `require`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (81.1ms) | Samples: 0

**Called by:**
- `bound require` (66)

**Calls:**
- `anonymous` (66)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/format/index.js:3` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `internal:util/inspect`
`internal:util/inspect:179` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound call` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js:4` | Self: 0.0% (0us) | Total: 0.0% (9.8ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js:4` | Self: 0.0% (0us) | Total: 0.1% (15.4ms) | Samples: 0

**Calls:**
- `bound require` (11)

### `internal:validators`
`internal:validators:2` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `normalizeTasks`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:123` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `prepareTaskGraph` (1)

**Calls:**
- `record` (1)

### `getSignalsByName`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:10` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `map` (1)

### `AddOptionalAction`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/type/engine/optional/instantiate_add.mjs:8` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `Update` (1)

### `forcedBlockedTaskFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:666` | Self: 0.0% (0us) | Total: 0.0% (2.1ms) | Samples: 0

**Called by:**
- `reconcileForcedBlocks` (2)

**Calls:**
- `map` (2)

### `prepareTaskGraph`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:76` | Self: 0.0% (0us) | Total: 0.0% (2.1ms) | Samples: 0

**Called by:**
- `compileAdmissionGraphInput` (1)
- `preparedFixture` (1)

**Calls:**
- `validatePreparedTaskGraph` (2)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/machine-output/v4/schema.ts:33` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `AddOptionalAction` (1)

### `profiledRows`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:577` | Self: 0.0% (0us) | Total: 47.0% (5.13s) | Samples: 0

**Called by:**
- `(module)` (4278)

**Calls:**
- `measuredSync` (3031)
- `measuredSync` (1247)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts:82` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `toUpperCase` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:598` | Self: 0.0% (0us) | Total: 45.9% (5.01s) | Samples: 0

**Called by:**
- `sampleSync` (2991)
- `measuredSync` (1202)

**Calls:**
- `admissionCandidatesForCore` (4104)
- `freeze` (29)
- `admissionCandidatesForCore` (27)
- `admissionCandidatesForCore` (20)
- `admissionCandidatesForCore` (9)
- `admissionCandidatesForCore` (2)
- `admissionCandidatesForCore` (2)

### `sampleSync`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:283` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `from` (1)

**Calls:**
- `memoryUsage` (1)

### `coreAtDepth`
`/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts:242` | Self: 0.0% (0us) | Total: 2.3% (259.0ms) | Samples: 0

**Called by:**
- `profiledRows` (219)

**Calls:**
- `admissionCandidatesForCore` (208)
- `admissionCandidatesForCore` (6)
- `admissionCandidatesForCore` (4)
- `admissionCandidatesForCore` (1)

### `execFileSync`
`node:child_process:263` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `gitCommit` (1)

**Calls:**
- `normalizeExecFileArgs` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/keyword.js:6` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:5` | Self: 0.0% (0us) | Total: 0.0% (2.1ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `internal:primordials`
`internal:primordials:78` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `makeSafe` (1)

### `internal:streams/transform`
`internal:streams/transform:2` | Self: 0.0% (0us) | Total: 0.0% (6.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/errors.js:4` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `node:v8`
`node:v8:2` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `anonymous` (1)

### `Update`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/system/memory/update.mjs:12` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `AddOptionalAction` (1)

**Calls:**
- `FromTypeObject` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js:70` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `getSignalsByNumber` (1)

### `from`
`[native code]` | Self: 0.0% (0us) | Total: 66.2% (7.23s) | Samples: 0

**Called by:**
- `measuredSync` (6024)
- `graphFor` (2)
- `getSignalsByNumber` (1)

**Calls:**
- `sampleSync` (6019)
- `sampleSync` (3)
- `(anonymous)` (2)
- `sampleSync` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `catalogForCore`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:501` | Self: 0.0% (0us) | Total: 0.0% (7.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (6)

**Calls:**
- `taskStatusFor` (6)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/cross-spawn@7.0.6/node_modules/cross-spawn/index.js:4` | Self: 0.0% (0us) | Total: 0.0% (2.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js:22` | Self: 0.0% (0us) | Total: 0.0% (2.2ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts:104` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `freeze` (1)

### `get ReadStream`
`node:fs:578` | Self: 0.0% (0us) | Total: 0.0% (2.6ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `relationOrMutexRejectionFor`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:575` | Self: 0.0% (0us) | Total: 0.2% (21.9ms) | Samples: 0

**Called by:**
- `selectionRejectionForPendingTask` (8)
- `admissionCandidatesForCore` (8)

**Calls:**
- `filter` (16)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/package-checks/function-metrics/target-files.ts:67` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `caseInsensitiveExtensionPattern` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/index.js:11` | Self: 0.0% (0us) | Total: 0.0% (993us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `compileAdmissionGraphInput`
`/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts:384` | Self: 0.0% (0us) | Total: 0.0% (3.6ms) | Samples: 0

**Called by:**
- `createAdmissionGraph` (3)

**Calls:**
- `taskGraphFromSchedulerSnapshot` (2)
- `taskGraphFromSchedulerSnapshot` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/uniqueItems.js:6` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/micromark@4.0.2/node_modules/micromark/lib/initialize/text.js:15` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `initializeFactory` (1)

### `internal:streams/add-abort-signal`
`internal:streams/add-abort-signal:2` | Self: 0.0% (0us) | Total: 0.0% (5.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/resolve.js:6` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/index.js:4` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js:6` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 99.3% (10.84s) | Samples: 0

**Calls:**
- `(anonymous)` (9043)

### `spawnSync`
`node:child_process:226` | Self: 0.0% (0us) | Total: 0.0% (5.8ms) | Samples: 0

**Called by:**
- `execFileSync` (4)

**Calls:**
- `spawnSync` (4)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 98.2% | 10.72s | `[native code]` |
| 1.3% | 149.4ms | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/admission-core.ts` |
| 0.0% | 10.4ms | `internal:streams/writable` |
| 0.0% | 6.8ms | `/home/dev/.codex/worktrees/4a40/vibe-check/changes/optimize-admission-core-selection-index/readiness/current-admission-core-baseline.ts` |
| 0.0% | 5.1ms | `node:os` |
| 0.0% | 3.5ms | `node:async_hooks` |
| 0.0% | 2.3ms | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/typebox@1.3.9/node_modules/typebox/build/system/memory/clone.mjs` |
| 0.0% | 2.3ms | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/human-signals@8.0.1/node_modules/human-signals/build/src/main.js` |
| 0.0% | 2.1ms | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph-validation.ts` |
| 0.0% | 2.1ms | `node:child_process` |
| 0.0% | 1.3ms | `node:fs/promises` |
| 0.0% | 1.2ms | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/micromark@4.0.2/node_modules/micromark/lib/initialize/text.js` |
| 0.0% | 1.2ms | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/yoctocolors@2.1.2/node_modules/yoctocolors/base.js` |
| 0.0% | 1.2ms | `/home/dev/.codex/worktrees/4a40/vibe-check/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/code.js` |
| 0.0% | 1.2ms | `internal:util/inspect` |
| 0.0% | 1.1ms | `/home/dev/.codex/worktrees/4a40/vibe-check/src/project-run/task-scheduler/graph.ts` |
