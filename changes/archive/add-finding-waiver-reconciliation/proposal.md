# Proposal

本 Plan 已将质量 Finding 的例外从扫描前路径排除改为可审计、调用方语义身份驱动的 reconciliation。

## Why

历史 v2 Schema 的 glob exclusion 会隐藏真实 SCC finding，而普通 Record ID 不能代表所有 Check 可稳定 author 的 waiver identity。实现需要一个不依赖 Core/Gate 的公开 helper，让 producing Check 自行采用完整 finding 与用户定义 identity 的批量对账。

## Outcome

公开泛型 helper 已将完整 findings、caller-defined canonical identity 与结构化 waiver/reason 对账为 actionable、waived、overmatched dispositions 及 waiver audits。repository file-metrics 已保留 historical v2 run schema 的 SCC finding/Record 与理由，并删除 Gate path exclusion。

## Scope

### Intended Change

- 新增并公开独立 helper 与类型；它按调用方 `identify(finding)` 产生的 canonical identity 对完整 candidate 集合和 waivers 做确定性 reconciliation。
- 完成 0/1/>1 匹配、重复/hostile input 与 caller mutation 边界的验证；waiver evidence detached/deep-frozen，原 finding 引用不被复制或改写。
- 在 file-metrics 完整 candidates 形成后采用 helper：historical v2 run schema 仍交由 SCC 测量，finding Record 保留 waiver reason；Gate 的 schemas-examples 精确 path exclusion 已删除。
- 保持 shared settlement 为中性 `{ actionable, blocking }`，由 Check 自己发布 Record 和结算 outcome；没有 Core/Gate waiver special case。

### Resulting Impacts

- helper 的公开 exports 与测试明确其不认识 Core Record、Check status、Gate 或 rendering。
- file-metrics 保持 final data `{ findingCount, blockingFindingCount }`；waived finding 不参与 actionable settlement，unused/overmatched waiver 形成独立 audit Record，且 audit ID 与正常 path 域不相交。
- 因 machine schema/example shape 未改变，本 Change 不需要修改 schema 或 example；稳定 owner 文档仅同步已落地的实际行为。
- 历史 path-exclusion Decision 已由新 Decision 修订；后者已在实现和完整验证后对齐。

## Success Criteria

- helper 可由任意 Check 使用完整 finding + caller-defined identity 产生确定性 applied、unused 与 overmatched evidence；多匹配不会被默认豁免。
- historical v2 run schema 仍被 SCC 测量，并在 file-metrics evidence 中带精确 preservation reason；其它 schema/example selection 和 limits 没有扩大豁免。
- helper、file-metrics、Gate/output evidence、type/lint/format/docs/diff、test-evidence 与完整 required Gate 已通过；不存在 Core-wide waiver special case。

## Affected Owners

- `src/finding-waivers/**` 与 `src/index.ts`：公开 helper、canonical identity、输入边界与 exports。
- `src/package-checks/file-metrics/**`：Check-owned finding publication、waiver audit、message 与 settlement。
- `scripts/project/gate/**`：repository-private waiver authoring 和 schemas-examples exact inputs。
- `docs/architecture.md`、`docs/quality-metrics.md`、`docs/scan-scope.md` 与 `docs/decisions/`：独立纯 helper 模块边界、file-metrics waiver shape `{ identity: { metric, path }, reason }`、输入事实与长期判断；machine schema/examples 未受影响。
