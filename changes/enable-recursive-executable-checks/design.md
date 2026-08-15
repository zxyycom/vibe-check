# Design

本 Design 在形成时把每个 recursive Check node 规范化为独立 Check execution scope，并以 generic settled-order relation 将父子先后纳入同一静态 Task graph。它当前仅保留为形成时设计记录，已暂停，不能作为实施指令。

## Context

### Authority and Current State

以下四条曾是本 Change 形成时的 `active + unaligned` direction record。它们的 paths 已不存在；保留此表只为了恢复当时的 Plan，不得把它当作当前 authority：

| Concern | Direction owner | 本 Change 的责任 |
| --- | --- | --- |
| Recursive authoring shape | `configuration/use-one-recursive-executable-check-shape` | 实施一种 executable Check shape，移除 Product `CheckGroup` |
| Check scoped cap | `configuration/carry-recursive-check-parallel-limits-through-closure-scopes` | 保留 inheritance、closure scope span、active minimum cap 与 reservation/drain |
| Graph execution | `product-contract/execute-recursive-check-closures-through-one-task-graph` | 实施 settled order、可信 closure、独立 facts 与单一 engine |
| Public names / adjustments | `product-contract/confirm-recursive-check-authoring-and-adjustment-names-before-publication` | 更新 current inventory，保留 helper 责任边界 |

### Current Pause and Handoff Owner

本 Change 保持 active `plan`，但当前暂停：`plan` 只说明形成时 artifacts 的结构成熟，不能授权开始 Implementation。上表的四条 paths 不再拥有当前方向；当前七条 `active + unaligned` direction owners、它们的语义和仍待决定的 handoff 都由[新 Draft 的 Design](../unify-check-values-and-inherited-configuration/design.md)承接。本 Plan 的 `childrenOrder`、`settlesAfter`、closure terminal 和 built-in/custom adjustment 方案与该方向不兼容，因此在取得明确 handoff 前不得实施或勾选其未完成任务。

当前代码和稳定 docs 仍是已对齐旧基线的实现事实：

- `CheckNode = CheckGroup | BuiltInCheck | CustomCheck`；parser 只要看到 `checks` 就按 group 解析。
- group 的 `dependsOn`、`mutex` 与 `maxParallel` 被继承后 flatten 到 leaves；group identity 只用于 dependency expansion。
- 只有 leaves 进入 `NormalizedCheck[]`、Run resolution、Core registration 与 Check execution scopes。
- Generic `TaskNode.dependsOn` 同时表示 readiness 和 failure blocking；graph 没有“等待任意 settlement”的独立关系。
- direct Check 使用一个 root/terminal Task；TaskPlan Check 使用 leaves 与 trusted completion Task。TaskPlan group 只是单个 Check 内部的 private planning shape。

以下章节保留本 Change 的形成时 future direction，不把归档的 `converge-task-engine-and-check-core` Change 重新打开，也不把它的形成时文本当作当前计划 owner。暂停期间不得依据这些章节推进实现；恢复条件见文末。

### Stable Terms

| Term | Meaning in this Change |
| --- | --- |
| Recursive Check node | 一个 built-in 或 custom Check；拥有稳定 `checkId`、自身 execution binding，并可选包含同形 `checks` |
| Parent / descendant | 只表示 Project Definition containment；每个节点仍是独立 Check，不形成 aggregate entity |
| Availability dependency | 显式 `dependsOn`；target unavailable 会阻断 consumer work |
| Settled order | Generic graph relation；只等待 target 进入任一 terminal settlement，不传播其 outcome |
| Native execution terminal | direct work Task 或 TaskPlan completion；表示该 Check 自身 executable work 已停止，但 dependency-blocked 路径不保证 Core 已关闭 |
| Check closure terminal | 每个 applicable Check scope 的 private trusted finalizer；在 outcome 与 RecordSink 关闭后 settlement，并作为 Check-level relation target |
| Check execution scope | Product adapter 投影的一组 private Tasks、cap、RecordSink ownership、activation work 与 closure terminal |
| TaskPlan | 单个 custom Check 内部的静态 private Task composition；不是 nested Check tree |

### Target Data Flow

