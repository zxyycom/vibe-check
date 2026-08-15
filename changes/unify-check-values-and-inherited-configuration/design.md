# Design

本 Draft 以单一递归 `Check` value、同一可信 binding handoff 和闭合集合配置表达式兑现 Proposal，同时明确它不引入 containment order、closure 或 Task engine 改造。

## Context

### Authority and current state

以下相关的 `active + unaligned` 决策记录拥有本 Draft 的长期方向；本 Draft 只把它们组织为后续实现的临时交接上下文，不替代这些 owner：

| Concern | Direction owner |
| --- | --- |
| 单一递归 Check shape 与共同 binding handoff | [`configuration/use-one-check-shape-with-recursive-composition`](../../docs/decisions/configuration/use-one-check-shape-with-recursive-composition.md) |
| set-like 公共字段的闭合集合表达式 | [`configuration/use-closed-inheritable-check-collection-expressions`](../../docs/decisions/configuration/use-closed-inheritable-check-collection-expressions.md) |
| 所有 Check 的字段 owner 派生与 binding preservation | [`configuration/use-check-value-derivation-contract`](../../docs/decisions/configuration/use-check-value-derivation-contract.md) |
| `maxParallel` 的 Task scope 投影 | [`configuration/carry-recursive-check-parallel-limits-through-task-scopes`](../../docs/decisions/configuration/carry-recursive-check-parallel-limits-through-task-scopes.md) |
| 单一静态 Task graph 中的递归 Check 执行 | [`product-contract/execute-recursive-checks-through-one-task-graph`](../../docs/decisions/product-contract/execute-recursive-checks-through-one-task-graph.md) |
| `checks` base-value composition 与 authoring publication names | [`product-contract/confirm-single-check-authoring-and-derivation-names-before-publication`](../../docs/decisions/product-contract/confirm-single-check-authoring-and-derivation-names-before-publication.md) |
| 单一 public Check surface、provider values 与唯一执行入口 | [`product-contract/expose-single-check-authoring-surface`](../../docs/decisions/product-contract/expose-single-check-authoring-surface.md) |

当前 Product 实现仍使用 `CheckGroup | BuiltInCheck | CustomCheck` 的 authoring 基线，group 会在 normalization 时 flatten，只有 leaf Check 获得 execution scope。当前 `dependsOn` 与 `mutex` 采用 root-to-leaf append/deduplicate，`maxParallel` 采用 nearest explicit value。这些是待迁移的当前事实，而不是本 Draft 已经完成的结果。

`/workspace/vibe-check/changes/enable-recursive-executable-checks/` 仍是 active Change，且未被归档或删除。本轮只在其 artifacts 记录暂停与 handoff gate，不重写形成时设计或既有任务完成状态。它的已写设计包含 `childrenOrder`、generic `settlesAfter` 和 per-Check closure terminal；这些与本 Draft 的方向不兼容，不能作为新实现的既成基线。新 Draft 在进入 Plan 前必须完成明确 handoff。

本 Draft 是当前 handoff owner：它集中保存当前方向、未决 public naming 与旧 Change 的交接条件；旧 Plan 只保留形成时设计。Draft 本身不授权 implementation，也不预先决定旧 Change 应重写、拆分、转移还是归档。

### Stable terms

| Term | Meaning in this Draft |
| --- | --- |
| Check | 唯一 public authoring shape。每个出现的节点都有全树唯一且稳定的 `checkId`、通过同一 trusted construction/binding contract 获得并保留的 private binding，以及可选的同形 `checks`。 |
| Preprovided Check | Product 预先准备的普通 Check value；它不是另一种 public type 或另一条 runtime binding lookup 路径。 |
| Project-created Check | 项目提供的普通 Check value；它与 Preprovided Check 一样进入同一 trusted handoff。 |
| Effective configuration | normalization 根据本节点与 ancestor 的合法声明得到的最终字段值；不是运行期 deep merge。 |
| Base-value derivation | 从一个明确 Check value 创建新的、脱离 base 的 Check value 的 authoring 操作；它保留 base 的 `checkId` 与 trusted binding，不编辑 containment parent、tree path 或 registry。 |
| Containment | `checks` 描述的递归选择与 source-level composition。它不表示执行顺序、等待、聚合或额外 Task scope。 |

## Goals / Non-Goals

### Goals

- 让 preprovided 与 project-created Check 使用一种 `Check` authoring shape、相同的 validation、normalization、resolution 和 trusted construction/binding handoff。
- 让任何出现的 Check 节点（顶层、父级、中间级或叶级）各自形成一个 Normalized Check、一个 Resolved Check、一个 Core Check，以及自身的 outcome 与 Records。
- 让 `dependsOn`、`mutex` 的继承、替换和 base-relative add/remove 不依赖数组位置、隐式 append 或 generic deep merge。
- 保持 `maxParallel` 的 nearest-explicit 继承和现有 Task scope 模型。
- 让任意来源的 Check 都以同一非突变、字段 owner 派生契约派生新 value；派生保留 base 的 stable `checkId` 与 trusted binding。
- 让 `checks` 只通过显式 base-value derivation 编辑，不向 containment child 继承。
- 保持 machine/output 的 canonical surface 为独立 Checks、Records 和必要运行元数据；不从 containment 发布 hierarchy 或 aggregate convenience view。

