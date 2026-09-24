# AGENTS.md

## 项目入口

- 仓库维护任务从[文档导航](docs/navigation.md)识别相关规则的 owner、特殊流程和验证入口，
  再按需读取相邻源码与测试。
- Product 是 `src/**` 下的 TypeScript/Bun 运行时；`src/index.ts` 提供程序化 API，项目拥有 TypeScript
  Project Definition 与 bound Project Run。Product 不提供 CLI 或 `bin`。
- 仓库开发脚本由 `scripts/**` 拥有；Project Gate 的唯一进程入口是 `scripts/project/gate/run.ts`，
  具体接线见 [Project Gate](docs/tooling/project-gate.md)。

## 工作约定

- 缺少 owner 文档时，以近邻代码、测试、示例和当前请求为依据，并说明会影响结果的假设。
- 理解调用关系优先使用可用的 CodeGraph MCP；不可用、索引不足或结果不足时，使用带路径过滤的
  `rg` / `rg --files`。
- 新增 Node/TypeScript 依赖使用 `pnpm`，运行项目脚本使用 `bun run`，Python 工具使用 `uv`。
- 修改后检查局部 diff，只保留目标范围；不得把未授权的 Git add、commit、Change finalize/delete 或外部写入视为
  实施步骤。
- 按[文档导航的交付验证](docs/navigation.md#交付验证)选择覆盖受影响边界的命令；交付时说明实际运行、
  未运行的验证及其影响。
