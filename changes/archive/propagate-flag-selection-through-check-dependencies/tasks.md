# Tasks

按先固定选择事实源、再接入执行与 aggregation、最后简化 Gate 和验证/归档的顺序实施；checkbox 只在对应代码、材料和证据实际完成后勾选。

## Readiness

- [x] 0.1 已恢复 Configuration/API/Architecture、静态 graph、flag-control、aggregation、progress/machine 边界及相关 active Decisions，并记录到 proposal/design。
- [x] 0.2 已以 `unify-effective-flag-selection-and-aggregation.md` 归并并演进冲突的 flag-control、aggregation、flag-progress Directions；它从实施前的 active + unaligned 状态推进，并在实现、文档与证据核对后正式 aligned。
- [x] 0.3 实施开始前，按 `docs/testing.md`、`docs/testing/case-maintenance.md` 和 `test-evidence-review` 恢复 flag/aggregation/Gate test 的现有 Case、Owner、Proves；先运行 `bun run test-evidence -- check --root .`，确认需要新增、修改或拆分的 Case mapping。

## Implementation

- [x] 1.1 在 `src/check/**` 和 `src/project-definition/**` 将 executable `enabledByFlags` 精确扩展为 `propagateDependsOn?: true`：仅接受 literal true，省略保持 false，拒绝 false/unknown/container authoring，并在 public JSDoc、normalization、immutable snapshot 和 declarative fingerprint 中证明 canonical identity。
- [x] 1.2 在现有 Run planning / flag-control owner 构造一次私有 effective selection，且仅在完整 static graph validation 后使用：直接选择 unflagged 与 predicate-matching Check；对每个 matching opt-in root 合并其 normalized `dependsOn` transitive closure、去重并使用 canonical order；不遍历 `observes`，不建立第二 graph、public resolver 或 selection DSL。
- [x] 1.3 让 flag-control settlement、Scheduler pre-admission results 和 dependency lifecycle 消费该唯一 plan：closure 中 dependency 自身 predicate 未匹配仍执行，真正未选中的 flag Check 保持现有 `not-applicable / flag-condition-not-matched`，并保留 pre-work cancellation、invalid graph、preflight、all-passed `dependsOn` blocking 和四态 facts 的优先级。
- [x] 1.4 将 `CheckAggregation.checks` 扩展为显式 `"effective"` selector，并从同一 private plan 聚合 settled outcomes；保持 `"all"`、explicit canonical ID list、unknown/duplicate-ID validation、`aggregate: null` default 和 `empty` policy 的现有行为，不暴露 effective IDs。
- [x] 1.5 审查并最小化调整 progress、diagnostic、RunResult 和 machine handoff：dependency-activated Check 走普通 lifecycle，grouped disabled block 只含实际未选中的 flag settlements，且不增加 root/activation/effective-ID machine fields、public result fields 或 diagnostic telemetry。
- [x] 1.6 在 Product capability 实际通过后更新 `scripts/project/gate/**` 的 Definition/eligibility/aggregate composition，删除手工 `dependsOn` closure 和重复 aggregate-ID projection，改用 authoring propagation + `"effective"`；保留 Gate-owned preset/command policy、explicit `observes` closure validation、exact candidate 和 process-exit mapping。
- [x] 1.7 同步唯一 stable owners、public JSDoc 和受管 package materials：Configuration、API mechanics、Architecture、Quality Metrics、Gate/script tooling、必要 example/Case mapping。按 `ai-ready-docs` 审阅，使 implementer/consumer 可从实际文本恢复 default compatibility、dependency-predicate priority、`observes` exclusion、aggregation source 和无 telemetry 边界，而不在引用处复制规则。
- [x] 1.8 进行正确性与编码规范审查：沿“validated static graph → effective selection → control settlement/Scheduler → terminal aggregation”单一路径审计状态、cancellation 和失败归属；确认跨模块类型表达合法组合、private helper 有真实不变量/消费者、没有 boolean 驱动无关流程、无第二 resolver/DSL/telemetry，且新增/直接受影响代码符合 `docs/coding-style.md`。

## Verification

- [x] 2.1 添加或更新最窄 Product tests，独立证明 authoring validation/default+fingerprint、direct roots/unflagged nodes、multiple roots/unique transitive `dependsOn` closure、dependency self-predicate miss、`observes` exclusion、invalid static graph/cancellation、ordinary prerequisite blocking 和默认兼容。
- [x] 2.2 添加或更新 aggregation/presentation/output tests，证明 `"effective"` 与同次 execution selection 完全同源、empty policy、all/ID compatibility、真正 flag-disabled group 与 dependency-activated lifecycle 差异，以及 RunResult/machine/diagnostic 未扩张 selection contract。
- [x] 2.3 添加或更新 Gate Definition/adapter tests，证明 Gate 只在 Product 实施后移除 `dependsOn` closure 和 aggregate-ID duplication，继续闭合其 `observes` inputs、使用同一 aggregate、并维持 exact candidate 与 exit mapping；按 test-evidence review 同步实际变化的 semantic Cases，随后运行 `bun run test-evidence -- check --root .`。
- [x] 2.4 运行受影响的最窄 Product/Gate tests，再运行 `bun run typecheck`、`bun run lint`、`bun run format -- check`、`bun run validate -- docs` 与受影响的 package/documentation projection/acceptance；记录无法运行项及其输出边界风险。
- [x] 2.5 在跨 Product、公共 contract、输出和 Gate 边界完成后运行 required Project Gate `bun run check`；若本次最终触及 package artifact、candidate 或 external-consumer acceptance，再按范围运行 `bun run check -- --all`。本次 required Gate 已从最新源码构建 exact candidate；没有修改 package artifact / external-consumer acceptance owner，故未追加 `--all`。
- [x] 2.6 交付前审阅局部 diff，运行 `bun run decisions -- check`、`bun run change-plan -- check changes/propagate-flag-selection-through-check-dependencies`、`bun run validate`（含 `git diff --check`），并逐项核对 proposal 成功标准、Decision alignment 与 stable owner 同步事实。
- [x] 2.7 所有任务和成功标准已有实际实现/验证证据，stable owners 已同步，且当前用户请求已明确授权完成后归档并提交；据此运行 `bun run change-plan -- archive changes/propagate-flag-selection-through-check-dependencies`。
