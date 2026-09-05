# Design

本设计只重组当前测试证据：每个测试文件承担一层可观察的证明责任，并以最小 public-DTO fixture 消除真实的结构重复。它不改变 Scheduler 或 AdmissionGraph runtime 行为。

## Context

- `docs/api-mechanics.md#admissiongraph-simulation` 定义 `createAdmissionGraph` 的 exact public input、frozen opaque state、canonical validation、binary settlement、scope lifecycle 与 Scheduler hard revalidation；public projection 未读取时不得构造 catalog/search。
- `docs/architecture.md#execution-boundary` 拥有 Scheduler admission、execution、settlement、diagnostic/measurement runtime responsibility；critical-path Case 独立证明 `dependsOn` 与 `observes` 的 reverse score。
- `docs/testing.md` 与 `docs/testing/case-maintenance.md` 要求移动或改写 native test node 时保留其 semantic Case purpose、更新 current entity mapping，并以完整 Test Evidence closure 验证。
- 实施前的 focused-quality artifact 有 13 条 non-blocking Records。本 Change 仅处理其中的 843-code-line file-metrics Record 与 admission-core/critical-path 的 17-line duplicate-detection Record。

## Goals / Non-Goals

**Goals**

- 将 `WB-RUNTIME-ADMISSION-GRAPH-001` 的八个 entities 分配给 public simulation、private core transition/trace 和 Scheduler replay 的实际证明责任，使每个 test file 局部可读且低于 repository file metric。
- 以一个 narrow fixture 供 public AdmissionGraph simulation 与 critical-path ranking 构造 fresh deep-frozen `SchedulerGraphSnapshot`，而不共享任何 assertion logic。
- 以 target tests、Test Evidence、docs/type/lint/format checks 和 focused-quality records 证明证据没有丢失，且恰好消除两条目标 Record。

**Non-Goals**

- 不改变 Scheduler、admission core、compiled graph、API、validation、catalog getter runtime semantics 或 quality policy。
- 不添加 public helper、production fixture、large generic test framework、quality waiver/exclusion，或新的 semantic Case。
- 不运行 complete (`--all`) Gate，不手动 push、不绕过已配置的 commit hook，也不改写历史；授权的一次 default Gate、归档和本 Change-only commit 仅用于关闭已完成的证据重组。

## Decisions

### Intended Change

将八个现有 AdmissionGraph entities 迁移到对应的证明责任文件，并以一个 policy-neutral public-DTO fixture 消除与 critical-path ranking 的结构重复。

#### 1. 保持 semantic Case 连续性

`WB-RUNTIME-ADMISSION-GRAPH-001` 仍是唯一的 admission Case：其既有 Proves 一起承接 public simulation 与 shared reducer/shell boundary。八个 entities 只迁移 path/suite/test 映射，断言 purpose 不变。`WB-RUNTIME-SCHEDULER-CRITICAL-PATH-001` 保持独立，继续拥有 score assertion。

#### 2. 按执行 authority 分割测试证明

| Test file | 唯一证明责任 |
| --- | --- |
| `admission-graph.test.ts` | explicit public DTO input、frozen opaque successor、canonical catalog/validation/binary settlement/scope lifecycle，以及 callback lookahead 与 Scheduler hard revalidation |
| `admission-graph.capacity.test.ts` | duplicate blocker payload 与 global active-scope capacity 对每个 candidate 的约束 |
| `admission-core.transitions.test.ts` | seeded core facts 的选择/settlement、legacy snapshot mutex、forced frontier cascade 与 closed scope root |
| `admission-core.trace.test.ts` | public 和 real-only failed/cancellation actions 通过同一 reducer 的 trace、effects 与 immutable post-state |
| `admission-core.scheduler-integration.test.ts` | real Scheduler execution 对 canonical failed/forced effects 的 shell diagnostic、measurement 与 terminal last-settled replay |
| `critical-path-ranking.test.ts` | `dependsOn`/`observes` reverse score、expected scores 与 frozen-score assertion；不拥有 admission assertion |

