# Proposal

本 Change 将 admission Scheduler 测试按可观察的证明责任重组，消除两条现存的非阻断质量 Record，且不改变 Product runtime。

## Why

`src/project-run/task-scheduler/admission-core.test.ts` 同时承载 public `AdmissionGraph` simulation、private core reducer 和真实 Scheduler replay，达到 843 code lines，形成一个 file-metrics Record。该文件还手写公开 `SchedulerGraphSnapshot` task DTO，与 `critical-path-ranking.test.ts` 中的同形片段形成一个 17-line duplicate-detection Record。现有断言是所需测试证据；本 Change 不以删除、弱化或 quality exclusion 处理这些 Record。

## Outcome

八个现有 AdmissionGraph entities 迁移到其真实的证明边界：public simulation、private core transition/trace，或真实 Scheduler diagnostic/measurement replay。两个测试只共享一个窄的 public-DTO fixture；每次调用均产生 fresh、deep-frozen `SchedulerGraphSnapshot`，而非复用或准备 production graph。两个既有 Case 的 ID、Owner、Topic 和 Proves 保持不变，Case Markdown 只更新已移动 entity 的实际 Bun path/suite/test 映射。

已有 focused quality 证据显示：目标 file-metrics Record 和目标 duplicate Record 均消失，machine `records.ndjson` 的总数从 13 降为 11。其余 11 条非阻断 Record 不属于本 Change。

## Scope

### Intended Change

- 只修改 `src/project-run/task-scheduler/*test*.ts`、`scheduler-graph-snapshot.test-support.ts`、`docs/testing/cases/quality-runtime.md` 及本 Change artifacts。
- 保留 `WB-RUNTIME-ADMISSION-GRAPH-001` 与 `WB-RUNTIME-SCHEDULER-CRITICAL-PATH-001` 的 Case ID、Owner、Topic 和 Proves；迁移前者的八个 entities 到实际承担证明责任的 test files。
- fixture 只从显式 public `SchedulerGraphSnapshot` DTO fields 构造值：复制 collections、冻结嵌套 task/scope DTO，并为每次调用返回新 snapshot。它不得调用 `prepareTaskGraph`、提供 production admission helper，或改变 public input boundary。

### Resulting Impacts

- public simulation 继续直接覆盖 exact input、opaque/frozen successor、canonical validation、scope capacity 与 callback lookahead/hard revalidation；private tests 继续覆盖 seeded core state、forced effects、trace 和 immutable post-state；integration test 继续覆盖 real execution 的 diagnostic/measurement replay。
- critical-path ranking 仅以 fixture 去除 handwritten public-DTO duplication；prediction、expected score 和 frozen-score assertions 继续由该 test 独立拥有。
- 移动 native test nodes 后，Case catalog 必须闭合至新 entity 映射，并以目标 Scheduler tests、Test Evidence、docs/type/lint/format checks 和已有 focused-quality artifact 验证。

## Success Criteria

1. `admission-core.ts`、compiled graph、`scheduler.ts` 与其他 production code 均未修改；未使用 quality waiver/exclusion，未删除或弱化现有断言。
2. 八个 AdmissionGraph entities 均在与其证明责任相符的文件中执行；fixture 在每次调用时返回 fresh deep-frozen public DTO；critical-path 保留独立的 score assertions。
3. Case catalog 对移动后的 entities 闭合，且两个受影响 Case 的 ID、Owner、Topic 和 Proves 不变。
4. 已有 focused-quality machine records 不含目标 admission-core file-metrics 或 admission-core/critical-path duplicate Record，且总数为 11（变更前为 13）。
5. 在归档前恰好一次 default `bun run check` 通过；不运行 complete (`--all`) Gate，不手动 push 或绕过已配置的 commit hook。default Gate 通过后归档 Change，并以只含本 Change 测试证据的提交保存结果。

## Affected Owners

- `docs/api-mechanics.md#admissiongraph-simulation`：public AdmissionGraph simulation contract。
- `docs/architecture.md#execution-boundary`：Scheduler core transition、execution、measurement 与 critical-path score evidence。
- `docs/testing.md` 与 `docs/testing/case-maintenance.md`：semantic Case continuity 与 entity closure。
- `scripts/project/gate/checks/repository-quality.ts`：focused-quality Record 的验证 owner；本 Change 不修改其 policy。
