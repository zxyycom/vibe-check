> **核心句：**本 change 为 TypeScript Project Definition 保留声明式文件政策方向，使同一项目中的文件可以使用不同的 Check 自有政策，而不突破全局输入边界。

## Why

README、设计文档、生成示例和普通源码常常需要不同的检查政策。项目需要一个可解释的文件级声明方式，但共同基础仍在演进，当前不应提前冻结具体 authoring API 或功能字段。

## What Changes

- Project Definition 可以贡献声明式纯数据文件政策，并以 normalized project-relative path 有序匹配。
- 每项政策只影响 producing Check 明确声明为可覆盖的 policy input；内置与自定义 Check 分别拥有自己的政策契约和验证责任。
- 公共 resolution 边界只负责匹配、顺序、owner 路由、结果冻结与来源追踪，不定义任意 deep merge 或功能专属字段。
- 文件政策不能扩大项目全局 inventory；同一路径的 current 与显式 reference 工作使用同一 invocation 中解析并冻结的值。
- 产品应能解释某个路径匹配了哪些声明及其来源，但本 change 不固定解释入口或输出格式。
- 本 change 只记录未来能力意图；实施前必须基于已落地的 Check/Record Core、Check Task Orchestration 与 TypeScript Project Definition 重新细化。

## Capabilities

### New Capabilities

- `file-policy-resolution`: Project Definition 中声明式文件政策的 check-owned validation、ordered path resolution、scope boundary、reference consistency 与 provenance。

### Modified Capabilities

无。

## Impact

- 未来会影响 Project Definition normalization、resolved Check contribution、全局 inventory 到 Check input 的 handoff，以及 comparison/reference planning。
- 后续内置或自定义 Check 只消费该能力并声明自己拥有的政策输入；它们不反向定义公共匹配与冻结机制。
- Artifact 可以先验证基础 change 是否提供必要 authoring seam；实际实现必须在三个直接依赖实施或同步后开始。
