# Tasks

所有任务均已以实现、目标测试与完整 Gate 证据闭合；本文件保留为已归档的实施记录。

## Readiness

- [x] 0.1 已读取 public export、quality/output/scan-scope owner、file-metrics candidate/Record/final-data tests 与 Gate tests，确认 helper placement、实际输出契约和 historical v2 input evidence。
- [x] 0.2 已将 `reconcile-finding-waivers-with-caller-defined-identities.md` 建立为 active unaligned，并以修订关系归档旧 path-exclusion Decision；实现后已完成其 alignment 核对。
- [x] 0.3 已定义 canonical structural identity、duplicate/hostile input validation、稳定 reconciliation 与 0/1/>1 结果；未引入一对多 selector 语义。

## Implementation

- [x] 1.1 已实现并公开泛型 finding-waiver helper、types、canonical identity comparison 与 deterministic reconciliation/audit results。
- [x] 1.2 已增加 helper unit/type tests，覆盖 caller-defined projections、nested identity、duplicate/invalid/hostile inputs、unused、applied、overmatched、detached/deep-frozen waiver evidence 与 finding reference preservation。
- [x] 1.3 已在 file-metrics 完整 candidates 后采用 helper，映射到 Check-owned Records/messages/settlement；已移除 Gate schemas-examples historical v2 run schema glob exclusion。
- [x] 1.4 已更新 file-metrics/Gate integration evidence；machine schema/example shape 未变，故未修改它们。

## Verification

- [x] 2.1 已运行 helper、file-metrics 与 repository Gate 目标测试；证明 v2 run schema 经 SCC 扫描并显示 waiver reason，unused/overmatched 及 zero exact input 不会静默豁免，audit ID 与 normal path 域不相交。
- [x] 2.2 已运行 typecheck、lint、format、docs、diff 及 `bun run test-evidence -- check --root .`；test-evidence 报告 281 entities / 84。
- [x] 2.3 已运行 `bun run verify:vibe-check-workspace:required`，最新 full Gate（required + package tests）36/36；完成 stable owner 对照后已对齐 successor Decision，并通过 decisions 与 Change checks。