### Non-Goals

- 不创建 `childrenOrder`、`settlesAfter`、closure terminal、barrier、第二 queue、nested scheduler，或对 generic Task engine、blocked sweep、cancellation taxonomy 作此 Change 专属改造。
- 不让 containment 隐式创建 Task dependency、wait、aggregate verdict、Record 复制、parent scope 或 multi-scope Task。
- 不跨不同 Check 继承或 merge options，也不建立 generic options editor。
- 不为 `checks` 提供 containment-parent patch、mutable registry/tree editor、runtime dynamic child registration 或兼容旧 group shape。
- 不在 Draft 阶段创建 `tasks.md`、开始产品实现、归档旧 Change，或锁定 helper/export 的最终 public spelling。

## Decisions

### 1. One Check value and one trusted binding handoff

本 Draft 遵循单一 `Check` public contract。preprovided Check 与 project-created Check 都是同一种 value：两者都可作为 Project Definition 顶层元素、递归 composition 的 base，以及普通调整的输入。

每个 Check 使用同一 trusted private construction/binding **contract** 进入 closed-shape validation、normalization 与 invocation resolution。construction 为该 value 提供的 private binding 会被 base-value derivation 保留；implementation 和 options 可因具体 Check 而不同，direct/TaskPlan 也仍是单个 Check 的 private execution layout。Run 不得根据 origin、`kind`、`checkId`、public value identity、parent/leaf 角色或树路径 lookup 或重取 binding。Normalized 与 Resolved 是内部 lifecycle 阶段，不是第二种 public authoring variant。

每个出现的节点必须持有全树唯一、稳定的 `checkId`。identity、execution source 和 trusted binding 都是该节点自身的属性，不能从 ancestor 继承或由 options merge 产生。

### 2. Recursive composition executes every node

`checks` 可选且出现时必须是 non-empty、closed 的同形 Check collection。materialized/normalized Check 的 `checks` 因此要么缺失、要么 non-empty；不能保留空 array。每个节点都表示选择该 Check，并各自独立形成 outcome 与 QualityRecords；父、子不会聚合 outcome，也不会跨 scope 复制 Records。

containment 只提供 recursive selection、有效配置上下文与 source-level composition。它不隐含 sibling array order、父子先后、Task edge、wait、barrier、closure、scope ownership 或 output hierarchy。各节点的实际 admission 只继续受显式 `dependsOn`、`mutex`、effective `maxParallel`、root capacity 和既有 invocation cancellation 语义约束。

normalization 必须在任何 work 前验证 closed shape、non-empty `checks`、全树 identity、显式 reference 与 effective configuration。它为每个节点形成 canonical Normalized Check；Run 再通过共同 handoff 形成 Resolved Check，并在一张既有静态 Task graph 中执行。

### 3. Field ownership and inheritance grammar

继承按 field owner 区分，不能用 generic object merge：

| Field family | Authoring rule | Effective-value rule |
| --- | --- | --- |
| `dependsOn`、`mutex` | 缺失、普通 readonly array，或 closed base-relative add/remove expression | 缺失继承 parent effective collection；array 精确替换（`[]` 明确清空）；expression 以 parent effective collection 为基准增删。 |
| `maxParallel` | 缺失或合法 explicit scalar | nearest explicit ancestor/self wins；整条 path 缺失时使用 root scheduler limit。 |
| options | 由其 implementation/options owner 的 typed contract 定义 | 不跨不同 Check 继承、merge 或由 generic expression 编辑。 |
| `checks` | 只由声明它的 Check 拥有；普通 child array 或 base-relative child edit | 不向 containment child 继承；只从明确 base Check value 派生编辑。plain array 精确替换，`[]` 明确清除；无论 empty collection 来自 replacement 还是 edit 的最终结果，都 materialize 为缺失的 `checks`。 |
| `checkId`、execution source、trusted binding | 由同一 construction contract 建立；field derivation 保留 base 的 `checkId` 与 trusted binding | 不跨 containment 继承，不由 collection expression、options merge 或 Run lookup 修改。 |

set-like expression 的语义为：属性省略表示继承；普通 array 表示完整 replacement；closed add/remove object 表示相对 parent effective collection 的编辑。add/remove 通过该 field 的 stable identity 解释；remove 一个不存在于 parent collection 的 identity 是 no-op；同一 expression 对同一 identity 同时 add 与 remove 必须 fail closed。normalization 在 work 前 canonicalize、deduplicate 并执行 field-specific reference validation。未知 object key、任意嵌套 object、数组位置 identity、把空 array 当作缺失，或隐式 deep merge 都不合法。

### 4. `checks` uses explicit base-value derivation

`checks` 不是 inherited scheduling field。任一来源的 Check 都可作为明确 base value 派生新 Check；派生是非突变的，保留 base 的 stable `checkId` 和 trusted binding，不会修改 base、containment parent、tree path 或 registry，也不会在运行期保留 base link。若 author 需要新 identity，必须先通过同一 construction contract 创建新的 Check，再把它作为 base。