此分割只改变 source path 与为表达责任所需的 suite label，不改变行为或现有 assertion purpose。

#### 3. 限制 shared fixture 边界

`scheduler-graph-snapshot.test-support.ts` 只构造 public `SchedulerGraphSnapshot` DTO：接收显式 task/scope fields，复制 relation arrays，冻结 nested DTOs，并在每次调用时返回新 snapshot。它不 import `graph.ts`，不调用 `prepareTaskGraph`，也不执行 selection、core transition、score prediction 或 expected-value logic。这些判断仍由各自 tests 本地断言。

#### 4. 以 records 而非退出状态解释 focused quality

focused-quality 验证应读取其生成的 machine `records.ndjson`：允许保留与本 Change 无关的 findings，但必须没有两个目标 locations，且总数必须为 11。它是 non-default 的 narrow quality selection；它准备 candidate 并写入正常 `.log` artifacts，不等于 default 或 complete Gate。

### Resulting Impacts

- `quality-runtime.md` 必须将每个已移动 `bun|path|suite > test` entity 写到实际 test file，同时不改变受影响 Case 的 ID、Owner、Topic 或 Proves。
- test-support 必须保持 policy-neutral，防止 malformed public-input coverage 被 fixture 吸收，或重复 production preparation。
- focused-quality evidence 可以保留 11 条无关 non-blocking Records；本 Change 不以此修改 policy、waiver/exclusion、production runtime 或 public API。

## Risks / Trade-offs

- native test node 移动后，即使目标 tests 通过，也可能遗留 stale Case mapping；Test Evidence closure 与直接审阅 Case mapping 共同覆盖该风险。
- 过宽、可配置的 fixture 会掩盖 malformed public input 或复制 production behavior；只构造 immutable public DTO 且保留 callers 的 assertion logic 避免此退化。
- focused quality 的结果只能证明 selected quality boundary。default Gate 将作为一次最终广度验证；complete (`--all`) Gate 不运行，因此不作为本 Change 的验证证据。

## Open Questions

无。范围已由 current owners、target tests、Case catalog 与 recent focused-quality records 确认。

## Implementation Observations

- **Entity migration.** 三个 direct public simulation entities 位于 `admission-graph.test.ts`；duplicate-blocker/global-scope-capacity entity 位于 `admission-graph.capacity.test.ts`；legacy-mutex 与 forced-cascade entities 位于 `admission-core.transitions.test.ts`；reducer trace 位于 `admission-core.trace.test.ts`；shell diagnostic/measurement replay 位于 `admission-core.scheduler-integration.test.ts`。已删除的 `admission-core.test.ts` 没有 entity mapping。
- **Shared fixture boundary.** `scheduler-graph-snapshot.test-support.ts` 通过复制 task/scope relation arrays 构造新的 deeply frozen public DTO。它由 public AdmissionGraph simulation 和 critical-path ranking 使用，不 import `graph.ts`，也不调用 `prepareTaskGraph`。critical-path 的 prediction、expected score 与 freezing assertions 仍在其 own test 中。
- **Verification evidence.** 六个 focused Scheduler test files 共通过九个 tests；post-change Test Evidence 闭合 122 Cases 中的 541/541 Bun entities。Product typecheck/lint、docs validation 与 format check 已通过。focused `bun run check -- --quality` 在 `.log/project-gate/2026-09-05T05-45-40.286Z-1951738-d15d2c74-e4df-4909-a744-465f8bc2825b` 通过；其 machine `records.ndjson` 有 11 条 Records，且没有目标 file-metrics 或 duplicate Record。
- **Residual risk after final closure.** 剩余 11 条 non-blocking repository findings 在本 Change 范围外；未改变 quality policy、waiver/exclusion、production runtime 或 public API。一次 default `bun run check` 已通过（31 passed、5 not-applicable、0 failed/unavailable；logs: `.log/project-gate/2026-09-05T06-01-04.874Z-1962352-280da03c-ee43-4a8b-bd7d-e77b572fe53d`）；complete (`--all`) Gate 未运行且不在本 Change 验证范围内。
