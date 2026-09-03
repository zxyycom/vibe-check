# Proposal

本 Plan 的 Outcome 是让 package consumer 以一个 invocation-scoped custom strategy 完成一次 Run 的准入选择，并把它的 completion 纳入现有 terminal measurement output。

## Why

**实施前基线（不是现行 public contract）：** public custom authoring 只有同步 `proposeAdmission(context)`；Invocation 已有私有 provider lifecycle，而 generic `scheduler.measurementHooks` 与私有 `complete` 分属两个终态交付路径。调用方无法以一个可验证的 public contract 表达异步准备、Run-local `decide` 与终态提交。

## Outcome

实现后，package consumer 可选择两种 custom strategy：simple strategy 直接同步 `decide`；prepared strategy 通过异步 `prepare` 形成该 Run 独有的 `decide` 与可选 `complete`。Invocation 管理 `prepare` 和 `complete`，Scheduler 继续只消费同步、result-only 的 `select | wait` policy，并独占 graph legality、hard guards 与 Task execution。

当 Scheduler 形成 sealed terminal measurement 时，它运行既有 internal summary 与 configured generic measurement Hooks runner；Invocation/orchestration 在该 runner 返回后交付 prepared `complete`，并将同一 sequence 结算到既有 `outputs.measurementHooks`。该 field 继续作为唯一 aggregate output，并保留既有 diagnostic、primary-result precedence、sealed Task/Check facts 与 machine v4。

## Scope

### Intended Change

- 公开 closed custom strategy grammar：`simple` 提供同步 `decide`；`prepared` 提供 async-capable `prepare`，并返回该 Run 的 `decide` 与可选 `complete`。`prepare` 读取 frozen graph-ready facts，`decide` 复用 `AdmissionPolicyContext`，`complete` 读取 sealed `SchedulerMeasurementContext`。
- 由 Invocation 为每个 graph-ready Run 解析 strategy、执行一次 `prepare` 并保存 Run-local closure；它将唯一的 frozen synchronous policy 交给 Scheduler。
- 建立 `Scheduler seal → Scheduler internal summary + configured generic measurement Hooks → Invocation prepared complete → aggregate` 的 terminal delivery：generic runner 返回后才调用 `complete`，并以同一个 `outputs.measurementHooks` 结算全体实际 participant。
- 同步完成 public TypeScript definition、exact runtime validation、normalization、declarative snapshot/fingerprint、exports、documentation、installed-consumer fixture、runtime tests、Test Evidence 与 workspace evidence。

### Resulting Impacts

- Project Definition、public declaration 和 fingerprint 共同表达 strategy kind，运行时只保留 callback runtime state，不把 callback identity、source 或 closure 写入 declarative snapshot。
- Invocation、provider、terminal measurement delivery 和 RunResult mapping 共同形成 per-Run lifecycle、一次 terminal delivery 及其 failure precedence；Scheduler 的执行状态机和 hard guards 保持单一 owner。
- API/configuration/architecture docs、README/JSDoc/examples、package candidate 与 Test Evidence 共同提供 public contract 和消费者可核对证据；`docs/output.md` 仅核对 machine boundary。

### Compatibility and boundaries

- public custom authoring 只采用 simple/prepared 两种 shape；retired `proposeAdmission` 是 hard-cut compatibility boundary，validation、normalization、declaration、docs 和 installed-consumer acceptance 一致执行该 boundary。
- callback 是 trusted host code：Product 通过 frozen context 和 result-only handoff 限定 Product surface，不提供 state、filesystem、persistence、clock、logger、mutable Scheduler state 或 Task command。
- Simulation 可独立、增量地扩展 context object；它不是本 Plan 的依赖。machine v4、schema version、algorithm Change 与 generic persistence/model API 均不在本 Plan 范围。

## Success Criteria

1. public definition、runtime validation、normalization、declaration projection 和 installed-consumer fixture 共同接受两种 strategy form，并以同一 compatibility boundary 验收已退休 authoring form、unknown field 和 async/thenable `decide`。
2. 每个 graph-ready Run 各自完成 strategy preparation；overlapping Runs 的 returned closure 相互隔离，Scheduler 只收到 frozen synchronous policy 并保留现有 hard guards。
3. sealed terminal context 触发唯一、可排序的 side-effect pipeline：Scheduler 的 generic runner 让所有 configured observers 先获得调用机会，Invocation 随后最多一次交付 prepared `complete`；没有 sealed context 时 field 以其 enabled 条件保留 `not-run`。
4. preparation、decision、pre-terminal engine、terminal side-effect、cancellation 与 normal completion 都按确定的 failure matrix 形成结果；`complete` 或 generic Hook failure 仅影响既有 aggregate output，并保留 sealed facts 与 primary-result precedence。
5. stable owner documentation、public declarations、runtime/tests、Test Evidence、installed consumer 以及 required/full workspace verification 提供可复核证据；两个 active + unaligned future Decisions 仅在这些内容成为 current fact 后才可对齐。

## Affected Owners

- `docs/architecture.md#private-admission-strategy-lifecycle`、`docs/configuration.md`、`docs/api-mechanics.md#outputs-与-runresult-边界`：稳定事实、public contract、RunResult output 和事实/目标边界；`docs/output.md` 只核对 machine boundary。
- `src/project-definition/scheduler-policy.ts`、`src/project-definition/project-definition.ts`、validation/fingerprint owner、`src/index.ts`：authoring grammar、normalization、declaration 与 fingerprint。
- `src/project-run/admission-strategy-provider/**`、`src/project-run/invocation.ts`、`src/project-run/task-scheduler/scheduler-terminal-measurement.ts`：Invocation lifecycle、terminal delivery、Scheduler handoff 与 output mapping。
- `docs/testing.md`、`docs/testing/case-maintenance.md`、`docs/testing/cases/quality-runtime.md` 与相邻 runtime tests：行为证明和 Case closure。
- `scripts/package/candidate/external-consumer/type-acceptance.ts`、package docs/examples 和 build verification：installed-consumer public declaration evidence。
- [Authoring Decision](../../docs/decisions/adopt-invocation-scoped-custom-admission-strategy-authoring.md)、[measurement Hook output Decision](../../docs/decisions/extend-measurement-hook-output-to-prepared-complete.md)、[Change coordination](../../docs/change-execution-order.md)：长期方向、合入冲突和阶段协调。
