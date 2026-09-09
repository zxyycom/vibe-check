# Design

本设计记录文档路由的待评估范围与恢复条件，不预先选定新的路由结构。

## Context

- [AGENTS.md](../../AGENTS.md) 提供项目边界、任务路由和工作约束；[文档导航](../../docs/navigation.md)连接公开与内部 owner。
- 本轮仅撤回 AGENTS.md 新增的分支/worktree 路由行；[Change 协调](../../docs/governance/change-coordination.md)和[Package release](../../docs/tooling/package-release.md)中的领域规则继续保留。
- 用户选择稍后重新调整路由。本 Draft 与当前发布准备独立，不改变其他 Change 的实施或发布条件。

## Goals / Non-Goals

目标是让入口覆盖真实任务、阅读路径清楚且维护责任集中，并通过代表性任务核对代理能否找到正确 owner。

本轮不修改 AGENTS.md 的现有结构，不迁移领域规则，不预设单层或多层路由方案，也不扫描、重写全部项目文档。

## Decisions

### Intended Change

用户恢复本项后，先用实际任务检查 AGENTS.md、文档导航与领域 owner 之间的路由：

1. 识别必须在入口呈现的触发条件，以及可以交由导航或领域文档承接的判断。
2. 核对重复摘要、遗漏入口、跨层跳转和失效引用对任务执行的实际影响。
3. 比较候选结构，确认维护边界与验收场景后再形成 Plan；不以本 Draft 作为具体方案的采用依据。

### Resulting Impacts

后续可能调整 AGENTS.md、文档导航及直接相关的领域入口，保持完整规则由其 owner 承接。
若形成长期路由判断，按 Decision Records 流程记录；实施验证应包括链接检查和代表性任务的语义审查。

## Risks / Trade-offs

入口过细会重复规则并增加同步成本；入口过薄则可能让代理漏读必要约束。
调整应以任务能否准确定位 owner 为标准，而不是单纯减少行数或增加链接。

## Open Questions

- 哪些任务触发条件必须直接保留在 AGENTS.md，哪些适合由文档导航继续分流？
- 如何划分入口摘要、导航说明与完整领域规则的维护责任？
- 以哪些代表性任务验证路由充分性与阅读负担？
