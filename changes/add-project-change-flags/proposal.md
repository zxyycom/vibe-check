# Proposal

本 Draft 为 Project Definition 设计可选的 change preparation：在调度前把变更 marker 派生为 Product-owned flags，并让所有 Check 继续通过 `enabledByFlags` 选择。

## Why

模块化测试等高成本 Check 可以根据项目变更范围减少无关执行。Project 已能用 immutable flags 形成一次 effective selection，也已有统一的项目文件 selection 与 glob matcher，因此根级 change 配置可以复用现有选择链路，而不必让每个 consumer 接线和解析变更 provider。

根配置负责在任何 Check author work 前形成一次可信 snapshot 和 change-derived flags；封闭的 flag expression 负责组合 caller flags 与 change markers；preflight 和 execution 按需查询同一 snapshot。这样既保留显式依赖和静态调度，也避免形成第二套 enablement language。

## Outcome

本 Change 完成后，package consumer 可配置一个 project-wide change view。Product 一次准备变更、复用既有 matcher 派生 flags，并以扩展后的 `enabledByFlags` expression 选择 Check 及其依赖闭包。省略配置时 Run 保持现有行为；配置可用时 preflight 与 execution 读取同一冻结 `change` query；输入不可信时保守运行相关 Check，而不把未知视为零变更。
