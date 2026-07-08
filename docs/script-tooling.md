# 脚本工具

本文档是 Vibe Check 开发脚本工具边界的 owner：记录哪些
Docnav-style toolkit 被接入、哪些 Vibe Check 脚本消费它们、这些脚本如何
保持在 Rust runtime contract 之外，以及哪些初始化和验证命令证明脚本工具仍可用。

## 范围

Vibe Check 复用 Docnav 的脚本工具组织方式，用于开发期质量观测。

当前由 Vibe Check 拥有的消费入口是：

- `scripts/quality/scan.ts`：开发期质量观测入口，使用 `foundation` 和
  `quality-core`。
- `scripts/quality/annotate.ts`：把 quality warning NDJSON 渲染为 GitHub
  Actions warning annotation。
- `scripts/docs/validate.ts`：校验 Markdown 链接、JSON 语法、report schema
  编译和 report examples。
- `scripts/cargo/with-bins.ts`：构建指定 Cargo binary，并把 executable path
  注入下游命令环境变量。
- `scripts/vibe-check-workspace/verify.ts`：项目级验证编排入口，使用
  `parallel-task-runner` 并行运行本地检查。

新增任何 Vibe Check-owned consumer 时，必须在本文补充入口、owner 和验证命令。

这些工具不属于 Rust CLI runtime contract。

## 工具来源

可复用脚本工具以 pinned submodule 形式放在 `scripts/tools/` 下：

- `foundation`：process、Git、path、filesystem、JSON、CSV、NDJSON、
  argument、error 和 type guard helpers。
- `parallel-task-runner`：task normalization、dependency graph validation、
  concurrency、mutex scheduling 和 lifecycle hooks。
- `quality-core`：quality schema/types、code area classification、scanner
  adapters、metrics aggregation、warnings、reports、baseline/cache primitives
  和 `runQualityScan`。

每个 toolkit 都通过 `scripts/tools/*/src` 的源码 import 被消费。它们不是 npm
package contract。

## 新 checkout 初始化

在新的 checkout 里运行脚本工具前，先初始化 toolkit submodule，并安装 lockfile
固定的 Node 依赖：

```bash
git submodule update --init --recursive
pnpm install --frozen-lockfile
```

这些命令只准备本地开发工具，不构建也不修改 `vibe-check` Rust binary。

## Runtime 边界

`vibe-check` Rust binary 仍然是产品 runtime 和 release contract。脚本工具可以
为本地观测调用 lizard、scc、jscpd、Cargo、OpenSpec 和 JSON schema validator，但
这些结果不能替代 Rust scanner adapter、schema examples、CLI contract tests 或
OpenSpec validation。

开发期 quality 入口是：

```bash
bun scripts/quality/scan.ts --profile quick
```

默认 artifact 写入 `artifacts/vibe-check-quality/`，并作为 generated local state
忽略。

开发期 workspace 验证入口是：

```bash
bun scripts/vibe-check-workspace/verify.ts --profile required
```

验证日志写入 `.log/verify/workspace/`。日志和 artifact 只用于本地定位，不属于
release artifact。

## 配置所有权

`scripts/quality/config.ts` 拥有开发期 quality observation 默认配置：

- Vibe Check source、docs、schemas 和 OpenSpec material 的 include / exclude globs。
- code area 分组和 warning policy 名称。
- lizard、scc 和 jscpd command discovery。
- artifact 和 cache 路径。

长期产品语义仍由 `docs/architecture.md`、`docs/scanner-dependencies.md`、
`docs/quality-metrics.md`、`docs/output.md` 及其 schema/examples 拥有。

`scripts/tools/validators/config.ts` 拥有开发期文档验证路径和任务名；它只登记
现有 schema/example 路径，不重新定义 output contract。

`scripts/vibe-check-workspace/checks/definitions.ts` 拥有 workspace verifier 的
任务集合、profile 分层、warning output 识别和成功输出过滤。它不定义产品行为，
只编排已有命令。

## 验证

修改脚本工具接入时，如果 `node_modules/` 或 `scripts/tools/*` 缺失，先完成上面的
新 checkout 初始化。

按改动面选择最窄验证：

- 根脚本配置或 Vibe Check quality 入口：

```bash
bun run typecheck:scripts
bun run lint:scripts
bun run quality:check
```

- 文档 validator、schema/example 校验或 Markdown 链接校验：

```bash
bun run validate:docs
```

- Workspace verifier 编排、任务定义或输出过滤：

```bash
bun run verify:vibe-check-workspace:required
```

- Toolkit pin、source checkout 或面向 toolkit 的 import：

```bash
bun run toolkit:foundation:test
bun run toolkit:parallel:test
bun run toolkit:quality:test
```

Rust 行为改动仍按 `docs/navigation.md` 的 Rust 验证路径执行。
