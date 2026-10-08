# Design

本 Draft 优先评估统一 filesystem 枚举与可选文件事实，围绕 [Proposal](proposal.md) 收敛范围剪枝、后端和迁移。

## Context

- [后端选型](../../docs/investigations/compare-node-file-collection-backends.md)推荐 fast-glob；
  [职责调查](../../docs/investigations/fast-glob-git-collection-boundaries.md)证明它不提供 Git index/ignore 语义，
  并记录被排除子树仍有 8 次 Git 调用的 Product trace。库仅完成固定版本源码审查，尚待实际接入。
- [Project files](../../docs/development/project-files.md)与[公开收集指南](../../docs/guides/collecting-project-files.md)
  拥有当前 selection、共享候选、exact inputs 和同步 façade；
  [显式双来源](../../docs/decisions/select-check-files-from-explicit-sources.md)、
  [公开同步工具](../../docs/decisions/provide-synchronous-single-selection-file-collection.md)及
  [按需收集](../../docs/decisions/retain-on-demand-project-file-collection.md)仍是 active 基线。
- 当前 Git 来源包括 tracked 与标准非忽略 untracked，没有 tracked-only 公开选项。
  `src/project-run/changes/git.ts` 已汇总 committed/staged/unstaged/untracked paths 并形成 flags；
  这与现存文件的收集是不同事实。
- 共同 matcher 同时被 collection、revision/submodule 过滤与 change regions 消费。
  用户允许讨论破坏性调整；本 Draft 不改变现行契约或批准实施。
- [宿主决策](../../docs/decisions/treat-node-engine-as-a-minimum-version.md)要求 Node >=24.18 package 验收；
  Bun 仓库脚本与源树诊断另记实际版本，不作为 Product host 支持证据。

## Goals / Non-Goals

### Goals

- 在进入无需求子树前控制范围，明确范围内失败与合法空结果。
- 用标准 Node API 或成熟库承担同步枚举/匹配，按需组合有价值的 ignore 和 Git 事实。
- 保持 Check 内必要的候选共享与稳定路径，把公共契约、依赖、Decision 和配置迁移一起验收。

### Non-Goals

- Run 调度、跨 Check cache、watcher 和调用级文件 barrier 保持既有边界。
- membership 继续是无 I/O 的路径关系计算；change flag 调试由独立 Change 交付。
- 本次不预建完整 Git status API；新增公共查询能力须有明确消费者和范围。
  eligibility、内容读取、安全 resolver、Finding、Record 与结算由 owning Check 负责。

## Decisions

### Intended Change

**优先候选：filesystem 统一收集路径，忽略规则和 Git 事实显式按需组合。**
是否删除 `git-worktree`、保留哪些可选能力和公共形状，均在 Plan 前确定。

| 职责 | 候选方向与选择条件 |
| --- | --- |
| 枚举与匹配 | fast-glob 3.3.3 + 薄适配优先接入验证；显式 micromatch 承担纯路径匹配，覆盖所有共同消费者。最终版本和依赖在 Plan 前核定。 |
| 范围剪枝 | 根据全部需要共享候选的 selections 判断子树是否无需求；无法证明时保留访问。task base、静态 include 和子仓库入口都须遵守范围。 |
| 忽略文件 | 显式确定文件来源、嵌套规则和 grammar；Git ignore 的顺序、`!` 与相对基准由成熟解析能力承接，而非把每行当普通 exclude。 |
| 追踪事实 | 决定仅用于 tracked/untracked 选择还是也供查询；需要时用原生 Git 批量取得，并明确仓库范围和失败。 |
| 变更事实 | 先复用现有 `changes` 的 baseline 与 flags；changed-only 输入仅在确有需求时补相应契约，删除路径仍是独立事实。 |
| 链接策略 | 评估跳过、保留链接条目和读取目标；文件链接与目录链接分别确定支持范围，内容授权仍归 owning Check。 |

ignore 与 tracked 的优先级必须共同确定：若保留 Git 对 tracked 的例外，剪枝前就要取得必要事实，
不能先排除整个目录再补状态。显式 exclude 与 ignore 的优先级也须明确。

若选择保留 Git 收集，按 root-relative prefix 在 child inspection、`rev-parse` 和 child 枚举前剪枝，
仅在全部同源 selections 均无需求时跳过。若选择移除，关闭旧递归 acquisition 并迁移旧 selection；
仅在旧来源需提前修复而重构延期时，另设局部 Git 剪枝 Change。

### Resulting Impacts

| 影响 | 处理与验证要求 |
| --- | --- |
| 收集与错误 | 验证 root 缺失/不可读、范围外/范围内失败、空 include、excluded task base、静态 include、目录消失及多 selection 重叠。保留稳定冻结路径和完整 exact-input handoff。 |
| Git 与 ignore | 验证 ignore 顺序/否定/嵌套/父目录规则、tracked 例外和子仓库范围；所需事实 unavailable 与合法空区分。保留 Git 时直接证明被排除子树无 child inspection 或 Git 调用。 |
| 链接与内容 | 验证 root/base、文件/目录链接、断链、越界、循环与重复；公开收集不是 sandbox，选中路径不能绕过 secret 等 Check 的读取安全规则。 |
| 契约与迁移 | 按最终策略同步 selection 类型、closed validation、默认值、Check constructors、公开指南与示例。取消双来源时先建立替代 Decision，并给出明确迁移，旧配置不隐式映射为不同语义。 |
| matcher 与包 | 审计 dot、brace/extglob、排除优先及 change regions；用 pnpm 维护显式依赖、lockfile、许可和发布清单，证明 installed Node consumer。 |
| 证据与 owner | 同步内部 project-files、相关 Check/API 文档、changelog 和 Case；用相同真实 workload 比较耗时与访问/Git 调用数，局部 trace 不代替收益证明。 |

实施验收按[文档导航](../../docs/navigation.md#交付验证)：最窄 collection/matcher/changes/Check tests、
typecheck/lint/dependency 校验，文档与 Case 检查，再运行跨边界 Gate；包依赖和安装后消费者由完整验收覆盖。

## Risks / Trade-offs

- fast-glob 默认忽略 ENOENT，任务起点也可能直接 stat；薄适配需证明可信失败与进入前剪枝。
  若需重建递归引擎才能兑现目标，重新选择后端。
- 统一磁盘枚举会改变 index 与磁盘差异、ignore、子仓库和链接语义；tracked 例外又可能要求预先 Git 查询。
  简化代码不自动意味着相同结果或更低成本。
- 外部消费者的 Git 来源用量未知；接受破坏性调整仍需完整迁移与消费者证据。
- 与 membership/change flag 调试共享 matcher、包及文档 owner 时串行实施和合入；它们不是本次的硬前置。

## Open Questions

1. 第一版是否删除 `git-worktree`？ignore、tracked 选择和链接策略保留哪些能力，公共输入如何表达？
2. ignore 读取哪些文件、采用什么 grammar？是否保留 tracked 例外，和显式 include/exclude 的优先级怎样定义？
3. Git 查询覆盖 root 还是显式子仓库，如何批量获取并明确 unavailable？现有 `changes` 是否已经满足修改事实需求？
4. 最低支持 Node 上，后端的 task base、静态 include、symlink 和 ENOENT 顺序如何？哪些薄适配能兑现范围与失败承诺？

保持 `draft`；产品范围、兼容策略和实际接入问题收敛后，再补全 Plan proposal 并派生 tasks。
