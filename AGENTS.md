# AGENTS.md

## 项目定位

- Vibe Check 的产品实现是 `src/product/**` 下由本仓库拥有的 TypeScript/Bun
  代码质量检测 CLI；正式本地入口是
  `bun run product:cli -- scan [project-root]`。
- `quality:check`、`quality:full-check` 和 `quality:scan` 保持省略 gate 的观察行为；
  `quality:gate` 通过 full `regressions` policy 显式启用阻断。它们与
  `scripts/quality/scan.ts` 都是显式传入仓库根并单向调用产品入口的 dogfood wrapper；
  开发脚本行为参考本仓库 `scripts/**`。
- `docs/` 是长期规范入口；OpenSpec 用于较大 change；代码、测试和 release artifact 证明实现状态。

### 当前实现状态

- `src/product/**` 是唯一产品运行时源码 owner；参数、默认配置、扫描 core、scanner
  adapters、warnings 和 output 均由该目录拥有。
- `scripts/quality/scan.ts` 只显式传入 Vibe Check 仓库根并单向调用产品入口；仓库已移除
  Rust crate、根 Cargo 产品 workspace 和 quality-core gitlink。

## 架构边界

- CLI：参数、配置、路径、退出码、输出模式、错误映射。
- Core：扫描计划、文件收集、指标模型、聚合、warning、报告数据。
- Scanner：内置检测、外部工具适配、缓存、原始输出、解析错误。
- Output：人读报告、机器输出、CI 摘要和 annotation。
- Config：默认阈值、include/exclude、generated file、project profile。

## 工作方式

- 能从文档、OpenSpec、本仓库脚本实现或相邻代码可靠推断时，说明假设后继续。
- 方案影响 CLI、schema、scanner contract、退出码或长期架构时，先区分目标、现有方案、可选方案和推荐方案。
- 多条路径影响兼容性、跨平台或维护成本时，先比较复杂度、风险和开发成本。
- 不为短期跑通引入长期难维护方案；确需临时处理时写清 TODO、范围和移除条件。
- 风险高且不能可靠推断时，只问必要问题。

## 上下文获取

### 本仓库

1. 先读本文件，以及贴近编辑路径的项目文档、源码或测试。
2. 项目文档从 `docs/navigation.md` 进入，只读本任务需要的主规范。
3. 缺少对应 owner 文档时，使用近邻代码、测试、示例和用户上下文作为依据。
4. 修改产品实现时，先读 `src/product/**` 及对应 owner 文档；修改开发脚本或 dogfood
   wrapper 时，先读对应 `scripts/**` 入口。
5. 短小配置、入口提示词和工具说明可直接读取。

### Markdown 与文档

处理大型 Markdown 或层级文档时，可使用可用的文档导航命令辅助定位：

```powershell
docnav outline <path>
docnav read <path> --ref "<ref>"
```

`docnav` 不可运行时，回退到常规文件读取。

### 代码结构

- 理解调用关系优先用可用的 CodeGraph MCP。
- CodeGraph 不可用、索引缺失或结果不足时，用带路径过滤的 `rg` / `rg --files`。
- 搜索排除 `.git`、`target`、`node_modules`、`.venv`、`dist`、`build` 和缓存目录。

### 变更材料

- `openspec/changes/` 只在处理 change、审计、验收或用户明确要求时读取；涉及时先运行 `openspec list --json`。
- 修改字段、示例、schema 或输出 shape 时，读取 `docs/schemas/` 和 `docs/examples/`；owner 缺失时先说明依据和落点。

## 实现与验证

### 变更前

- 涉及实现、重构、测试脚本、验证脚本或跨模块修改时，先读对应主规范和 `docs/coding-style.md`。
- 缺少对应主规范时，按现有代码、TypeScript/Bun 社区惯例和相邻实现执行，并在需要时补文档。
- 涉及架构、数据模型、CLI surface、scanner 边界、依赖或验证链路时，先说明影响范围和验证方式。

### 测试与契约

- 新增或修改测试前，明确证明目标；没有明文契约时，不新增臆测断言。
- 涉及 schema、示例、CLI 或 scanner 输出时，同步更新对应规范和验证材料。
- 发现实现与 docs、OpenSpec、schema 或 examples 偏离时，先判断是实现缺口、目标能力、计划中 change、历史记录还是冲突。

### 命令与验证

- CLI 命令优先只读、可复现、范围明确。
- TypeScript/Bun 产品行为改动后，按范围运行 product import、typecheck、lint、test、
  dependency 和入口检查，以仓库 package scripts 为准。
- 文档、schema、examples、OpenSpec 或 whitespace 改动后，优先运行 `bun run validate`；局部文档校验可用 `bun run validate:docs`。
- 脚本工具改动后，按影响面选择 `bun run typecheck:scripts`、`bun run lint:scripts`、`bun run quality:check` 或对应验证命令。
- 跨产品行为、OpenSpec、schema、示例、输出边界或多个包边界时，优先运行 `bun run verify:vibe-check-workspace:required`；发布前或大范围重构运行 `bun run verify:vibe-check-workspace:full`。
- 说明文档改动还要用局部 diff、关键词搜索或文档导航命令确认结构和范围。
- 新增 Node/TypeScript 依赖用 `pnpm`；运行项目脚本用 `bun run`；Python 工具用 `uv`。
- 修改后用局部 diff 确认只改目标范围；无法运行的验证在最终说明中写明。
