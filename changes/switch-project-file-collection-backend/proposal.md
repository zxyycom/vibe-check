# Proposal

本 Draft 规划用 Node 可用的文件收集后端替换手写 filesystem 遍历器，让输入范围在遍历阶段生效，并明确范围内失败。具体方案与待验证问题见 [Design](design.md)。

## Why

当前 project-files 先枚举候选，再用 minimatch 过滤；提前剪枝只覆盖全部同源 selections 共同声明的 `**/<literal-directory>/**`。`.tmp/**` 等子树排除仍可能先进入目录，使只需要 `docs/**/*.md` 的检查被范围外目录的访问失败阻断。

[调查报告](../../docs/investigations/compare-node-file-collection-backends.md)将 fast-glob 列为优先候选：它提供同步 glob、目录排除与较严格的错误传递，但任务起点、符号链接和 ENOENT 边界仍需接入实测。此 Change 承接选型后的设计收敛。

## Outcome

同步项目文件收集由标准 Node API 或第三方库与薄适配层完成，按项目最低 Node >=24.18 的支持边界验收，运行时不绑定 `Bun.*`：

- **范围感知**：可证明不包含目标路径的子树在进入前剪枝，包括 `.tmp/**` 排除与仅包含 docs 的 selection。
- **可信失败**：project root 不存在或不可读、可能包含目标的目录枚举失败时明确失败；合法无匹配返回冻结空数组。选中文件的内容读取及失败结算继续由 owning Check 负责。
- **稳定输入**：保留显式 filesystem / git-worktree 来源、同步按需调用、Check 内同源共享候选，以及 project-relative slash paths 的排序、去重与冻结；不引入隐式来源回退。
- **一致升级**：允许新匹配 grammar 的破坏性变更；相关消费方、依赖声明、公开与内部说明同步，并由 collection / Check 集成及 installed Node consumer 证据证明。
