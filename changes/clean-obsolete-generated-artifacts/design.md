# Design

本 Design 保持 Draft。它记录一次已获明确授权的窄清理，不把该次操作推广为 retention policy、自动清理机制或 formal release 重建授权。

## Context

local package、formal release、Product machine outputs、Gate evidence 与 cache 各有 owner。`build/package/`、`build/artifacts/`、`build/release-package/`、根 `artifacts/` 和 `.log/` 不能作为一个可整体删除的集合。当前产物定位由 [发现 Change](../clarify-current-package-artifact-discovery/proposal.md) 与 package status 承接。

直接 owner：[Package lifecycle](../../docs/tooling/package-lifecycle.md)、[Project Gate](../../docs/tooling/project-gate.md)、[Project Run](../../docs/development/project-run.md)、对应 lifecycle scripts。

## Goals / Non-Goals

本次先盘点来源、依赖、活跃引用、可重建性与占用，再在明确授权下完成最小清理；不运行 broad rm、通用 git clean 或按目录年龄盲删，不引入自动 retention 服务作为默认解法。

### 2026-09-07 实施记录

agent 核对授权条件后，已完成仅含两份可重建 machine-publication 文件的窄清理，并保留空父目录。精确路径、来源、保留材料、验证和占用变化见 [cleanup-evidence.md](cleanup-evidence.md)。未删除任何 candidate、formal-release 或 Gate 证据。

## Decisions

### Intended Change

本轮先只读生成含精确路径、owner、身份、保留理由/删除理由和恢复方法的清单；agent 确认目标符合明确授权后，已按 owner 边界完成一次性窄清理。证据见 [cleanup-evidence.md](cleanup-evidence.md)。未批准生成器或测试隔离修改、进一步删除、发布、归档或自动 retention 工具；只有重复运维需求与相应授权都成立时，才可另行设计工具。

### Resulting Impacts

涉及 build/cache/artifact/Gate 文档和生命周期；此 Change 不预先修改 runtime。验收应证明授权目标消失、保留目标 bytes/身份不变、当前 package status 正常、活跃 writer 不受影响；必要时重新生成允许重建的 candidate。

## Risks / Trade-offs

旧 release receipts、签名/审计材料或并发任务输出可能不可替代。未经检查不能把 ignored/untracked 当作废弃；允许清理一份 candidate 不等于允许删除所有 versioned tarballs。

## Open Questions

本次授权范围内的精确路径、活跃 writer、引用和恢复方式已闭合，见 [cleanup-evidence.md](cleanup-evidence.md)。仍待用户决定的是 process-check fixture 的 legacy `outputs.output` 写法：实际遗留 pair 表明该单测会让默认 `artifacts/vibe-check/` 在后续执行中重新出现。该动态生成问题不由本次清理修改，也不证明应删除任何其他产物。

本轮已完成记录所述的精确删除；仍未批准生成器修改、更多删除、发布或归档。后续的生成源修复待用户确认。
