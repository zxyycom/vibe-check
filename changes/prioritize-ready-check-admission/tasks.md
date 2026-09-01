# Tasks

任务按长期判断、Product contract、scheduler 实现和项目 Gate 证据推进。不得先给 Gate 填写直觉优先级，再倒推 Product 或基线。

## Readiness

- [ ] 0.1 使用 Decision Records 演进 parallel-limit/reservation 与 measured Gate scheduling Decisions，固定 priority 只在既有选择层级内排序、reservation 建立后不可抢占，以及 Gate 配置由重复证据拥有。
- [ ] 0.2 在相同 exact candidate、Check membership、root capacity、runtime/toolchain 与 candidate reuse policy 下，为当前 required/full Gate 各执行一次不计样本的 warm-up 和五次 measured run，记录原始 wall time、median、p90、ready-to-start delay、duration、dependency/mutex wait 与 admission trace，形成 default 基线和候选列表。

## Implementation

- [ ] 1.1 在 public Check authoring 与 Project Definition closed grammar 中实现 safe-integer `admissionPriority`、默认 `0`、nearest-explicit inheritance、normalized declaration、deep-freeze、declarative snapshot/fingerprint 和 JSDoc；同步 invalid/default/override fixtures。
- [ ] 1.2 将 effective priority 投影到 Check execution plan 和 generic task graph，完成默认值、safe-integer validation 与 immutable `PlannedTask`；更新所有生产调用方和手写 graph fixtures，不允许测试绕过统一 grammar。
- [ ] 1.3 在 pure scheduler decision/inspection owner 中实现 selection ladder：reserved task；tightening 和 constrained continuation 的 cap/priority/scope-id/task-id comparator；ordinary ready 的 priority/pending-order comparator。保持 `canAdmit`、sticky reservation、stale cleanup 和 imperative scheduler shell 无 priority 状态或第二队列。
- [ ] 1.4 更新 Configuration、Architecture、Testing 和 public API 文档、semantic Case ledger、generated package declaration 与 installed external consumer；让 internal admit decision 和现有人读 diagnostic 携带 selected task 的 effective priority，不扩展 machine/Check/Record/output order contract。
- [ ] 1.5 根据 0.2 的候选，为 required/full 各先 warm-up 两种 variant，再采集五组 AB/BA 交错的 default/tuned 配对样本。仅当目标 start delay 至少四组降低、两个 profile tuned median 均不增加、至少一个 profile median 降低且 task/outcome 集合相同时，才在中央 Gate Definition 保留非零值并为新 fingerprint 重建 advisory baseline；否则保持默认 `0`。

## Verification

- [ ] 2.1 运行 Definition/Check-plan/task-graph 最窄 tests，证明 invalid number、signed safe integer、default/explicit-zero fingerprint 等价、父级继承、子级覆盖、deep-freeze 与 public type projection。
- [ ] 2.2 运行 pure decision 与 scheduler engine tests，证明默认 trace、higher-priority selection、各 selector 既有 tie-break、blocked-high no-head-of-line、dependency/mutex/cap、tightening cap-first、sticky reservation、stale/cancel cleanup、constrained continuation 和 no-preemption。
- [ ] 2.3 按 Test Evidence 流程闭合新增/修改 Cases，并运行 product typecheck、lint、format、docs、Decisions、package candidate、installed external consumer、required/full workspace Gate；复核 machine/publication/result bytes 与既有顺序 contract 未变化，并保存 1.5 的 A/B 与新 baseline 证据。
