# Tasks

本 Plan 先固定长期边界和 DTO，再实现 decision sampling、统一 terminal delivery并完成跨 owner 验证。

## Readiness
- [x] 0.1 已读取 Scheduler、admission policy、measurement Hook、测试与治理 owner，确认归档 predecessor 只作演进依据。
- [x] 0.2 已审查 Decision 历史与 active Change，确认不涉及 learned-duration Change。

## Implementation
- [x] 1.1 添加 public graph DTO、policy measurement snapshot 与 bounded captured-prefix action-observation reader，并在 custom callback 前 flush/freeze。
- [x] 1.2 保持 mutation/capture/post-action observation baseline 顺序，按 custom policy需求启用 collector并保留 static no-consumer fast path。
- [x] 1.3 将 summary 作为内部默认 Hook 与 caller Hook 纳入同一 terminal runner，保持 failure containment/output precedence。
- [x] 1.4 同步稳定 docs、Decision 演进、Case 账本与目标测试矩阵：当前 owner 明确 shared graph、actual-callback boundary、captured prefix、terminal-only table、summary runner 与非目标；archived Decision 仅保留历史。

## Verification
- [x] 2.1 测试修改前后运行 test-evidence check 与最窄 Definition/Scheduler/Run tests。
- [x] 2.2 运行 format、typecheck、lint、docs、Decision 与 Change checks，并复核当前 docs 没有把已归档单条 transition snapshot 当作现行 API/owner。
- [x] 2.3 运行 required workspace verification，审查局部 diff与静态无采样边界。
