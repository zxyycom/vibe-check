# Tasks

旧阶段的 completed work 保留为历史基线；本轮确认的聚合、policy、测试隔离与 release-readiness 修订以未完成任务重新交接，checkbox 只随实际证据更新。

## Readiness

- [x] 0.1 恢复先前 direct quality observation、machine evidence 与 performance advisory 的已实现基线，并确认其 quality aggregate exclusion 仅是历史事实。
- [x] 0.2 恢复当前 Gate/quality/release owner、活跃 Decisions 和本轮用户确认：all eligible aggregation、producing-Check non-blocking policy、Markdown public policy、用户原始 27/129/2 初始快照与发布时全部已知 findings 的 release 条件。
- [x] 0.3 审阅 Gate entry、eligibility、controls、aggregate adapter/output 和相邻测试，确定移除/迁移 `contributesToAggregate` 不会留下 alternate aggregate source。
- [x] 0.4 审阅 Markdown Link public configuration、declarations、guide/examples、Record/final-data/message contract 与 unavailable cases，形成最小 compatibility matrix（default blocking / explicit non-blocking / unavailable）。
- [x] 0.5 在改动测试前运行 Test Evidence closure，盘点受影响 Gate、quality、Markdown Link 与 output/timing Cases；为 test-owned fixture/artifact 方案确定 owner 与 cleanup scope。
- [x] 0.6 复核当前 release owner 与真实 Gate evidence，将用户原始 27/129/2 初始快照、最终 28/134/2 evidence 与发布时全部已知 findings 的未来处置/复验条件准确交接给独立 Decision；不在此 Change 中假定 waiver、执行修复或声称已解决。

## Implementation

- [x] 1.1 让 required/full/local partial 从同一 eligible entry projection 将全部 selected IDs 传给 explicit `checkAggregation.mode = "all"`，移除 quality-specific aggregate exclusion 和任何 Record/message/finding-based aggregate reducer。
- [x] 1.2 保持 Gate adapter 只消费 package aggregate、definition/output/progress facts，并更新 Gate exit/progress/machine evidence/output 表达为通用 aggregate policy 与 eligible status facts。
- [x] 1.3 在 repository-quality producing Check options 明确 non-blocking finding policy；保留默认 public blocking 行为和 distinct unavailable settlement，不改写 Check outcome。
- [x] 1.4 为 `markdownLinkValidation` 实现、验证并公开 `findingPolicy`；覆盖 blocking/non-blocking findings 的 final data、Records、warning/messages 与 scanner/source/parse unavailable，不把 Markdown findings 接到 generic aggregation inputs。
- [x] 1.5 将 quality Gate integration tests 改为 test-owned repository fixtures 与 output/artifact directories；只删除本测试创建的 paths，消除当前仓库扫描和 mixed output 假设。
- [x] 1.6 明确并实现 Gate elapsed 的测量阶段，以及仅在 diagnostic logging 或 machine publication 至少一项启用时一次捕获、两项同时启用时共享、两项都禁用时不读取/序列化的 run timestamp 和 terminal log 语义/字段/renderer；不把 advisory 变为 budget 或从 log 文本反推 aggregate。
- [x] 1.7 为两个 docs link validator 赋予可区分的稳定名称，并同步相应 command/help/output/docs references，避免误把实现/发布验收混为同一 validator。
- [x] 1.8 在代码、最窄 tests、docs validation 与 Decision evolve 证据具备后，同步稳定 owner 文档、Case prose 与已经成为 current fact 的 Gate aggregation、Markdown policy、invocation timestamp、phase timing Decisions；release-quality Decision 因 findings 尚未处置保持 unaligned。
- [x] 1.9 将 full Gate 暴露的 schema/example material 临时读写竞争收敛为三项确有资源关系的 Checks 的 named documentation-materials mutex；保留 JSON grammar 与 Markdown path validators 的并行，并同步自包含调度 Decision、owner 文档与 Case prose。

## Verification

- [x] 2.1 运行 Gate definition/eligibility/adapter/output 的最窄测试，证明 all aggregation 与 passed/failed/unavailable/not-applicable/empty policy 只消费 eligible statuses。
- [x] 2.2 运行 Markdown Link default/constructor/config/public-material tests，证明 default blocking、explicit non-blocking 的 complete facts/warning 与 unavailable 边界。
- [x] 2.3 运行质量 fixture/artifact ownership、performance elapsed、仅在 diagnostic/machine output 启用时的一次 timestamp capture/共享、terminal-log 和 docs-validator naming 的最窄测试；检查 test cleanup 不触及 pre-existing runtime inventory。
- [x] 2.4 按 Test Evidence review 运行 closure 与最窄语义测试，维护受影响 Cases/Proves；同步 schema/examples/docs 时运行相应 docs validation。
- [x] 2.5 在实现完成后运行 decisions check、change check、required workspace verification 以及 required/full Project Gate；分别保存真实 repository-quality 与 isolated fixture evidence。
- [x] 2.6 验证本 Change 只记录并交接初始 27/129/2、最终 28/134/2 evidence 与发布时全部已知 findings 的独立 release-quality 条件，而不将修复、waiver、release evidence 或该 Decision 的 alignment 作为本 Change 完成门槛。
