# OpenSpec 历史材料

`archive/legacy/openspec/` 完整保留 Vibe Check 切换到“长期决策 + Change Plan”治理前形成的
OpenSpec 配置、specs、active-looking change 目录与 archives，供历史审计和恢复形成时上下文使用。
这是迁移前 OpenSpec 的唯一历史 owner；当前 Change 不复制这些材料。

这些文件不再是当前规范、当前计划或实施授权：

- 当前稳定行为以 `docs/` owner 文档、代码、测试和 release artifact 为准。
- 跨 change 的已确认方向以 `docs/decisions/` 为准。
- 当前持久实施计划位于 `changes/<change>/`，由 `change-plan` skill 管理。
- 本目录不再进入默认上下文、OpenSpec CLI lifecycle 或项目验证 gate，也不为新工作继续维护。

需要恢复这里记录的方向时，先核对当前 owner、活动决策与实现事实；历史材料只作为形成时证据。
随后运行 `bun run change-plan:list`，继续匹配的 active Change；只有不存在匹配的 active Change 时
才创建新计划。这里显示的状态、任务勾选、旧基线和 archived Change 都只作为历史证据。
