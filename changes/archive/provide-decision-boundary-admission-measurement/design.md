# Design

本设计保持 Scheduler 的唯一状态机与有界一阶 measurement owner，同时把可供 policy 读取的事实限定在 decision boundary。

## Context

归档 Change `add-scheduler-measurement-hooks` 已建立 terminal raw measurement 与 caller Hook；其后继的归档 Decision 只保留形成时的单条 transition snapshot，不能作为当前 contract owner。当前 custom policy context 已有 frozen graph/candidates/capacity/runtime，但没有 decision-boundary measurement，且 summary 由 Scheduler 单独调用。

## Goals / Non-Goals

目标是只在每次**实际** custom callback 前 flush 当前 open interval，并提交从上一 accepted policy action post-state 到该 callback 的 frozen state observation；同一 Run 的 graph 只构造/冻结一次，summary 作为内部默认 terminal Hook。非目标是 learned scheduling、跨 invocation history/storage、自动调参、完整 interval ledger、live observation array、per-round history slice 或 per-transition caller Hooks。

## Decisions

### Intended Change

- 以唯一 public `SchedulerGraphSnapshot` 统一 admission 与 terminal context 的 graph DTO，所有公开 Task identity 都是 `taskId`。
- 以最小 `AdmissionPolicyContext.measurement` 增量交接 `{ cumulative, measurementCount, measurementAt(index) }`；cumulative 是 collector 已 flush 的 bounded scalar measurement，完整 per-Task table 只在 terminal raw measurement 出现。reader 在每个 context 创建时捕获 invocation-local append-only frozen action observations 的 end-count；`measurementAt(index)` 是同步 prefix getter，不返回 live array 或每轮 slice，故旧 context 不会看到 future append，也不为每轮复制 history。
- custom policy 使 collector 即使 diagnostic disabled/caller Hooks empty 也启用；只有 static 且无 terminal consumer 时保持不采样。flush、append 与 reader 构造只在**实际** custom callback 前发生；accepted action 使用既有 flush→mutate→capture post-state→commit action observation 顺序。blocked、cancel 与 settlement 只作为已有 pending action 的 effects，不把 state observation 叙述为 action causality。
- internal default summary Hook 与 caller Hooks 使用单一 ordered async runner；summary wrapper 自己吞没 writer failure，runner 只将 caller failure 交给既有 output precedence。

### Resulting Impacts

- public API、configuration、architecture/API mechanics、change order、tests 与 Case 账本必须说明 decision snapshot、taskId 一致性、append-only action observation/interval 边界、clock unavailable 和 runtime-only fingerprint exclusion。action observation interval 是 closed union：available 才含 contribution，unavailable 只含 reason，避免把 timing fault 伪造成合法 zero；合法 zero span 仍是 available contribution。
- policy callback、Hook identity/closure与 snapshot不进入 declarative fingerprint；pre-work/planning不创建 Scheduler context或调用 Hook。

## Risks / Trade-offs

collector snapshot 保持每 graph task/scoped fact的有界空间，而非完整 ledger；clock unavailable 仍保留离散 effects，并以 unavailable interval reason 而非数值贡献表示；合法 zero 仍为 available contribution。默认 summary Hook 不能影响 caller Hook failure precedence。synthetic allocation proxy 只用于审计此有界表示的取舍，不形成 runtime performance budget。

## Open Questions

无。

## Implementation Observations

在 Bun 1.3.14 / Linux WSL2 的 synthetic serial-admission allocation proxy 中，逐轮 clone/deep-freeze graph 与 raw admissions 的基线在 N=100/D=100 为 19.7ms、N=1k/D=1k 为 1913ms；一次 shared graph 加 compact scalar measurement 分别为 2.90ms、265ms。N=5k/D=200 的 eager 2118ms、shared/full-raw 492ms、shared/compact 464ms。该观察不是稳定 performance budget；它仅证明选择避免 `O(decisions × tasks)` graph allocation 及逐轮 terminal admission materialization。实现仍为每轮 candidates/running/settled 等动态 facts 建新冻结数组，以免旧 context 观察后续 mutation；Scheduler 不保留 caller context。
