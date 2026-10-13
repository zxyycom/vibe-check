# Tasks

先关闭事实来源与阶段契约，再实施单次交接，完成语义和可归因性能证据。Plan 保留；本轮 Git 提交已获授权，受限自动推送遵循[工作区提交规则](../../docs/tooling/workspace.md#local-post-commit-auto-push)，结项删除另行授权。

## Readiness
- [x] 0.1 读取 owner、直接 Decisions、原始调用者与完整 Case 起点检查，确认 raw 入口仍需完整验证。
- [x] 0.2 root 审阅明确 capability、output-owned inputs 与 derive tasks 后通过 Plan 门禁。
- [x] 0.3 冻结同一其他改动的 before source mirror、workload 和环境，准备独占计时与操作计数。

## Implementation
- [x] 1.1 Definition validation 保留 parsed/resolved facts，公开 Run 不 materialize/reparse；legacy standalone validator/normalizer保留原合约。
- [x] 1.2 Invocation pre-Git 持有绑定 checks、static graph、root cap 的 private prepared handoff，strategy/execution/Scheduler复用；raw入口独立关闭。
- [x] 1.3 补足 prepared graph identity/cap、跨 Run authored mutation、raw failure 与生命周期最窄语义证据，向 root 交接 Case entity。
- [x] 1.4 向 root 提交内部 owner 定向说明，独立审查确认公开用法和 contracts 无迁移。

## Verification
- [x] 2.1 Definition、public Run、flags/Git/cancel、strategy failure、resource constraints与Scheduler standalone相关tests通过。
- [x] 2.2 typecheck/lint/dependency/入口验证、Case闭合和组合Gate通过，报告未覆盖边界。
- [x] 2.3 同一公开APIworkload的小/大static/custom、outputs配置对照与parse/plan/prepare计数完成；区分操作量和端到端收益。
- [x] 2.4 独立代理审查、主线程语义验收和共享接口冻结 hash 完成；Plan 保留，提交不等于结项删除。

## Delivery Evidence

### 文档与编码规范整理后验收

本次实际 diff 已按 ai-ready-docs 与编码规范完成实施侧检查及独立复核，无剩余必须整改项或临时风格豁免。
整理后的候选 `0.0.0-local.f051c973f74b` 经 `mise exec -- bun run check -- --all` 验证，exit 0，
43/43 Checks 通过，包含实际安装包的 artifact/types/documentation/runtime acceptance。
日志为 `.log/project-gate/2026-10-13T07-03-21.944Z-2398670-75eec21d-3d31-41b0-8640-0d9ed675fca7/`。
总反馈 41.54 秒；Check 均值 2277.1 ms、P95 6029.8 ms 仍超过 2000/5000 ms 告警预算。
首轮同候选 Gate 有三个 5 秒测试超时；原日志保留在
`.log/project-gate/2026-10-13T07-01-30.440Z-2391490-e2233747-1008-4d86-9df8-cba0c66fb8c8/`。
三个目标文件单独复跑 9/9 通过后，未改源码、超时、阈值或豁免即完成上述完整重验。
Case 闭合保持 715 entities / 178 Cases / 15 topics；文档投影、材料、Decision、Change 和格式检查通过。
整理后未重新计时：下方性能数据只证明各自冻结源码，不视为当前字节版本的测量。Plan 继续保留。

### 上轮实现验收

以下保存上轮实现验收的日志、候选版本与测量边界；当时的 Git 状态不代表本次提交结果。

2026-10-13 最终组合验证 `mise exec -- bun run check -- --all` exit 0，43/43 Checks 通过，
包括 Product/scripts tests、typecheck/lint/import boundary、实际安装包的 types/documentation/runtime acceptance、
artifact 与 Case 闭合。候选为 `0.0.0-local.3db8a33d20ab`；日志位于
`.log/project-gate/2026-10-13T06-24-59.203Z-2372756-26315e2b-165e-4c58-b346-5ff52251c19c/`。

总反馈 75.99 秒低于 90 秒告警预算；Check 均值 3029.5 ms、P95 7478.1 ms 超过 2000/5000 ms
告警预算，未修改预算或豁免。此 Gate 证明组合验收，不将独立切面计时外推为整个 Gate 加速。
未运行独立 cold candidate lifecycle integration、发布或跨平台验收；本次未修改 candidate lifecycle。
Plan 保留，未暂存、提交或结项删除；性能原始数据与镜像按本轮辅助目录的旁注留作复核。
