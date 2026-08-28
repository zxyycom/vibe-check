# Design

本设计以“共享调用和解析责任、保留领域输入差异”为边界统一随包 Check，不建立 generic factory 或结果 registry。

## Context

现有四项 public exports 已是函数，三项 format Checks 是完整 value；普通 Check contract 已支持 provider `parseData` 和可选 terminal/preflight messages。Run 与 machine v4 只保存 generic canonical object，因此类型恢复和领域消息必须由 producing Check 拥有。当前 area、document、schema、link 与 maintenance policies 仍分别由各自 owner 定义。

## Goals / Non-Goals

目标是统一七项随包 Check 的调用形态、补齐默认值、提供严格 final-data parser 和公共辅助类型，并让 Check-owned 问题具有安全可行动 message。非目标是建立共享 options grammar、公共 file-selection helper、machine artifact reader、generic diagnostic registry、兼容旧 value 或要求所有自定义 Check 返回 message。

## Decisions

### Intended Change

每个 Check owner定义自己的 authoring options、resolved options、final data、Record data、unavailable code、parser 和 message mapping。三个 format function 使用与现有 metric constructors 相同的两阶段边界：constructor 同步关闭 authoring input 并补 defaults，preflight/execution 再验证完整 resolved replacement。返回 Check 的 `parseData` 与 root named parser 使用同一函数。Messages 总结可行动边界，Records/final data 保留详细事实。

### Resulting Impacts

公共 export inventory、isolated consumer imports、Project Definition fixtures、package API examples 和全部直接调用要硬切为函数。Parser 和 message 分支需要直接行为测试；现有 Case proof 更新而不按 helper 数量拆 Case。消息必须避免 raw tool output、external absolute path、schema bytes、credentials 和 stack。维护提醒保留 entry-local message 语义，其 final-data parser 只解析 `{ entries }`。

## Risks / Trade-offs

- 全部函数使调用一致，但 domain options 仍不同；文档必须避免暗示七项具有同一配置 grammar。
- 为每个 unavailable code 写 message mapping 增加维护面；稳定 code 与领域 owner 能让变化保持局部。
- 公开辅助类型扩大预稳定 surface；只导出 consumer 实际需要的闭合类型，不导出 adapter/private protocol。
- Parser 只验证 final data object，不验证 Run branch 或 machine bytes；文档必须防止把它误当 artifact trust boundary。

## Open Questions

无。用户已确认三个 format functions 补齐可省略字段、所有随包 Check 提供 parser，并要求随包 Check 对自己明确结算的问题附带可行动消息。
