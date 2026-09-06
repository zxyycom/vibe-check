# Proposal

本 Change 为 Project Definition 和唯一 Task Scheduler 增加静态 named resource capacity，使资源受限 Check 与不使用该资源的工作仍可在同一 root 并行预算中安全并发。

## Why

当前 `mutex` 只能表达同名资源容量为一，`maxParallel` 只能限制 invocation 或 active Check scope 的总并发。调用方若要让两个 browser worker Check 并发、阻止第三个 browser worker、同时允许一个不使用 browser 的 Check 填充剩余 root slot，现有 primitive 都不能准确表达：mutex 会错误串行所有 browser work，`maxParallel: 2` 会错误阻塞无关工作，而 `maxParallel: 3` 又不能保护 browser capacity。

把容量拆成多个人工 mutex 还会让 claim 依赖资源分片选择，无法原子表达不同权重或同时占用多个资源。这个缺口属于 Product 已有 Definition-to-Task-graph-to-Scheduler admission 路径，不应由 Check callback 自行维护 invocation 外 semaphore，也不应成为 custom policy 的第二套 hard guard。

## Outcome

Definition 可声明有限的静态命名资源容量，Check 可声明在整个 Task 生命周期内持有的静态正整数 claims。Scheduler 仅在所有 claims 与现有 relation、mutex、root/scope parallel guard 同时满足时原子 admission，并在 settlement 一次释放；custom/standalone AdmissionState 可读取同一规范化事实和拒绝原因。默认未声明资源的 Definition 保持现有行为。

## Scope

### Intended Change

- 在 `scheduler.resourceCapacities` 增加 closed `resourceId -> positive safe integer` mapping；在 Check 增加 `resourceClaims`，使用相同 key/value grammar。
- Check 的 `resourceClaims` 省略时继承最近显式 mapping，显式 `{}` 清空，显式非空 mapping 完整替换；不增加 map edit DSL 或隐式 merge。
- 将 capacities 与 claims 纳入规范化 Definition、declarative fingerprint、Task graph、public Scheduler graph snapshot、standalone `AdmissionGraph` 和真实 Scheduler 的共享 immutable admission core。
- 对全部资源 claim 进行原子可用性检查；running Task 持有 units，所有 settlement path 释放 units。资源不足形成 closed public rejection reason，并在 inspection 中暴露 canonical capacity/in-use/available facts。
- `mutex` 继续作为独立的 binary exclusion primitive；named resource shortage 进入现有 capacity blocker/measurement 分类，但不新增 machine output、Check fact 或独立公平状态。

### Resulting Impacts

- Project Definition public types、closed runtime validation、authoring materialization、recursive resolution、declarative snapshot 与 package examples 需要同步。
- generic Task graph validation、compiled indexes、persistent selection counters、public immutable state、custom policy context 和 Scheduler diagnostics 需要使用同一 resource facts。
- Scheduler queue measurement 的 `capacityBlocked*` denominator 必须把 named resource shortage 与 root/scope capacity 一同分类，同时维持 relation 与 mutex precedence。
- 测试 Case 账本需要覆盖 Definition grammar/fingerprint、standalone transition/rejection、real Task lifecycle/atomic multi-resource claim、diagnostic/measurement compatibility。
- 本仓 Project Gate 暂不配置非默认 capacity/claim；只有后续同 workload 证据证明具体 peak-resource 改善且 elapsed 代价可接受时，Gate owner 才采用该能力。

## Success Criteria

- 一个 root `maxParallel: 3`、named capacity `browser: 2` 的可复现测试中，两个 browser tasks 与一个不使用 browser 的 task 可同时运行，第三个 browser task 必须等待任一 claim 释放。
- 多资源/加权 claims 要么全部成功 admission，要么零占用；settlement、failure 与 cancellation drain 后没有泄漏。
- 未声明 named resources 的既有 Definition、Scheduler decisions 与 measurement 语义保持兼容；`mutex` 行为不变。
- 非法 capacity、未知 resource claim、claim 超出 capacity、非法 mapping shape 在任何 Check work 前 fail closed。
- 相关目标测试、TypeScript、lint、Test Evidence、Decision、Change 与默认 Project Gate 验证通过。

## Affected Owners

- `docs/development/project-definition.md`
- `README.md`
- `docs/development/architecture.md`
- `docs/guides/scheduling.md`
- `docs/api-mechanics.md`
- `docs/testing/strategy.md`
- `docs/testing/cases/scan-configuration.md`
- `docs/testing/cases/quality-runtime.md`
- `docs/testing/cases/repository-tooling.md`
- `docs/decisions/enforce-static-named-resource-capacities.md`
- `src/check/**`
- `src/project-definition/**`
- `src/project-run/check-execution/**`
- `src/project-run/task-scheduler/**`
- `src/index.ts`