```text
recursive built-in/custom Check nodes
  -> closed validation + deterministic normalization
       -> every node becomes one Normalized Check
       -> inherited dependsOn / mutex / maxParallel
       -> derived settled-order Check relations
       -> trusted custom function slots remain private
  -> one Package Run resolution pass
       -> every node becomes one Resolved Check
       -> not-applicable closes without executable scope
       -> applicable direct / TaskPlan layout
  -> one frozen Task graph
       -> dependsOn: completion + availability blocking
       -> settled order: any terminal settlement, no outcome propagation
       -> one generic scope and private closure terminal per applicable Check
  -> independent Core Checks + QualityRecords
  -> policy / machine v3 / effects / Run result
```

## Goals / Non-Goals

### Goals

- 用一种 recursive executable Check authoring shape 取代 Product Group/leaf union。
- 让每个 parent、child 与 leaf Check 独立 resolution、execution、Record submission 与 settlement。
- 让父子 `parallel`、`self-first`、`children-first` 在 work 前确定性进入 static graph。
- 在 generic engine 中区分 availability dependency 与 pure settled order。
- 让 Check-level order 与 dependency 都以已关闭 outcome/RecordSink 的可信 terminal 为边界。
- 保持现有 Core entity set、TaskPlan boundary、scoped cap、cancellation 和 machine v3 contract。
- 对 Product public names、docs、Cases 和 downstream package Plan 做同一 hard cut。

### Non-Goals

- 不公开 generic Task graph、settled-order relation、scope 或 scheduler state。
- 不让 Check 与一个 scheduler Task 强制一一对应；一个 Check scope仍可包含 direct Task 或完整 TaskPlan。
- 不给 parent 计算 aggregate verdict，也不把 descendant Records 复制到 parent。
- 不发布 parent ID、tree path、scope、barrier 或 Task identity。
- 不重构 TaskPlan authoring、scripts-only Check groups、scanner internal concurrency 或 package runtime。
- 不支持 dynamic graph、runtime child registration、retry/priority 新协议或第二 scheduler。

## Decisions

### 1. One Recursive Check Shape

目标 authoring contract 在 built-in 与 custom variants 上共享：

```ts
type CheckChildrenOrder = "parallel" | "self-first" | "children-first";

interface CheckComposition {
  readonly checks?: readonly CheckNode[];
  readonly childrenOrder?: CheckChildrenOrder;
}

type CheckNode = (BuiltInCheck | CustomCheck) & CheckComposition;
```

这是语义示意，不要求用 intersection 或上述 private interface 实现。最终 source 应选择符合项目编码规范、避免循环 type ownership 的最小结构。

Validation rules：

1. 每个 node 必须是 closed built-in 或 custom Check，并拥有自身 execution identity/binding。
2. `checks` 缺失表示 leaf；存在时必须是非空 closed CheckNode array。
3. `childrenOrder` 只允许在存在非空 `checks` 时出现；缺省为 `parallel`。
4. 全树 `checkId` 唯一；custom Check 不能覆盖 built-in identity。
5. 旧 `{ id, checks }` group-only shape、group-only ID reference 和 mixed group/Check fields fail closed。
6. Array order 与 sibling position 永远不创建 dependency 或 settled-order edge。

每个 node 都进入 canonical collection。Normalization 不保存一个 parallel tree runtime；它只保留下游共同需要的 Check definition、options、effective scheduling 与 derived relation facts。

### 2. Inheritance and Check-Level Relations

递归 normalization 保留已确认的 scheduling context：

- `dependsOn`：ancestor 与 node declarations 按 root-to-node 追加、去重；每个 reference 必须是全树真实 `checkId`。
- `mutex`：ancestor 与 node declarations按 root-to-node 追加、去重。
- `maxParallel`：nearest explicit node value wins；整条 path 缺失时使用 root scheduler limit。
- `childrenOrder`：node-local，不向 descendants 继承。

Normalization 另外形成 scheduler-private Check-level `settlesAfter` identities：

- `parallel`：不添加父子 relation。
- `self-first`：每个 descendant Check settles after parent Check。
- `children-first`：parent Check settles after每个 descendant Check。

这里的 `settles after` 只用于 execution ordering，不能与 `dependsOn` 合并。Normalization 在 work 前对 availability 与 settled-order edges 的并集执行 unknown/self/cycle validation；同一 target 的重复 relation 只保留一次。

Declarative fingerprint 使用 canonical sorted Check projections，并显式包含 effective scheduling 与 derived settled-order identities。语义等价的 tree composition 产生相同 projection；会改变执行的 identity、options、dependency、mutex、cap 或 order 必须改变 projection。

