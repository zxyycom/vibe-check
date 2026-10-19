# 0.0.4 发布证据

当前阶段：本地准备；尚未正式发布。固定约定由 [Package release](../../docs/tooling/package-release.md) 拥有。

## 输入与授权

- package：`@zxyycom/vibe-check`；version：`0.0.4`；tag：`latest`；registry：`https://registry.npmjs.org/`；access：`public`。
- 用户同意按已说明的发布准备流程推进。本轮执行分支/worktree、本地必要提交、构建验收与证据保存；不执行 publish、tag、push、merge 或清理。
- 实现工作区：`/home/dev/.codex/worktrees/package-release-preparation/vibe-check`；分支：`release-0-0-4`；起点：`357fb7c4061c3f576d0b70c8594e458c2941ce39`。
- main 工作区：`/workspace/vibe-check`，保留原 HEAD；末笔结项提交未手动推送。

## Registry 观察

2026-10-19T06:09:26Z 通过 canonical registry HTTPS GET 只读查询 package metadata：latest 为 `0.0.3`，已存在版本为 `0.0.1`、`0.0.2`、`0.0.3`；`0.0.4` 不存在。
该观察不预留版本，不证明 publisher authority；临发布必须重新查询。不采集或保存认证材料。

## 准备期审查基线

- 用户文档：此前独立审查覆盖全部 29 篇随包页，修复和复核见 [readiness Change](../repair-release-documentation-readiness/design.md)；审查者 `second_pass_public_readiness`。
- 对外 JSDoc：`audit_jsdoc_core_api`、`audit_jsdoc_package_checks`、`audit_jsdoc_scheduler_tools` 分别覆盖 60、115、52 个包根导出族及必要辅助声明；22 项问题已修复并独立复核。完成态可从提交 `cc9c4d1dd63d48365c7c97c07e6ddca6618ffef1` 的 `changes/repair-package-jsdoc-usability/` 恢复。
- 最终旧候选：`0.0.0-local.ce99cf444ac9`；SHA-256：`a384e106b2af99e1fffc6eca6bcd79c0845062c811d0f5fc82874fa80001f077`；原 tarball 位于 `/workspace/vibe-check/build/artifacts/zxyycom-vibe-check-0.0.0-local.ce99cf444ac9.tgz`。
- 旧候选最近完整 Gate 为 43/43 passed：`/workspace/vibe-check/.log/project-gate/2026-10-19T05-52-35.046Z-705370-5e692449-e5de-4b4a-b717-491847d2e719/`。这不是正式发布验收。
- 本轮包内容预计仅改变 changelog 的版本归属；正式材料清单、bytes、相关行为与阅读结论适用性仍须独立确认。

## 当前验收与产物

正式 source S、receipt、tarball 与完整验收尚待形成，不把 local candidate 或工作树状态代替正式身份。

- 实现工作区已通过标准 `bun run env:setup`：锁定依赖安装、CodeGraph 初始化与候选构建完成；没有修改 lockfile 或项目工具 pin。
- 版本说明变更后的候选为 `0.0.0-local.ba3c585d2a0f`，SHA-256 为 `b6bbb41b76943057ddff58d7688ce7fd1dbcd3e3536047bcb453770f76da11d9`。
- 与上述旧候选逐文件比较，1537 项文件清单相同，仅 `package.json` 的版本字段和 `docs/changelog.md` 的标题/版本边界两行变化；运行时、公开声明、JSDoc、示例和其余用户页面 bytes 一致。
- 已运行 `docs:api`、`validate`、`test-evidence -- check --root .`、`change-plan -- check-all changes`、`decisions -- check` 和 `git diff --check`，全部通过；756 test entities / 188 Cases / 16 topics、17 Changes、372 Decisions。

## Manual CR:

准备期审查对象为上述 `ba3c585d2a0f` 候选及其实际安装包。四名非实施 reviewer 分别确认旧结论可复用，无新增阻断：

| 审查者 | 覆盖与代表性任务 | 独立结果 |
| --- | --- | --- |
| `second_pass_public_readiness` | 全部 29 篇公开页、5 项 schema/机器示例；首次集成、Check 配置、回调扩展、结果及失败处理 | tar/installed/source bytes 一致；README 直达其余 28 页。相对已审材料仅 changelog 顶部两行变化，版本边界准确，没有冒称发布完成；原全文结论可复用。 |
| `audit_jsdoc_core_api` | 60 个根导出及必要辅助声明；Check/facts/Record、typed dependency、Run 分支、输出、flags 与数据工具 | 核心声明与相关行为材料不变；抽核 25 份 tar/installed 声明、12 处公开专题链接通过；原 8 项修复关闭。 |
| `audit_jsdoc_package_checks` | 115 个根导出及必要 supporting declarations；九项 Check、文件规则、schema identity、command、lint 与 ranges | 1537/1537 tar/installed 文件一致，373 份声明含 202 份 Check 声明与旧包不变；原 7 项关闭，command 安全说明仍准确区分默认行为与自动发布。 |
| `audit_jsdoc_scheduler_tools` | 52 个根导出及必要辅助声明；admission/wait、prepared 收尾、learned identity/observation、模拟分叉、cache、waiver 与 Finding 预算 | 清单/顺序及相关声明、源码、runtime、指南不变；重读关键修复，原 7 项关闭。 |

本轮先依据实际包与原独立阅读确认使用路径，再用来源与行为一致性核实复用。26 个 JSDoc 修复源文件去除注释/空白后的 TypeScript token 序列未变；没有借内部材料补齐用户说明。
上述确认未重跑旧行为演练，也不覆盖尚未形成的正式包。正式 S、receipt、tarball 的身份与最终独立适用性结论仍待下阶段确认。

## 后续执行边界

正式发布由用户交互完成 2FA；发布前重新核验权限和状态。发布成功后才进行分发核验、tag、合回与最终归档。
两个工作区、本 Change 和本地归档均保留，清理须另行确认。
