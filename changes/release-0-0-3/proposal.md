# Proposal

准备并交付 `@zxyycom/vibe-check@0.0.3`；本 Plan 覆盖完整发布生命周期，按当前授权逐阶段推进。

## Why

`0.0.2` 之后已有产品、声明、文档与包材料变化，需要从发布基线恢复版本净变化、迁移和消费方证据，形成可靠的 `0.0.3` 发布输入。准备树、正式产物验收和实际发布分别需要自己的证据。

## Outcome

`0.0.3` 有可核对的净变化与升级路径、新用户和升级用户的消费方证据；在阶段授权和发布门禁满足后，以冻结提交对应的同一 receipted tarball 完成验收、发布、分发验证与 Git/证据交接。

## Scope

### Intended Change

- 在 `release-0-0-3` 实现 worktree 维护本 Plan、[evidence](evidence.md) 和 Change 协调入口。
- 将 [changelog](../../docs/changelog.md) 收敛为相对 `0.0.2` 的净变化和迁移，修正[依赖指南](../../docs/guides/check-dependencies.md)随包 Check 数量残留，保持示例与产品契约。
- 审核优化本次文档，按完整[编码规范](../../docs/development/coding-style.md)审查本次改动，独立检验 AI 阅读路径，验证准备树并整理本地语义提交。本轮权限见 [design](design.md#当前授权)。
- 按 [Package release](../../docs/tooling/package-release.md)完成正式冻结、same-tarball 验收、归档、发布与分发验收；后续在独立授权下完成 Git 交接。

### Resulting Impacts

- 用户：新用户可仅凭随包材料完成程序化集成；升级用户能识别默认、回调、声明与 Record 分支变化，并复核代表性 Run。
- 验证：准备树的 local candidate/Gate 和冻结提交的正式 receipt/same-tarball Gate 分别记录；每次材料改动后证据须匹配实际输入。
- 协调：已继承 waiver 可省略实现；其它当前 Change 保持独立 Outcome 和恢复条件，不成为本版前置。
- 交接：正式产物、日志和摘要按发布 owner 归档；版本标签与合入遵守其 Git 时序。

## Success Criteria

- 净变化、迁移和受影响消费者可从 changelog 与公开 owner 恢复，代表性用户任务和 AI 阅读任务通过独立反查。
- 准备树的自举、材料/Case/governance 验证、完整 `bun run check -- --all` 和本地语义提交均有真实记录；证据时点与当前改动明确对应。
- 后续 clean `S`、正式 receipt、same-tarball 验收、临发布事实与精确写入授权成立，实际发布及分发身份核验成功。
- 正式证据归档与字节核对、`v0.0.3` 绑定 `S`、Git 和稳定 owner 交接完成；checkbox 只表达已完成工作。

## Affected Owners

- [Package release](../../docs/tooling/package-release.md)：冻结、正式产物、发布、归档和 Git 时序。
- [Package lifecycle](../../docs/tooling/package-lifecycle.md)、[Package artifact](../../docs/tooling/package-artifact.md)：local candidate、隔离安装验收与包材料。
- [Changelog](../../docs/changelog.md)、[README](../../README.md)及受影响公开专题：版本说明、迁移与用户入口。
- [编码规范](../../docs/development/coding-style.md)：代码质量与对外说明语言；[Workspace tooling](../../docs/tooling/workspace.md)、[Project Gate](../../docs/tooling/project-gate.md)、[文档导航](../../docs/navigation.md#交付验证)：自举与验证。
- [知识治理](../../docs/governance/knowledge-maintenance.md)、[Change 协调](../../docs/governance/change-coordination.md)：载体、依赖与协作；沿用既有发布 Decision。