### 3. Generic Task Graph Adds Settled Order

Generic graph 增加一个独立关系；实现名称目标为 `settlesAfter`，但它保持 repository-internal，不进入 npm API 或 machine contract。

每个 planned Task 的 readiness 同时检查：

| Relation | Ready condition | Failure propagation |
| --- | --- | --- |
| `dependsOn` | 所有 targets settlement 为 `completed` | target failed/blocked/`cancelled-before-start` 使 consumer blocked |
| `settlesAfter` | 所有 targets 已有任一 terminal settlement | 不传播；target 的 terminal kind 不改变 consumer availability |

Graph validation：

- 两类 relation 都要求 known unique Task IDs，并禁止 self reference。
- Cycle detection 使用两类 directed edges 的并集，因为任一组合 cycle 都无法 admission。
- Scope terminal reachability 使用两类 directed edges 的并集证明 terminal 不早于全部 scoped Tasks；只有 `dependsOn` 传播 availability。Product TaskPlan native completion 仍用 `dependsOn` 保持 leaf success contract，只有 adapter-owned closure terminal 使用 pure settled order承担 trusted finalization。
- Admission 要求全部 `dependsOn` targets completed 且全部 `settlesAfter` targets 已 terminal。非 Abort 的 blocked sweep 同样必须先等两类 targets 全部 terminal，才因非 completed 的 `dependsOn` 将 consumer 标为 blocked；blocked reason 不包含 `settlesAfter` target。这样 failed dependency 不能让 consumer、其 native terminal 或 closure 越过仍在运行的 pure-order target。
- `cancelled-before-start` target 从 relation 自身看已经满足 settled order且不追加 blocked；但 invocation Abort 被观察后停止新 admission，closure 与 consumer 若仍 pending 都成为 `cancelled-before-start`，不能因 order 已满足而运行。

该能力属于通用 Task engine，而不是 Check adapter 私下 `await` 的第二条执行路径。Scripts adapter 可以不使用新 relation；本 Change 不修改其 authoring contract。

### 4. Product Adapter Projects Trusted Check Closure and Order

Run pre-work 先形成全部 Resolved Checks，再构造一张 graph。每个 applicable Check layout 同时保留 native execution terminal 与私有 `closureTaskId`；not-applicable Check 没有 scope或 closure，它已通过 graph 外可信路径关闭。

`closureTaskId` 属于对应 Check scope，以 `settlesAfter` 等待 native execution terminal，并成为 scope terminal、所有显式 Check `dependsOn` 的 target 与所有 parent/child settled-order target。它不执行 project user work：

- direct 或 successful TaskPlan 已关闭 Core 时，closure 只镜像现有 availability；
- TaskPlan leaf failure、local blocking 或 external dependency blocking 使 native terminal blocked 时，closure 依既有 mapping 单次关闭仍 open 的 Core scope；
- closure 在 Check available（包括 `completed(failed)`）时 completed，在 Check unavailable 时抛既有 contained unavailable signal；
- 因此 closure settlement 必然晚于该 Check outcome 与 RecordSink 的可信关闭。非取消路径不再依赖 graph 返回后的 blocked-terminal sweep；取消 finalizer 只处理因 Abort 未获 admission 的 closure 与其余未关闭 facts。

Projection rules：

- direct Check：executable Task 是唯一 user-work entry 与 native terminal；closure 是 scope terminal。
- 非空 TaskPlan Check：全部 leaves 都是可能最先执行的 entry，并且必须承接 external Check-level `dependsOn` / `settlesAfter`；native completion 继续通过 `dependsOn` 覆盖全部 leaves，closure 再等待 native completion 的任一 settlement。
- zero-leaf TaskPlan：native completion 是唯一 user-work entry 与 native terminal，必须承接 external relations；closure 仍是 scope terminal。
- `self-first`：每个 applicable descendant Check 的全部 entry work `settlesAfter` applicable parent closure；parent not-applicable 时不生成 edge。
- `children-first`：parent 的全部 entry work `settlesAfter` 每个 applicable descendant closure；not-applicable descendants 不生成 edge。
- `parallel`：parent 与 descendants之间没有 implicit edge。

