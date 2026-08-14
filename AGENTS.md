# AGENTS.md

## 项目边界与入口

- Vibe Check 的产品运行时是 `src/product/**` 下由本仓库拥有的 TypeScript/Bun Product runtime；正式集成入口是项目拥有的 TypeScript Project Definition 与 bound Project Run；Product CLI 仅保留 legacy migration diagnostic。
- `quality:check`、`quality:full-check`、`quality:scan` 和
  `scripts/quality/scan.ts` 是调用仓库 Project Run 的 dogfood aliases；它们不解析参数、不发现配置，开发脚本由
  `scripts/**` 拥有。
- 项目文档从 [`docs/navigation.md`](docs/navigation.md) 进入。先按任务定位唯一 owner 和验证入口，
  再读取相邻源码与测试；不要为获取上下文扫描全部文档。
- 历史材料不参与当前规范、计划或验证。只有任务明确要求历史审计、恢复形成时依据或比较演进时，
  才按[决策与 Change 治理](docs/decision-and-change-governance.md)进入归档。

## 任务路由

| 触发条件 | 必须采用的入口与动作 |
| --- | --- |
| 修改产品实现、脚本、测试工具或跨模块结构 | 从[文档导航](docs/navigation.md#如何阅读这些文档)选择行为 owner，并读取 [`docs/coding-style.md`](docs/coding-style.md) 与相邻源码、测试。 |
| 修改 schema、示例、CLI、scanner 或 output contract | 读取文档导航指向的领域 owner，并同步受影响的 schema、示例和验证材料。 |
| 形成或修改会持续影响后续行为、owner、边界、兼容性、风险处理或验收方式的判断 | 使用 `decision-records` skill，先运行 `bun run decisions:list`；涉及 Change 交接时再读[决策与 Change 治理](docs/decision-and-change-governance.md)，维护后运行 `bun run decisions:check`。 |
| 明确 change 需要跨文件、owner 或验证阶段持久交接 | 使用 `change-plan` skill，先运行 `bun run change-plan:list`，再读取目标 `changes/<change>/`；归档只在当前任务明确授权时执行。 |
| 新增、删除、重命名或移动原生 test 节点，修改测试正文，或修改 Case 的 Owner / Proves | 使用 `test-evidence-review` skill，修改前后运行 `bun run test-evidence:check`，并运行最窄目标测试。 |
| 用户明确要求保存、更新或审阅持久调查报告 | 使用 `investigation-report` skill；普通调查不创建报告 artifact。 |

## 上下文与工具

- 缺少 owner 文档时，以近邻代码、测试、示例和当前请求为依据，并说明会影响结果的假设。
- 理解调用关系优先使用可用的 CodeGraph MCP；不可用、索引不足或结果不足时，使用带路径过滤的
  `rg` / `rg --files`。
- 处理大型 Markdown 或层级文档时，可用 `docnav outline <path>` 和
  `docnav read <path> --ref "<ref>"`；不可运行时回退到常规文件读取。
- 新增 Node/TypeScript 依赖使用 `pnpm`，运行项目脚本使用 `bun run`，Python 工具使用 `uv`。
- 修改后检查局部 diff，只保留目标范围；不得把未授权的 Git add、commit、归档或外部写入视为
  实施步骤。

## 验证

- 按[文档导航的交付验证](docs/navigation.md#交付验证)选择最窄且覆盖受影响边界的命令。
- 产品行为先运行目标测试，再按 package scripts 补 typecheck、lint、dependency 与入口检查。
- 跨产品行为、Change Plan、schema、示例、输出或多个包边界时，运行
  `bun run verify:vibe-check-workspace:required`；发布前或大范围重构运行
  `bun run verify:vibe-check-workspace:full`。
- 最终说明实际运行的验证、未运行项及其影响。
