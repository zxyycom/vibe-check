# Proposal

本 Plan 将 standalone simulation 和 live custom lookahead 交付为一个 public immutable `AdmissionGraph` / `AdmissionState` 协议；它共享 real Scheduler 的 private compiled reducer/effects，不执行或改写真实 Run。

## Why

当前 `AdmissionPolicyContext` 只有当轮选择所需的局部 snapshot。调用方不能从同一 Scheduler-owned surface 列出所有 pending 和 primary blocker、验证单项 Task、从相同 predecessor 推演不同 select/settle branch，或从静态图离线探索。自行重建 relation、mutex、capacity、scope 和 forced-block 规则会制造第二套调度语义；另建 simulator 也会漂移。

公共 capability 又不能暴露 mutable Scheduler 或让 hypothetical state 成为 reservation/Task control。real shell 必须继续拥有 Task/Promise、signal、diagnostics、measurement、actual result/error、policy fault 和 hard revalidation。该边界以及 successor representation 会进入长期兼容/性能空间，因此需要一个可实施的跨 owner Plan。

## Outcome

实现完成后，package consumer 可以通过 `createAdmissionGraph({ graph, maxParallel })` 获得一个 immutable initial `AdmissionState`，custom admission callback 可以从 `AdmissionPolicyContext.admissionState` 获得同一种 current-boundary state。调用方以 frozen inspection/catalog/read-only validation 和 `select` / binary `settle` 获得 hypothetical successor；保留 predecessor 即形成分支，不能写回或控制真实 Scheduler。

real shell 和 public handle 共享一次 static compile、immutable dynamic node、pure reducer 与 canonical effects；shell 仍执行 effects 和 callback-return hard guards。exact DTO/rejection/order/trace semantics、two consumer evidence、representation benchmark 和 implementation/verification tasks 都已在本 Plan 固化。

## Scope

### Intended Change

- 在 `src/project-run/task-scheduler/**` 提取 private compiled admission graph、immutable dynamic node、pure reducer、canonical effects、real-shell effect application和 trace harness，作为唯一 legality/transition owner。
- 新增 public `AdmissionGraphInput`、`AdmissionGraph`、opaque `AdmissionState`、inspection/catalog/reason/result DTO、`createAdmissionGraph`，并将同型 state 增加到 `AdmissionPolicyContext`；不增加 Definition configuration 或 fingerprint input。
- 限定 v1 public actions 为 hypothetical `select(taskId)` 与 `settle(taskId, "satisfied" | "unsatisfied")`；`wait`/`complete` 是 inspection boundary，不是 caller actions；cancel/effects/executor/state storage 保持 private。
- 同步 public declarations/export/JSDoc、current owner docs/examples/package projection、installed-consumer evidence、scheduler tests/Test Evidence 与 reproducible performance evidence。

### Resulting Impacts

- 现有 imperative scheduler decision/inspection/mutation 需要收敛，确保 public state 与 real execution 不复制 relation/mutex/capacity/scope/forced-block logic；real shell 的 Task/Promise/signal/diagnostic/measurement/RunResult responsibility 不变。
- callback context 新增 additive public field，要求 exact DTO validation、deep frozen/opaque behavior、hard revalidation、simple/prepared compatibility和 installed package contract evidence。
- binary public settlement需要明确与 current `completed` / `prerequisite-unsatisfied` / `failed` / forced `blocked` / private cancellation lifecycle 的映射，且 trace oracle 覆盖它们而不扩大 public action surface。
- representation changes public branching cost but not public storage. Parent+delta is selected by current evidence; benchmark remains executable and no cross-host timing number becomes a required gate。
- 本 Change 与 fail-fast/named-capacity/runtime owner 是串行交接关系：若它们先改变 current Scheduler facts，实施者需按本 Plan 重新基线、更新 contract/trace/benchmark，而非隐式叠加。

## Success Criteria

- [ ] standalone factory 与 context-bound state have exactly one public type/DTO/action contract; every returned public object is frozen/opaque and accepted successor does not mutate predecessor.
- [ ] catalog partitions all pending Tasks in canonical order; arbitrary-ID validation has its dedicated closed rejection union and the same precedence/rejection as `select`; next boundary, scope lifecycle and binary settlement mapping match this Plan.
- [ ] public transitions and real shell are shown by the shared trace oracle to have the same legality, effects and state projection across relation, mutex, root/scope capacity, forced block, wait/complete and private cancellation paths.
- [ ] standalone branching and live custom lookahead are proven by direct current tests/installed consumer evidence; a callback lookahead cannot reserve/start/settle a real Task and its returned proposal remains hard-revalidated.
- [ ] static/custom/learned real runs that do not read `admissionState` do not construct public catalog/search state; implementation benchmarks preserve the recorded matrix and justify any private representation deviation.
- [ ] public exports, type/docs/examples, test evidence, validation and required workspace assurance are current; the unaligned Decision is marked aligned only after that complete direction is verified.

## Affected Owners

- `src/project-run/task-scheduler/**` and Scheduler behavior/tests: compiled graph, reducer, effects, shell, trace and performance.
- `src/project-definition/scheduler-policy.ts`, `src/project-definition/project-definition.ts`, `src/index.ts`: public API, exact context/type/export boundary.
- `docs/architecture.md`, `docs/configuration.md`, `docs/api-mechanics.md`, package API projection/examples and installed consumer acceptance: stable public semantics and non-control boundary.
- `docs/testing.md`, `docs/testing/cases/**`, `test-evidence-review`: current test entities and semantic cases once tests change.
- `docs/decisions/provide-immutable-admission-graph-state.md`: future long-term direction, currently active + unaligned.
- `changes/provide-admission-strategy-simulation/readiness/**`: reproducible readiness/implementation benchmark and consumer evidence; not a Product runtime owner.
