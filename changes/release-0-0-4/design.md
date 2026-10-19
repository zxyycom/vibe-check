# Design

把持续更新的发布记录与固定源码身份分开，先完成规范审查，再以 receipt、同包验收和独立结论交接正式包。

## Context

- main 起点为 `357fb7c4061c3f576d0b70c8594e458c2941ce39`。发布实现分支已保存文档优化、测试证明重分工和调查；本轮审查起始 HEAD 为 `95488448`。
- 初次正式包已有验收和归档，但不包含后续文档优化。当前授权、工作区身份和逐轮结果由 [current evidence](current-evidence.md) 统一记录。
- 固定方向沿用 Decisions `260909-standardize-package-release-procedure`、`260908-isolate-package-release-source-from-change-work`、`260908-use-unprefixed-project-branch-names` 和 `261019-require-consumer-oriented-package-documentation-review`。
- 用户已确认测试证明重分工、保留 5 秒红线，并将严格 JSON 优化草案分离。后续网络调查指向 registry 元数据等待，具体链路责任未知；用户选择停止专项排查，继续发布准备。
- 用户已授权从 `95488448` 建立新 detached 工作区，标准自举已完成；随后要求先重新审查优化文档和代码，允许必要提交与正常 hook 推送。本轮审查及 candidate 验收已完成，原冻结身份不用于新输入。

## Goals / Non-Goals

目标是让本次变更符合文档和代码规范，并形成可交给发布者的精确产物与完整证据。
本轮不新增功能、不改变依赖、门禁或安装语义；不继续专项排查网络。npm publish、版本 tag、手动 push、合回 main 和旧材料清理仍按对应授权执行。

## Decisions

### Intended Change

- 实现与证据维护在 `/home/dev/.codex/worktrees/package-release-preparation/vibe-check`；main 继续作为集成线。正式包从独立 detached 工作区的最终 clean S 构建。
- 文档以 `ai-ready-docs` 按真实阅读任务审查：保留必要规格和风险边界，合并无独立价值的重复，将历史实验留给调查与归档。公开页、维护 owner、形成时报告和当前计划分别拥有自己的主线。
- 代码先按行为 owner 恢复职责，再按完整编码规范判断实现；只整改具体语义障碍，不凭相邻旧代码、行数或语法偏好重构。审查覆盖本次全部三个 TypeScript 文件及其直接集成边界。
- 保留已采用的测试分工：真实 workflow 只替换八项 leaf 依赖，生产 task map、wrappers 和错误翻译不替换；证明默认分发、顺序等待、focused selection、去重及失败汇总。workspace 保留真实 links fixture。
- 全量内容正确性由既有 Gate/material/artifact 验收承担；薄 main 的 argv、await、输出、OS exitCode 和默认绑定由明确 Manual CR 承担。既有 Case 只有证明职责实际变化时才同步。
- 审查者基于实际 diff 反查改动和使用路径；准备期结论绑定最终 candidate，正式包再按 receipt、清单和内容确认适用性。

### Resulting Impacts

- 随包文档变化进入 package fingerprint，须生成新 candidate 并完整验收；已有 JSDoc 结论的复用还要核对关联阅读路径和行为。
- 正式输入变化后重新选择 clean S、prepare 和验收；在实现工作区更新计划不使 frozen 工作区 drift。旧工作区、tarball 和归档保持原 bytes。
- 新工作区沿用标准 `bun run env:setup`，锁定工具、依赖、CodeGraph 和 local candidate；不使用会丢弃工作区内容的 clear 环境。
- 网络根因不再阻挡准备。正式完整 Gate 仍包含真实外部安装；若失败，保留该次证据和未完成项，不自动重试至绿或修改验收条件。
- 正式验收后按公共 Git 目录的固定槽位归档原始产物、receipt、Gate 日志及 evidence 快照，并逐文件核对摘要。交互认证由发布者完成。

## Risks / Trade-offs

既有 43/43 只证明当次 candidate，不能代替修改后输入或正式包验收。5 秒测试预算与 provider 的 30 秒预算保持不变；当前网络风险尚未修复。
文档精简可能误删规格或历史语义，因此保留受管示例、准确迁移说明和独立复核。调查正文优化保留形成时事实和资源 bytes，不用当前决定覆盖旧结论。
registry 观察可能过期，publisher authority 尚未核验；临发布再检查。本地归档独立于临时 worktree，但不等于跨机器备份。验收只覆盖实际运行的平台。

## Open Questions

审查完成后的最终 S 与重新冻结目标需按精确授权确认；已授权的 `95488448` 工作区先保留。
实际 publisher、临发布 freshness/registry 及外部写入授权留到本地验收后的交接。当前不需要改变测试方案、采用 JSON 草案或恢复网络专项排查。

## Implementation Observations

实际改动、命令结果、独立结论、提交及剩余步骤统一进入 [current evidence](current-evidence.md)，任务仅按证据勾选。
