# Proposal

本 Draft 规划随包 change flag 调试工具，展示所选当前文件假如发生变更时会命中的 flags。

## Why

现有 `project.changes` 只发布实际变更中命中 region 的路径，无法展示未变更或零命中文件。调用方需要独立的全集映射，提前审视可能漏配、范围过宽或预期重叠。

## Outcome

调用方显式提供项目文件枚举范围和当前 change regions，取得并按需展示调试结果：

- 列出所选全集的每个文件、change flags 与命中数，包括零命中；支持按 flag 查看文件；
- 标明本次枚举范围与生效的来源/过滤策略，全集独立于 change regions，使已收集但零命中的路径可见；
- 每次调用重新获取输入，同次查询和展示共享一份 Core 关系结果。

本工具呈现成员事实，覆盖是否符合预期由调用方判断。本 Change 独立交付调试 API、呈现、示例和验收；实施依赖[Core 关系能力](../add-project-file-membership-queries/proposal.md)。
