# Design

用分离的实现与冻结工作区，将本次发布准备、同包验收和人工发布交接绑定到可复核身份。

## Context

- 用户于 2026-11-02 确认开始上一轮提出的 0.0.5 发布准备：同步 main、建立发布 Change/分支/工作区、正式构建验收和最终文档确认；npm 发布及 2FA 留给用户交互执行。
- 用户随后在交互终端完成发布；registry 独立分发核验通过后，明确授权继续补证据、创建并推送版本 tag、合回并推送 main 及结项 Change。两个发布 worktree 与发布分支暂时保留。
- main 基线为 `fba271ec`，同步后本地与 origin/main 一致；工作区干净。
- canonical registry 于 `2026-11-02T09:22:25.472Z` 返回 latest=0.0.4、versions=0.0.1–0.0.4，0.0.5 尚不存在。该观察不证明之后仍可发布或账号权限。
- 固定规则与长期判断沿用发布 owner，不调整流程。既有全包审查见 `fd930556:changes/prepare-0-0-5-documentation/`，最新指南审查见 `90217c36:changes/rework-project-gate-guide/`。

## Goals / Non-Goals

- 目标：获得可交互发布的同包证据和精确命令；发布结果由后续事实闭合。
- 非目标：新增产品行为、重做未变材料的无差别审查、GitHub Release、自动认证或提前创建版本 tag。

## Decisions

### Intended Change

- 实现工作区为 `/workspace/vibe-check-release-0-0-5`，分支 `release-0-0-5`；日常 `/workspace/vibe-check` 保持 main。
- 记录与升级说明经检查后保存到发布分支；选定该 clean commit 为 S，在 `/workspace/vibe-check-release-0-0-5-frozen` detached 固定。
- 通过 `package:release:prepare -- --version 0.0.5 --tag latest` 构造，使用 `package:release:verify -- --receipt <path>` 完整验收，不手改 receipt。
- 独立审查者比较最终包实际清单与已审材料，复核差异和关联使用路径，形成 `review-final-package.md`；结果汇入 `evidence.md`。

### Resulting Impacts

- 新工作区沿用公开环境自举入口；只在冻结工作区产生受控 build/cache/log，不维护活动记录。
- 归档使用 Git common-dir 的固定 receipt 摘要槽位，已有不同 bytes 绝不覆盖。
- 产物与两个 worktree 保留到发布及归档核验结束；本轮不执行 worktree/分支清理。
- 准备授权包含限域记录提交；发布分支 hook 不推送。追加收尾授权覆盖 `v0.0.5 -> S` 的 tag/push、发布分支合回及推送 main、记录提交和 Change finalize/delete，不包含删除两个发布 worktree 或发布分支。

## Risks / Trade-offs

- 缓存、宿主工具和实际依赖图可能影响验收，失败不得借开发期候选或选择性跳过替代。
- 发布准备通过不保证 registry availability、publisher authority、跨平台行为或发布成功。
- 独立阅读结论与机械 Gate 各自必需，不以其中一项替代另一项。

## Open Questions

无待决方案：实际 publisher 为 `zxyycom`，版本、latest 与分发 bytes 已核验；Git 收尾按追加授权执行并逐项留证。
worktree/发布分支清理不属于本轮，保留供审计与恢复，不作为 Change 结项前置。
