# Proposal

本 Draft 整理由 Product 提供的维护提醒 Check constructor；它保存已经确认的产品方向和进入 Plan 前仍需决定的边界，不授权实施。

## Why

项目会持续积累需要定期复核、但默认不应阻断交付的维护事项，例如文档结构复核和代码优化质量抽查。使用者可以用 custom Check 自行实现，但这会重复 Git 基线解析、变化度量、提醒展示和可选失败结论的处理。

Vibe Check 应提供一个可直接配置的公共能力，同时保持一个清楚的产品边界：多条提醒属于同一个维护提醒 Check 的局部配置和结果，不成为独立 Check，因而不会扩大全局 Check catalog、progress accounting、aggregation selection 或 dependency identity。

## Outcome

Package 使用者可以调用 `maintenanceReminders([配置1, 配置2])` 构造一个普通 executable Check。每条配置固定自己的 base commit、变化限制和提醒内容；超过提交数或变化行数限制时，该 Check 通过结构化 message 让对应事项被看见。

默认行为只提供提醒，不产生 failed 结论。使用者可以为确实需要门禁的提醒显式选择失败语义；是否最终阻断流程仍由调用方的 Run aggregation 或 Project Gate mapping 决定。
