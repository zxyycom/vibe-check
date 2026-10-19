# Design

把可变的发布记录与不可变的正式源码分开，以 receipt、同包验收和独立阅读结论交接发布。

## Context

- 起点 main 为 `357fb7c4061c3f576d0b70c8594e458c2941ce39`，工作区干净，相对本地 origin/main 领先一笔 Change 结项提交。
- 2026-10-19 用户同意按已说明的发布准备方案推进；初次准备授权包含创建发布分支、双 worktree、必要的本地提交、构建、验收与证据保存。
- npm registry 只读观察为 latest 0.0.3，0.0.4 不存在。按现行 `0.0.<patch>` 契约选择 0.0.4，tag 为 latest；观察不是版本预留或发布权限证明。
- 候选 `0.0.0-local.ce99cf444ac9` 已通过完整 Gate 和 JSDoc 修复复核；此前全部 29 篇用户页审查与修复完成。具体适用性在本次最终包上独立确认。
- 固定流程与理由沿用 Decisions `260909-standardize-package-release-procedure`、`260908-isolate-package-release-source-from-change-work`、`260908-use-unprefixed-project-branch-names` 和 `261019-require-consumer-oriented-package-documentation-review`，不修改长期方向。
- 初次正式验收完成后，用户要求继续按 ai-ready-docs 复查重心、负向描述、迁移残留、篇幅与 Markdown 结构；当前先交付文档改动和新 local candidate 的复核，不自动提交、重新冻结或发布。

## Goals / Non-Goals

目标是形成可交给发布者的精确产物与完整证据。当前不执行 npm publish、Git tag、手动 push、合并或清理，也不新增产品功能、修改依赖与门禁。

## Decisions

### Intended Change

- 实现工作区位于 `/home/dev/.codex/worktrees/package-release-preparation/vibe-check`，分支 `release-0-0-4`；main 留在 `/workspace/vibe-check`。
- 版本说明与准备期审查稳定后提交，选择 clean S，在另一 detached worktree 执行正式 prepare/verify。
- `current-evidence.md` 保存当次身份、registry 观察、`Manual CR:`、验证结果与操作授权，持续更新只发生在实现工作区。
- 三名非实施 reviewer 重新全文阅读 29 篇随包 Markdown，实施者据此调整正文，再由原 reviewer 对新候选复核。仅整理本次发布直接相关维护材料，不批量重写历史 Decision/Investigation。
- 正式验收后按固定公共 Git 目录归档原始 tarball、receipt、Gate 日志及 evidence 摘要快照。

### Resulting Impacts

- 版本说明变化进入 package fingerprint，不能直接把旧候选称为正式发布证据；包内差异需独立复核。
- 若正式包材料或关联行为需修正，重新提交、冻结、prepare、完整验收和语义确认，不手改 receipt 或冻结工作区。
- 当前只改 Markdown，不改 runtime、声明、示例源码、测试或阈值；对外 JSDoc 的既有结论需结合变化后的引用页面判断适用性。当前正式身份任务重新打开，旧证据保留且明确其 source 边界。
- 新工作区通过标准 `bun run env:setup` 自举锁定依赖、CodeGraph 和 local candidate；只使用标准环境，不选择会清除用户工作的 clear 环境。
- 本地准备通过不授权发布；交互式认证由用户完成，不读取或保存 token、OTP、认证配置及会话 transcript。

## Risks / Trade-offs

registry 在观察后可能变化，临发布须重查；publisher authority 尚未核验。旧阅读结论只在实际材料和相关行为一致时复用。
本地归档独立于临时 worktree，但不等同跨机器备份。正式包验收运行当前平台，不新增其它平台认证。

## Open Questions

实际 publisher、临发布 freshness/registry 核验与外部写入授权留待本地验收完成后的交接；不阻断本地准备。

## Implementation Observations

当次可核对事实、失败尝试和剩余步骤统一记录在 [current evidence](current-evidence.md)，不以计划勾选替代证据。
