# Design

本 Draft 按“上游结论稳定 → 冻结版本 → 正式验收 → 授权发布 → registry 验证”组织交付。建立或提交草案不等于执行这些步骤。

## Context

- 发布身份、clean HEAD、受控构建路径与 receipt 的精确契约见 [Package lifecycle](../../docs/tooling/package-lifecycle.md#formal-release-preparation-and-receipt)。workspace 根 package version 不是发布版本 owner；稳定 release manifest 保留 sentinel。
- 遵守 [0.0.x 版本线](../../docs/decisions/keep-prestable-package-releases-on-0-0-x.md)、[个人 scope 发布](../../docs/decisions/publish-user-scoped-vibe-check-publicly.md)与[完整发布 Gate](../../docs/decisions/require-complete-project-gate-evidence-before-public-release.md)。本 Change 不建立稳定兼容承诺。
- 上游轨道分为 repository Gate named-resource configuration、repo-private virtual measurement workbench 和 learned heuristic adoption。旧算法比较、HTML/网络 Link、fail-fast 与 SCC public expansion 不自动进入本版。
- local Gate 证据不证明正式 0.0.2 已通过验收；旧 release 的版本可用性、publisher authority 和发布授权均须重新核验。

## Goals / Non-Goals

目标是交付可安装、可追溯、升级影响明确的 0.0.2，并分别证明本地产物与实际 registry 分发结果。

不扩张算法研究或其它能力，不降低 Gate、增加 waiver 或调整 selection 来通过发布。npm publish、Git tag 和 GitHub Release 各需相应授权；普通提交的受限 auto-push 仍按[工作区既有规则](../../docs/tooling/workspace.md#启用与授权)执行，不等于版本发布。

## Decisions

### Intended Change

**发布输入的状态：** 目标版本已选 `0.0.2`；npm tag 建议 `latest`、待确认；public access 由受验 staging manifest 承接。上游结论已交接；最终 release source commit、发布机制、当次 registry observations 与 publisher 核验仍待取得。版本已占用时停止确认，不自行递增。

按以下顺序形成证据；可先做升级差异调查，但不能绕过上游结论冻结正式包。

| 步骤 | 执行动作与通过条件 |
| --- | --- |
| 1. 上游结论 | 已交接 named-resource configuration `b30477b6`、virtual workbench `f7e9f353` 与算法不采用结论 `fd8923c8`，此项前置已解除；各自稳定 owner 见 proposal。 |
| 2. 升级说明 | 对照 0.0.1 实际发布包及可追溯 source，核对宿主、API/config、调度、机器输出和法律材料；说明破坏式变化、新能力、迁移动作与限制，建议精确锁版并提交 lockfile。历史比较仅服务此审计。 |
| 3. 正式验收 | 同一 clean HEAD 上用 `bun run package:release:prepare -- --version <version> --tag <tag>` 构建；receipt 绑定 source、fingerprint、inventory 与 integrity，再用 `bun run package:release:verify -- --receipt <receipt-path>` 对该包运行完整 Gate 和 external consumer 验收。 |
| 4. 授权发布 | 临发布前重验 source/tarball、registry version/tag 和 publisher authority，取得精确对象的外部写入授权；只发布已验 tarball。 |
| 5. 分发验证 | 核对 registry metadata/tag/integrity，从 registry 安装精确版本，验证 root import、类型、README 最小路径及代表性 Check；结果与本地证据对应。 |
| 6. 交接 | 保存发布结果、验证边界与限制；按已确认的 Git/tag/Release 方案关联 source。owner 交接、验证及当次删除授权齐备后才清理 Change。 |

### Resulting Impacts

- Package lifecycle/scripts 保持构建与审计 owner；仅修复确认的发布阻塞，不借机重构工具。release notes 位置在 Plan 前确定，不把长篇迁移历史塞入 README。
- source 或产物字节漂移时重新冻结输入、更新 receipt 并重跑受影响验收；不得用旧 local candidate 结果顶替正式证据。
- 公开说明或内部职责变化时，由非实施代理基于实际 diff 反查；包材料、types/runtime/documentation 与 registry 消费者仍各有验证责任。
- 认证只在相应授权下核验；token、OTP 和 `.npmrc` 不进入仓库、日志或 release evidence。

## Risks / Trade-offs

发布前 registry 和权限状态可能变化；网络或认证失败不等于版本不存在。正式 receipt 只证明本地产物，不证明 registry 分发成功。0.0.x 不承诺包级兼容仍需清楚说明迁移，且不能撤销独立 output/schema 稳定契约。

验证失败或发布部分成功时保留证据并停止，先核对实际状态；不自动重写 Git、覆盖版本、unpublish 或改 tag。恢复动作按影响另行授权。

## Open Questions

- npm tag 是否为 `latest`；使用什么发布机制，何时由用户授权并完成 publisher 核验？
- release notes 保存在哪里；是否创建/push Git tag 或 GitHub Release，以及如何处理远端同步？
