# Proposal

本 Change 为 Check node 增加静态 `admissionPriority`，让项目在不改写 Definition 展示顺序的情况下，优先启动已 ready 且更可能影响总耗时的 executable Check。优先级只改变准入选择，不替代 dependency、mutex、capacity 或现有 reservation 机制。

## Why

当前 scheduler 在没有 reservation、tightening scope 或 constrained continuation 时，从 dependency/mutex eligible tasks 中按 Definition 的稳定顺序选择第一个任务。短任务先占满 root capacity 时，较长但已 ready 的任务可能很晚才启动，延长整次 Run 的尾部；手工调整 Definition 顺序又会把阅读结构、declarative fingerprint 与性能调度耦合起来。

2026-09-01 的一次本仓库 required Gate 观察中，`markdown-link-validation` 很早 ready，却约在 Run 开始后 13.9 秒才启动，并运行约 2.5 秒；该 Run 约 16.4 秒完成。这只能证明存在值得测量的候选，不能作为采用某个优先级值或声称性能改善的基线。另一个长任务 `tests-package-candidate` 与 package lifecycle mutex、下游 consumer 相关，说明“运行越久优先级越高”的自动策略可能反而延迟关键路径。

## Outcome

Package author 可以在 Check tree 中声明安全整数 `admissionPriority`。数值越大，同一现有调度选择层级内的 ready task 越早被考虑；省略时规范化为 `0`，并保持当前稳定准入顺序。容器 Check 的显式值由后代就近继承，子节点可以用更大、相同或负值覆盖。

本仓库 Gate 只在重复、同工作负载的前后对照证据支持时配置非零优先级。若证据不足或退化，则保留 Product 能力但不保留无效的 Gate 调优值。

## Scope

### Intended Change

- 将 `admissionPriority` 加入 Check authoring、递归 resolution、normalized declaration、declarative fingerprint 与 public TypeScript contract；它是安全整数，默认 `0`，采用 nearest-explicit scalar inheritance，而不是 `inherit({ add, remove })`。
- 将规范化后的值作为 immutable task metadata 投影到 scheduler；不增加动态优先级、历史数据、第二条队列或新的 scheduler mutable state。
- 保留现有选择层级：有效 reservation、tightening scope、constrained continuation、ordinary ready。优先级只在同一层级内排序；同优先级继续使用该层级当前的确定性 tie-breaker。
- reservation 一旦建立便保持 sticky，直到目标被准入、取消或离开 pending/eligible 集合；新出现的高优先级任务不能抢走 reservation。
- 保持非抢占语义。高优先级任务不能绕过 dependency、mutex、scope 或 root capacity，也不能因为尚未 ready 而阻塞可运行的低优先级任务。
- 在 internal admit decision 中记录 selected task 的 effective priority，让现有人读 scheduler diagnostic 可直接关联 task、选择层级与 priority；不扩展 machine output、Check/Record facts 或结果排序 contract。
- 用同一 candidate、相同 Check membership 与相同 runtime 条件重复交错运行本仓库 required/full Gate，对比 wall time、离散度、task start delay 与 mutex/dependency 关键路径；只保留有证据的 Gate 配置，并为新 fingerprint 重新建立 performance baseline。

### Resulting Impacts

- Public package type、JSDoc、Configuration/Architecture 文档与 installed external consumer 必须同步覆盖新字段。
- Project Definition parser、normalization、fingerprint、Check execution plan、task graph validation、pure scheduler decision 与相关 fixtures/tests 会受影响。
- 本仓库 Gate Definition 的任何非零值都会改变 declarative fingerprint；既有 advisory performance baseline 不能直接沿用。
- 现有 parallel-limit/reservation 与 measured Gate scheduling Decisions 需要在实现前演进，明确新的长期边界和证据 owner。

## Success Criteria

- 所有 Check 均省略或显式使用 `admissionPriority: 0` 时，scheduler 的准入 task、reason 与稳定 tie-break 顺序保持兼容。
- 较大优先级只在 dependency/mutex eligible 且属于同一现有选择层级的 task 间生效；blocked 高优先级 task 不造成 head-of-line blocking。
- tightening task 先按更严格的 effective cap、再按优先级、最后按既有 scope-id/task-id 顺序选择；reservation 建立后不被后来任务重排或抢占，且任何任务仍必须通过 `canAdmit`。
- 实现不引入抢占、aging、运行时调权、时长预测、priority inheritance、额外队列，或除既有 `reservationTaskId` 外的新调度状态。
- 优先级只改变 admission timing；terminal outcome、aggregation、Check/Record facts、machine schema、publication order 与 progress/result order contract 不变。
- 新字段经过 closed grammar、safe-integer、inheritance、deep-freeze、fingerprint 与 task-graph validation；生成的 package declaration 和真实安装 consumer 均可使用。
- 本仓库 Gate 的非零配置满足设计中的五组交错 A/B 接受规则，并重新生成匹配新 fingerprint 的 advisory baseline；未满足时不保留该配置。

## Affected Owners

- [`docs/configuration.md`](../../docs/configuration.md)：Check scheduling grammar、默认值与继承。
- [`docs/architecture.md`](../../docs/architecture.md)：Definition normalization、task metadata 与 scheduler 责任边界。
- [`docs/testing.md`](../../docs/testing.md)：Definition/Scheduler semantic Cases 与可观测证据。
- `src/check/**`、`src/project-definition/**`、`src/project-run/check-execution/**`：public authoring、normalization、fingerprint 与 task projection。
- `src/project-run/task-scheduler/**`：task validation 与 pure admission decision。
- `scripts/project/gate/**`：经测量的项目配置、diagnostic evidence 与 performance baseline。
- `docs/decisions/**`：parallel-limit/reservation 和 measured Gate scheduling 的长期判断。
