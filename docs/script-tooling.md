# 脚本工具

本文档是 Vibe Check 开发脚本工具边界的 owner：记录共享 toolkit、Vibe
Check-owned consumer、产品与 dogfood 的调用方向、配置 owner 和脚本验证入口。

## 范围

Vibe Check 的开发脚本以本仓库 `scripts/**` 为日常依据。`scripts/tools/*`
提供共享 helper source import；consumer、默认配置、profile 和 package scripts
由 Vibe Check 拥有。

Vibe Check 拥有的开发脚本入口是：

- `scripts/quality/scan.ts`：显式传入 Vibe Check 仓库根并委托
  `bun run product:cli -- scan [project-root]` 的 dogfood 薄 wrapper。
- `scripts/quality/annotate.ts`：把 quality warning NDJSON 渲染为 GitHub
  Actions warning annotation。
- `scripts/docs/validate.ts`：校验 Markdown 链接、JSON 语法、report schema
  编译和 report examples。
- `scripts/decision-records.ts`：显式传入 Vibe Check 仓库根，复用项目内
  `decision-records` skill 的 ESM API，并提供长期决策查询、维护和检查入口。
- `scripts/vibe-check-workspace/verify.ts`：项目级验证编排入口，使用
  `parallel-task-runner` 并行运行本地检查。

新增任何 Vibe Check-owned consumer 时，必须在本文补充入口、owner 和验证命令。

这些工具不属于产品 runtime contract。`quality:check`、`quality:full-check` 和
`quality:scan` 是省略 gate 的观察命令；`quality:gate` 是显式 opt-in 的阻断命令。它们
都是 package-level dogfood wrapper，不是第二套产品入口。

## 当前实现状态

- `scripts/quality/scan.ts` 只显式传入 Vibe Check 仓库根并调用
  `src/product/cli.ts` 的正式入口。
- `quality:check`、`quality:full-check`、`quality:scan` 与 `quality:gate` 通过该
  wrapper 到达同一产品 core；wrapper 只透明传递参数和产品 exit。
- `src/product/**` 拥有 TypeScript 运行时闭包和唯一默认配置；开发脚本不保留第二套参数、
  配置或扫描 core。
- Rust 产品构建 helper 与 quality-core gitlink 已移除；`foundation` 和
  `parallel-task-runner` gitlinks 仍服务开发脚本。

## 工具来源

可复用脚本工具以 pinned submodule 形式放在 `scripts/tools/` 下：

- `foundation`：process、Git、path、filesystem、JSON、CSV、NDJSON、
  argument、error 和 type guard helpers。
- `parallel-task-runner`：task normalization、dependency graph validation、
  concurrency、mutex scheduling 和 lifecycle hooks。

每个 toolkit 都通过 `scripts/tools/*/src` 的源码 import 被消费。它们不是 npm
package contract，也不拥有 Vibe Check 的 package scripts、profile 或 artifact
路径。

质量产品的 schema/types、scanner adapters、metrics、warnings、reports、
baseline/cache primitives 和必要 `foundation` helper 闭包归属 `src/product/**`，
不是开发脚本 toolkit。开发脚本可以单向调用产品入口，但产品运行时不得 import
`scripts/**`、`foundation` gitlink 或其它 toolkit gitlink。

已移除 quality-core gitlink 的来源 revision 和产品内 foundation helper 闭包记录在
`src/product/README.md`。`foundation` 与 `parallel-task-runner` gitlinks 不是产品 runtime
依赖。

## 新 checkout 初始化

在新的 checkout 里运行仍由开发脚本消费的 toolkit 前，先初始化对应 submodule，并安装
lockfile 固定的 Node 依赖：

```bash
git submodule update --init --recursive
pnpm install --frozen-lockfile
```

这些命令只准备本地开发工具，不构建也不修改 `src/product/**`；quality dogfood 不依赖
quality-core submodule。

## Runtime 边界

`src/product/**` 是 TypeScript/Bun 产品 runtime 的唯一源码 owner，正式本地入口是：

```bash
bun run product:cli -- scan [project-root]
```

省略 project root 时使用启动 cwd。开发脚本可以调用 lizard、scc、jscpd、OpenSpec 和
JSON schema validator；产品扫描所需的 scanner 调用必须由 `src/product/**` 内的产品
边界拥有，不能由 wrapper 重新实现。

仓库 dogfood 入口是：

```bash
bun run quality:check
bun run quality:full-check
bun run quality:gate
bun run quality:scan
```