未编辑的字段保留 base 的值。普通 readonly child array 精确替换 `checks`；`[]` 明确清除 `checks`，派生结果 materialize 为 `checks` 缺失而不是空 array。base-relative child edit 可以 add、remove 或同时 add/remove child Check。remove 以 child `checkId` 定位，缺失 target 是 no-op，同一 edit 同时 add/remove 相同 `checkId` 必须 fail closed。无论 empty child collection 来自 plain replacement 还是 base-relative edit 的最终结果，派生结果都 materialize 为 `checks` 缺失；最终 Project tree 中的 duplicate `checkId` 也必须 fail closed。

该设计只固定派生语义，不假定最终 helper function、参数 object、export 位置，或它是否与其它字段调整 API 共用名称。现有 adjustment helper 的最终兼容/迁移边界须由 publication decision 和 Plan 一起确认。

### 5. Task scopes and output stay flat

每个 applicable Resolved Check 继续把自己的 effective `maxParallel` 投影到现有单一 Task engine 的一个 Task scope：direct Check 使用已有 direct Task，TaskPlan Check 使用已有 leaves 与 trusted completion Task。scope 只包含该 Check 自己的 Tasks；parent 不拥有 descendant Tasks，任何 Task 不属于多个 Check scope。没有 executable work 的 Check 继续走既有可信非执行关闭路径。

Core 和 machine/output contract 继续以各 Check 和 producing Records 为事实边界。事实可以按既有运行时能力流式形成；本 Change 不要求等待树完成后才可观察，也不新增 containment-derived output。最终落盘只保留 canonical Checks、Records 和必要运行元数据。

### 6. Required handoff from the older active Change

在本 Draft 进入 Plan 前，owner 必须明确选择并记录一种 handoff：

1. 旧 Change 将如何暂停、重写、拆分或以其他受授权方式退出与本 Draft 重叠的实施路径；
2. 上述方向决策与旧 Change artifacts 中旧的 `childrenOrder` / `settlesAfter` / closure 表述如何保持一致；
3. 是否由新 Change 承担完整 hard-cut migration，还是先把旧 Change 中仍可复用的无冲突工作独立切分；
4. 哪个 Change 拥有未来 implementation tasks、owner migration 和 acceptance evidence。

本轮不替旧 Change 宣布完成、归档或实施，也不重写其形成时设计或既有 task 状态；旧 tasks 除新增的未勾选 pause/handoff gate 外保持原样。没有这项 handoff，不得把两套互斥的 Task graph/containment 语义同时推进到 implementation；handoff 的选择会先记录在本 Draft，随后才可由受授权 Change 更新自己的 artifacts。

## Risks / Trade-offs

- **Active-Change overlap。** 旧 Change 的 Plan 与新方向在运行顺序和 graph protocol 上直接冲突；若未先 handoff，两个 Change 可能各自通过局部检查却共同产生互相矛盾的 implementation。
- **Public API premature lock-in。** 单一 Check 的语义已确定，但 helper/export spelling 尚未确定。现在硬编码名称或兼容 alias 会把尚未审计的人机 authoring 选择误变成长期契约。
- **Identity reuse during derivation。** 派生明确保留 base 的 `checkId`；若把 base 与派生 value 同时放入同一 Project tree，duplicate identity validation 必须 fail closed。需要不同 identity 的 author 必须先走同一 construction contract，而不是期待 derive 隐式 clone。
- **Closed grammar is intentionally restrictive。** 它避免 deep merge 的误用，但 implementation 必须给出清晰的 closed-shape diagnostics，不能把未知 input 静默忽略。
- **Binding unification is architectural, not cosmetic。** 只把 public type 改名而保留按 origin、`kind` 或 `checkId` 分支的 runtime binding，会违反共同 handoff 的核心约束，并让不同来源获得不同失败与安全边界。
- **No containment order is deliberate。** 依赖默认父子先后或 array order 的现有 authoring 必须显式使用既有 scheduling fields，不能期待本 Change 保留隐藏行为。

## Open Questions

1. **Publication names and exports:** `Check` 的最终公开 construction form、base-value derivation helper 与 `checks` edit 的参数 spelling、callable count、export inventory，以及现有 `replace` / `append` 的兼容或迁移边界分别是什么？已确认的派生/child-edit语义不因名称尚未确定而重新开放。
2. **Canonical collection order:** set-like effective values 的 deterministic output/fingerprint 顺序如何定义，尤其是 add/remove 与 duplicate canonicalization 后？
3. **Old Change handoff (blocks Plan):** 在何种明确授权下，`enable-recursive-executable-checks` 的形成时 Plan 将重写、拆分、转移无冲突工作或以其他方式处置？本 Draft 必须先记录这一选择，才能安全派生 implementation owner、tasks 和验证。
4. **Migration acceptance:** hard cut 影响的 Definition schema、examples、public-contract inventory、fixtures、repository dogfood 与 downstream package Plan 的确切 owner 和验收证据是什么？这些应在 handoff 后从稳定 owner 派生为 tasks。
