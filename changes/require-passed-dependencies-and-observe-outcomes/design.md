# Design

本设计只增加成功前置与终态观测两种固定 relation；状态分支继续由普通 TypeScript 或 Gate 外 orchestration 拥有，Scheduler 不解释领域工作流。

## Context

- 当前 Task Scheduler 只把依赖 Task 的 `completed` settlement 当作 ready；Check callback 正常返回的四态结果都会让对应 Task completed。
- `dependencies.get(...)` 对 upstream `passed` 与 `failed` 返回 final data，对 `not-applicable` 与 `unavailable` 返回受控 read failure；`dependencies.list()` 保留全部四态 direct outcomes。
- current preflight 在任何 execution admission 前按 Definition 顺序经过全局 barrier。blocked preflight 会先形成 unavailable fact，但依赖它的 ready Check 仍可执行。
- generic Task engine 已有 private `blocked` settlement，却只用于 executor failure propagation；Check finalizer 当前把任何 blocked Product Check 视为 invariant failure。
- aligned dependency Decision 以现有 `dependsOn` 同时拥有 wait 与 read authorization；aligned preflight Decision 明确要求 global barrier；aligned inheritance Decision 只允许 `dependsOn` 与 `mutex` 使用 `inherit(...)`。本 Change 必须演进这些长期判断，不能把 Plan 文本冒充已对齐事实。
- 本 Plan 采用一次 public hard cut，不提供旧语义 alias 或双读期；实施必须迁移仓库内与 installed consumer 中的全部现有使用，并由对应长期 Decision确认版本边界。

三种图 relation 的职责固定如下；`maxParallel` 与 `admissionPriority` 仍是调度参数，不形成第四种 relation：

| Relation | Readiness | Direct outcome read | Status routing |
| --- | --- | --- | --- |
| `dependsOn` | 全部 upstream `passed` | 是 | 无 |
| `observes` | 全部 upstream 已结算 | 是 | 由 consumer 的普通 TypeScript 处理 |
| `mutex` | 没有同名运行中 claimant | 否 | 无 |

## Goals / Non-Goals

**Goals**

- 让依赖默认表示成功前置条件，并在 prerequisite 不满足时阻止全部 dependent author work。
- 保留显式 audit/summary consumer 对任意 direct upstream outcome 的只读观察能力。
- 让两类 relation 在 normalization、graph validation、inheritance、readback 和 diagnostics 中使用一个闭合事实源。
- 保持 Scheduler 只解释 readiness、settlement、capacity 与 cancellation，不解释业务状态表达式。

**Non-Goals**

- 不提供按状态选择 Check、`if` 表达式、all/any 状态组合、fallback、retry、rollback 或发布工作流。
- 不授权读取 transitive、ambient 或 undeclared Check，也不提供全局 executed-Check registry。
- 不把 fail-fast、resource weight、aggregation 或 admission priority 合并进 relation contract。
- 不增加第五种 public Check status，也不改写 upstream 已形成的 outcome、Records 或 messages。

## Decisions

### Intended Change

1. `dependsOn` 保留现有 string collection authoring spelling，但语义硬切为 all-passed prerequisite。`observes` 使用同一 `InheritableCheckCollection<string>` grammar，表示只等待 direct upstream结算。
2. normalized executable Check 分别保留稳定、去重的 `dependsOn` 与 `observes` 集合。两者的 union 是 `CheckDependencies.get/list` 的唯一 direct authorization set；`list()` 按 Check ID 稳定排序，不暴露 relation-specific scheduler history。
3. 同一 upstream ID 不得同时出现在一个 Check 的 effective `dependsOn` 与 `observes` 中。两类有向 edge 的 union 共同执行 unknown target、self dependency 和 cycle validation；`mutex` 继续只表达无方向的运行期互斥。
4. 每个 Check Task 在 dependency readiness 成立后依次执行自己的 preflight 和可选 execution。`dependsOn` upstream 必须全部 `passed`；`observes` upstream 只需已有 terminal outcome。preflight、execution、Record reporter 与 console capture 都不能在 readiness 前启动。
5. owning Check 的 preflight block 或 execution `failed` / `not-applicable` / `unavailable` 保留原四态 Core outcome，同时向 Scheduler 暴露“不能满足 success prerequisite”的 package-private settlement signal。generic Task layer不读取 Check data、reason 或 status string。
6. 未满足 `dependsOn` 的 Check 不调用 preflight/execution，由 Product 单次结算为 `unavailable`，reason code 为 `dependency-not-passed`，`checkIds` 只包含稳定排序的 direct non-passed prerequisite IDs；duration 为 `null`，无伪造 author message或 Record。
7. `observes` 不带状态过滤。需要失败报告的 consumer 在 callback 中读取 outcome并使用普通 TypeScript；成功时可自行返回 `not-applicable`。实际 publish/deploy 继续在读取完整 Gate aggregate 后由项目入口执行。
8. invocation cancellation 继续优先停止新 admission并 drain 已启动 Task；dependency blocking 不复用 AbortSignal，也不覆盖已形成的 upstream facts。

### Resulting Impacts

- Check authoring/parser/materialization 需要识别 `observes`，并把它纳入 closed keys、deep freeze、recursive resolution、declarative fingerprint 和 public declarations。
- Task graph需要区分 success prerequisite 与 settlement observation edge，并允许 expected non-success Check settlement阻断 prerequisite descendants而不升级为 task-engine failure；observer descendants仍可 admission。
- global preflight barrier需要移入每项 Task。原有按 Definition 顺序串行执行全部 preflight 的保证将退出；相互独立的 preflight可按现有 Scheduler并行，因此 diagnostics、console attribution、cancellation 和 tests必须改为 task-local lifecycle事实。
- dependency reader 的 direct authorization 改为两类 relation union；`get` 对 passed/failed data 的现有 parser边界和 `list` 的四态 frozen observation保持不变。
- blocked dependent的 Product-owned unavailable需要通过 Core session、progress、duration、aggregation、machine publication与diagnostic timeline完整闭合；不得调用 author callback补造结果。
- 本仓库 process wrapper 可以保留 passed-status defensive assertion，但正确性不能继续依赖每个 consumer手写 guard。
- README 首屏字段表必须直接说明 `dependsOn` 只接受 passed prerequisite，`observes` 接受任意 terminal upstream；API文档分别给 provider consumer与failure observer示例，避免把两个字段描述为同义 order edge。
- 需要新建或演进长期 Decision，以替代 current global preflight、settled dependency readback和仅两种 inheritable collection字段的已对齐判断；实施前不得直接改写既有 Decision语义。

## Risks / Trade-offs

- 这是 pre-stable public breaking change；遗漏一个原本依赖失败数据的 consumer会令其不再执行，因此 repository-wide usage audit是实施前门禁。
- task-local preflight改变独立 Check 的准备顺序和并行性；若某个 preflight依赖 Definition 顺序或ambient side effect，该隐式依赖必须改为显式 relation或移出 preflight。
- non-passed prerequisite会沿 `dependsOn` 链形成 unavailable descendants。每个 reason只列 direct blockers可避免无界重复，但诊断消费者需要沿 snapshot自行追踪更早根因。
- `observes` consumer仍会在成功时启动 callback；为避免状态 DSL，这类少数 Check接受一个快速普通 TypeScript分支，而不是由 Scheduler条件跳过。

## Open Questions

无。用户已确认成功前置与终态观测是唯一两种有向 relation，且不建立按状态路由的工作流 DSL；本 Plan 采用上述硬切和完整 preflight gating。
