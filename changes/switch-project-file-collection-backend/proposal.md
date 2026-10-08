# Proposal

本 Draft 规划收敛项目文件收集职责，让范围在进入目录前生效，并按需组合忽略规则、Git 追踪与变更事实。
后端与公共契约的候选方向见 [Design](design.md)。

## Why

当前 filesystem 收集的提前剪枝只覆盖部分共同排除规则；Git 收集又在最终过滤前进入子仓库。
因此范围外目录仍可能引发读取失败或无意义的 Git 调用。仅替换 filesystem walker 不能解决后一问题。

[后端选型](../../docs/investigations/compare-node-file-collection-backends.md)将 fast-glob 列为优先候选；
[职责调查](../../docs/investigations/fast-glob-git-collection-boundaries.md)进一步区分路径枚举、忽略规则、追踪和变更。
用户的核心需要是后三项文件事实，而非维护两套递归收集器。本 Change 在既有 Draft 内重新收敛范围。

## Outcome

形成同步、按需且职责清楚的项目文件收集方案，并以支持宿主的实际接入证据证明：

- **范围感知**：证明无需求的子树在进入前剪枝，包括 `.tmp/**`、仅包含 docs 的 selection 和被排除子仓库。
- **能力分层**：优先评估 filesystem 统一枚举，显式支持选定的 ignore、tracked/untracked 与链接策略；变更触发复用现有 `changes`。
- **可信结果**：来源和所需事实失败明确报告，合法无匹配返回冻结空数组；保留相对 `/` 路径、排序去重及 owning Check 的 exact inputs。
- **明确迁移**：是否移除 `git-worktree` 及改变 matcher grammar 在 Plan 前确定，同步契约、Decision、配置与安装后消费者验收。

当前授权仅覆盖 Draft 整理；公共形状、最终策略及产品实施尚待收敛。
