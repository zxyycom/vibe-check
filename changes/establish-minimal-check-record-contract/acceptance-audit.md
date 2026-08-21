# Acceptance Audit

本审计记录`establish-minimal-check-record-contract`完成Implementation与Verification时的当前事实和验收证据。它证明本Change已达到Proposal Success Criteria；Change仍保持`active + plan`，本轮没有归档授权。

## Implemented Result

### 主契约

- Public Check callback使用`passed(data) | failed(data) | not-applicable(reason?) | unavailable(reason)`；`passed`/`failed`的`data`是唯一primary result。
- Reporter固定为contextual `records.report({ id }, data)`；Product没有新增Record generic、catalog、registry、Schema或top-level reporter roots。
- Core在唯一author settlement boundary将final/Record data安全materialize为detached、null-prototype、deep-frozen facts；invalid author output只contain owning Check，已接受Records保持成立。
- Core Record固定为`{ checkId, id, data }`，使用结构化`checkId → id`所有权和重复检测；不同Checks可重用local ID。
- JavaScript object枚举顺序不是contract。Canonical text、UTF-8 bytes与fingerprint在每一层显式按lexical key order序列化，覆盖integer-like与nested keys。

### 主契约引起的直接迁移

- Completed/effect Run facts始终返回raw Checks/Records；未配置aggregation时`aggregate === null`。
- `RunControls.checkAggregation`显式声明selection、`all | any`、unavailable、not-applicable与empty-set handling；unknown、duplicate、sparse或named-property Check ID arrays在work前失败。
- Repository required/full绑定eligible IDs与package-owned aggregation；adapter只映射Run facts、日志与exit code，不遍历snapshot重算结论。
- Machine硬切v4，发布四态Check final data和`{ checkId, id, data }` Records，保留two-file fingerprint trust boundary并拒绝v3/mixed/partial sets。
- DecisionPolicy、GateResult、comparison/reference evaluator、Record catalog、v3 publication、旧annotation/readable fallback及其直接plumbing已经删除；其它execution context fields没有随之迁移。
- Default Checks、public contract、candidate package、ancestry-external consumer、schemas、examples、独立validators与稳定owner docs均已迁移。

## Independent Review

独立审查先发现三个阻断和一个closed-input缺口：integer-like key的canonical text依赖JS枚举、aggregation truth matrix不足、hostile final-data settlement证据不足，以及aggregation Check ID array未完全closed。修复后复核确认：

- Canonical serializer递归显式排序，fingerprint有固定text/hash证据。
- 真实Run aggregation table覆盖`all | any`、all/explicit/empty selection、三种empty结果、三种unavailable处理、三种not-applicable处理及passed/failed组合。
- Callback→Core adversarial table覆盖Proxy/reflection、accessor、`toJSON`、cycle、sparse/named array、non-finite与unsupported prototype，并证明prior Record retention、other Check isolation和late reporter closure。
- Author final data只在Core settlement canonicalize；callback不重复处理，Core freeze不重复重验。`validateCoreSnapshot`只保留为external/publication trust boundary。
- 没有发现compatibility wrapper、dual reader/writer、generic registry、重复reducer或不必要抽象。

## Success Criteria

| # | Evidence | Result |
| --- | --- | --- |
| 1 | Project authoring tests与ancestry-external installed consumer覆盖ordinary custom Check、四态结果、two-argument reporter和generic readback。 | Passed |
| 2 | Declaration emit、public inventory与negative type tests证明旧result/catalog/reference roots已退出，options inference和composition保留。 | Passed |
| 3 | Descriptor/canonical/adversarial tests覆盖detachment、freeze、prototype、integer keys、`__proto__`、`-0`与全部rejection边界。 | Passed |
| 4 | Core tests证明one terminal outcome、structural ownership、Check-local uniqueness和cross-Check ID reuse。 | Passed |
| 5 | Callback/Core tests证明Records不决定status，invalid write只影响owner且不撤销prior Records。 | Passed |
| 6 | Run tests证明raw facts始终可读、无配置aggregate为`null`且lifecycle与aggregation分层。 | Passed |
| 7 | Machine v4 Product与independent validator tests证明新rows、ownership/order/fingerprint、v3及mixed/partial rejection。 | Passed |
| 8 | Run truth matrix与pre-work validation覆盖完整explicit aggregation grammar，没有hidden default。 | Passed |
| 9 | Static surface audit、删除diff和Gate tests证明legacy policy/reference/evidence退出且没有dependent Check或CLI reducer替代。 | Passed |
| 10 | Repository required/full入口均通过，并消费bound Project Run的package aggregate。 | Passed |
| 11 | Typed dependency、presentation与Gate authoring Drafts已分别记录新facts输入且没有把其API设计带入本Change。 | Passed |

## Verification Evidence

独立验收代理在最终工作区顺序运行并确认：

- `bun run typecheck`
- `bun run lint`
- `bun run format -- check`
- `bun run validate -- docs`
- `bun run test-evidence -- check --root .`：143 entities全部由45 Cases映射。
- Public authoring、Core/Run、default Checks、package candidate、ancestry-external consumer、Project Gate、publication v4与independent machine validator focused suites。
- `bun run verify:vibe-check-workspace:required`：14 passed、6 profile-excluded、0 failed/unavailable。
- `bun run verify:vibe-check-workspace:full`：19 passed、1 profile-excluded、0 failed/unavailable。
- `bun run decisions -- check`与目标`change-plan check`。
- `git diff --check`。

## Decision Lifecycle

以下successors已建立为`active + aligned`，各自直接前序已按`修订`或`替代`关系归档：

- `use-four-state-check-results-with-final-data.md`
- `use-core-check-record-facts-with-final-data.md`
- `use-explicit-run-controls-check-aggregation.md`
- `bind-project-gates-to-run-aggregation.md`
- `publish-fingerprint-bound-check-record-machine-v4.md`
- `expose-minimal-check-and-run-public-surface.md`

`report-check-owned-record-data-with-local-identities.md`和`keep-comparison-semantics-inside-producing-checks.md`也已在完整方向成为current facts后标记aligned。最终strict Decision检查为131条记录、46 active、33 aligned、13 unaligned、85 archived、0 candidates。

## Remaining Boundary

- 本Change的直接需求、次级直接迁移、稳定owners、Decisions与验证均已闭合。
- Typed dependency getter、Gate catalog/native composition与human presentation仍由三个下游Draft承接，不是本Change未完成项。
- Change保持active；只有另获明确归档授权后才移动到archive。
