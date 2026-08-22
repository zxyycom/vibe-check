# Acceptance Audit

本审计记录`establish-minimal-check-record-contract`完成Implementation与Verification时的当前事实和验收证据。Implementation、技术验证与 Decision lifecycle 均已收敛，本 Change 已达到 Proposal Success Criteria。Change 当前仍保持`active + plan`；用户已授权在下一阶段归档，但首个提交前尚未移动目录。

## Current owner route

本页是完成时证据，不重复维护 runtime contract。后续修改时，按问题进入唯一 current owner：Check authoring 和 Run controls 见 [Configuration](../../docs/configuration.md)，final data、supplemental Records 与 aggregation 见 [Quality Metrics](../../docs/quality-metrics.md)，machine v4 见 [Output](../../docs/output.md)，repository Gate adapter 见 [脚本工具](../../docs/script-tooling.md#project-gate)。本 Change 的 scope、planning baseline 与下游边界仍见 [`proposal.md`](proposal.md) 和 [`design.md`](design.md)。

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
- `ProjectQualityConfiguration`现在只拥有 scope fields；Product effects只剩 cache、progress 和 output。Project Gate 的 transcript directory 是 adapter-owned local diagnostic，不是 Product effect。
- Metric defaults只保留 absolute-floor/allowance branches；`RunControls.changedFiles`继续作为 custom Check context。current submodule worktree collection 继续属于 scan scope，但 Product 不再提供泛用 comparison/revision model。
- Output publisher只写 `run.json` 与 `records.ndjson`，不创建 scanner material path。它以 trusted Core snapshot 和已验证 invocation 作为投影输入，序列化 two-file candidate 后在 canonical path 变更前完整验证该 candidate；这里的 trusted input 不宣称跨路径原子可见性，也不是“避免再次遍历 author data”的承诺。`canonicalJsonBytes`归属 canonical-data owner。已删除的 test-only output planning helpers 与无 consumer artifact-reader 没有替代 public surface，真实 I/O tests 承接 publication lifecycle 证据。

## Independent Review

独立审查先发现三个阻断和一个closed-input缺口：integer-like key的canonical text依赖JS枚举、aggregation truth matrix不足、hostile final-data settlement证据不足，以及aggregation Check ID array未完全closed。修复后复核确认：

- Canonical serializer递归显式排序，fingerprint有固定text/hash证据。
- 真实Run aggregation table覆盖`all | any`、all/explicit/empty selection、三种empty结果、三种unavailable处理、三种not-applicable处理及passed/failed组合。
- Callback→Core adversarial table覆盖Proxy/reflection、accessor、`toJSON`、cycle、sparse/named array、non-finite与unsupported prototype，并证明prior Record retention、other Check isolation和late reporter closure。
- Author final data只在Core settlement canonicalize；callback不重复处理。v4 publication 从 Core snapshot 投影、序列化并完整验证 candidate two-file set；Core canonicalization 与 candidate validation 是不同边界，验收不把它表述为“没有第二次 traversal”。独立 docs validator 则从 artifact bytes 自行递归验证 canonical JSON（含 non-finite rejection），再 fail closed 地检查 complete-set fingerprint。
- 没有发现compatibility wrapper、dual reader/writer、generic registry、重复reducer或不必要抽象。

## Success Criteria

| #   | Evidence                                                                                                                                    | Result |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Project authoring tests与ancestry-external installed consumer覆盖ordinary custom Check、四态结果、two-argument reporter和generic readback。 | Passed |
| 2   | Declaration emit、public inventory与negative type tests证明旧result/catalog/reference roots已退出，options inference和composition保留。     | Passed |
| 3   | Descriptor/canonical/adversarial tests覆盖detachment、freeze、prototype、integer keys、`__proto__`、`-0`与全部rejection边界。               | Passed |
| 4   | Core tests证明one terminal outcome、structural ownership、Check-local uniqueness和cross-Check ID reuse。                                    | Passed |
| 5   | Callback/Core tests证明Records不决定status，invalid write只影响owner且不撤销prior Records。                                                 | Passed |
| 6   | Run tests证明raw facts始终可读、无配置aggregate为`null`且lifecycle与aggregation分层。                                                       | Passed |
| 7   | Machine v4 Product与independent validator tests证明新rows、ownership/order/fingerprint、v3及mixed/partial rejection。                       | Passed |
| 8   | Run truth matrix与pre-work validation覆盖完整explicit aggregation grammar，没有hidden default。                                             | Passed |
| 9   | Static surface audit、删除diff和Gate tests证明legacy policy/reference/evidence退出且没有dependent Check或CLI reducer替代。                  | Passed |
| 10  | Repository required/full入口通过，并消费bound Project Run的package aggregate。                                                              | Passed |
| 11  | Typed dependency、presentation与Gate authoring Drafts已分别记录新facts输入且没有把其API设计带入本Change。                                   | Passed |
| 12  | 两条需要生命周期事务的 Decision 语义修订均已建立 successor，并归档各自前序。                                                                    | Passed |

## Verification Evidence

最终代码收敛已执行并确认：

- Public authoring、Core/Run、default Checks、package candidate、ancestry-external consumer、Project Gate、publication v4与independent machine validator 的 focused 测试：63 tests / 9 suites。
- `bun run test-evidence -- check --root .`：140 current entities全部由44 Cases/10 Topics映射；其中包含 candidate-write 与首次 canonical-rename failure 的真实 I/O tests。
- `bun run verify:vibe-check-workspace:required`：20 checks，14 passed、6 profile-excluded not-applicable、0 failed/unavailable。
- `bun run verify:vibe-check-workspace:full`：20 checks，19 passed、1 profile-excluded not-applicable、0 failed/unavailable。
- `bun run typecheck`、`bun run lint`、全局 format check（267 files）、`bun run validate -- docs`、strict Decision check（134 records：46 active、33 aligned、13 unaligned、88 archived、0 candidates）、目标 `change-plan check`（30/30 tasks）与 `git diff --check`。

## Decision Lifecycle

已建立的 successor 维持`active + aligned`，其已完成的直接前序已按`修订`或`替代`关系归档：

- `use-four-state-check-results-with-final-data.md`
- `use-core-check-record-facts-with-final-data.md`
- `use-explicit-run-controls-check-aggregation.md`
- `bind-project-gates-to-run-aggregation.md`
- `publish-fingerprint-bound-check-record-machine-v4.md`
- `expose-minimal-check-and-run-public-surface.md`
- `keep-empty-information-check-warnings-as-run-facts.md` 修订并归档 `allow-empty-information-checks-with-warning.md`，闭合由本 Change 引起的 Product `logs` effect 清理这一项次级 Decision 迁移。

`report-check-owned-record-data-with-local-identities.md`和`keep-comparison-semantics-inside-producing-checks.md`也已在完整方向成为current facts后标记aligned。另有16条 aligned Decisions与2条 other unaligned Decisions完成了编辑性术语收敛。

两条语义修订均已完成 lifecycle 事务：

- `require-check-owned-network-authorization.md`（`active + unaligned`）修订 `require-explicit-network-check-authorization.md`（已归档）；
- `use-check-owned-file-overrides.md`（`active + unaligned`）修订 `use-file-policy-overrides.md`（已归档）。

当前 strict Decision snapshot 为134条记录、46 active、33 aligned、13 unaligned、88 archived、0 candidates。两条 successor 尚待其各自独立实施与 alignment；它们不再阻塞本 Change 的最终验收。

## Remaining Boundary

- Typed dependency getter、Gate catalog/native composition与human presentation仍由三个下游Draft承接，不是本Change未完成项。
- Change保持active；用户已授权下一阶段归档，但首个提交前尚未移动到archive。
