# Design

本 Plan 将第一批 remediation 锚定在稳定 Record inventory：唯一授权的 resources selection 调整，或具有窄 owner、邻近测试和不变行为边界的局部职责提取。

## Context

- 基线是 Project Gate `2026-09-04T14-52-30.845Z-1071190-0f77a68c-4619-4a78-843c-aa72de9677fc` 的 `machine/records.ndjson`：72 条 quality Record（duplicate 4、file 18、function 50）。`record-inventory.md` 是该基线的完整稳定 ID 分类。
- 验收运行是 `2026-09-04T15-38-42.511Z-1155534-8f0afbe7-d31e-4119-8310-68e8bdf412e7` 的 focused `quality` Gate。它通过并发布 46 条 Record（duplicate 1、file 11、function 34）；与 inventory 比较时，26 条 in-scope ID 缺席、46 条 deferred ID 全部存在、没有新增 ID。
- `docs/quality-metrics.md` 规定 producing Check 保留 Finding/Record facts，Gate 以显式 aggregate 映射 process result；既有 Decision 让 repository-quality Findings 保持 advisory。advisory 不降低本 Plan 选择的 26 条记录的验收标准。
- 已对齐的 `exclude-lizard-port-from-repository-quality-metrics.md` 仅允许 Lizard source-aligned analyzer 的既有整目录 selection exclusion。本 Change 的唯一新增授权是 `docs/investigations/_resources/**` 退出 **file metrics**；它不覆盖 docs validation、duplicate/function metrics 或其它目录。
- 被选择的 parser/path/canonicalization/selection functions 有窄 owner 与邻近 tests；本 Change 提取 field group、value-kind branch、predicate/ordering helper 或 read/probe phase，保留公开入口、结果与 fail-closed 边界。测试 entity/Cases 的语义连续性优先于文件行数。

## Goals / Non-Goals

**Goals**

- 消除 inventory 的 26 个 in-scope Record；微小超限不是保留已证实低风险 owner split 的理由。
- 为 resource exclusion、每个 extraction 和 duplicate helper 保留局部测试、Case 与 quality evidence，并保留其它 validation。
- 保持其余 46 条 Record 的 selected、visible、unwaived deferred 边界，为下一批独立评估提供精确输入。

**Non-Goals**

- 不把 advisory Finding 变为 Gate process failure，也不建立“全仓库 quality inventory 归零”的要求。
- 不提高 threshold、不增加 waiver、不开辟额外 file selection exclusion，且不改变 package public API、Gate aggregation 或 scanner protocol。
- 不重构 Lizard performance、legal/compliance parser、layout characterization、parse-facts cache、invocation/completion/diagnostic logger、scheduler duration、task-scheduler admission core，或其它未证实为机械 owner split 的 owner。

## Decisions

### Intended Change

1. 在 `fileMetrics.codeAreas.docs-specs.files.exclude` 增加且只增加 `docs/investigations/_resources/**`；configuration test 证明它只影响 docs-specs 的 file metrics selection，`bun run investigations` 仍是独立必经验证。
2. 对 package artifact/candidate evidence、maintenance advisory、Gate diagnostics/controls、machine canonicalization、Function Metrics analysis、Markdown link root probe/read source、Check authoring 和 RunControls validation，提取 owner-local helper/module。调用者、input/output shape、branch precedence、diagnostic/error text、fail-closed behavior、frozen snapshot 与 security containment 不变。
3. measurement-performance harness/worker 使用同一 source DTO helper；custom-admission lifecycle/learned scheduling 使用同一 event-order assertion helper；analyzer-adapter 使用局部 fixture constructor。三项只整理共同测试/support-data 不变量，不改变 Product analyzer、scheduler lifecycle 或 oracle expectation。
4. 仅按现有 Case `Proves` 的独立 semantic boundary，把 Markdown default-check 与 invocation-progress test entity 移至 sibling owner；不为 file metric 创建 Case。
5. 从 `run.test-support.ts` 提取 cohesive support module，保留 exported helper signature 与现有 Run test import behavior。

### Resulting Impacts

- imports、test entities 与 Case mappings 随拆分同步；test-evidence closure 与 owner-local Bun tests 证明原行为仍在。
- path containment、authoring/control parser 与 canonical serializer 有 security/contract 责任；本次只提取不改变 domain predicate 的机械边界。不能由窄测试证明 equivalence 的记录应保持 deferred，不能用 waiver 或 threshold 处理。
- focused rerun 使用 Gate 的真实 repository-quality configuration，并比较完整 Record 集合。只证明 selected IDs 缺失不足以掩盖新 Finding。
- deferred inventory 不是 waiver：不写入 `findingWaivers`、不从 selection 删除、不调整 limits。后续只能以独立 Change 或新的机械 owner-split evidence 重新选择。

## Risks / Trade-offs

- 微小超限仍可能诱使只为指标拆分并改变错误或测试语义；控制方式是先确认 invocation/proof boundary，再用相邻 tests/Cases 验证，而不是容忍超限。
- 调查资源可能包含大型 profile payload；仅 `_resources/**` 的 file-metrics exclusion 避免将其视为 code。扩大为 `docs/investigations/**` 会丢失普通 docs signal，因而不被授权。
- parser/canonical/path helper 的 fail-closed/security sensitivity 由保留 public owner、无状态局部 helper 与精确现有 tests 控制；不是放弃 remediation signal 的理由。
- 本 Change 不处理高风险 owner，因而保留 46 条 advisory Record；它们仍被 selected、visible、unwaived，而非被接受、waive 或隐藏。

## Open Questions

无。范围内实施、focused quality comparison 与默认 workspace verification（任务 2.4）均已完成。

## Implementation Observations

完成 evidence 以 `proposal.md#completion-evidence` 与 `record-inventory.md` 为准：最新运行准确保留 baseline 的 46 条 deferred stable ID，并消除了全部 26 条 in-scope stable ID。完整 workspace verification 证明长期方向成为当前事实，随后已由正式 Decision CLI 标记为 `active + aligned`；该观察不扩展 selection 权限。
