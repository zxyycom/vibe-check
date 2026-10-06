# Tasks

本 Plan 覆盖准备到发布交接。全部任务已按实际证据完成，本地标签、合入、合入后验证与归档核对均已闭合；用户已补充授权推送、结项与清理，当前按公开 finalize 入口收尾。权限以 [design](design.md#当前授权) 为准，证据见 [evidence](evidence.md)。

## Readiness

- [x] 0.1 查询当前 Changes 与 Decisions，完整恢复直接相关 active 发布判断、治理和 release owner。
- [x] 0.2 确认用户选择 `0.0.3`、准备分支/worktree 基线、本轮本地权限及后续独立授权边界。
- [x] 0.3 核对已继承 waiver 变更和其它 12 项非本版前置，保留暂停条件及旧 Change；不从旧证据推导本轮通过。
- [x] 0.4 标准 `bun run env:setup` 成功，记录新准备 checkout 的实际环境结果。
- [x] 0.5 在授权范围完成 canonical registry 只读版本/dist-tag 观察，记录时间、请求与结果；不代替临发布复核。
- [x] 0.6 取得 detached 冻结 worktree 精确授权，选定 clean `S` 并确认 source/material 范围。
- [x] 0.7 临发布重新核对 registry/freshness/publisher authority，取得该 tarball、version/tag/access 的精确外部写入授权。

## Implementation

- [x] 1.1 建立本 Plan、非敏感 evidence 与协调入口，沿用既有发布约定，不新增长期 Decision。
- [x] 1.2 收敛 `0.0.3` 相对 `0.0.2` 的 changelog 净变化、迁移与消费者边界；修正依赖指南数量残留，不伪造已发布事实。
- [x] 1.3 在授权后创建绑定 `S` 的独立 detached worktree 并 prepare 正式 `0.0.3`/`latest` tarball 和 receipt。
- [x] 1.4 正式 same-tarball 验收通过后，按发布 owner 归档 tarball、receipt、正式日志与 evidence，核对字节和摘要。
- [x] 1.5 在 0.7 与正式验收成立后，由发布者本地交互式 2FA 发布通过验收的同一 tarball，不从源码重打包。
- [x] 1.6 发布及分发验证后按授权将 `v0.0.3` 绑定 `S`、交接合回 `main`，归档后续 evidence；清理与 Change finalize 的独立授权按 design 核对。

- [x] 1.7 按 `ai-ready-docs` 优化本次文档，收敛 owner、当前授权、证据时点与阅读主线。
- [x] 1.8 按本轮授权整理本地语义提交，确认仅保存目标范围和可追溯验证结果。

## Verification

- [x] 2.1 当前 Plan/check-all、Decision check、材料与全树 Case 检查及局部 diff 审计通过，记录机械验证与语义判断的边界。
- [x] 2.2 非实施代理反查净变化、公开 owner 和实际 diff，核对新用户仅凭随包材料的代表性集成路径；安装后的可执行示例由 documentation acceptance 验证。
- [x] 2.3 核对 `0.0.2` 升级迁移说明及现有安装后类型、代表性 Run 的终态/Records/aggregation/diagnostic 验收证据；不替代未提供的实际下游项目升级验收。
- [x] 2.4 对最终公开材料运行 `bun run check -- --all`，记录 exact local candidate、43项实际结果与日志，包含安装后 artifact/types/documentation/runtime；不作正式发布证据。
- [x] 2.5 在 frozen worktree 运行正式 `package:release:verify -- --receipt <receipt-path>`，完整 Gate 与 external consumer 绑定同一 tarball；记录实际 receipt/digests/日志。
- [x] 2.6 验证 registry 的 `0.0.3` 与 `latest`、integrity/tarball 身份及 registry 安装后的代表性消费；失败时停止 tag/合入，不用本地产物冒充分发成功。
- [x] 2.7 核对归档 bytes、tag 指向 `S`、授权 Git 交接与稳定 owner 同步；复核成功标准、未决问题及后续清理权限，保留可持续交接。

- [x] 2.8 按完整编码规范审核本次实际变更，记录适用范围、发现及整改或无阻断结论。
- [x] 2.9 非实施代理仅凭优化后的材料执行代表性 AI 阅读任务，恢复目标、owner、权限、证据时点和下一步。
- [x] 2.10 对本轮最新准备树重跑材料、Case/governance 与完整 local Gate，记录 exact candidate、日志和实际告警。
- [x] 2.11 核对语义提交、提交后状态和发布前剩余门禁，给出可核对的就绪判断。
