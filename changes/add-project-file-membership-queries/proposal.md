# Proposal

本 Draft 规划一个按需的公共项目文件成员关系查询工具：它把受管路径全集与多个具名 `selection` 的实际匹配关系交给调用方查询，而不替调用方解释命中数量。

## Why

调用方需要从 filesystem 独立枚举受管源码，再回答“某条路径命中了哪些已配置区域”以及“某个区域实际选择了哪些路径”。现有 package-root `collectProjectFiles(...)` 只能返回一份 `selection` 的路径快照；内部 `collectProjectFileSets(...)` 虽已支持按 source 批量收集，却没有相应的公共成员关系查询。

区域重叠可能是 duplicate comparison、阈值或其它策略刻意要求的语义。成员关系工具因此只保留零、一或多个命中的事实；调用方可在自己的 Gate、Check 或脚本中选择“至少一个”“恰好一个”“允许的交集”或仅报告。

工具是一次显式、同步、按需的路径快照，不创建 Run 级文件上下文、缓存或状态。当前长期方向已将独立的共享 path-membership consumer 列为重新评估最小方案的条件。

## Outcome

package 调用方可显式提供 project root、一个 filesystem `inventory`（受管路径全集）和多个具名 `selections`，得到冻结的、时点性的查询值：

- 从 inventory path 查询全部匹配的 selection IDs、命中数或零命中；
- 从 selection ID 查询其精确 paths；
- 保留重叠，不读取内容，也不判断 coverage、唯一性或 Check outcome。

该工具不修改 Run、Definition、Gate 或既有 Check 的 area 语义。
