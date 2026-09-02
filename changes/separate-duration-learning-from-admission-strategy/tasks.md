# Tasks

按“先固定行为等价 oracle，再迁移 duration-model owner，然后形成 pure strategy factory，最后重接 invocation 并验证”的顺序执行；所有任务完成前不得推进后继算法 Change 的生产策略实现。

## Readiness

- [ ] 0.1 运行 Decision 与 Change catalog 查询，确认现有两条 Scheduler Decision 仍为本 Plan 的 aligned 约束，`optimize-learned-admission-strategy` 仍是依赖本 Change 的 Draft，且没有另一条已授权 Change 并行修改 scheduler-history、task-scheduler、resolved-checks 或 invocation seam。
- [ ] 0.2 在修改测试前运行 Test Evidence check，定位 history/prediction、critical-path policy、invocation learned integration、custom policy fault、public consumer 与 Gate adoption 的当前 Case Owner/Proves，并列出路径迁移后必须同步的实体。
- [ ] 0.3 用当前实现运行最窄 reference tests，固定 prediction digest、critical-path score、selection-layer/tie-break/wait trace、三类 learned failure、custom fault、terminal facts 与 deterministic history JSON；缺失的行为等价证明先在旧 composition 上补齐。
- [ ] 0.4 确认当前 exact package candidate 和 required/full Gate 基线可用，并记录本 Change 只接受行为等价、无 public contract变化和无算法性能结论的验收边界。

## Implementation

- [ ] 1.1 建立 `src/project-run/scheduler-duration-model/**` owner，迁移 bounded history、prediction、recording、storage 与其测试；保持 model version、identity、statistics、digest、serialization、capacity bound 和 atomic write 不变，并删除退出后的 `scheduler-history/**`。
- [ ] 1.2 在 duration-model owner 实现显式 `ready | static-fallback` preparation 与 prepared post-drain record capability；区分 empty learned model、prepare fallback 和 record/write observation，且不保留 raw authored options、flags、Check data 或 Scheduler mutable state。
- [ ] 1.3 将 critical-path ranking 迁入 Task Scheduler owner，并让 learned strategy factory从同一 immutable graph与prediction一次形成score snapshot、pure `AdmissionSelectionPolicy`和只读diagnostic lookup；保持score、layer、priority、ID与wait comparator逐项等价。
- [ ] 1.4 在 invocation 中集中完成 static/custom/learned public policy dispatch、duration-model prepare、strategy creation、execution、admission diagnostic和post-drain record，删除混合 `SchedulerLearning` aggregate，并保持所有failure containment与measurement触发不变。
- [ ] 1.5 将 `resolved-checks` 输入收敛为optional private `AdmissionSelectionPolicy`，删除public policy dispatch及history/prediction/critical-path依赖；确认Task Scheduler仍在唯一hard-guard边界接受或拒绝proposal。
- [ ] 1.6 按新的owner迁移或拆分直接测试，同步Case ledger中的测试路径与必要Owner/Proves；不因文件移动新增同义Case，不在本Change加入backfill或其它算法候选。
- [ ] 1.7 更新Architecture、API mechanics、Configuration摘要和Testing owner，使文档明确两个private owner、invocation唯一composition point、public配置未变和后继算法Change的固定prediction前置；不把private TypeScript shape承诺为public API。

## Verification

- [ ] 2.1 运行duration-model、critical-path strategy、Task Scheduler、resolved-checks和invocation learned integration的最窄测试，证明迁移前后prediction/digest、score、admission trace、terminal facts、diagnostic分类与history bytes等价。
- [ ] 2.2 运行Definition/fingerprint、custom admission fault、installed consumer type/docs/runtime和Gate Definition测试，证明public `{ kind: "learned-critical-path", stateDirectory }`、static/custom语义及本仓adoption未改变。
- [ ] 2.3 运行product/scripts format、typecheck、lint与dependency/import-boundary检查，确认新目录和imports表达单向owner关系，且没有barrel、转发wrapper、generic registry或新增依赖。
- [ ] 2.4 运行Test Evidence、docs validation、package API projection check、Decision check、Change Plan check和`git diff --check`，并审阅局部diff只包含本Change的owner迁移、组合重接及等价证明。
- [ ] 2.5 重建并核对exact package candidate，运行`verify:vibe-check-workspace:required`与`verify:vibe-check-workspace:full`；结果membership、quality/public outputs和性能预算必须通过，任何算法收益或退化都不作为本行为等价Change的成功主张。
- [ ] 2.6 对照proposal全部Success Criteria和design中的等价oracle完成语义验收；确认后继算法Change仍为Draft且没有被本Change隐式实施，再评审Decision alignment与归档授权。
