# Proposal

本 Change 增加显式启用的 `learned-critical-path` admission policy，让 Product 从 executable Check Task 的真实 admitted-to-settled active duration 自动维护跨 Run 预测，并在不要求逐项手工估时的情况下减少长关键路径过晚启动造成的尾部；该能力作为通用 package 能力交付，本仓 Project Gate 是否采用由独立 A/B 证据决定。

## Why

静态 `admissionPriority` 解决了“不重排 Definition 也能调整 ready Task 顺序”，但需要项目作者识别长 Check、重复测量并持续维护数值。本仓 archived priority evidence 已证明，把一个长 Markdown Check 从第 28 项提前到第 1 项能显著降低其启动延迟，却仍使 full Gate wall median 上升；单项耗时排序不能识别依赖下游和实际关键路径。

现有 Scheduler terminal raw measurement 在 timing 可用时已经记录每个 admitted Task 的 admission 与 settlement monotonic timestamp；二者之差覆盖占用 Scheduler 槽位的 task-local preflight、execution 与 Product settlement。`RunResult.checkDurations` 只覆盖 author callback 到 Check settlement 的公开时长，不包含 task-local preflight，因此不能作为合并后完整 Task 槽位耗时的替代。Product 尚未跨 invocation 保存或消费前一类事实。要求每个 Check 手工填写预计耗时会让能力在大 Definition 中难以采用；把可变统计塞入 `cacheJsonByKey` 又会违反该 helper 的 caller-keyed immutable result 契约。因此需要一个 Product-owned、位于 Scheduler 外、显式授权且失败时只影响优化的有界历史 owner。

## Outcome

项目在 Definition 的 Scheduler 设置中选择 `learned-critical-path` 并提供一个 caller-managed local state directory 后，所有具有有效 admitted-to-settled interval 的 Check Task 自动贡献真实槽位占用样本。下一次 Run 在任何 Task admission 前加载有界历史，形成 immutable per-Task duration prediction 与 estimated downstream critical-path score；admission policy 读取 Scheduler 形成的 relation/mutex eligible candidates 与 per-candidate capacity facts；它可以在 running work 可 drain 时等待，Scheduler 仍只准入当前 capacity 允许的 selected Task。

没有历史的 Check 使用本轮模型的 project prior；整个项目无历史时使用相同正值，因此第一轮降级到图结构、现有 effective `admissionPriority` tie-break 与规范顺序。Check 一旦产生样本，后续预测直接来自其最近真实样本。第一版不提供 per-Check 手工估时或 learned estimate override。

省略 learned setting 时继续使用当前 `{ kind: "static" }` policy，不读取或写入历史。学习历史和预测只改变 admission timing，不改变依赖、观测、mutex、capacity、Check outcome、Record、aggregation、machine publication 或结果排序。

## Scope

### Intended Change

