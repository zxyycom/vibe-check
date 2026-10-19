# Proposal

以同一份正式 tarball 的验收与证据交接完成 0.0.4 发布；本轮先完成本地发布准备。

## Why

main 的用户文档和对外 JSDoc 已完成一轮修复，初次正式包也通过验收。用户要求先继续按 ai-ready-docs 复查 changelog 与文档；新材料完成独立复核后，须重新绑定冻结源码和 receipt，才能进入发布。

## Outcome

`@zxyycom/vibe-check@0.0.4` 的正式包通过同包完整验收与独立文档确认，发布、分发核验、Git 交接和归档均可追溯。
当前交付止于准备完成；后续外部写入取得精确授权后继续。

## Scope

### Intended Change

- 沿用 [Package release](../../docs/tooling/package-release.md) 的 registry、public access、latest、交互式 2FA、双工作区和归档规则。
- 在 `release-0-0-4` 分支准备版本说明、Change、同包验收和非敏感证据；不向 main 提前合入。
- 重新阅读全部 29 篇随包 Markdown，按使用任务修正重心、层级、重复和过强表述；保留必要安全边界、历史版本事实及完整示例。
- 从干净提交 S 建立独立 detached worktree，生成并验证正式 tarball；外部发布时只使用该产物。

### Resulting Impacts

- changelog 顶部由未发布内容确定为 0.0.4；不增加产品行为或虚构发布日期、npm 发布结果。
- 独立审查者确认原有整包阅读结论与正式包的一致性，复核版本说明差异及关联路径。
- 文档优化改变 package fingerprint；旧冻结包的验收和归档保留为历史证据，不覆盖优化后的材料。
- 发布后才创建指向 S 的版本 tag，并按授权合回 main；工作区和 Change 在交接前保留。

## Success Criteria

- 正式 receipt 闭合 clean S、版本、tag、完整 inventory、SHA-256 与 SRI，同一 tarball 的完整 Gate 通过。
- `Manual CR:` 覆盖全部随包用户文档、示例和对外 JSDoc，取得适用于最终包的独立结论。
- 实际发布前完成 freshness、registry、publisher authority 和精确写入授权核验；发布及下载分发 bytes 核对成功。
- tag、合入、证据归档和后续保留边界有真实记录，无认证秘密。

## Affected Owners

- [发布流程](../../docs/tooling/package-release.md)、[候选包生命周期](../../docs/tooling/package-lifecycle.md)与 [Package artifact](../../docs/tooling/package-artifact.md)。
- [文档使用者审查](../../docs/tooling/documentation.md#对外文档使用者审查)、[changelog](../../docs/changelog.md)和 [Change 协调](../../docs/governance/change-coordination.md)。
