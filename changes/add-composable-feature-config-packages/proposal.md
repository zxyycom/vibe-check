# Proposal

本 Draft 设计可组合的功能配置包：调用方加入一个可定制的配置工厂，即可向项目配置贡献一组内置 Checks、Hooks、策略和默认值。

## Why

质量检查、智能调度和文档检查等功能需要调用方在 Check tree、scheduler policy、terminal observers 等位置重复接线。单项 constructor 已能生成普通 Check，learned strategy factory 也能生成普通 prepared strategy，但多个功能仍缺少统一的 authored-config 组合入口。

`defineConfig(...)` 会补齐默认值，因此多个完成态 Definition 已经丢失“显式输入”和“默认值”的区别。配置包需要先以字段感知的规则合并 authored fragments，再由一次 `defineConfig` 完成默认化、验证和规范化。

## Outcome

完成后，package consumer 可以显式导入并定制质量检查、智能调度、文档检查等功能配置包，将它们与项目基础配置组合为一个经现有 validation/normalization 的 `ProjectDefinition`。省略配置包即不启用其 Checks、Hooks、策略或 I/O；需要 Project Gate 能力的仓库集成仍输出独立且唯一的 `afterGate`。
