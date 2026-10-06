# Design

用独立证据连接发布准备、冻结验收与分发交接，按阶段兑现 `0.0.3` 的完整 Outcome。

## Context

- 版本已选 `0.0.3`；准备分支 `release-0-0-3`，实现 worktree `/workspace/vibe-check-release-0-0-3`，Plan 基线 `8d522ebf21ccca3a55a01d5a8df439d4c0116861`。该基线不是正式冻结提交 `S`。
- 本次沿用 active/aligned 发布判断：[完整版本化产品单元](../../docs/decisions/release-one-versioned-npm-product-unit.md)、[预稳定 0.0.x](../../docs/decisions/keep-prestable-package-releases-on-0-0-x.md)、[完整发布 Gate](../../docs/decisions/require-complete-project-gate-evidence-before-public-release.md)、[冻结源码隔离](../../docs/decisions/isolate-package-release-source-from-change-work.md)、[固定发布流程](../../docs/decisions/standardize-package-release-procedure.md)。方向与 alignment 保持不变。
- [Waiver 可省略 Change](../audit-public-authoring-optional-fields/proposal.md) 的实现已继承；其独立验收与结项由原 Change 承接。
- 前轮本地准备已有验收记录；本轮继续文档/规范审查、验证和提交。当前与前轮证据见 [evidence](evidence.md)，任务进度见 [tasks](tasks.md)。

### 当前授权

用户最新请求授权本轮审核优化文档、按完整编码规范审核本次变更、运行本地验证，并整理执行本地 `git add`/`git commit`。它更新前轮“止于本地验收、不提交”的边界；准备分支/worktree、本地修改和标准 `bun run env:setup` 的既有授权继续适用。

本轮止于本地审查、验证与提交后的发布就绪判断。正式 detached 冻结 worktree、publish、tag、push、merge、分支/worktree 切换或清理、Change finalize/delete 和归档清理仍须对应明确授权。Plan 中的完整生命周期任务不扩大本轮权限。

## Goals / Non-Goals

本轮目标：文档能恢复真实净变化、当前权限和证据时点；代码审查与独立阅读结果可核对；最新准备树完成完整 local Gate 和语义提交，并明确能否进入正式发布准备。

完整目标：后续按发布 owner 完成 `0.0.3` 的冻结、同包验收、发布与交接。

非目标：推进其它 Change、扩大产品能力、建立公共 CLI、改变长期发布流程或增加 GitHub Release 渠道。

## Decisions

### Intended Change

1. **输入与内容。** 使用已选 `0.0.3`；package/registry/access 由 [release manifest](../../scripts/package/artifact/release-manifest.json)解析，固定发布约定由 [Package release](../../docs/tooling/package-release.md)拥有。Changelog 从 `v0.0.2`、实际 diff 和公开 owner 提炼净变化与迁移，标题表达版本内容，不填未确认发布日期。
2. **本轮编辑与审查。** 编辑范围为本 Change、changelog、协调入口及依赖指南数量残留。文档按 `ai-ready-docs` 优化，按完整编码规范识别实际实现改动及适用规则，由非实施代理反查公开承诺并执行代表性 AI 阅读任务。若发现需要产品/脚本整改，先界定具体缺口与授权范围。
3. **准备验证与保存。** 采用 mise 固定工具链运行受影响材料、Case/governance 检查和完整 local Gate，记录 exact candidate、输入范围与日志；据实际结果更新任务，然后整理本地语义提交。提交保存准备树，不自动选定正式 `S`。
4. **正式验收。** 在后续授权阶段选定 clean `S`，创建独立 detached worktree，再执行 `bun run package:release:prepare -- --version 0.0.3 --tag latest` 与 `bun run package:release:verify -- --receipt <receipt-path>`。验收绑定同一正式 tarball，证据按 owner 归档。
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

本轮文档/规范审查、独立阅读、最终材料验证与本地语义提交已完成，结果见 evidence。当前没有阻塞本轮交付的开放问题。进入正式发布阶段仍需精确授权、clean `S`、冻结路径、正式产物及临发布事实；版本和固定流程已有 owner，无需重复选型。
