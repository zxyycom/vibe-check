# Proposal

本 Draft 评审把 Scheduler 的调度解释收敛为一套共享核心：真实运行与供 custom selector/算法使用的 simulation 都从同一已编译图、纯 state transition 与 canonical effects 派生。它不在 Draft 阶段改变 runtime、既有 callback contract 或默认策略。

## Why

当前 custom `AdmissionPolicyContext` 能给 policy 一次 `select | wait` 所需的 candidates、running/settled IDs、capacity、scope 和静态 graph，却不能：

- 一次列出全部 pending Check、当前 selectable、不可选原因与 running/settled；
- 独立验证某个 task、`wait` 或 complete 在当前 boundary 是否合法；
- 分支预演“选择 A、选择 B、让 A 以 prerequisite 满足/不满足的终态结束”后的图状态。

因此 consumer 想做 lookahead、遍历或确定性测试时，不得不重建 relation、mutex、capacity、scope 和 forced-blocked 规则。这既困难，又可能与真实 Scheduler 的 hard guard 漂移。

“另写一个 simulator”也不是正确边界：真实 Scheduler 本来就在解释同一调度状态。应将 graph compile、legality、state transition 和 effects 收敛为唯一 core；真实 shell 推进并执行 effects，simulation facade 只让调用方显式输入假设 transition、读取分支结果。这样 simulation 不是第二套规则实现，而是同一机器的非执行使用方式。

该公共能力也会被搜索型算法反复调用。若没有先行性能设计与证据，catalog、branch 或穷举本身可能成为瓶颈，反而阻碍后续智能策略。

## Outcome

本 Change 结束时，项目拥有一份可执行的 public simulation-contract Plan，或有依据地选择不采用；该 Plan 必须同时闭合以下结果：

- 私有 compiled Scheduler machine（名称暂定）一次验证/编译图，并拥有 ID 索引、正反邻接、mutex/scope 信息与 canonical order；其 pure state/reducer 和 canonical effects 是 real shell 与 simulation facade 的唯一 legality/transition owner。
- custom selector 在每个 decision boundary 获得 Scheduler-owned inspect view：可选择项、带稳定 reason 的其余 pending、running、settled/终态、capacity、scope，以及明确的 `select | wait | complete` next-boundary 合法性；另有不构造 full catalog 的 per-task validator。
- consumer 可以对 immutable branch 分别 `select` 和显式 `settle` running task（以 scheduler-relevant satisfied/unsatisfied outcome），并由 core 自动处理 release、scope、relation 和 forced blocked propagation；选择与终态分离以保留并发及完成顺序。
- real shell 继续负责 policy/selector、Task/Promise 执行、真实 settlement、signal 检测、policy-fault diagnostics/failure mapping、measurement 和 `RunResult`，并在 callback 后 hard revalidate；但 signal/fault 触发的 pending cancellation 必须以 private `cancel-pending` action 交给同一 core 产生 canonical settlement/scope/drain effects。simulation v1 不公开 cancel action，却必须从同一 core 的 closed/cancelled seed state 形成 view；它不执行或写回任何 real effects。
- Plan 前先有可复现 benchmark/baseline 设计与证据，覆盖 core、facade、catalog、validation、branch、复杂 fanout 和 real static/custom/learned hot path；数值阈值只在该 baseline 后冻结。

simulation facade/context 的 public 名称、DTO、reason 与 settlement vocabulary、是否公开 ordered effects、convenience replay/batch API，以及其自身的 Definition normalization/fingerprint/compatibility 影响仍是 Draft open questions；outer lifecycle 的 authoring shape 与其 normalization/fingerprint/failure/output 则由 custom lifecycle Draft 单独闭合。不把本文件的示意名当作 SDK。

## Change Boundary

本 Draft 的唯一语义 owner 是 `src/project-run/task-scheduler/**` 的 **一次 graph compile、pure scheduler core state/reducer 与 canonical effects**；它是 real execution shell 和 non-executing simulation shell 的唯一 legality/transition 来源。public facade 由 scheduler-policy/export/docs owner 承接，不能让 facade 反向拥有或复制 core。

- **进入 Plan 的全部前置**：必须有真实 lookahead 或 deterministic-test consumer；闭合 catalog、single-task validator、`select | wait | complete` next-boundary、explicit `settle`、reason/outcome、immutable branch、error/compatibility/fingerprint 与 Decision alignment；并先取得可复现的正式 performance baseline。baseline 必须覆盖 compile、lazy real path、catalog、validator、select/settle/fork、fanout/search 以及 real static/custom/learned paths，并记录环境、输入、方法与原始结果。没有该 baseline 不创建 tasks、不切为 Plan、不写 runtime。
- **依赖 / 非依赖**：本 Change 不语义依赖 duration/provider lifecycle Plan，也不依赖其 public contract；可服务现有 custom callback。与 1A 推荐串行/继承基线仅因共享 owner。算法 Change 可复用 private core/test harness，却不依赖 simulation public API；custom lifecycle Draft 也不与本 Change 合并。
- **公共 / 私有**：compiled core、reducer、canonical effects、private cancellation action 与 real execution ledger 是 private；public facade 只能公开经兼容审阅的 immutable inspect/branch operations。**本 Change 独占 decision-time inspect/catalog/validator/next-boundary legality vocabulary，并闭合该 facade/context 自身的 Definition normalization、fingerprint 与 compatibility 影响。**它不定义 outer `prepare`/`complete` authoring shape、其 normalization/fingerprint，或 lifecycle failure/output；那些属于 custom lifecycle Draft。simulation 不执行 Task/Promise、measurement、history、diagnostic、RunResult 或 real effects，也不是 reservation/control capability。
- **非目标与验证出口**：不新增 `expectedDurationMs`、public strategy registry、第二种 graph or legality semantics，也不改变 priority：策略先按自身算法排序，`admissionPriority` 仅在该策略分数相同后 tie-break。Plan 的验证出口是 shared-core trace oracle、real-shell hard revalidation、public/installed-consumer compatibility 及上述正式 baseline；模型细节可观察但不自动成为兼容承诺。
