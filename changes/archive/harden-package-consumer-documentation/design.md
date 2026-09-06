# Design

本设计通过修正现有 consumer 入口和 supporting declarations 提升可复制性与局部可理解性，不借机扩大运行时能力。

## Context

README 已准确说明 `RunResult.kind === "completed"` 不等于全部 Check 通过，并把 public API 限定为 package root。审计确认七项内置 Check 指南忽略返回结果，secret-detection 指南未调用 `run`；JSON Schema 与 Run/output 的深入指南准确但局部字段 JSDoc 不完整；两处说明引用未打包路径。现行决策要求 README 为唯一总入口、任务专题拥有完整使用路径、局部参数由 declarations JSDoc 承接，并保持 root-only public import surface。

## Goals / Non-Goals

目标是让最小示例真实完成 Check Run 和失败处理，让安全、controls、cache、结果和 callback DTO 的高价值字段 hover 自足，并清除 package 外引用。非目标是新增 CLI/Gate、改变 exit-code 产品契约、导出新的 supporting types、公开内部调度或 scanner 机制、为全部内部 declarations 机械添加注释、改变运行时行为或归档本 Change。

## Decisions

### Intended Change

把 CI 结果处理保持为 consumer-owned adapter：示例使用现有 `RunResult`/`checkAggregation`，不复用 repository Gate。JSDoc 只说明现有结构和语义，不改字段与类型；优先覆盖会改变调用方选择或结果解释的 controls、aggregation、cache、final-data counts、Scheduler callback DTO 与安全字段，而不是用注释数量代替语义判断。失效引用改为当前随包页面内的说明或链接。基础 npm metadata 属于 closed generated manifest 的独立契约，不在本次文档修正中调整。

### Resulting Impacts

若最小示例来自 allowlisted projection source，应修改 source 后运行 projection write/check，避免直接制造漂移。JSDoc 变化需要 declaration/QuickInfo 验收。Markdown 与 manifest material 变化需要重建或核对 candidate，确保生成包而非仅源码已同步。公共 export inventory 必须保持不变。

## Risks / Trade-offs

八份指南复制同类 exit 处理可能增加篇幅，但可避免最危险的复制误用；可通过一个短而一致的 pattern 控制重复。把 repository 证据文字删除后仍需保留正确的性能/行为边界，不能把形成时证据伪装成 package 用户可访问的材料。JSDoc 过长会降低 hover 可读性，应让每个字段只承接调用方在局部必须恢复的语义，把完整算法、示例和取舍留在任务指南。

## Open Questions

无。root supporting type export 与 npm metadata 均保留为后续独立候选，不阻塞本 Change。
