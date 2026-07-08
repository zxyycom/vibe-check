# 脚本工具

本文档是 Vibe Check 开发脚本工具边界的 owner：记录哪些
Docnav-style toolkit 被接入、哪些 Vibe Check 脚本消费它们、这些脚本如何
保持在 Rust runtime contract 之外，以及哪些初始化和验证命令证明脚本工具仍可用。

## 范围

Vibe Check 复用 Docnav 的脚本工具组织方式，用于开发期质量观测。

当前由 Vibe Check 拥有的消费入口是 `scripts/quality/scan.ts`，它使用
`foundation` 和 `quality-core`。`parallel-task-runner` 作为固定版本的
toolkit 保留给后续本地 automation 使用；新增任何 Vibe Check-owned consumer
时，必须在本文补充入口、owner 和验证命令。

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
为本地观测调用 lizard、scc、jscpd 等外部工具，但这些结果不能替代 Rust scanner
adapter、schema examples、CLI contract tests 或 OpenSpec validation。

开发期 quality 入口是：

```bash
bun scripts/quality/scan.ts --profile quick
```

默认 artifact 写入 `artifacts/vibe-check-quality/`，并作为 generated local state
忽略。

## 配置所有权

`scripts/quality/config.ts` 拥有开发期 quality observation 默认配置：

- Vibe Check source、docs、schemas 和 OpenSpec material 的 include / exclude globs。
- code area 分组和 warning policy 名称。
- lizard、scc 和 jscpd command discovery。
- artifact 和 cache 路径。

长期产品语义仍由 `docs/architecture.md`、`docs/scanner-dependencies.md`、
`docs/quality-metrics.md`、`docs/output.md` 及其 schema/examples 拥有。

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

- Toolkit pin、source checkout 或面向 toolkit 的 import：

```bash
bun run toolkit:foundation:test
bun run toolkit:parallel:test
bun run toolkit:quality:test
```

Rust 行为改动仍按 `docs/navigation.md` 的 Rust 验证路径执行。
