# Design

用独立证据连接发布准备、冻结验收与分发交接，按阶段兑现 `0.0.3` 的完整 Outcome。

## Context

- 版本已选 `0.0.3`；准备分支 `release-0-0-3`，实现 worktree `/workspace/vibe-check-release-0-0-3`，Plan 基线 `8d522ebf21ccca3a55a01d5a8df439d4c0116861`。该基线不是正式冻结提交 `S`。
- 正式冻结提交 `S` 为已完成本地验收的 `4a830ef3dfd1aadde7219455760a27394040e812`；独立 detached worktree 为 `/workspace/vibe-check-release-0-0-3-frozen`。后续进度只记录在准备工作区，不修改冻结输入。
- 本次沿用 active/aligned 发布判断：[完整版本化产品单元](../../docs/decisions/release-one-versioned-npm-product-unit.md)、[预稳定 0.0.x](../../docs/decisions/keep-prestable-package-releases-on-0-0-x.md)、[完整发布 Gate](../../docs/decisions/require-complete-project-gate-evidence-before-public-release.md)、[冻结源码隔离](../../docs/decisions/isolate-package-release-source-from-change-work.md)、[固定发布流程](../../docs/decisions/standardize-package-release-procedure.md)。方向与 alignment 保持不变。
- [Waiver 可省略 Change](../audit-public-authoring-optional-fields/proposal.md) 的实现已继承；其独立验收与结项由原 Change 承接。
- 本地准备、文档/规范审查、同包正式验收、发布、分发验收及本地 Git 交接均已完成；合入后 main 完整 Gate 43/43 通过。各阶段证据见 [evidence](evidence.md)，任务进度见 [tasks](tasks.md)。

### 当前授权

用户在本地标签和合入完成后，对“未推送远端、未清理工作区、未删除 Change；这些仍需单独授权”明确回复“都可以去推进了”。当前授权包括向既有 `origin` 非强制推送 `main` 与 `v0.0.3`，保存最终非敏感证据，按 `finalize --preflight` / `finalize` 结项本 Change，并清理本次发布的两个 worktree、已合入分支和临时 registry consumer。

已完成的 npm 发布及其精确授权见 evidence，本轮不再次 publish，也不移动版本标签。提交继续在准备分支产生，正常执行既有 post-commit hook；main 仅快进合入，不改写历史。仅清理经核对的本次短期工作物；保留 main checkout、正式 tarball/receipt/日志归档、历史 evidence 快照和其它 Change，不清理用户认证配置或共享工具状态。

## Goals / Non-Goals

已完成目标：在 npm 发布和分发验收结果保持可追溯的前提下，将本地 `v0.0.3` 绑定原冻结提交 `S`，把发布说明、Plan 和非敏感证据合回 `main`，验证实际合入状态并保留交接证据。

本次发布目标已完成，当前按新增授权完成远端同步与结项清理；历史 Plan 从结项前的 Git revision 恢复，正式证据保留在发布 owner 约定的公共 Git 归档槽位。

非目标：推进其它 Change、扩大产品能力、建立公共 CLI、改变长期发布流程或增加 GitHub Release 渠道。

## Decisions

### Intended Change

1. **输入与内容。** 使用已选 `0.0.3`；package/registry/access 由 [release manifest](../../scripts/package/artifact/release-manifest.json)解析，固定发布约定由 [Package release](../../docs/tooling/package-release.md)拥有。Changelog 从 `v0.0.2`、实际 diff 和公开 owner 提炼净变化与迁移，标题表达版本内容，不填未确认发布日期。
2. **已完成的编辑与审查。** 编辑范围为本 Change、changelog、协调入口及依赖指南数量残留。文档按 `ai-ready-docs` 优化，按完整编码规范识别实际实现改动及适用规则，由非实施代理反查公开承诺并执行代表性 AI 阅读任务。后续若发现需要产品/脚本整改，先界定具体缺口与授权范围。
3. **已完成的准备验证与保存。** 采用 mise 固定工具链运行受影响材料、Case/governance 检查和完整 local Gate，记录 exact candidate、输入范围与日志；据实际结果更新任务并整理本地语义提交。本轮从已验准备树显式选定 Context 中的 `S`；新的治理记录仅保存在准备工作区，不进入冻结输入。
4. **正式验收。** 本轮使用 Context 中已选定的 clean `S` 和独立 detached worktree，执行 `bun run package:release:prepare -- --version 0.0.3 --tag latest` 与 `bun run package:release:verify -- --receipt <receipt-path>`。同机 ignored 性能预算从准备工作区原样复制，阈值不变。验收绑定同一正式 tarball，证据按 owner 归档；如需修改 source 或随包材料，先停止沿用旧冻结证据。
5. **发布交接。** 正式验收、临发布 freshness/registry/authority 核验和精确写入授权齐备后，由发布者本地交互式 2FA 发布已验 tarball。分发验证成功后按 owner 和实际授权完成 tag、合入与证据交接。

### Resulting Impacts

- **用户材料。** 净变化和迁移由 changelog 与公开 owner 定义。新用户任务仅持随包材料；升级任务核对 declarations、代表性 Run 的终态、Records、aggregation 和 diagnostics。隔离安装后的示例/types/runtime 验收提供可执行证据；实际下游项目未提供时，保留其升级验证缺口。
- **包消费。** 复用现有 artifact 与 external-consumer 入口，对实际安装产物验收；正式 receipted tarball 在冻结阶段重新完整验收。local candidate 不能替代正式产物。
- **协作。** 其它当前 Change 保持独立；暂停条件从各自 artifacts 恢复。共享 package material/稳定文档 owner 的拟纳入变更串行审阅；正式冻结后的输入变化按发布 owner 重新冻结和验收。
- **证据。** [evidence](evidence.md)负责当前输入、前轮形成时结果、本轮验证及未来正式结果；保留有复核价值的摘要与日志索引。正式归档位置、字节核对和敏感材料边界直接引用发布 owner。

## Risks / Trade-offs

- `0.0.x` 可能含破坏式变化；准确迁移说明和代表性回归比标题或机械检查更重要。
- 验证只覆盖运行时的输入：准备树改动后重新核对 local 证据，正式输入改动后重新冻结并验收。Git 距离为零不表示工作树无改动。
- ambient Bun 与 mise pin 可以不同，candidate fingerprint 和验证需采用同一工具链；本机预算原样保留，warning 与阻断结果分别报告。
- Registry 与 publisher 状态会变化；前轮只读观察是时点证据，临发布重核且保持认证秘密不进入记录。

## Open Questions

推送、结项与本次短期工作物清理均已明确授权，没有阻塞当前实施的开放问题。若远端或 main 出现外来修改、标签冲突、未归档的唯一数据或不能快进，停止相应操作并核对，不自动 force、reset、rebase 或丢弃改动。持久归档不在清理范围。