显式 Check `dependsOn` 连接 prerequisite closure，并投影到 consumer 的全部 entry work。若 prerequisite 本身使用 `children-first`，它的 closure 自然晚于 subtree；这只是 order 的传递结果，不表示 dependent 自动依赖每个 child availability。只有显式依赖具体 child 才传播该 child unavailable。

父子 order 与显式 dependency 可以交叉；任何 resulting cycle 在 Definition normalization 与 generic graph validation 两个边界都 fail closed。

### 5. Independent Check / Record Facts

每个 recursive node 在 Core session 中注册一次：

- not-applicable 通过 trusted non-execution path 关闭；
- applicable scope 获得绑定自身 `checkId` / record types 的 RecordSink；
- direct wrapper、TaskPlan completion或 closure terminal 只关闭自身 Check且受 single-use capability 约束；
- parent 与 child outcome互不聚合，Records 不跨 scope 复制；
- quality `completed(failed)` 仍是 available completion；contained unavailable 只通过显式 `dependsOn` 阻断 consumer。

Core 可以在各项 fact 形成时内部流式交付，不必等整张 graph；closure 只划定本 Check 不再接受 Records并已有 terminal outcome 的边界。父子 order 不承诺 partial machine files；machine v3 仍只从 terminal validated snapshot 发布 `{ checks, records }` 的 canonical projection。

Policy catalog 将每个 parent 与 child 作为独立 Check operand，不从 containment 推导 subtree operand。Machine v3 同时包含各自 Checks 与 producing Records，但不发布 hierarchy、aggregate outcome、scope 或 closure identity。

### 6. Scoped Cap Remains Per Check

Ancestor `maxParallel` 成为每个 descendant Check 的 effective cap。每个 applicable Check scope 只包含自身 direct/TaskPlan/closure Tasks，并按自身首个 admitted user-work Task 到 closure settlement形成 active span。

- Parent scope不包含 descendant Tasks，也不因 `children-first` 等待期或仅运行未激活 scope 的 closure 而提前 active。
- 一个 Task 不同时属于多个 Check scopes。
- Scheduler 的 effective capacity 仍取 root limit 与所有 active scopes cap 的最小值。
- reservation/drain、non-preemption 与 constrained continuation priority 保持不变。

因此无需 nested scheduler、multi-scope Task 或 keyed cap side map。

### 7. Built-in Adjustment Boundary

`checks` 与 `childrenOrder` 是普通 Check composition fields。项目可以用 typed plain data 组合 built-in parent，例如先从 exported built-in value 建立包含 children 的 `CheckNode`。

`replace` / `append` 保持现有精确职责：

- patch 不接受 `checks` 或 `childrenOrder`；
- `replace` 只替换 owner 允许的 options/scheduling fields；
- `append` 只追加 owner 允许的 scheduling collections；
- 若输入 BuiltInCheck 已带 composition fields，返回值原样保留它们及其类型关系；
- helper success 不替代完整 recursive Project Definition validation。

这避免新增 `withChildren`、builder、registry 或 arbitrary custom editor，同时不会让 options 调整意外丢失子树。

### 8. Hard Cut and Owner Migration

本产品尚未发布稳定 package contract，因此实施使用单版本 hard cut：

- 删除 Product `CheckGroup` type、parser branch、group descendant maps 与 group reference expansion。
- 更新 `CheckNode`、BuiltInCheck/CustomCheck composition、current public-contract inventory、examples 与 docs。
- 删除或重写只证明 authoring-only group flattening 的测试；通过 `test-evidence-review` 保留其真实证明目的并迁移到 recursive node、inheritance 与 order Cases。
- 将 `scripts/quality/project-definition.ts` 的 `repository-quality` group flatten 为三个真实 top-level built-in Checks，把原 effective `maxParallel: 2` 明确带到 former children，并保留 `fileMetrics` 更近的 `maxParallel: 1`；不得创建没有 execution binding 的同名假 parent。
- Machine v3 schema无需增加 hierarchy field；只在 fixtures 实际改变时再生相应 current examples。
- `scripts/vibe-check-workspace/**` 的独立 group authoring保持不变，除非另有明确任务。
- `establish-api-only-npm-product-boundary` 在进入 Implementation 前更新 mixed tree、group/leaf cap 与 public `CheckGroup` assumptions；本 Change 只交付 re-plan handoff，不实现 package。

### 9. Engineering Evidence

