# Design

按消费者任务拆分文档而非按主题相似度合并文字，用现有机械证据和独立语义审查分别承接同步风险。

## Context

当前发布路径 Markdown 直接作为包材料，代码示例从 allowlisted TypeScript 投影。现有 README 唯一入口和自然 heading 定位仍适用；最多一份深入机制页不再符合用户对可扩展专题的要求。用户确认 AI 实施和维护，人负责指导。

## Goals / Non-Goals

完整保留用户使用和内部设计两种用途，支持真实任务需要的专题增长；不生成整篇说明、不建功能文档总账、不用文件变化或校验成功冒充语义覆盖，不发明未公开 hook，不改变产品行为。

## Decisions

### Intended Change

README 保持定位与最小完整路径，调度深度用法迁入 scheduling 专题，Check 生命周期扩展形成独立指南；API mechanics 保留跨专题公共心智模型和结果边界。长期规则分别承接单入口多专题与按受众审查的方向。治理规则在现有 Change 任务或局部交付中记录变化、受影响页面/无需修改理由和验证，由独立代理从实际 diff 反查。

后续内部布局采用 development、tooling、governance 与既有 testing 职责组，不增加统一 developer 父目录或各目录重复索引。Configuration 按 Definition authoring 与 Run invocation 分开，脚本长文按工作区、Gate、package lifecycle 与文档维护分开。长度只触发职责和阅读负担审查，不设硬性行数阈值；共同必读的编码规则继续完整保留。

### Resulting Impacts

tooling 消费显式 Markdown 材料集合并保持闭合拒绝，投影随 heading 移动，installed consumer 继续执行实际示例。例子源和 prose 分别验证。内部规范引用公共契约不替代用户教程，用户文档不依赖未发布的内部页。新增 root 文档命令以既有命令实现为唯一执行入口。

内部路径迁移同步当前导航、Case owner 与入链，不保留第二份规范正文。三份现存调查报告只修复指向已迁移 owner 的导航目标，保持形成时显示文字、证据与结论不变；归档和历史采样资源不改写。`investigations` 根命令移除抢占子命令位置的前置参数，默认检查和追加的查询/同步子命令均使用原 skill CLI，不另建 wrapper。

## Risks / Trade-offs

两类叙述必然有适度重叠，风险由明确范围与同轮审查控制，而非强制逐字同源。专题增长会增加导航负担，只有独立使用任务才新增页面。机械校验能证明材料、投影和执行事实，不能保证自然语言完整无误。

## Open Questions

无阻断设计问题。实施核对公开回调实际能力后，若现有示例不足以说明使用边界，补充最小可运行示例并同步其现有 registry 与验收。
