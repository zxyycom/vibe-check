# Tasks

本 Plan 先固定 runtime-only API 与终态事实边界，再实现并以 Scheduler/Definition/Run 契约验证收口。

## Readiness

- [x] 0.1 已读取 Scheduler、Definition、output-failure、诊断与测试 owner，确认 summary 是私有二级投影且现有 output branch 可保留 facts。
- [x] 0.2 已建立完整 Decision candidate，确认它修订现有 summary Decision 而不涉及 learned scheduling、跨 invocation state或历史存储。
- [x] 0.3 已审查既有 Scheduler performance Case，确定 context、顺序、async settlement、failure isolation、default/validation/fingerprint为独立可观察证明。

## Implementation

- [x] 1.1 增加 Scheduler measurement Hook public/runtime Definition grammar、normalization和 declarative fingerprint exclusion，并补默认、validation和fingerprint证据。
- [x] 1.2 将 Scheduler accumulator重构为有界 raw terminal measurement/context；保留采样与现有 summary作为内置 terminal side effect。
- [x] 1.3 实现 ordered terminal Hook invocation、all-settled failure isolation和独立 output status/result diagnostic：所有 caller hooks 成功后才标记 succeeded，正常完成才升级为 output failure，primary cancellation/policy failure保持优先级。
- [x] 1.4 同步 Configuration、Architecture、API mechanics、Case账本与后继 active Decision；归档的 summary/Hook Decision 仅保留演进历史，不按当前规则重写；不归档 Change。

## Verification

- [x] 2.1 在测试修改前后运行 `bun run test-evidence -- check --root .`，并运行 Definition/fingerprint、Scheduler和invocation diagnostic最窄 tests。
- [x] 2.2 运行相关 typecheck、lint、docs/decision/change checks，检查局部 diff与无意 fingerprint/machine/progress扩张。
- [x] 2.3 运行 `bun run verify:vibe-check-workspace:required`，核对完整 facts-preserving hook failure与无后台 hook work证据。