| Area | Required evidence |
| --- | --- |
| Definition | recursive valid/invalid shapes、built-in/custom parents、global IDs、inheritance、all order values、combined cycles、fingerprint |
| Generic engine | `dependsOn` versus `settlesAfter` readiness、failed/blocked/`cancelled-before-start` targets、combined cycles、closure reachability、mutex/cap/admission/cancellation |
| Run adapter | direct/TaskPlan/zero-leaf entry projection、closure mirror/finalization、not-applicable edge omission、parent/descendant order、explicit unavailable blocking |
| Core | one Check per node、independent outcomes/Records、failed TaskPlan partial Record closure、exact-once settlement、cancellation closure |
| Policy / output | parent/child independent catalog operands；v3 contains each Check/Record without implicit subtree、hierarchy或aggregate fields |
| Public authoring | no `CheckGroup` export、recursive inference、adjustment preservation、closed current-contract inventory |
| Stable owners | Architecture、Configuration、Quality Metrics、Output/Core contract review、Testing/Cases、repository dogfood 与 downstream Plan 同步 |

## Risks / Trade-offs

- **新的 generic relation。** `settlesAfter` 扩大 Task graph contract，但它表达普遍的“先后不等于成功依赖”，比在 Check adapter 复制 scheduler 更小且更可复用。
- **每 Check 一个 closure Task。** 它增加静态 Task 数，但统一关闭 direct、TaskPlan failure 与 dependency-blocked 路径，并让 dependency/order 共用可信 target；它是 adapter-owned finalizer，不引入 public barrier entity、第二 queue 或第二 scheduler。
- **组合 edge 数量。** parent order 展开到整个 descendant set 可能增加静态 edges；graph 在执行前冻结，首版优先采用简单可审计展开，不再预建 subtree barrier abstraction。
- **Inheritance 与 executable parent。** Parent scheduling 同时作用自身和 descendants；这是对旧 group inheritance 的连续保留，但 `mutex` 可能让声明了同名 resource 的 parent/subtree 串行，属于显式配置结果。
- **Order 与 dependency 混合。** 两类 edge 可以形成 cross-kind cycle；必须在 Check-level 与 Task-level均 fail closed，不能靠 scheduler blocked 状态掩盖。
- **Not-applicable 与 cancellation。** Not-applicable 没有 executable order target，视为已满足；Abort 则停止新 admission，不能因 pure order 已满足而继续启动工作。
- **Public hard cut。** 删除 `CheckGroup` 会使当前示例与 downstream package Plan 失效；prestable hard cut 避免维护双类型，但要求同一 Change 完整同步 owner 与 acceptance。

## Open Questions

形成时设计已把当时的 `childrenOrder`、settled order、closure terminal 与 built-in adjustment 边界视为闭合。当前暂停只保留以下交接问题：

1. 在取得明确授权后，旧 Plan 应重写、拆分、转移无冲突工作，还是以其他受授权方式处置？本 Change 不自行选择最终处置。
2. 哪些形成时范围、任务和验证在阅读[新 Draft](../unify-check-values-and-inherited-configuration/design.md)、七条当前决策和当前实现后仍有独立价值，并应由哪个 Change 拥有？

公开 API spelling、single-Check derivation surface、集合 canonicalization 与当前迁移验收不在本暂停 Plan 内重新决定；它们由新 Draft 的 Open Questions 和 authority owners 承接。

## Implementation Observations

- `.change-plan.json` 保持 `stage: plan`；当前 3 个已勾选 Readiness 项是形成时证据，所有 Implementation 与 Verification 项仍未勾选。
- 形成时 authority paths 已不存在，且其方向与当前七条决策不兼容。这个事实暂停本 Plan，但不等于它已经归档、完成或没有可复用内容。
- 本次暂停记录没有修改源代码、测试、稳定 owner 或任务完成状态；它只建立恢复前必须重新审阅的边界。

## Resume Conditions

1. 获得对旧 Change handoff 与最终处置的明确授权，且不把它误解为归档授权。
2. 读取新 Draft、其中七条 direction owners、相邻当前代码与测试，重新判断形成时设计的有效部分和冲突部分。
3. 按该判断更新本 Change 或把经授权的范围交给另一个 Change；完成相应 Readiness，保持 tasks 的实际状态，并运行 Change Plan 的 `plan` 命令刷新基线。
4. 只有另有当前任务授权 Implementation，才开始任何实现或验证任务。