这些命令与 `scripts/quality/scan.ts` 必须显式传入 Vibe Check 仓库根并单向调用同一
产品入口。package consumer 分类为：

| 命令 | Gate 行为 |
| --- | --- |
| `quality:check` | quick profile，省略 gate，warning 非阻断 |
| `quality:full-check` | full profile 与 baseline，省略 gate，warning 非阻断 |
| `quality:scan` | 不隐式选择 gate policy；调用者参数透明传递 |
| `quality:gate` | full `regressions` gate；evaluated failure 或 evidence/runtime failure 按产品 exit 阻断 |

Gate policy、evidence prerequisite、evaluation 与 process mapping 仍由产品实现拥有；
`quality:gate` package script 显式传入 `--profile full --gate regressions`，thin wrapper
只透明转发 `argv` 和产品 exit。默认 artifact 继续写入
`artifacts/vibe-check-quality/`，并作为 generated local state 忽略。

开发期 workspace 验证入口是：

```bash
bun scripts/vibe-check-workspace/verify.ts --profile required
```

验证日志写入 `.log/verify/workspace/`。日志和 artifact 只用于本地定位，不属于
release artifact。

## 长期决策适配器

项目内安装的上游
[`decision-records`](https://github.com/zxyycom/skills/tree/main/skills/decision-records)
拥有决策记录格式、索引生命周期以及 CLI / ESM API 语义。Vibe Check-owned
`scripts/decision-records.ts` 显式传入仓库根、转发 CLI 参数，并为模块调用暴露
`runDecisionRecordsCli`、`scanDecisionRecords` 和 `validateDecisionRecords`。适配器不复制
解析、校验、索引维护或关系语义，`src/product/**` 也不导入该开发工具。

| 入口 | 用途 | 状态影响 |
| --- | --- | --- |
| `bun run decisions:list` | 列出活动决策的检索投影 | 只读 |
| `bun run decisions:check` | 严格检查目录、Markdown、索引和关系 | 只读 |
| `bun run decisions -- <command>` | 调用 skill 的完整 CLI | 由具体命令决定；写命令按 skill 契约执行 |

已确认的长期取舍位于 `docs/decisions/`；代码、配置和 owner 文档继续承接当前事实与行为。

## 配置所有权

产品默认配置及其 profile、scanner、warning、baseline 和 artifact 语义由
`src/product/config.ts` 唯一拥有，包括：

- Vibe Check source、docs、schemas 和 OpenSpec material 的 include / exclude globs。
- code area 分组和 warning policy 名称。
- lizard、scc 和 jscpd command discovery。
- artifact 和 cache 路径。

Gate policy 与 exit contract 由 Product CLI、Quality Metrics 和 Output owner 及其
`src/product/**` 实现拥有，不属于 config、wrapper 或 package script。

长期产品语义由 `docs/architecture.md`、`docs/scanner-dependencies.md`、
`docs/quality-metrics.md` 和 `docs/output.md` 拥有；已退役 schema/examples 的历史状态由
Output owner 说明。

`scripts/tools/validators/config.ts` 拥有开发期文档验证路径和任务名；它只登记
现有 schema/example 路径，不重新定义 output contract。

`scripts/vibe-check-workspace/checks/definitions.ts` 拥有 workspace verifier 的
任务集合、profile 分层、warning output 识别和成功输出过滤。它不定义产品行为，
只编排已有命令。

## 验证入口

修改脚本工具接入时，如果 `node_modules/` 或 `scripts/tools/*` 缺失，先完成上面的
新 checkout 初始化。

按改动面选择最窄验证：

| 改动面 | 命令 |
| --- | --- |
| 脚本类型或 lint | `bun run typecheck:scripts`、`bun run lint:scripts` |
| 长期决策适配器或记录集合 | `bun run decisions:check`；适配器改动另跑 `bun run typecheck:scripts`、`bun run lint:scripts` |
| 产品入口、dogfood wrapper 或配置接线 | `bun run quality:check`，并按影响面补充产品入口测试 |
| Opt-in repository gate | `bun run quality:gate`；该真实 gate 可按产品 contract 退出 `1` 或 `2` |
| 文档校验 | `bun run validate:docs` |
| workspace verifier | `bun run verify:vibe-check-workspace:required` |
| quality annotation | `bun run quality:annotate` |
| toolkit pin、checkout 或 import | `bun run toolkit:foundation:test`、`bun run toolkit:parallel:test` |

产品行为改动按 TypeScript/Bun 产品验证入口执行。
