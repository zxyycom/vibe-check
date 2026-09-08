# Proposal

建立一个可直接实施的仓库私有准入模拟工作台：它只从 exact installed candidate 的公开入口消费 `AdmissionGraph`，以固定场景、策略和 seed 产生可审计的虚拟比较；实施时新增开发命令，不修改 Gate 入口。

## Why

公开 `AdmissionGraph` 能准确回答某次 `select` 或 `settle` 是否合法，却不产生可比较的工作时长、资源竞争或策略证据。真实 Gate 的 wall time 同时混有 candidate 准备、环境波动与真实执行，不能单独归因于准入选择。

需要一个小而确定的开发期平台，把 Product legality、合成时间/竞争假设、策略可见信息和真实集成证据分开。它应让后续算法 Change 能在相同外生输入上比较少数候选，而不以模拟结果声称真实 Gate 必然加速。

## Outcome

提供 repository-private 的 `bun run admission:simulate` 开发工作流（本 Change 实施时新增）：它对版本化场景、策略、seed 与 replicate 执行有界离散事件模拟，输出 makespan（主指标）、slot·time 与逐 named resource 的 unit·time（次指标）以及可复放 trace。它以公开 `AdmissionGraph` 为唯一 legality authority，虚拟主循环不运行真实 Check；少量 shared-closure Check 的真实集成及少量正式 Gate 最终验证作为分离证据交付；Gate mapping 作为静态 Gate 形状场景输入。

## Scope

### Intended Change

- 在 `scripts/project/admission-workbench/**` 新建仓库私有 owner；该模块通过 `scripts/project/package.json` 中 exact installed `@zxyycom/vibe-check` candidate 的公开入口消费 `createAdmissionGraph` 和公开类型，绝不从 `src/**` 或 Scheduler private core import。
- 实施时在根 `package.json` 新增 `admission:simulate`，其值指向该 owner 的 runner；该命令不是 `scripts/project/gate/run.ts` 的别名、子入口或 Gate preset。
- 用冻结的 scenario/profile/policy/seed 输入驱动虚拟事件循环；每个 `select`/`settle` 必须由 immutable public `AdmissionState` 接受，模拟器只计算合成工作量、推进速度、度量和 trace。
- 固定四类调查经验 profile，另以明标“合成假设”的零/弱/强资源竞争与长尾压力场景检验策略；不要求、也不伪造，真实竞争系数或实际加速证明。

### Resulting Impacts

- 根开发命令、`scripts/project/**` 私有 candidate-consumer 边界、场景/JSON evidence contract、测试 Case 和维护说明需同步；不会扩展 `src/index.ts` 的 Product API、用户文档或 Gate root entry。
- Gate named-resource mapping 只在其资源配置 Change 形成静态、版本化 mapping 后，作为最终 Gate 形状场景输入；它不阻塞基础平台或 profile，且平台不能反向裁定该 mapping；算法的正式比较与最终交接须等待平台和稳定 mapping 输入。
- 平台输出能成为算法 Change 的候选比较输入；算法仍需自行决定采用或不采用，且不得读取模拟真实时长、未来随机数或内部 Scheduler 状态。
- 少量 shared-closure adapter 的真实 lifecycle、虚拟模拟结果和少量正式 Gate 最终验证分别标记来源与时间口径；静态 Gate-shape 输入不冒充真实运行证据，Gate 验证只观察模型偏差而不证明竞争系数。

## Success Criteria

- 可从计划文本实现有限输入、事件边界、seed 派生、错误/trace 输出和指标计算，且可用文中的手算 oracle 复核实现。
- 每次模拟 transition 仅经公开 `AdmissionGraph.select/settle` 接受；虚拟主循环不执行真实 Check，也不重实现 Scheduler legality、取消或 Gate process 行为。
- 同一 scenario version、policy version、seed 与 replicate 产生相同 result/trace；不同策略共享同一 task 外生时长抽样。
- 输出把 makespan 与次指标分开，资源单位不跨 resource 相加，并明确所有调查输入、合成假设和证据来源。
- shared-closure 集成、静态 Gate-shape 场景、少量正式 Gate 偏差观察、目标测试、test-evidence、文档影响审查和全量 check 均有任务与证据边界；模拟结果不作真实性能保证。

## Affected Owners

- `scripts/project/admission-workbench/**`（新增）：runner、场景、策略 adapter、事件循环、JSON evidence 和直接测试。
- 根 `package.json` 与 [Workspace tooling](../../docs/tooling/workspace.md)：拟新增开发命令及 private candidate-consumer 边界。
- [模拟调度分支指南](../../docs/guides/simulating-admission.md) 与 [Scheduler](../../docs/development/scheduler.md)：公开 legality 与真实 runtime 的不交叉边界。
- `scripts/project/gate/definition.ts`、其测试及 [Project Gate](../../docs/tooling/project-gate.md)：仅在最终静态 mapping 场景与少量正式 Gate 验证中被读取，不改变唯一 Gate entry 或新增 selector。
- [测试策略](../../docs/testing/strategy.md)、Case 维护和本 Change 的 `tasks.md`：测试证据、复核和交接。
