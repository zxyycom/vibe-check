# Proposal

对已经实现的 `fileMetrics` 配置改造执行一次独立的 AI-ready 文档审查和编码规范审查，使 consumer 能从唯一指南恢复完整配置与结果语义，并使实现代码直接表达边界、领域状态、失败映射和模块职责。

## Why

`fileMetrics` 指南已经包含主要事实，但配置关系、allowance 分支、结果状态和 owner 边界仍需要读者跨段拼接；Configuration 又重复展开部分精确 contract，增加后续漂移风险。constructor 已替代原 default Check value，但实现文件仍沿用 `default-check` 名称；部分内部名称与 nullable 返回值也不能直接呈现 exact-input、scanner、area membership、Record policy 和失败状态。

这些问题不会改变已经确认的 area-owned policy 或 SCC adapter contract，但会降低后续 AI、实现者和 reviewer 从局部文本恢复真实数据流与失败边界的可靠性。相邻实现即使继续使用旧名称或弱领域表达，也不构成本次偏离项目编码规范的依据。

## Outcome

- 手写 `fileMetrics` 指南成为 consumer 配置、默认值、有效上限、重叠 area、结果与 custom executable 的完整 owner；相邻文档保留明确摘要与链接。
- 文件、类型、参数和阶段名称直接表达 constructor、exact inputs、scanner、area membership、Record policy 与 failure mapping。
- 行为、公共 option shape、Record shape、SCC CLI protocol 和 terminal outcomes 保持不变。
- 目标测试、Case 账本、文档 projection、公共 package、typecheck、lint、format 和 workspace Gate 提供可复核证据。

## Scope

### Intended Change

- 重构 `docs/checks/file-metrics.md` 的信息顺序和局部规格，明确 defaults、effective maximum、overlap、Record/result 与 failure mapping。
- 让 Configuration 和 scanner owner 只保留各自职责内的摘要或验证边界，不复制完整 consumer contract 或依赖旧测试文件名。
- 将 file-metrics constructor 源码与配对测试改为职责明确的文件名，并同步 package root export 和 Case entity path。
- 优化 file-metrics 边界类型、领域命名、Record conversion、穷尽 failure mapping 和 typed process error handling。

### Resulting Impacts

- 影响 `docs/checks/file-metrics.md`、`docs/configuration.md`、`docs/scanner-dependencies.md`、`src/package-checks/file-metrics/**`、`src/index.ts` 与相关测试 Case。
- package declarations、candidate artifact 和 generated documentation projection 需要重新准备与验收。
- 测试路径 rename 需要保持 Case ID 与证明目的连续，只更新 current entity key。

## Success Criteria

- AI 只读 `fileMetrics` 指南即可生成合法的多 area 配置，并解释 defaults、allowance、overlap、scanner 和全部终态。
- 当前实现不再以 `default-check` 命名 constructor，也不以 `current`、`dependency`、`semantics` 或 nullable 三态隐藏跨阶段职责。
- package root public API 和运行结果不变；目标测试与 Case IDs 保持语义连续。
- 目标测试、文档检查、typecheck、lint、format、Test Evidence、candidate 验收和 required Gate 通过，或明确隔离并报告共享工作区的非本 Change 阻塞。

## Affected Owners

- Consumer Check guide：`docs/checks/file-metrics.md`。
- Package composition：`docs/configuration.md`。
- Private scanner boundary：`docs/scanner-dependencies.md`。
- 通用实现质量与 package 中文说明：`docs/coding-style.md`。
- File-metrics Product owner：`src/package-checks/file-metrics/**`。
- 测试策略与 Case 账本：`docs/testing.md`、`docs/testing/case-maintenance.md`。
