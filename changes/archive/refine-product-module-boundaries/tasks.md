# Tasks

按 owner 依赖顺序迁移，再以当前事实和全量工作区验证闭合。

## Readiness
- [x] 0.1 审计现有模块、直接 consumers、current owner、Decision 和 Test Evidence 起点。
- [x] 0.2 确认 prestable public contract 以 `ProjectOutputs`/`output` 完成 hard cut、不保留 compatibility alias，并记录 Check semantics、发布边界和 foundation caller audit 原则。
- [x] 0.3 复核扩大后的真实 consumer、CSV/host environment/shared-data 边界，并建立后继长期 Decision。

- [x] 0.4 审计第二轮 settlement、Project Run、cache、JSON shared capability 与 public inventory 的真实 owner，并形成后继 Decision。

## Implementation
- [x] 1.1 迁移 ordinary Check contract、Project Definition 和 Check facts，消除生产目录循环。
- [x] 1.2 将 Run invocation contract 与 Task scheduler 收入 Run，并更新 Product consumers 与 public entry。
- [x] 1.3 删除确认无 consumer 的 foundation 迁移残留，并同步 tests、current docs、layout/package tooling 和 Case paths。
- [x] 1.4 建立并对齐后继长期 Decision，更新 Change 实施证据和完成状态。
- [x] 1.5 迁移 Run execution、progress、controls 与 outputs 到具名子 owner，保留 Run entry/invocation/result 职责。
- [x] 1.6 迁移 machine v4 output、package Checks/project files、data-boundary 与 public API inventory；删除 foundation 及无 consumer 残留。
- [x] 1.7 同步 Product/script imports、layout/package/candidate/docs tooling、current docs、active Changes、tests 和 Case entities。

- [x] 1.8 迁移 check-settlement、Project Run、progress rendering、package JSON mechanism 与 tooling inventory；删除旧共享 I/O/cache 特权，并以明确 Run outputs 和 Check-owned cache 取代它。
- [x] 1.9 放宽无业务必要的 kebab-case runtime 限制并同步 machine contract/current docs/Case。

## Verification
- [x] 2.1 运行目标 Product、layout/package/candidate 测试和完整 Test Evidence closure。
- [x] 2.2 运行 Change/Decision/docs 检查、typecheck/lint 与 required workspace Gate。
- [x] 2.3 审查最终 diff、模块依赖方向和 public inventory，并记录未覆盖风险。
