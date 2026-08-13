# Proposal

本 Change 把现有 `parallel-task-runner` 的源码与测试机械迁入 `src/product/task-orchestration/**`，建立唯一的 Product-owned 实现，再通过 Check orchestration adapter 接入静态 `TaskPlan`；不重写一套调度器，也不改变现有 Check/Record machine contract。

## Why

`scripts/tools/parallel-task-runner` 已经能够处理 task 先后关系、independent parallelism、显式 concurrency、mutex、nested groups、父组 metadata 继承、group dependency 展开和 lifecycle hooks。当前缺口不是调度能力不足，而是该实现仍由 script-tool gitlink 拥有，Product runtime 无法在自己的 source boundary 内直接使用；与此同时，Check/Record foundation 只提供 direct contribution seam，尚未把静态 `TaskPlan`、Check dependency 和 shared concurrency budget 接到这个现成调度能力上。

因此本 Change 先完成 source ownership migration，再做 Product-specific adapter。旧 runner 的通用 authoring 与 scheduling semantics 保持原样；closed planning、Check selection/applicability、work-handle protocol、terminal CheckRun 和 failure containment 只存在于 Check adapter 与 foundation 边界，不反向污染通用 scheduler，也不产生第二套实现。

## Outcome

`parallel-task-runner` 的 pinned source/tests 迁入 `src/product/task-orchestration/**`，workspace verifier 与 Product Check orchestration 共同消费这一份实现，旧 gitlink 和旧 import/workspace owner 退出。迁移先保留原始行为，再以独立、可审阅的 Product integration adjustments 增加 pre-work closed planning 与 Check adapters。

一个 invocation 在任何 managed work 前解析并冻结 selected Checks 和全部 applicable `TaskPlan`。每个
TaskPlan 包含 exactly-one Check-level completion function；adapter 把 direct bindings、Task leaves 与
synthetic completion 映射成同一批私有 runner tasks，共享一个 concurrency/mutex scheduler。普通
project-code 或 Check protocol failure 被 adapter 收敛为私有 outcome：只跳过依赖该失败 outcome 的
work，unrelated work 继续；scheduler 仍不解释 payload、quality verdict、record 或 task success。

本 Change 不给 `QualityRecord` 增加 orchestration 字段。Task/group identity、work handles、ack calls、task outcomes 和 terminal-settlement protocol 都是 invocation-private；现有 `CheckRun`、coverage、snapshot integrity/completeness 与 `QualityRecord` 仍由 foundation 产生，并按既有 `run.json` / `records.ndjson` contract 发布。

## Scope

纳入范围：

- 从 gitlink revision `025af7350e2d624eeded23784f411bec5f4a1473` 机械迁移 `parallel-task-runner` 的 source/tests 到 `src/product/task-orchestration/**`，记录 pinned provenance 和 expected integration adjustments；
- 把 workspace verifier 等现有 script consumers 切换到新 source owner，移除旧 gitlink、`.gitmodules` entry、workspace/lockfile importer 和过时 toolkit verification entries；
- 保留原 runner 的 normalization、nested group inheritance、group dependency、dependency completion、bounded parallelism、mutex、opaque result 与 lifecycle-hook semantics；
- 增加 Product-private closed schedule declaration、`requiresChecks` closure、selection/applicability 后的 synchronous `TaskPlan` factory、完整 plan validation/freeze 和唯一 `SchedulerPolicy.maxParallel`；
- 把 direct binding、Task leaves 和 exactly-one Check completion 映射到迁入的 runner，并通过 foundation-owned ports 收敛 acknowledgement、records、result 与 private settled availability；
- 在 adapter 层隔离 ordinary execution/protocol failure，使 unavailable dependents 不调用 project function，unrelated tasks 继续，并保留此前已提交的 valid records；
- 更新 source provenance、Architecture、Quality Metrics、Script Tooling、Testing 与相应 semantic Cases。

非目标：另写或长期维护第二套 scheduler；把通用 runner 作为 public package/API 暴露；给 Product TaskPlan 开放任意 metadata；修改 `QualityRecord`、`CheckRun`、DecisionPolicy 或 publication 字段；公开 Task/group identity或progress；动态追加 Task、cross-Check Task value传递、result-driven graph expansion；caller cancellation、timeout、hard termination、retry、priority、capacity resources、per-Check budget、persistent recovery；command/process/worker/remote execution；治理 managed function 内部自行 fan-out。

