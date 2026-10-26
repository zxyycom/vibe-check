# Design

在唯一 progress owner 中限制 flag mismatch 名单，不改变选择和结算。

## Context

变更前的 renderer 在 flag-control barrier 聚合未选 Check，但无界列出名称。公开契约见 `docs/guides/run-outputs.md`；现有 preview 和事实隔离方向由 `260914-configure-progress-previews-and-quiet-pass-presentation` 与 `260830-separate-settlement-run-progress-and-machine-owners` 支持。

## Goals / Non-Goals

默认无名称噪声，并可按需诊断前 N 项。不调整 Check 定义、选择传播、outcome、aggregation、progress 分母、machine schema 或 quiet-pass policy。

## Decisions

### Intended Change

用户已确认默认摘要和可配名称预览。使用非负 safe integer `flagMismatchPreviewLimit`，默认 0，复用既有 Definition/Controls grammar；省略或 undefined 不覆盖，0 显式恢复摘要。renderer 输出单复数正确的数量/原因行，正数时附加前 N 个 escaped names；仅发生正数截断时附加剩余数量。

### Resulting Impacts

- 默认值和声明性投影统一增加字段；省略与显式 0 等价，不同 Definition 值改变 fingerprint，Controls 不进入 fingerprint。
- 分组 guard、barrier 时机和 completion accounting 不变，TTY/plain/dumb 与 progress tee 使用同一输出。
- 目标测试覆盖默认、零/单/多、截断边界、Definition 顺序、Controls 覆盖、转义和完整事实；既有 Case 保留身份并调整证明内容。
- 用户指南提供入口和配置用法，内部 owner 说明责任；changelog 说明默认行为变化。现有 formatter 只处理 Record/message，不处理名单。

## Risks / Trade-offs

默认不再显示未选名称是预期的人读变化；完整 Check 可从 RunResult/machine output 读取，配置足够大的合法 limit 可展开全部。此改动不是公开结果裁剪，也不引入 CLI flags。

## Open Questions

无影响实施的问题。本轮已授权整理提交及 hook 自身触发的推送；Change finalize/delete 仍待明确授权，提交后保留计划。

## Implementation Observations

- 首轮 tee 参数矩阵复用了 exclusive-create 文件名，后续场景使 progress output failed；改为每场景独立文件后通过，不改产品文件契约。
- 直接执行 Gate test 曾读取旧 installed candidate，缺少新 default；changed Gate 重新构建并绑定同一 current candidate 后，该测试及 artifact/docs/runtime 验收均通过。
- 首轮 changed Gate 的唯一产品检查失败为两份扩充后的测试超出 file-metrics 300 code-line 门限。将已存在的独立 progress authoring validation 移入实现配对测试，并复用相邻 writer helper、共享 flag Check 构造，保留所有断言；不增加 waiver 或放宽门限。