- 在 `expose-custom-admission-selection-policy` 已建立的 closed `static | custom` Definition admission-policy union 上增加 `learned-critical-path` variant：省略仍是当前 `{ kind: "static" }`，而既有 `custom` callback contract 不因本 Change 改写。learned variant 需要显式 `stateDirectory`；相对目录从 effective project root 解析，绝对目录直接使用；不存在隐藏的用户级或仓库级默认写入。该目录是类似 cache 的调用方受信、可整体删除的本地状态，只服务同一项目在相近运行环境中的重复执行；第一版不承诺跨机器、remote、distributed 或共享 CI history。
- 在完整 Definition normalization 后、Scheduler 启动前，按 model version、Check ID、canonical authored-options digest 与 canonical project flags 构造 history identity。task-local preflight 尚未发生，不参与 admission prediction identity；历史文件不保存 raw options、flags 或 caller secret，这些输入只参与本地 digest。
- learned mode 即使未启用 diagnostic、caller measurement Hook 或 custom policy，也启用既有 Scheduler measurement collector，并只把 timing available、同时具有 admission/settlement timestamp 的非负有限差值作为样本。任何已 admitted Task 都按真实区间记录，不因 preflight block、execution outcome 或 admitted 后 cancellation 删除；history 同时保留 Scheduler settlement kind 供诊断。flag-control pre-admission result、dependency-blocked、fail-fast/cancel-before-start 与其它未 admitted Task 不产生样本，public `checkDurations` 的 callback-only 数值和 clock-anomaly fallback 也不进入模型；admission delay 和 resource wait 不进入 Task active-duration model。
- 第一版当前模型为每个 identity 只保留最近 32 个真实样本，使用窗口 arithmetic mean 形成下一 Run 的内部时长 estimate，并在 prediction snapshot 中保留 sample count 与 nearest-rank p90。该 estimate 不是 Check authoring 的 `expectedDurationMs` 或其它 per-Check override。没有 identity 样本时使用当前模型内已有 learned estimates 的中位数；完全 cold start 时所有 Check 使用同一常数 `1`。公共文档说明当前模型以支持理解和诊断，但这些统计参数与调度算法不构成跨版本兼容承诺，也不承诺跨环境或跨 Run 形成相同 admission 顺序。
- 在 final directed readiness graph 上计算 `estimatedDurationMs + longest estimated downstream path`。learned policy 以无状态算法在当前 relation/mutex eligible candidates 与 capacity facts中作 select/wait；Scheduler 只守 selected next-option hard conditions 与 wait-drain，不保存或解释 fairness/starvation state。各既有 selection layer 内先比较 critical-path score；仅在分数相同时按 Task 自身现有 effective `admissionPriority` 和 canonical tie-break 选择。模型不修改、吸收或重新解释 priority。
- 使用一个 versioned、第一版最多保留 4096 个 identity 的 Product-private history file，读取时视为不可信输入，写入时在目标目录 atomic replace。missing、invalid、incompatible 或 read failure 形成 learned cold/project-prior model；canonical input、local setup、prediction 或 score construction 不可用时仅该 invocation 回退 static；post-drain record/write failure 与 concurrent invocation 只丢失未来优化样本。它们均不改变 Check settlement 或 Run result kind，也不得产生 partial/corrupt publication。
- diagnostic logging 启用时记录 history read/write status、model version/digest、选中 Task 的 estimate source、sample count、estimated duration 与 critical-path score；不输出 raw identity input或完整历史，不建立 public telemetry stream。

### Resulting Impacts

- `ProjectDefinition.scheduler`、normalization、fingerprint、package declarations、Configuration/API 文档与 installed consumer 需要新增 learned setting；第一版不修改 Check authoring grammar，也不增加 per-Check estimate 字段。
- Run prediction owner 需要在 admission 前从 normalized authored facts 组装 prediction identity，并在 Scheduler closure 后把 terminal raw measurement 中有效的 admitted-to-settled interval 与 settlement kind 交给 history owner；Task Scheduler 只接收 immutable score snapshot，不执行 filesystem I/O 或统计更新。
- `src/project-run/task-scheduler/**` 依赖 `extract-scheduler-admission-selection-policy` 的 private contract 和 `expose-custom-admission-selection-policy` 的 closed public union，并在 learned policy 中计算 graph bottom-level score；现有 static policy 保持默认。
- history 是可变统计状态，不是 caller-keyed computation result；`src/cache/**` 与 `cacheJsonByKey` contract不修改、不迁移，也不获得 Scheduler或Run lifecycle capability。
- `separate-passed-dependencies-from-settled-observations` Decision 必须先闭合 success dependency和outcome observation的 directed readiness edge；关键路径同时读取两者，但不把 outcome predicate变成预测输入。
- `add-scheduler-performance-diagnostics` 应先提供或同步提供 admission delay、slot utilization与tail证据，用于验证 learned policy是否改善代表性 workload；fail-fast与named resource若随后落地，只改变 candidate legality/started samples，不能绕过同一 policy。
- 当前 `use-stateless-admission-policies-with-hard-scheduler-guards` Decision 已允许 Scheduler 外的 learned-duration snapshot；`learn-check-task-durations-for-critical-path-admission` 已在实现、public docs、tests 与 Gate 验收后标记为 `active + aligned`，固定通用 package 能力、static 默认、learned 显式本地启用、现有 effective priority 仅作同分 tie-break、模型公开但不作兼容承诺，以及 history failure 非质量结算边界。Project Gate 已在重复 A/B 证据不退化后启用 learned setting。

## Success Criteria

