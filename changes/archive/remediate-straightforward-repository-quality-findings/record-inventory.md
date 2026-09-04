# Gate Record Inventory

本清单是 `2026-09-04T14-52-30.845Z-1071190-0f77a68c-4619-4a78-843c-aa72de9677fc/machine/records.ndjson` 的完整 72 条 quality Record 基线。它是本 Change 的唯一逐条验收对比输入，不是 waiver 清单；下方的 Check/Record ID 必须逐字保持稳定。

验收运行是 `2026-09-04T15-38-42.511Z-1155534-8f0afbe7-d31e-4119-8310-68e8bdf412e7/machine/records.ndjson`：恰好 46 条 Record（duplicate 1、file 11、function 34）。比较结果为 26 条 in-scope ID 全部缺席、46 条 deferred ID 全部存在、零未分类新增 ID。该结果不将 deferred 项变成 waiver，也不授权扩大 selection。

## In-scope Records

恰好 26 条：两个 `_resources` file-metrics Records 由已授权 selection exclusion 消除；21 条窄 owner function/file Records 由 behavior-preserving extraction 消除；3 条 duplicate Records 由已知共同不变量 helper/fixture construction 消除。
- `duplicate-detection` — `duplicate-fragment/v1/sha256:005447158d51db224c287eaf8a54f34e3f6f64b525a378b752a038a7fea45343/occurrence:1` — duplicate-tokens (src/package-checks/function-metrics/measurement-performance-harness.test-support.ts:160-169; src/package-checks/function-metrics/measurement-performance-worker.test-support.ts:30-39)
- `duplicate-detection` — `duplicate-fragment/v1/sha256:010dcaac1958c43adab95bc5b4bf51ea95def56e396d6b1094b90b2daa52297d/occurrence:1` — duplicate-tokens (src/project-run/invocation-custom-admission-strategy-lifecycle.test-support.ts:291-304; src/project-run/invocation.learned-scheduling.test.ts:269-282)
- `duplicate-detection` — `duplicate-fragment/v1/sha256:24d524424fd4d206d63bfe065e279db8e6bd90536f06f7fadf30daa3faa656f3/occurrence:1` — duplicate-tokens (src/package-checks/function-metrics/analyzer-adapter.test.ts:53-60; src/package-checks/function-metrics/analyzer-adapter.test.ts:54-61)
- `file-metrics` — `docs/investigations/_resources/diagnose-lizard-real-typescript-analyzer-hot-path/typescript-bun-cpu-profile.md` — code-lines limit=500
- `file-metrics` — `docs/investigations/_resources/diagnose-lizard-typescript-port-performance-gap/typescript-cpu-profile.md` — code-lines limit=500
- `file-metrics` — `scripts/package/artifact/staging-audit.ts` — code-lines limit=300
- `file-metrics` — `scripts/package/candidate/external-consumer/runtime-evidence-assertions.ts` — code-lines limit=300
- `file-metrics` — `src/package-checks/markdown-link-validation/default-check.test.ts` — code-lines limit=500
- `file-metrics` — `src/project-run/progress-rendering/invocation-progress.test.ts` — code-lines limit=300
- `file-metrics` — `src/project-run/run.test-support.ts` — code-lines limit=300
- `function-metrics` — `function:{"file":"scripts/maintenance/lizard-upstream-advisory.ts","name":"checkLizardUpstream"}:cyclomatic-complexity` — cyclomatic-complexity checkLizardUpstream value=15 limit=10
- `function-metrics` — `function:{"file":"scripts/maintenance/lizard-upstream-advisory.ts","name":"checkLizardUpstream"}:nesting-depth` — nesting-depth checkLizardUpstream value=9 limit=7
- `function-metrics` — `function:{"file":"scripts/package/artifact/esm-module-specifiers.ts","name":"isFunctionMetricsWorkerUrl"}:cyclomatic-complexity` — cyclomatic-complexity isFunctionMetricsWorkerUrl value=12 limit=10
- `function-metrics` — `function:{"file":"scripts/package/candidate/external-consumer/runtime-evidence-assertions.ts","name":"assertDuplicateAndTerminalMessages"}:cyclomatic-complexity` — cyclomatic-complexity assertDuplicateAndTerminalMessages value=11 limit=10
- `function-metrics` — `function:{"file":"scripts/package/candidate/external-consumer/runtime-evidence-assertions.ts","name":"assertDuplicateAndTerminalMessages"}:function-code-density` — function-code-density assertDuplicateAndTerminalMessages value=76 limit=50
- `function-metrics` — `function:{"file":"scripts/project/gate/checks/oxlint-failure-records.ts","name":"labelLocation"}:cyclomatic-complexity` — cyclomatic-complexity labelLocation value=11 limit=10
- `function-metrics` — `function:{"file":"scripts/project/gate/checks/oxlint-failure-records.ts","name":"labelLocation"}:nesting-depth` — nesting-depth labelLocation value=8 limit=7
- `function-metrics` — `function:{"file":"scripts/project/gate/checks/prepared-candidate.ts","name":"assertPreparedCandidateIdentityScalars"}:nesting-depth` — nesting-depth assertPreparedCandidateIdentityScalars value=9 limit=7
- `function-metrics` — `function:{"file":"scripts/project/gate/runtime/controls.ts","name":"selectionFromFlags"}:cyclomatic-complexity` — cyclomatic-complexity selectionFromFlags value=11 limit=10
- `function-metrics` — `function:{"file":"scripts/validation/documentation/machine-artifacts/canonical.ts","name":"serializeCanonicalJson"}:nesting-depth` — nesting-depth serializeCanonicalJson value=8 limit=7
- `function-metrics` — `function:{"file":"src/package-checks/function-metrics/analysis.ts","name":"compareFunctionInstances"}:cyclomatic-complexity` — cyclomatic-complexity compareFunctionInstances value=11 limit=10
- `function-metrics` — `function:{"file":"src/package-checks/markdown-link-validation/filesystem-probes.ts","name":"probeRootContainedPath"}:cyclomatic-complexity` — cyclomatic-complexity probeRootContainedPath value=11 limit=10
- `function-metrics` — `function:{"file":"src/package-checks/markdown-link-validation/filesystem-probes.ts","name":"probeRootContainedPath"}:function-code-density` — function-code-density probeRootContainedPath value=57 limit=50
- `function-metrics` — `function:{"file":"src/package-checks/markdown-link-validation/resolver-engine.ts","name":"readSource"}:cyclomatic-complexity` — cyclomatic-complexity readSource value=11 limit=10
- `function-metrics` — `function:{"file":"src/project-definition/check-tree/authoring.ts","name":"parseCheck"}:nesting-depth` — nesting-depth parseCheck value=8 limit=7
- `function-metrics` — `function:{"file":"src/project-run/controls/validation.ts","name":"validateRunControlsValue"}:nesting-depth` — nesting-depth validateRunControlsValue value=8 limit=7

