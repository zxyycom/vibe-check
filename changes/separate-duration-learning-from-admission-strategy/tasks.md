# Tasks

按“固定现有终态与等价 oracle → 分离两个内部 owner → 引入 provider lifecycle → 由 invocation 驱动并验证”的顺序实施；公共 custom lifecycle 和算法优化均是后继 Change，不得混入本 Plan。

## Readiness

- [ ] 0.1 运行 Decision 与 Change catalog 查询，确认既有 aligned Decisions仍拥有 history/pure policy/hard guards边界，`introduce-invocation-scoped-admission-strategy-lifecycle` 已由Decision owner建立为 `active + unaligned` 的本 Plan前置方向（不是已aligned事实），`optimize-learned-admission-strategy` 与 `support-invocation-scoped-custom-admission-strategies` 均为后继 Draft，且没有已授权 Change 并行修改 duration model、task-scheduler、provider、resolved-checks 或 invocation seam。
- [ ] 0.2 在修改测试前运行 Test Evidence check，定位 history/prediction、critical-path policy、invocation learned integration、custom fault/measurement hooks、public consumer 与 Gate adoption 的 Case Owner/Proves，并列出路径迁移后必须同步的实体。
- [ ] 0.3 用当前实现运行最窄 reference tests，固定 prediction digest、score、selection/tie-break/wait trace、三类 learned failure、custom fault、`requiresMeasurement: true`、decision-boundary measurement prefix、accepted action interval attribution、collector/clock启用、measurement hook、terminal facts 与 deterministic history JSON；缺失的行为等价证明先在旧 composition 上补齐。
- [ ] 0.4 固定当前 lifecycle与measurement reference：normal、cancelled、admission-policy-failed 仅在 `executeResolvedChecks` 返回 terminal sequence/context 后、且既有terminal Hooks已delivery时，才有 `prepare once → decide 0..N → complete once`；task-engine/pre-terminal failure无complete。确认complete不进入本Run measurement、只供下一Run，并固定矩阵：plain static无额外需求，custom保留per-decision+terminal，learned ready/static-fallback均保留terminal，logging/configured Hooks独立启用；不从public kind推断。

## Implementation

- [ ] 1.1 建立 `src/project-run/scheduler-duration-model/**` owner，迁移 bounded history、prediction、recording、storage 与其测试；保持 model version、identity、statistics、digest、serialization、capacity bound 和 atomic write 不变，并删除退出后的 `scheduler-history/**`。
- [ ] 1.2 在 duration-model owner实现 closed `ready | static-fallback` preparation 与终态 record capability；区分 empty learned model、prepare fallback 和 record/write observation，不捕获 raw authored options、flags、Check data 或 Scheduler mutable state。
- [ ] 1.3 将 critical-path ranking迁入 Task Scheduler owner，使纯 factory以同一 immutable graph和prediction一次形成score snapshot、完整 frozen `AdmissionSelectionPolicy`和只读诊断 lookup；保持score、layer、priority、ID与wait comparator逐项等价。
- [ ] 1.4 建立 closed private strategy-provider owner和每 Run 独立 `PreparedAdmissionStrategy`，其中持有完整 frozen `admissionPolicy`而非裸 decide；static/custom no-op completion只消费已有terminal handoff、不新增I/O、collector或clock read，现有custom adapter保留trusted同步callback的closure/reentrancy/host-side-effect边界与 `requiresMeasurement`/prefix/action-interval metadata，prepared另交接terminal requirement；learned provider在 prepare/conditional complete中组合 duration model与pure algorithm；不建立registry、generic model或public API。
- [ ] 1.5 将 invocation重接为 effective provider lifecycle runner：graph ready后 await prepare一次，将完整 frozen `prepared.admissionPolicy`交给resolved-checks/Scheduler（而非裸 decide）；仅在后者返回terminal sequence/context且既有terminal Hooks已delivery后 await complete一次，task-engine/pre-terminal failure不调用；删除混合 `SchedulerLearning`与手工 model/strategy/record组合，保留failure containment、closed terminal requirement与 `requiresMeasurement`/collector/clock/action measurement矩阵及diagnostic presentation。
- [ ] 1.6 将 `resolved-checks` 输入收敛为optional完整 frozen private `AdmissionSelectionPolicy`，删除public policy dispatch及duration-model/provider lifecycle/critical-path依赖；确认Scheduler仍在唯一hard-guard boundary接受或拒绝proposal，并保留policy per-decision metadata；terminal requirement只经prepared private handoff进入invocation collector condition。
- [ ] 1.7 按新owner迁移或拆分直接测试，同步Case ledger中的路径及必要Owner/Proves；加入有独立证明价值的lifecycle/overlapping-Run证据，不新增同义Case、backfill或其它算法候选。

## Verification

- [ ] 2.1 运行duration-model、critical-path algorithm/provider、Task Scheduler、resolved-checks和invocation learned integration的最窄测试，证明prediction/digest、score、admission trace、terminal facts、diagnostic分类、`requiresMeasurement`、decision-boundary prefix、action interval attribution、plain static/custom/learned ready/learned fallback terminal requirement矩阵、collector/clock启用与history bytes等价。
- [ ] 2.2 直接证明返回terminal sequence/context的normal、cancelled、admission-policy-failed各自的 `prepare once → decide 0..N → complete once` 顺序、complete前drain/measurement seal/既有Hook delivery，及task-engine/pre-terminal failure无complete；同时证明并发Run prepared closure隔离、plain static不额外启用collector/clock、custom/learned的terminal requirement和custom完整policy的measurement requirements/action measurement不丢失，以及 `complete N → store → prepare N+1` 而非同Run回流。
- [ ] 2.3 运行Definition/fingerprint、static I/O、custom admission fault/measurement hook、installed consumer type/docs/runtime和Gate Definition测试，证明public learned/static/custom语义及本仓adoption未改变。
- [ ] 2.4 运行product/scripts format、typecheck、lint与dependency/import-boundary检查，确认新目录表达单向owner关系，且没有barrel、转发wrapper、generic registry或新增依赖。
- [ ] 2.5 运行Test Evidence、docs validation、package API projection check、Decision check、Change Plan check和`git diff --check`；确认lifecycle candidate在Implementation前为 `active + unaligned`，并在验收后按实现事实评审alignment；审阅局部diff只包含owner迁移、provider生命周期及等价证明。
- [ ] 2.6 重建并核对exact package candidate，运行`verify:vibe-check-workspace:required`与`verify:vibe-check-workspace:full`；结果membership、quality/public outputs和性能预算必须通过，任何算法收益或退化都不作为本行为等价Change的成功主张。

## Execution Boundary

- 本任务清单的唯一实施集成 owner 是 invocation lifecycle；duration model、pure algorithm、Scheduler guards 和 public contract 仍按 `proposal.md` / `design.md` 中列出的 stable owner 分担。
- `0.1` 要求的 candidate Decision 建立为 `active + unaligned` 是开始 Implementation 的前置，不表示它已 aligned，也不授权本 Plan 的执行者修改 Decision。
- `support-invocation-scoped-custom-admission-strategies` 和 `optimize-learned-admission-strategy` 只能在本 Plan 验收后消费稳定 seam；simulation 仅有共享 owner 的推荐串行关系，非语义前置。`docs/change-execution-order.md` 的顺序不替代这些语义关系。
- 完成出口是 2.1–2.6 的等价与边界证据；不得借此任务新增 `expectedDurationMs`、公开 provider/model、改变 `admissionPriority` 的同分 tie-break 语义，或把可观察模型细节写成兼容承诺。
