# Proposal

将 flag 未命中名单改为默认摘要，并保存本次实施与验证边界。

## Why

几百个按 flag 启用的 Check 即使合并为原因块，逐个列名仍会淹没有效结果。

## Outcome

默认以一行数量和原因呈现未选 Check；调用方可配置有界名称预览，完整事实与执行保持不变。

## Scope

### Intended Change

新增 `outputs.progressRendering.flagMismatchPreviewLimit`，默认 0，正数显示 Definition 顺序的前 N 个名称及剩余数量；只处理 Product-created flag mismatch。

### Resulting Impacts

同步 Definition/Controls validation、默认值和 fingerprint；更新 renderer、回归测试、Case、用户指南、内部 owner 与 changelog。machine schema 与 Check lifecycle 不变。

## Success Criteria

- 默认只有数量和原因；正数预览遵循顺序、转义与准确省略计数，零匹配不输出块。
- Definition 与 Controls 逐字段合并，0 有效，非法值即使 disabled 仍拒绝。
- 依赖带入项和其它终态不被误折叠，完整结果与计数保持。
- 目标测试、全树 Case check、材料校验与 changed Gate 有实际结果，并完成独立文档影响反查。

## Affected Owners

- `docs/guides/run-outputs.md`：公开配置和终端行为。
- `docs/development/project-definition.md`、`docs/development/project-run.md`：解析、投影与覆盖。
- `docs/development/human-output.md`：renderer 与事实隔离。
- `docs/testing/strategy.md`、`docs/testing/case-maintenance.md`：测试证据。
