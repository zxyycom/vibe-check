# Proposal

本 Change 增加显式启用的 learned-critical-path admission policy，让 Product 从各 Check 的真实 active duration 自动维护跨运行预测，并在不逐项手工配置的情况下减少长关键路径过晚启动造成的尾部。

## Why

静态 `admissionPriority` 解决了“不重排 Definition 也能调整 ready Task 顺序”，但需要项目作者识别长 Check、重复测量并持续维护数值。本仓 archived priority evidence 已证明，把一个长 Markdown Check 从第 28 项提前到第 1 项能显著降低其启动延迟，却仍使 full Gate wall median 上升；单项耗时排序不能识别依赖下游和实际关键路径。

现有 `RunResult.checkDurations` 已如实报告本次实际执行 Check 的 monotonic active duration，但 Product 不跨 invocation 保存或消费这些事实。要求每个 Check 手工填写预计耗时会让能力在大 Definition 中难以采用；把可变统计塞入 `cacheJsonByKey` 又会违反该 helper 的 caller-keyed immutable result 契约。因此需要一个 Product-owned、位于 Scheduler 外、显式授权且失败时只影响优化的有界历史 owner。

## Outcome

项目在 Definition 的 Scheduler 设置中选择 `learned-critical-path` 并提供一个 cross-run state directory 后，所有实际启动的 Check 自动贡献真实 active-duration 样本。下一次 Run 在任何 Task admission 前加载有界历史，形成 immutable per-Task duration prediction 与 estimated downstream critical-path score；admission policy 读取 Scheduler 形成的 relation/mutex eligible candidates 与 per-candidate capacity facts；它可以在 running work 可 drain 时等待，Scheduler 仍只准入当前 capacity 允许的 selected Task。

没有历史的 Check 使用本轮模型的 project prior；整个项目无历史时使用相同正值，因此第一轮降级到图结构、静态优先级 tie-break 与规范顺序。Check 一旦产生样本，后续预测直接来自其最近真实样本；可选 per-Check duration override 只处理已知例外，不要求完整配置。

省略 learned setting 时继续使用当前 `{ kind: "static" }` policy，不读取或写入历史。学习历史和预测只改变 admission timing，不改变依赖、观测、mutex、capacity、Check outcome、Record、aggregation、machine publication 或结果排序。

## Scope

### Intended Change

- 在 `expose-custom-admission-selection-policy` 已建立的 closed `static | custom` Definition admission-policy union 上增加 `learned-critical-path` variant：省略仍是当前 `{ kind: "static" }`，而既有 `custom` callback contract 不因本 Change 改写。learned variant 需要显式 `stateDirectory`；相对目录从 effective project root 解析，绝对目录直接使用；不存在隐藏的用户级或仓库级默认写入。
- 为 executable Check 增加可选 positive safe-integer `expectedDurationMs`，不继承、不允许 container 声明。它覆盖该 Check 的 learned estimate并进入 normalized declaration/fingerprint；其它 Check 继续自动学习。
- 在 preflight barrier 完成后、Scheduler 启动前，按 model version、Check ID、canonical prepared-options digest 与 canonical project flags 构造 history identity。历史文件不保存 raw options、flags 或 caller secret；这些输入只参与本地 digest。
- 将所有实际 started Check 的有效 monotonic active-duration measurement 作为事实样本，不按最终 status 删除；同时保留 outcome 分类供诊断。public duration 的 clock-anomaly fallback、preflight-blocked、dependency-blocked、fail-fast/cancel-before-start 与其它未启动 Check 不产生样本，admission delay 和 resource wait 不进入 execution-duration model。
- 每个 identity 只保留最近 32 个真实样本；使用窗口 arithmetic mean 作为下一次 expected duration，并报告 sample count 与 p90。没有 identity 样本时使用当前模型内已有 Check estimates 的中位数；完全冷启动时所有 Check 使用同一常数 `1`。
- 在 final directed readiness graph 上计算 `estimatedDurationMs + longest estimated downstream path`。learned policy 以无状态算法在当前 relation/mutex eligible candidates 与 capacity facts中作 select/wait；Scheduler 只守 selected next-option hard conditions 与 wait-drain，不保存或解释 fairness/starvation state。其余 selection preference按实现时确认的层级、critical-path score、`admissionPriority` 与 canonical tie-break组织。
- 使用一个 versioned、最多保留 4096 个 identity 的 Product-private history file，读取时视为不可信输入，写入时在目标目录 atomic replace。missing 是正常 cold start；invalid/read/write failure 降级为可诊断的 static/prior scheduling，不改变 Check settlement 或 Run result kind。并发 invocation 允许丢失一次优化样本，但不得产生 partial/corrupt publication或影响执行正确性。
- diagnostic logging 启用时记录 history read/write status、model version/digest、选中 Task 的 estimate source、sample count、estimated duration 与 critical-path score；不输出 raw identity input或完整历史，不建立 public telemetry stream。

### Resulting Impacts

