# Proposal

本 Draft 调查公共 authoring API 中迫使调用方填写空值或既定默认值的必填字段，并为逐项收敛提供证据；不授权批量可选化。

## Why

用户因原先 `changes.flags.<id>.exclude` 必须填写 `[]` 而要求系统核对同类调用负担；该先行项已落实为[可省略输入](../../docs/api-mechanics.md#按文件变化选择-check)。真实目标是让无额外政策的调用方不必重复填写中性值，而不是让所有公开字段都变成可选。

公共导出的完整类型并不都属于 authoring input：`defineConfig`、Check constructors 已接受 partial input，而 `ProjectDefinition`、resolved options、graph/context/result DTO 表达完整事实。安全读取范围、显式授权、身份与版本信息也不能因为存在一个猜测默认值就被省略。

本轮已核对 package-root 导出、Definition/Controls、九项固定身份构造器、`commandCheck` 与常用随包工具。形成时证据、分类、现有 Decision 约束和验证边界保存在 [inventory](inventory.md)。

## Outcome

公共 API 调用方可以在不改变既有显式输入行为、不扩大读取或执行授权、不削弱失败诊断的前提下，省略经逐项确认的中性字段；维护者拥有可复核的候选清单、保留必填的理由和实施前需要解决的设计问题。

本轮出口仅为有效 Draft 与系统调查清单：一个新增高置信候选、五个需设计判断的字段，以及保留必填/已经可选/非 authoring 的排除项。`changes.flags.<id>.exclude` 已由[Definition owner](../../docs/development/project-definition.md#project-changes)承接，不计入新增候选或待决事项，不在本 Change 重复实施。

## Scope

### Intended Change

- 暂定下一步优先审阅 `ReconcileFindingWaiversOptions.waivers` 的可省略输入，使省略与 `[]` 均表示没有 waiver；实施仍需独立确认和 Plan 收敛。
- 保留 `codeAreas.<id>.files`（三个 Check）、`CollectProjectFilesOptions.selection.exclude` 和 bundled schema source `catalog` 的设计问题，不视为既定实施范围。
- 在 owning input boundary 默认化；内部 resolved value 和输出保持完整。每个字段独立判断 omission、own `undefined`、非法显式值与 normalized identity。
- 本 Draft 只拥有调查材料，不修改 source、测试、当前 owner、现有 Decision 或其它 Change；转入 Plan、产品实施与结项须分别获得后续授权。

### Resulting Impacts

将来批准字段调整后，类型、runtime boundary、对应用户指南、JSDoc、authoring/consumer 验收须共同闭合。对安全范围、默认扫描范围、fingerprint/cache identity 有影响的字段，必须先处理相应 Decision 和默认值选择；本轮只记录影响，不更新稳定契约。

## Success Criteria

- 候选有准确 public 字段路径、必填类型与 runtime 依据、拟议省略语义、兼容/安全影响及判断状态。
- 区分调用输入与 materialized/resolved/context/output，不能以 normalized 必填字段数证明调用负担。
- 范围不与先行 `changes.exclude` 实施或现有 Change 重复；Draft 通过单目录结构检查，局部链接与 whitespace 可核对。
- 交付如实说明仅调查和建立 Draft，未完成产品变更、类型编译、回归或 installed-consumer 验收。

## Affected Owners

- [API 机制](../../docs/api-mechanics.md)、[Project Definition](../../docs/development/project-definition.md)、[Project Run](../../docs/development/project-run.md)：authoring/resolved 分工。
- [Finding waiver](../../docs/guides/finding-waivers.md)、[随包工具实现](../../docs/development/package-tools.md)：高置信候选的语义和实现 owner。
- [文件收集](../../docs/guides/collecting-project-files.md)、[fileMetrics](../../docs/checks/file-metrics.md)、[functionMetrics](../../docs/checks/function-metrics.md)、[duplicateDetection](../../docs/checks/duplicate-detection.md)、[JSON Schema](../../docs/checks/json-schema-validation.md)：设计待判断项的既有公开承诺。
- [测试策略](../../docs/testing/strategy.md)、[文档导航](../../docs/navigation.md)：未来实施验收入口；本轮不增加产品测试或 Case。