- 未声明或显式选择 `{ kind: "static" }` 时，不创建 state directory、不读写 history，admission trace、terminal facts 和所有 public outputs 保持当前 static-compatible 行为；两种 static authoring 形状得到相同的新 canonical fingerprint。若 schema 演进使它与变更前 fingerprint 不同，实施证据必须明确记录并重建匹配 baseline，不能伪称旧 fingerprint 未变。
- 一个只配置 global learned setting 的多 Check 项目，在首轮自动记录全部有效 admitted Task 的真实槽位占用时长；第二轮能从 history 形成不同的可信 estimate 和 deterministic policy snapshot，不要求或接受 per-Check 手工估时。
- 新Check无样本时不被当作`0ms`：有project history时使用中位project prior，完全cold start时所有Task使用相同`1`，并由graph score、priority tie-break和canonical order确定结果。
- 第一版当前模型中，每个有样本 identity 的 estimate 只由最近 32 项真实 admitted-to-settled duration 的 arithmetic mean 形成；一次样本立即参与下一轮，旧样本随窗口推进退出。settlement kind、sample count 和 p90 不伪造成独立执行时间。公共说明必须把这些内容标为当前模型，而不是稳定算法、跨版本顺序或性能结果承诺。
- 对一个包含并行短Tasks与较长downstream chain的deterministic workload，learned critical-path policy比static order更早启动目标链并降低makespan；不声称该greedy heuristic对任意dependency/resource图全局最优。
- learned policy 的无状态选择算法不能越过 hard guard；blocked、mutex-ineligible、未ready或当前 capacity 不可 admission 的 Task不能被 Scheduler 启动。capacity-inadmissible candidate仍可支持可 drain的 policy `wait`；现有 effective `admissionPriority` 在 learned mode 只处理同一 selection layer 内的 critical-path 同分，并继续保持自己的继承与 Task metadata 语义。
- missing、invalid、incompatible 或 read failure 必须形成 learned cold/project-prior model；canonical input、local setup、prediction 或 score construction 不可用时必须只让该 invocation 回退 static；post-drain record/write failure、clock anomaly和并发last-writer只降低或丢失未来优化证据。所有这些路径均不改变Task membership、outcome、Check/Record facts、aggregate、machine bytes或Run result kind；diagnostic启用时能解释分流。
- history file 有 version、closed parser、第一版每 identity 32 样本和最多 4096 个 identity，atomic publish 不暴露 raw options/flags；state directory 是调用方显式授权且可整体删除的本地状态。不兼容版本允许丢弃旧模型并 cold start，且不宣称该目录适合跨机器或共享 CI。
- repository required/full Gate完成同candidate、同membership、交错A/B测量。只有两个profile的learned wall median均不高于static且至少一个更低时才在Gate Definition启用；否则Product能力完成但本仓Gate保持static。

## Affected Owners

- [`docs/configuration.md`](../../docs/configuration.md)：Scheduler admission-policy setting、local state path与默认语义。
- [`docs/architecture.md`](../../docs/architecture.md)：history/model、Check execution与pure Scheduler依赖方向。
- [`docs/api-mechanics.md`](../../docs/api-mechanics.md)：跨运行学习、diagnostic可见性、failure fallback与cache边界。
- [`docs/testing.md`](../../docs/testing.md)、`docs/testing/cases/**`：Definition、history、prediction、Scheduler与真实安装consumer证据。
- `src/project-definition/**`：closed public scheduler grammar、normalization、fingerprint和declaration projection。
- `src/project-run/check-execution/**`、`src/project-run/invocation.ts`：admission前 authored-fact snapshot 与 settlement后 history update。
- `src/project-run/task-scheduler/**`：learned critical-path policy与deterministic selection。
- `src/project-run/scheduler-history/**` 或实施时确认的等价单一owner：versioned history parsing、bounded statistics与atomic publication。
- `src/project-run/diagnostic-logging/**`：有界model/history observation。
- `scripts/project/gate/**`：可选adoption、A/B evidence与匹配fingerprint的performance baseline。
- `docs/decisions/**`：长期方向的唯一 owner，记录 learned history、static/learned 选择、priority tie-break、当前模型与兼容承诺的区别，以及 diagnostic 边界；本 Change artifacts 只承接本次实现与验证。

## Delivery status

本 Change 的 Product implementation、直接测试与 Gate adoption 已有完成证据；当前 runtime/configuration owner 分别在
[`README.md`](../../README.md)、[`docs/configuration.md`](../../docs/configuration.md)、
[`docs/architecture.md`](../../docs/architecture.md) 与 [`docs/api-mechanics.md`](../../docs/api-mechanics.md)。
[`acceptance.md`](acceptance.md) 是本仓 Gate 是否采用 learned policy 的唯一实验结论 owner，
[`baseline.md`](baseline.md) 仅保留其前置 static workload evidence。两份 evidence 都精确记录 candidate、环境、原始
本地 evidence root、样本与排除项；不得从一次环境的值推出 package 的跨主机性能承诺。

专项 Decision 已按其生命周期规则标记为 `active + aligned`。该状态只确认上述长期方向已经成为当前事实，
不由本段落代替 Change `tasks.md` 的进度或归档授权。
