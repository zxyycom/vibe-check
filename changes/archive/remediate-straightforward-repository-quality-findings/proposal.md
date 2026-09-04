# Proposal

本 Change 已完成首批经审查可机械拆分的 repository-quality remediation；它保留 46 条未豁免的 deferred Record，并把调查资源的 file-metrics exclusion 限定在唯一获授权路径。

## Why

基线 Project Gate quality evidence 有 72 条 advisory Record。advisory 只描述 Gate aggregate，不降低已选 remediation 的验收：用户明确将阈值超限视为强 remediation signal，不因仅超出 4、10 或 20 行而保留 Finding，也不以 waiver、提高 threshold 或扩大 selection exclusion 替代 owner split。

首批只处理有明确局部 owner 且可由相邻 test 证明可观察行为不变的调整。Lizard performance、法务/合规解析、layout characterization、parse-facts cache、invocation/completion/diagnostic logger、scheduler duration 与 task-scheduler admission core 没有被伪称为“简单”；它们仍是未豁免的后续输入。

## Outcome

同一 focused repository-quality rerun 已不再发布本 Change 选择的 26 条基线 Record。`docs/investigations/_resources/**` 仅退出 file-metrics selection，调查报告/资源验证仍保留。基线的其余 46 条 deferred Record 逐条仍可见、没有 waiver，且没有新增 Record。

## Scope

### Intended Change

- 在 Gate repository-quality `fileMetrics` 的 `docs-specs` selection 中仅排除 `docs/investigations/_resources/**`，并以 configuration evidence 限定其只影响 file metrics；不改变 investigation validation、其它 metrics selection、threshold 或 finding policy。
- 对下列有独立局部 owner 的文件完成 preserving-behavior owner split/extraction，使其对应基线 Record 消失：
  - `scripts/package/artifact/staging-audit.ts`（runtime layout audit）、`scripts/package/artifact/esm-module-specifiers.ts`（Function Metrics Worker URL AST predicate）；
  - `scripts/package/candidate/external-consumer/runtime-evidence-assertions.ts`（quality/terminal-message assertions）；
  - `scripts/maintenance/lizard-upstream-advisory.ts`（maintenance-only response/result mapping，不改 network advisory semantics）；
  - `scripts/project/gate/checks/oxlint-failure-records.ts`（label span validation）、`prepared-candidate.ts`（identity scalar validation）和 `scripts/project/gate/runtime/controls.ts`（flag-selection clauses）；
  - `scripts/validation/documentation/machine-artifacts/canonical.ts`（canonical JSON value-kind serialization）；
  - `src/package-checks/function-metrics/analysis.ts`（FunctionMetric comparison-key/field）；
  - `src/package-checks/markdown-link-validation/filesystem-probes.ts`（root-containment probe phases）与 `resolver-engine.ts`（read-source phases）；
  - `src/project-definition/check-tree/authoring.ts`（closed Check authoring field groups）与 `src/project-run/controls/validation.ts`（RunControls field-group validation）；
  - `src/package-checks/markdown-link-validation/default-check.test.ts`、`src/project-run/progress-rendering/invocation-progress.test.ts`（按既有 proof boundary 移至 sibling test owners）与 `src/project-run/run.test-support.ts`（cohesive support helpers）。
- 提取两个已有共同不变量的 duplicate helpers：measurement-performance 两端的 source DTO 解析/构造，以及 custom-admission lifecycle 与 learned scheduling 的 event-order assertion；analyzer-adapter test 仅以局部 fixture constructor 整改重复 literal data，不将 scanner overlap 定义为 adapter bug。
- 不新增 waiver、不增加 threshold、不新增其它 quality-scope exclusion，且不改变 Gate aggregation 或 package Check public contract。

### Resulting Impacts

- Gate selection 与 repository-quality configuration test 证明只有 resources 路径退出 file metrics；`docs/investigations/**` 仍受验证，不是通用排除对象。
- 测试节点、正文和 Case entity mapping 已按既有证明目的同步；test-evidence closure 与各 owner 的最窄测试是该事实的验证边界，而不是为降低行数创建新 Case 的理由。
- parser、path containment、canonicalization、control-selection 与 candidate assertion 的 extraction 保留 fail-closed、ordering、returned value、error/reason、frozen-data 与 security boundary。
- 成功以完整 Records 集合判断：selected 26 条必须消失；inventory 的 46 条 deferred ID 必须仍逐条出现且无 waiver；任何新增 ID 都不能归为成功，必须重新审查范围。

## Success Criteria

1. repository-quality config 只新增 `docs/investigations/_resources/**` 的 file-metrics selection exclusion；其它 quality scope、所有 thresholds、finding policies 和 waiver arrays 均未放宽或新增。
2. `record-inventory.md` 中的 26 条 in-scope Record 均不在 focused quality rerun 中；每项由 owner split/extraction 或授权 selection change 消除。
3. 同一 rerun 逐条枚举 inventory 的 46 条 deferred Record，零 waiver、零 threshold 提升、零新增 selection exclusion，且没有新增 Record ID。
4. 已修改的测试实体、Case mapping 和目标 test execution 通过；相关 scripts/product tests、typecheck、lint、docs/investigations validation 与 focused repository-quality rerun 均通过。
5. Lizard performance、legal/compliance parsing、layout characterization、parse-facts cache、invocation/completion/diagnostic logger、scheduler duration 与 task-scheduler admission core 保持 deferred/unwaived，等待独立风险评估。

## Affected Owners

- `scripts/project/gate/checks/repository-quality.ts` 及其 configuration test：repository-quality selection 与 evidence。
- `docs/quality-metrics.md`、`docs/script-tooling.md#project-gate`：quality / Gate boundary。
- `docs/investigations/**` 与 `bun run investigations`：调查资源仍受验证，非通用排除对象。
- package artifact/candidate、maintenance advisory、Gate diagnostics/controls、machine-artifact validation、Function Metrics、Markdown link validation、Project Definition、Run Controls 和 Project Run test-support owners及相邻 tests/Cases。
- `docs/decisions/require-selected-repository-quality-remediation-in-active-cleanup-changes.md`：已启动 quality cleanup 的长期验收边界；最终 workspace evidence 已证明其方向成为当前事实，随后通过正式 Decision CLI 标记为 aligned。

## Completion Evidence

- 验收运行：`.log/project-gate/2026-09-04T15-38-42.511Z-1155534-8f0afbe7-d31e-4119-8310-68e8bdf412e7/machine/records.ndjson`。该 focused `quality` Gate 通过，输出恰好 46 条 Record（duplicate 1、file 11、function 34）。
- 对比方法与结果：以 `record-inventory.md` 的稳定 Check/Record ID 比较该运行；26 条 in-scope ID 全部缺席，46 条 deferred ID 全部存在，运行中不存在未分类的新增 ID。完整逐条列表仍只由 inventory 维护。
- workspace-level 验收：`.log/project-gate/2026-09-04T15-51-52.489Z-1176015-eaf5bf95-ae36-451d-9703-33831977c973`。默认 `bun run check` 的 required Gate 通过，31 个 Check `passed`、5 个 `not-applicable`、零 `failed`/`unavailable`；它完成任务 2.4，并提供未扩大范围、未添加 waiver、未提高 threshold 或新增 quality exclusion 的最终 workspace evidence。