- `ProjectDefinition.scheduler`、Check authoring grammar、normalization、fingerprint、package declarations、Configuration/API 文档与 installed consumer需要新增 learned setting 和 optional override。
- Check execution owner需要在 preflight 后组装 prediction identity，在 settlement 后把现有 duration/outcome交给 history owner；Task Scheduler只接收 immutable score snapshot，不执行 filesystem I/O或统计更新。
- `src/project-run/task-scheduler/**` 依赖 `extract-scheduler-admission-selection-policy` 的 private contract和`expose-custom-admission-selection-policy`的closed public union，并在 learned policy中计算graph bottom-level score；现有static policy保持默认。
- history 是可变统计状态，不是 caller-keyed computation result；`src/cache/**` 与 `cacheJsonByKey` contract不修改、不迁移，也不获得 Scheduler或Run lifecycle capability。
- `separate-passed-dependencies-from-settled-observations` Decision 必须先闭合 success dependency和outcome observation的 directed readiness edge；关键路径同时读取两者，但不把 outcome predicate变成预测输入。
- `add-scheduler-performance-diagnostics` 应先提供或同步提供 admission delay、slot utilization与tail证据，用于验证 learned policy是否改善代表性 workload；fail-fast与named resource若随后落地，只改变 candidate legality/started samples，不能绕过同一 policy。
- 当前 priority Decision明确不采用历史自动调权；实施前必须建立后继 Decision，保留 static默认并定义 learned mode下 priority仅为同分 tie-break。Project Gate只有在重复A/B证据不退化时才启用 learned setting。

## Success Criteria

- 未声明或显式选择 `{ kind: "static" }` 时，不创建 state directory、不读写 history，admission trace、terminal facts 和所有 public outputs 保持当前 static-compatible 行为；两种 static authoring 形状得到相同的新 canonical fingerprint。若 schema 演进使它与变更前 fingerprint 不同，实施证据必须明确记录并重建匹配 baseline，不能伪称旧 fingerprint 未变。
- 一个只配置global learned setting、没有任何per-Check override的多Check项目，在首轮自动记录全部实际started Check的真实duration；第二轮能从history形成不同的可信estimate和deterministic policy snapshot。
- 新Check无样本时不被当作`0ms`：有project history时使用中位project prior，完全cold start时所有Task使用相同`1`，并由graph score、priority tie-break和canonical order确定结果。
- 每个有样本identity的estimate只由最近32项真实active duration的arithmetic mean形成；一次样本立即参与下一轮，旧样本随窗口推进退出。outcome分类、sample count和p90不伪造成独立执行时间。
- 对一个包含并行短Tasks与较长downstream chain的deterministic workload，learned critical-path policy比static order更早启动目标链并降低makespan；不声称该greedy heuristic对任意dependency/resource图全局最优。
- `expectedDurationMs`只覆盖owning executable Check，拒绝zero、负数、非safe integer、container与unknown key；未覆盖Checks继续使用learned/prior值。
- learned policy 的无状态选择算法不能越过 hard guard；blocked、mutex-ineligible、未ready或当前 capacity 不可 admission 的 Task不能被 Scheduler 启动。capacity-inadmissible candidate仍可支持可 drain的 policy `wait`；static priority在learned mode只处理同分，不能让人工排序普遍屏蔽预测。
- missing、invalid、read failure、write failure、clock anomaly和并发last-writer情况只降低或丢失优化证据，不改变Task membership、outcome、Check/Record facts、aggregate、machine bytes或Run result kind；diagnostic启用时能解释降级。
- history file有version、closed parser、每identity 32样本和最多4096个identity，atomic publish不暴露raw options/flags；state directory是调用方显式授权且可整体删除的本地状态。
- repository required/full Gate完成同candidate、同membership、交错A/B测量。只有两个profile的learned wall median均不高于static且至少一个更低时才在Gate Definition启用；否则Product能力完成但本仓Gate保持static。

## Affected Owners

- [`docs/configuration.md`](../../docs/configuration.md)：Scheduler admission-policy setting、state path、Check override与默认语义。
- [`docs/architecture.md`](../../docs/architecture.md)：history/model、Check execution与pure Scheduler依赖方向。
- [`docs/api-mechanics.md`](../../docs/api-mechanics.md)：跨运行学习、diagnostic可见性、failure fallback与cache边界。
- [`docs/testing.md`](../../docs/testing.md)、`docs/testing/cases/**`：Definition、history、prediction、Scheduler与真实安装consumer证据。
- `src/project-definition/**`、`src/check/**`：closed public grammar、normalization、fingerprint和declaration projection。
- `src/project-run/check-execution/**`、`src/project-run/invocation.ts`：preflight后snapshot与settlement后history update。
- `src/project-run/task-scheduler/**`：learned critical-path policy与deterministic selection。
- `src/project-run/scheduler-history/**` 或实施时确认的等价单一owner：versioned history parsing、bounded statistics与atomic publication。
- `src/project-run/diagnostic-logging/**`：有界model/history observation。
- `scripts/project/gate/**`：可选adoption、A/B evidence与匹配fingerprint的performance baseline。
- `docs/decisions/**`：演进static priority、duration summary、cache/Run state与diagnostic边界。
