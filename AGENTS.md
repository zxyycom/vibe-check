# AGENTS.md

## 项目与规则入口

- 仓库维护任务从[文档导航](docs/navigation.md)识别相关规则的 owner、特殊流程和验证入口，
  再按需读取相邻源码与测试。
- Product 位于 `src/**`，通过 `src/index.ts` 提供程序化 API，不提供 CLI 或 `bin`；职责见[架构](docs/development/architecture.md#系统边界)。
- 仓库工作流由 `scripts/**` 拥有，使用根 `package.json` 的 scripts；Gate 通过 `bun run check` 运行，接线见 [Project Gate](docs/tooling/project-gate.md)。
- 缺少 owner 文档时，以近邻代码、测试、示例和当前请求为依据，并说明会影响结果的假设。

## 执行与授权

- 修改前核对当前分支、工作区及暂存区已有改动，限定本次任务范围并保留其它工作。
- 日常开发与提交只在 `main` 进行；其它分支须有明确授权。发布分支按已确认的
  [发布流程](docs/tooling/package-release.md)处理，工作区协调见[Change 协调](docs/governance/change-coordination.md)。
- 提交前按 [Git hook 边界](docs/tooling/workspace.md#local-post-commit-auto-push)核对当前 checkout 的启用状态、潜在自动推送及授权例外。
- 理解调用关系优先使用可用的 CodeGraph MCP；不可用、索引不足或结果不足时，使用带路径过滤的
  `rg` / `rg --files`。
- 新增 Node/TypeScript 依赖使用 `pnpm`，运行项目脚本使用 `bun run`，Python 工具使用 `uv`。
- 不得把未授权的 Git add、commit、Change finalize/delete 或外部写入视为实施步骤。

## 验证与交付

- 需要 Gate 快速反馈时默认只运行 `bun run check`；补充验证优先选择本次任务相关的最窄测试、owner 命令或 preset。
- 验证范围以本次改动及其真实依赖为准，不因其他人的改动、整个工作区变更量或进入交付阶段自动升级到 `--changed` / `--all`；升级条件见[交付验证](docs/navigation.md#交付验证)。
- 检查局部 diff；交付时说明实际检查范围、未运行项及其影响，不把定向通过表述为全仓或发布验收通过。