## Deferred Records

恰好 46 条。全部保持 selected、visible、unwaived；不提高 threshold，也不增加 selection exclusion。
- `duplicate-detection` — `duplicate-fragment/v1/sha256:5f58a01355d72a87781b590f9e8d661ead4125977499f8c6da783e306731bded/occurrence:1` — duplicate-tokens (src/project-run/task-scheduler/admission-core.test.ts:712-728; src/project-run/task-scheduler/critical-path-ranking.test.ts:12-28)
- `file-metrics` — `scripts/development/lizard-performance/command.ts` — code-lines limit=300
- `file-metrics` — `scripts/package/legal-materials.ts` — code-lines limit=300
- `file-metrics` — `scripts/validation/layout-characterization.ts` — code-lines limit=300
- `file-metrics` — `src/package-checks/markdown-link-validation/parse-facts-cache.ts` — code-lines limit=300
- `file-metrics` — `src/project-definition/project-definition.ts` — code-lines limit=300
- `file-metrics` — `src/project-run/diagnostic-logging/logger.ts` — code-lines limit=300
- `file-metrics` — `src/project-run/invocation.ts` — code-lines limit=300
- `file-metrics` — `src/project-run/scheduler-duration-model/scheduler-duration-model.test.ts` — code-lines limit=300
- `file-metrics` — `src/project-run/task-scheduler/admission-core.test.ts` — code-lines limit=300
- `file-metrics` — `src/project-run/task-scheduler/admission-core.ts` — code-lines limit=300
- `file-metrics` — `src/project-run/task-scheduler/scheduler.ts` — code-lines limit=300
- `function-metrics` — `function:{"file":"scripts/development/lizard-performance/canonical.ts","name":"compareMetrics"}:cyclomatic-complexity` — cyclomatic-complexity compareMetrics value=11 limit=10
- `function-metrics` — `function:{"file":"scripts/development/lizard-performance/command.ts","name":"parseArguments"}:cyclomatic-complexity` — cyclomatic-complexity parseArguments value=26 limit=10
- `function-metrics` — `function:{"file":"scripts/development/lizard-performance/command.ts","name":"parseArguments"}:function-code-density` — function-code-density parseArguments value=86 limit=50
- `function-metrics` — `function:{"file":"scripts/development/lizard-performance/command.ts","name":"parseArguments"}:nesting-depth` — nesting-depth parseArguments value=11 limit=7
- `function-metrics` — `function:{"file":"scripts/development/lizard-performance/command.ts","name":"parseChildResult"}:cyclomatic-complexity` — cyclomatic-complexity parseChildResult value=14 limit=10
- `function-metrics` — `function:{"file":"scripts/development/lizard-performance/command.ts","name":"parseChildResult"}:nesting-depth` — nesting-depth parseChildResult value=10 limit=7
- `function-metrics` — `function:{"file":"scripts/development/lizard-performance/command.ts","name":"parseSupervisorResult"}:cyclomatic-complexity` — cyclomatic-complexity parseSupervisorResult value=14 limit=10
- `function-metrics` — `function:{"file":"scripts/development/lizard-performance/command.ts","name":"runAnalyzerWorkload"}:function-code-density` — function-code-density runAnalyzerWorkload value=72 limit=50
- `function-metrics` — `function:{"file":"scripts/development/lizard-performance/command.ts","name":"runAnalyzerWorkload"}:parameter-count` — parameter-count runAnalyzerWorkload value=6 limit=5
- `function-metrics` — `function:{"file":"scripts/development/lizard-performance/command.ts","name":"runComparison"}:function-code-density` — function-code-density runComparison value=111 limit=50
- `function-metrics` — `function:{"file":"scripts/development/lizard-performance/command.ts","name":"runCurrentDecomposition"}:function-code-density` — function-code-density runCurrentDecomposition value=71 limit=50
- `function-metrics` — `function:{"file":"scripts/development/lizard-performance/command.ts","name":"runHistoricalProduct"}:cyclomatic-complexity` — cyclomatic-complexity runHistoricalProduct value=18 limit=10
- `function-metrics` — `function:{"file":"scripts/development/lizard-performance/command.ts","name":"runHistoricalProduct"}:function-code-density` — function-code-density runHistoricalProduct value=109 limit=50
- `function-metrics` — `function:{"file":"scripts/development/lizard-performance/command.ts","name":"runHistoricalProduct"}:parameter-count` — parameter-count runHistoricalProduct value=6 limit=5
- `function-metrics` — `function:{"file":"scripts/development/lizard-performance/command.ts","name":"sampleFromObservation"}:parameter-count` — parameter-count sampleFromObservation value=6 limit=5
- `function-metrics` — `function:{"file":"scripts/package/legal-materials.ts","name":"parseProvenanceEntry"}:cyclomatic-complexity` — cyclomatic-complexity parseProvenanceEntry value=11 limit=10
- `function-metrics` — `function:{"file":"scripts/package/legal-materials.ts","name":"parseProvenanceInventory"}:cyclomatic-complexity` — cyclomatic-complexity parseProvenanceInventory value=11 limit=10
- `function-metrics` — `function:{"file":"scripts/package/legal-materials.ts","name":"parseSupplementalSource"}:cyclomatic-complexity` — cyclomatic-complexity parseSupplementalSource value=13 limit=10
- `function-metrics` — `function:{"file":"scripts/project/gate/definition.ts","name":"createProjectGateEntries"}:function-code-density` — function-code-density createProjectGateEntries value=162 limit=150
- `function-metrics` — `function:{"file":"scripts/validation/layout-characterization.ts","name":"moduleSpecifiers"}:cyclomatic-complexity` — cyclomatic-complexity moduleSpecifiers value=19 limit=10
- `function-metrics` — `function:{"file":"scripts/validation/layout-characterization.ts","name":"moduleSpecifiers"}:function-code-density` — function-code-density moduleSpecifiers value=59 limit=50
- `function-metrics` — `function:{"file":"scripts/validation/layout-characterization.ts","name":"validateFunctionMetricsAnalyzerBoundary"}:function-code-density` — function-code-density validateFunctionMetricsAnalyzerBoundary value=60 limit=50
- `function-metrics` — `function:{"file":"src/package-checks/function-metrics/measurement.ts","name":"decodeUtf8IgnoringInvalidBytes"}:cyclomatic-complexity` — cyclomatic-complexity decodeUtf8IgnoringInvalidBytes value=15 limit=10
- `function-metrics` — `function:{"file":"src/package-checks/function-metrics/measurement.ts","name":"isFunctionMetric"}:cyclomatic-complexity` — cyclomatic-complexity isFunctionMetric value=23 limit=10
- `function-metrics` — `function:{"file":"src/package-checks/markdown-link-validation/parse-facts-cache.ts","name":"parse"}:cyclomatic-complexity` — cyclomatic-complexity parse value=14 limit=10
- `function-metrics` — `function:{"file":"src/project-run/completion.ts","name":"finalizeInvocation"}:cyclomatic-complexity` — cyclomatic-complexity finalizeInvocation value=11 limit=10
- `function-metrics` — `function:{"file":"src/project-run/completion.ts","name":"finalizeInvocation"}:function-code-density` — function-code-density finalizeInvocation value=53 limit=50
- `function-metrics` — `function:{"file":"src/project-run/scheduler-duration-model/recording.ts","name":"recordSchedulerHistory"}:function-code-density` — function-code-density recordSchedulerHistory value=68 limit=50
- `function-metrics` — `function:{"file":"src/project-run/task-scheduler/admission-core-compiled-graph.ts","name":"compilePreparedAdmissionGraph"}:cyclomatic-complexity` — cyclomatic-complexity compilePreparedAdmissionGraph value=20 limit=10
- `function-metrics` — `function:{"file":"src/project-run/task-scheduler/admission-core-compiled-graph.ts","name":"compilePreparedAdmissionGraph"}:function-code-density` — function-code-density compilePreparedAdmissionGraph value=88 limit=50
- `function-metrics` — `function:{"file":"src/project-run/task-scheduler/admission-core.ts","name":"buildSemanticSelection"}:cyclomatic-complexity` — cyclomatic-complexity buildSemanticSelection value=22 limit=10
- `function-metrics` — `function:{"file":"src/project-run/task-scheduler/admission-core.ts","name":"buildSemanticSelection"}:function-code-density` — function-code-density buildSemanticSelection value=95 limit=50
- `function-metrics` — `function:{"file":"src/project-run/task-scheduler/admission-core.ts","name":"transitionIndexedSelection"}:cyclomatic-complexity` — cyclomatic-complexity transitionIndexedSelection value=19 limit=10
- `function-metrics` — `function:{"file":"src/project-run/task-scheduler/admission-core.ts","name":"transitionIndexedSelection"}:function-code-density` — function-code-density transitionIndexedSelection value=98 limit=50

## Deferred Boundary

Lizard performance、legal/compliance parsing、layout characterization、parse-facts cache、invocation/completion/diagnostic logger、scheduler duration 和 task-scheduler admission core，以及其它未证明为机械 owner split 的记录均在 deferred 集合。每一条均以上述 stable Check/Record ID 单独枚举。
