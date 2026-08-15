# Proposal

这个 Draft 规定把预先提供和项目创建的检查收敛为同一种可递归组合的 `Check` value，并为公共配置继承与 base-value 派生建立闭合语义；它是当前 handoff owner，尚未成为可实施的 Plan，也不授权开始 Implementation。

## Why

当前 authoring 模型仍把 `CheckGroup`、预先提供的 Check 与项目创建的 Check 分成不同 shape，并把部分父级配置通过只追加的规则传给 leaf。这样会产生三个问题：

- 父节点不能像普通 Check 一样拥有自身的稳定 identity、执行、outcome 与 Records。
- 来源或 type variant 容易泄漏进 construction/binding 路径，使预先提供和项目创建的 Check 不能遵守同一可信交接契约。
- `dependsOn`、`mutex` 等真正集合化的公共字段不能明确表达继承、清空、替换或基于 parent 的增删；相反，options 与子 Check 又不应被通用 deep merge 错误继承。

现有 active Change `enable-recursive-executable-checks` 已规划了另一套 `childrenOrder`、`settlesAfter` 和 closure 方向。本 Draft 采用当前相关 `active + unaligned` 决策记录中的新方向；本轮只在旧 artifacts 记录暂停与 handoff gate，不重写其形成时方案或完成状态，也不归档或实施该旧 Change。

## Outcome

在完成后，Project Definition 将以一种 `Check` value 表达预先提供和项目创建的 Check。所有节点可递归组合、各自执行并独立形成 Check outcome 与 Records；containment 只表达选择与配置上下文，不产生隐式顺序、聚合或额外 runtime entity。

每个 Check 都通过同一 trusted private construction/binding contract 进入 normalization 与 resolution；base-value derivation 保留 base 的 stable `checkId` 与 trusted binding。implementation 与 options 可以不同，但 Run 不会按来源、`kind`、`checkId`、public value identity 或树位置 lookup 来选择 binding。公共 set-like scheduling fields 使用闭合的继承/替换/add-remove 表达式；options 不跨 Check 继承，`checks` 不向 child 继承，只能从明确 base Check value 派生编辑。plain child array 精确替换 `checks`，其中 `[]` 明确清除它；最终 materialized/normalized Check 的 `checks` 要么缺失、要么 non-empty。公开 helper 与 export 的确切名称将在 publication 前单独确认。