## Success Criteria

- `src/product/task-orchestration/**` 中声明为 byte-preserved 的 source/tests 可逐文件追溯到 pinned gitlink revision；所有差异都列为 integration adjustment 并有目标测试。
- 仓库不再包含 `scripts/tools/parallel-task-runner` gitlink、对应 `.gitmodules` / pnpm workspace importer 或旧 source import；原 workspace verifier consumer 通过新 owner 保持既有行为。
- 原 runner tests 在迁移位置继续证明 nested group、父组完整 metadata 继承、group dependency、unknown/duplicate validation、dependency order、independent parallelism、concurrency、mutex、opaque result 和 `run + onComplete` completion semantics。
- 完整 schedule catalog、`SchedulerPolicy`、Check dependency graph 与全部 applicable `TaskPlan` 在首个 user-managed function 前完成 closed validation、detached normalization、full cycle detection 与 freeze；每个 TaskPlan 恰有一个 Check-level `complete(outcomes)`，任一 planning failure时 user-managed function zero calls。
- Product TaskPlan 只使用 closed scheduling subset；adapter 将其映射到同一 runner，不复制 normalization/scheduler 算法。Direct、Task leaf 与 synthetic completion 共享一个 invocation-wide `maxParallel` budget。
- Scheduler 继续把 resolved values 视为 opaque completion。Adapter 捕获 ordinary execution/result/record/ack failure，阻止依赖该 outcome 的 user function，允许 unrelated work 继续；trusted adapter invariant failure完成已启动 work 的收敛后使 invocation fatal，且不发布 trusted snapshot。
- `requiresChecks` 只要求 prerequisite 获得 foundation-owned settled availability；该 availability 必须与最终 CheckRun 是否 `completed` 一致。`not-applicable` 和合法 `passed | failed` verdict 都满足依赖；execution、invalid result、record integrity 或 ack protocol failure使 dependent 形成 `unavailable`，但不把 quality `failed` 误当 execution failure。
- Task leaf failure时不调用 Check-level completion function；每个 applicable Check 必须 exactly-once settlement。Settled 后的 late sink/ack call 只被拒绝且不改变冻结事实；duplicate、unknown 或 drain 后 missing settlement 属于 trusted invariant failure。
- Work handle 与 ack identity 不进入输出；现有 coverage 只发布 aggregate counts。Snapshot integrity 继续是 `run.json` 中独立的稳定事实，不成为单条 `QualityRecord` 字段；terminal settlement 只产生既有 CheckRun facts。
- 与迁移前等价且遵守 port lifetime 的 direct execution 产生相同 canonical definitions、runs、records、integrity/completeness 和 publication bytes；settlement/arrival order 不改变 canonical snapshot，machine/readable artifacts 中不存在 Task/group/node ID、dependency、mutex、opaque task value 或 observed order。

## Affected Owners

- `scripts/tools/parallel-task-runner/**`、`.gitmodules`、`pnpm-workspace.yaml`、`pnpm-lock.yaml` 与 root package scripts：迁出旧 gitlink owner 并清理 repository integration。
- `src/product/task-orchestration/**` 与 `src/product/README.md`：承接 pinned source/tests、唯一 implementation owner、provenance 和 integration-adjustment audit。
- `scripts/vibe-check-workspace/**`：把现有 normalization/scheduler imports 切换到 Product-owned source，并保持 workspace verification behavior。
- `src/product/quality-core/src/check-record/catalog.ts`、`coordinator.ts`、manager seams 与相邻 orchestration modules/tests：承接 closed TaskPlan planning、adapter outcomes、foundation ports 和 terminal CheckRun integration。
- `src/product/quality-core/src/check-record/current-composition.ts`：让 repository direct bindings 通过同一 scheduler，并显式提供 private `SchedulerPolicy` `{ maxParallel: 4 }`。
- `docs/architecture.md`、`docs/quality-metrics.md`、`docs/script-tooling.md`、`docs/testing.md`、`docs/testing/cases/repository-tooling.md` 与 `docs/testing/cases/quality-runtime.md`：同步 owner migration、stable/private boundary、failure semantics 和测试证据。
