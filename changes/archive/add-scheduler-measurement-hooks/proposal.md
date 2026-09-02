# Proposal

本 Change 将 Scheduler 的 invocation-local 一阶性能测量交给公开的终态 Hook 消费，同时保留现有的人读摘要作为内置副作用。

## Why

现有 `scheduler.summary` 只由 enabled diagnostic logging 的私有 writer 消费；调用方无法在不解析日志或复制 Scheduler 生命周期的前提下进行自己的二级性能投影。性能采样、区间归属和积分仍必须由 Scheduler 的唯一状态机拥有，不能由调用方从 Check duration 或日志重建。

## Outcome

Project Definition 可配置有序 Scheduler measurement hooks。一次 Scheduler 停止 admission 并 drain 后，每个 configured caller Hook 恰好获得同一份递归冻结的终态 context；其中包含 canonical graph、已调度/结算 observation 与有界 raw measurement。现有人读 summary 保留为先执行的内置二级副作用；caller Hook failure 总由 output status 可见，并只在没有 primary failure 的正常 completion 时以保留完整 Check facts 的 output failure 表达。

## Scope

### Intended Change

- 增加 runtime-only scheduler measurement hook authoring、default、validation、normalization和 public type export；hook identity不进入 declarative fingerprint。
- 在 Scheduler 内形成一次有界、递归冻结的终态 graph/execution/raw measurement context，并在 drain 后依序 await内置 summary与 caller hooks。
- 将现有 summary projection/writer迁为内置 Hook；caller hook failures成为独立 output status，在正常完成时才成为保留 facts 的 output failure，且不掩盖 primary execution result。
- 同步稳定 owner、Decision、Case 账本和最窄行为证据。

### Resulting Impacts

- Run output status/diagnostic 和 API docs增加一个可见的 hook-side-effect failure；machine、progress和 Check facts保持不变。
- 诊断启用或 caller hooks存在时才启用 raw collection；disabled且无 hooks的 Scheduler 不额外采样。

## Success Criteria

- 每个 configured Hook 获得同一个 deeply frozen context，其中不含 Task value/error/callback 或可变内部集合；graph、admitted/settled observations 与 raw measurement 可用于二级投影。
- 正常、cancelled及 policy-fault drain均只调用一次 terminal Hook sequence；sync/async hooks严格按配置顺序、全部 settled，无后台任务，Hook elapsed不计入 raw measurement。
- 一个 Hook throw/reject 不阻止后续 Hook；正常完成时以 `output`/`scheduler-measurement-hooks-failed` 返回完整 settled facts，cancellation或 admission-policy fault 等 primary execution result 则保留其 kind/diagnostic并标记 Hook output failed；内置 summary writer failure仍受 containment。
- declaration validation拒绝坏 hook list；不同 hook closure的 Definition fingerprint相同。
- scheduler summary继续只由 diagnostic-enabled内置副作用生成，且不进入 machine/progress/Check facts。

## Affected Owners

- `docs/configuration.md`：SchedulerPolicy public authoring、validation与 fingerprint边界。
- `docs/architecture.md`、`docs/api-mechanics.md`：Scheduler measurement context、terminal hooks与 output failure。
- `docs/testing.md`、`docs/testing/cases/quality-runtime.md`：语义 Case与证据。
- `src/project-definition/**`、`src/index.ts`：public runtime-only hook surface。
- `src/project-run/**`：measurement collection、terminal Hook sequence、output status与事实保留。
- `docs/decisions/preserve-primary-run-failures-over-measurement-hook-output.md`：当前 failure precedence 的长期判断；前两项 summary/Hook Decision 已归档，只保留演进依据。
