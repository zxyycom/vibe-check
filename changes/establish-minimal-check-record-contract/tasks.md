# Tasks

本Plan先实现Check final result与minimal Record两个主契约，再处理它们直接引起的Core、Run、minimal aggregation、machine、legacy policy与consumer迁移。Typed dependency、repository Gate catalog/composition与presentation的具体设计由下游Changes承接；本Plan负责无中断cutover。所有 task 均已完成；本页是可审计 completion ledger，不是 current runtime contract。Implementation、Verification、独立审查、Success Criteria与Decision lifecycle的完成证据见[`acceptance-audit.md`](acceptance-audit.md)，current owner 路由见 [`proposal.md`](proposal.md)。

## Readiness

### 主设计准备

- [x] 0.1 建立 source、declaration emit、candidate package 与 ancestry-external consumer probe，固定四态 `CheckResult`、`passed/failed.data: object`、closed `records.report({ id }, data: object)` 和 generic canonical readback；证明 readonly local interface/`satisfies` 写入不需要 Check/Record generic、catalog 或 registry。证据见[`readiness-audit.md#01-public-contract-and-package-probe`](readiness-audit.md#01-public-contract-and-package-probe)。
- [x] 0.2 为 Check final data 与 Record data 建立同一个 canonical safety/containment contract，固定 author result invalid、report invalid、repeated identity、late write、callback throw/cancel 时的 owning-Check settlement 与已接受 Records 保留规则。证据见[`readiness-audit.md#02-canonical-safety-and-settlement-matrix`](readiness-audit.md#02-canonical-safety-and-settlement-matrix)。
- [x] 0.3 固定 Core/Run target：每个 Core Check 保存一个新终态及 canonical final data，Core Records 保存 `{ checkId, id, data }`；completed/effect `RunResult` 返回两者，且只在显式配置时产生aggregate。证据见[`readiness-audit.md#03-core-run-and-aggregation-target`](readiness-audit.md#03-core-run-and-aggregation-target)。

### 次级影响准备

- [x] 0.4 逐项追踪 `completed/verdict`、`recordTypes`、field operands、acceptance/views、`reportReference`、reference facts、comparison inputs、DecisionPolicy、GateResult 与 machine evidence，形成“主契约变更 → 直接消费者 → 删除/迁移 owner”map；不得把 downstream feature 当成本 Change 的主设计理由。证据见[`readiness-audit.md#04-direct-consumer-migration-map`](readiness-audit.md#04-direct-consumer-migration-map)。
- [x] 0.5 固定`RunControls.checkAggregation`、`RunResult.aggregate`、selected Check ID validation与`required/full`adapter migration；旧`result.decision.gate`只能在该cutover有可验证替代后删除，正式验证入口不得暂停。证据见[`readiness-audit.md#05-aggregation-and-repository-gate-cutover`](readiness-audit.md#05-aggregation-and-repository-gate-cutover)。
- [x] 0.6 核对 [`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/) 已重新审阅 upstream final data/Records source，[`add-check-associated-result-presentation`](../add-check-associated-result-presentation/) 已重新审阅 final data/Records projection，且Gate optimization Draft只消费本Plan的aggregate。证据见[`readiness-audit.md#06-downstream-handoffs`](readiness-audit.md#06-downstream-handoffs)。
- [x] 0.7 建立 Decision evolution map：核对目标 Decisions 与现行 Core facts、DecisionPolicy、machine v3及public surface，按 `decision-records` workflow准备successor/alignment/lifecycle动作；不得以Plan代替长期owner。证据见[`readiness-audit.md#07-decision-evolution-map`](readiness-audit.md#07-decision-evolution-map)。
- [x] 0.8 在修改原生测试前运行 `bun run test-evidence -- check --root .`，建立 Check result、Record/Core、canonical safety、Run facts、legacy policy removal、machine、default Checks、output consumers、Project Gate 与 package consumer 的 Case/Owner/Proves impact map。证据见[`readiness-audit.md#08-test-evidence-impact-map`](readiness-audit.md#08-test-evidence-impact-map)。

## Implementation

### 主设计实施

- [x] 1.1 在 public authoring owner 将 `CheckResult` 收敛为 `passed(data) | failed(data) | not-applicable(reason?) | unavailable(reason)`，删除 `completed + verdict` 双层表达，并保持 declared unavailable reason 与 Product containment reason 的责任差异。
- [x] 1.2 在 public Record authoring owner 实现 closed `RecordIdentityInput { id }` 与 `records.report(identity, data)`；删除 `recordTypes`、Record field declarations、`CheckRecordType`、identity extractor 与 reference reporter，不新增替代 registry、Schema 或默认 top-level reporter types。
- [x] 1.3 在 Check/Record Core owner 实现 descriptor-based、prototype-safe、detached canonical final/Record data snapshot、deep-freeze、exact Check-local Record ID、structural composite `{ checkId, id }` ownership、all-repeat rejection、late write 与 owning-Check failure containment；不得用 delimiter join 代替 composite key。
- [x] 1.4 更新 Core Check settlement 与 completed `RunResult` facts，使新的 terminal status/final data 和完整 Records 成为唯一 canonical facts；Run lifecycle failure kinds 与 multi-Check aggregation 保持分层，未配置 aggregation 的 consumer 可以读取 raw facts。

### 次级影响实施

- [x] 1.5 从 Run Controls、callback context、Definition normalization 与 execution plumbing 删除旧 Record contract 拥有的 common comparison/reference inputs；不重命名、移动或删除其它 execution-context fields。
- [x] 1.6 实现 machine v4 的新 Check rows/final data、minimal Record rows、canonical ordering、fingerprints、serializer 与 complete-set validators；删除 v3 Record catalog、opaque ID recomputation、reference/acceptance/views/blocking Record/decision evidence，并同步 schemas、examples 与 independent validators。
- [x] 1.7 在`RunControls`实现显式Check aggregation selection/config validation，在`RunResultFacts`返回`aggregate | null`，并将repository`required/full`迁移到package-owned aggregate；adapter不得遍历snapshot重建summary。
- [x] 1.8 在1.7 focused acceptance通过后，删除public/normalized DecisionPolicy、Record/reference evaluator、GateResult、RunResult decision/reference facts与Project Definition/project-run plumbing。
- [x] 1.9 迁移 default Checks、repository Project Definition、fixtures、output consumers、package materials与 public-contract inventory；每个 Check 返回自己的 final data，并仅在有补充事实时提交 Records。
- [x] 1.10 删除依赖旧 Record message/location/level 的人读/annotation projection但保留 Check lifecycle progress；不遍历 arbitrary final/Record data 猜测 presentation，也不创建 owner/count/IDs fallback。
- [x] 1.11 更新 Architecture、Configuration、Quality Metrics 与 Output owners，明确主契约、generic readback、canonical safety、explicit aggregation、legacy removal 与 machine v4；只在对应 downstream Change 保存 typed dependency、Gate optimization 与 presentation 的完整设计。

## Verification

### 主设计验证

- [x] 2.1 运行最窄 public authoring、declaration 与 package tests，证明四种 Check final returns、required passed/failed data、readonly local typing、primitive compile-time rejection、two-argument Record report、options inference、composition 与 isolated installed consumer。
- [x] 2.2 运行最窄 Check/Record Core tests，证明 final/Record canonical snapshot immutability、prototype-safe keys、显式canonical-text lexical ordering（包括整数形态与nested keys）、`__proto__` preservation、`-0` normalization、accessor/`toJSON` non-invocation、unsupported descriptor/prototype/cycle/sparse/non-finite rejection、Check-local identity、repeat rejection、late write、owning-Check containment 与 prior Record retention。
- [x] 2.3 运行最窄 Core/Run tests，证明每个Check只有一个新终态，passed/failed final data保留，not-applicable/unavailable不伪造data，Records与status相互独立；未配置时aggregate为`null`，显式配置时只从selected raw statuses确定性求值。

### 次级影响验证

- [x] 2.4 运行最窄 configuration/policy tests，证明 common comparison/reference inputs、DecisionPolicy、GateResult 与 decision/reference evidence 在 consumer migration 后删除，且没有固定 reducer、dependency Check 或 CLI-local traversal 取代它们。
- [x] 2.5 运行最窄 machine/docs/output tests，证明 v4 新 Check terminal data、`{ checkId, id, data }` Records、composite uniqueness、canonical ordering、complete-set fingerprint、mixed/partial-set rejection、v3 rejection与无任意 data presentation fallback。
- [x] 2.6 运行 Project Gate required/full/partial eligibility tests，证明正式入口继续工作、aggregation 来自显式配置、无配置调用方仍可读取 raw Check facts，并且 adapter 只负责 invocation、日志与 exit mapping。
- [x] 2.7 运行 default Checks、repository dogfood、public-contract inventory、candidate package 与 ancestry-external consumer tests，证明所有直接消费者完成同一 hard cut。
- [x] 2.8 运行修改后的 `bun run test-evidence -- check --root .`，确认受影响原生测试实体与 Case/Owner/Proves 闭合。
- [x] 2.9 运行 `bun run typecheck`、`bun run lint`、`bun run format -- check`、`bun run validate -- docs`，以及 dependency、product-import、public-contract 与 package-entry checks。
- [x] 2.10 运行 `bun run verify:vibe-check-workspace:required`，覆盖 Project Definition dogfood、Project Gate、public package、machine v4 与 current output consumers；失败时不通过恢复旧 Record/CheckResult contract、暂停入口或复制 aggregation logic 规避。
- [x] 2.11 逐项复核 Proposal Success Criteria、下游交接、长期 Decisions 与稳定 owners；只按实际证据勾选 tasks，在完整方向成为当前事实后按 0.7 的 evolution map维护 Decision lifecycle/alignment，并在另获归档授权前保持 Change active。
