# Tasks

本 Plan 先恢复现有证据和边界，再按证明责任重组测试，最后以目标验证闭合。所有完成状态均对应已执行的工作或记录的验证证据。

## Readiness

- [x] 0.1 读取 AdmissionGraph/API、Scheduler、testing/Case owners 与 Change/Test Evidence workflow；记录两个目标 quality Record 和八个当前 AdmissionGraph entities。
- [x] 0.2 确认 shared fixture 只构造 fresh frozen public `SchedulerGraphSnapshot`，不需要新 semantic Case 或 production change。

## Implementation

- [x] 1.1 将八个 AdmissionGraph entities 按 public simulation、private core transition/trace 和 Scheduler replay 的证明责任分离到局部可读、低于 file metric 的 test files，保留 assertion purpose。
- [x] 1.2 新增 narrow `SchedulerGraphSnapshot` fixture，并迁移 critical-path test 的共同 public-DTO construction；保留 critical-path 独立 score assertions。
- [x] 1.3 更新 `quality-runtime.md` 的 entities 到实际 path/suite/test；保持两个受影响 Case 的 ID、Owner、Topic 和 Proves。

## Verification

- [x] 2.1 运行 target Scheduler Bun tests 和 post-change Test Evidence closure，并审阅 entity-to-Case continuity。
- [x] 2.2 运行 docs validation、typecheck、lint、format 与 Change Plan check。
- [x] 2.3 审阅 focused-quality machine records：两个 target Records 消失，Record 总数由 13 降至 11。
- [x] 2.4 恰好运行一次 default `bun run check`（非 `--all`）；已通过，随后归档 Change，并只提交本 Change 测试证据。
