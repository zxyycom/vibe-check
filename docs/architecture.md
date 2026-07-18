# 架构

本文是 Vibe Check 组件职责、源码所有权、输出分层、scanner 边界和运行边界的主规范。

## 核心定位

Vibe Check 的产品实现是 `src/product/**` 下由本仓库拥有的 TypeScript/Bun 源码。
`bun run product:cli -- scan [project-root]` 是正式本地入口，负责 operation 分流、
project-root 归一化、现有 scan flags、顶层 error 和进程状态映射。扫描编排由 product core
拥有，负责文件收集、scanner 调用、指标聚合、baseline comparison、warning、artifact 和
最终 quality status。

仓库 dogfood 命令 `quality:check`、`quality:full-check`、`quality:scan` 及保留的
`scripts/quality/scan.ts` 只作为单向薄 wrapper：它们显式传入 Vibe Check 仓库根并调用
同一产品入口。`src/product/**` 不反向导入 `scripts/**` 或 toolkit gitlink。

### 当前实现状态

`src/product/**` 已拥有正式 CLI、参数解析、默认与显式完整配置、扫描 core、scanner
adapters、warnings 和 output。`src/product/config.ts` 拥有内置默认值，
`src/product/config-file.ts`、`config-parser.ts`、`config-thresholds.ts` 与
`config-validation.ts` 分别拥有显式 JSON 的 file boundary、完整结构 mapping、threshold
sections 和 path-aware primitive validation；
`src/product/quality-core/**` 与产品静态可达的 `src/product/foundation/**` 闭包均由本仓库
直接拥有。

`quality:*` 与 `scripts/quality/scan.ts` 只显式传入 Vibe Check 仓库根并单向调用正式
产品入口。Rust crate、根 Cargo 产品 workspace 和 quality-core gitlink 已移除；
`foundation` 与 `parallel-task-runner` gitlinks 只保留为开发脚本依赖，不进入产品 runtime
import closure。

核心流程保持产品化时固定的 TypeScript consumer 顺序：

```text
collect + classify
  -> fingerprint + changed scope
  -> scan
  -> aggregate
  -> baseline + compare
  -> warn
  -> write artifacts
  -> passed | warning | failed
```

`project root` 定位被扫描项目；`scan scope` 表示 product config 解析后的文件集合；
`scanner result` 表示检测能力的归一化输出；`quality metrics` 表示指标、聚合、baseline、
warning channels 和 metadata。CLI 不解析 scanner 私有输出；Output 不重新计算指标；
Scanner 不拥有 warning policy 或最终 status。

## 输出分层

TypeScript 产品扫描结果分为以下层次：

| 输出 | 用途 | Owner |
| --- | --- | --- |
| Console summary | 本地进度、summary、warning preview、completion 与 fatal 定位 | Product CLI / Output |
| `metrics.json` 与 warning NDJSON | 自动化、comparison 和 CI consumer | Output |
| `report.md` | 人读审查和定位 | Output |
| `raw/**` | 复现 scanner 与 baseline behavior | Scanner / Output |
| CI annotation | 消费 warning NDJSON，不进入产品 runtime | `scripts/**` consumer |

这些输出复用同一份 Vibe Check-owned metrics 和 warnings，但不共享稳定性承诺。Product
Core 先完成扫描和业务计算，Output 再写 console 与 artifacts；CI consumer 只读取产品
artifact，不形成第二条扫描管线。

scc CSV、Lizard CSV、jscpd reporter object、process result 和临时配置只属于 adapter
boundary。需要复现时可以保存 raw material，但第三方私有结构不成为稳定 product field。
旧 Rust CLI 的 human/JSON renderer、`vibe-check.report.v1` schema 和 examples 不是
TypeScript 迁移输入。

## 组件职责

### Product CLI

负责：

- 在 `src/product/**` 提供 `scan` operation 和正式入口。
- 解析 project root，并把现有 scan flags 交给 product parser。
- 在扫描前选择内置默认或显式完整 config，调用 product core。
- 保持 scan help、stdout/stderr、顶层 error 与进程状态映射。

Product CLI 不拥有 scan scope、scanner adapter、metrics、warning、baseline 或 artifact
shape。它不新增 `--format`、version operation、配置自动发现或第二套 output renderer。

### Product core

负责：

- 从 product config 构造 normalized scan scope 和 code areas。
- 建立 fingerprints、changed-file scope 和 optional baseline。
- 调用 scc、Python/Lizard 和 jscpd adapters。
- 将 scanner output 归一化为 Vibe Check-owned models。
- 聚合 current/baseline metrics 并生成 all / changed / regression warnings。
- 验证 metrics，写入 report data，并计算 `passed` / `warning` / `failed` outcome。

Product core 不解析 CLI operation 或 project-root positional，也不把 scanner-private
protocol 提升为 public model。

### Scanner adapter

负责：

- 使用 product config 选择的 external component 提供检测能力；默认 stack 由
  [Scanner 依赖选择](scanner-dependencies.md) 维护。
- 只消费 product core 已批准的 exact inputs。
- 隔离 availability check、process invocation、CSV/JSON report 与 parser。
- 返回 Vibe Check-owned metrics/fragments 或 normalized failure。
- 保存复现问题所需的 raw material 或 normalized scanner artifact。

Availability preflight 失败继续按现有 TypeScript behavior 记录并跳过该 component；已进入
scanner invocation 后的 process/report/parse failure 不得伪装成 successful empty result。
Scanner adapter 不拥有 warning、baseline、artifact envelope 或进程状态。

### Output

负责：

- 写入 `metrics.json`、`report.md`、warning NDJSON 和 raw artifacts。
- 从同一 metrics data 生成 summary、ranking、warning preview 和 completion text。
- 维护 artifact 路径、JSON/NDJSON serialization、Markdown report 与 stdout/stderr
  placement。
- 保持 quick/full、baseline 和 accepted-warning context 的输出一致。

Output 不拥有 file collection、scanner invocation、metrics aggregation、warning generation
或 status decision。Output 保持当前 TypeScript behavior；新增 schema、字段或 output mode
必须作为独立 contract 变更处理。

### 源码分组

当前产品源码保持既有文件分组、类型和控制流。逻辑职责包括：

- `config`：default config、完整 JSON parsing、code areas、thresholds、scanner commands
  和 artifact paths。
- `input` / `model`：file collection、fingerprints、changed scope 和 Vibe Check-owned types。
- `measurement`：scc、Python/Lizard、jscpd adapters、cache 和 aggregation。
- `warnings`：warning rules、channels、accepted reason 和 ordering。
- `output`：artifacts、Markdown report、summary 和 status text。
- `scan-command` / engine：runtime orchestration、baseline 和 final outcome。

这些是 owner 边界，不要求平行的 domain、adapter、service 或 provider hierarchy。新增
共享模块必须有独立变化原因和验证证据，不能只为源码移动制造抽象。

## 调用链

```text
caller
  -> product CLI：分流 scan、归一化 project root、解析 flags、选择完整 config
  -> product core：消费 selected config、收集文件、构造 scan context
  -> scanner adapters：执行 scc / Python-Lizard / jscpd 并归一化结果
  <- product core：聚合、baseline comparison、warnings
  -> output：写 artifacts 与 summary
  -> product core：验证 metrics 并选择 final outcome
  -> output：写 warning completion 或 fatal status
  <- product CLI：保留 stdout/stderr 与进程状态 mapping
```

Dogfood 调用只在链首增加一个显式传入仓库根的 wrapper。正式入口和 wrapper 必须到达同一
core，产品源码不得回调脚本入口。

## 运行边界

- 产品运行时源码闭包全部位于 `src/product/**`，由本仓库直接拥有；正式入口不得在运行时
  import `scripts/**` 或 toolkit gitlink。
- Product runtime 只拥有静态可达的 foundation helper；开发脚本专用 helper 留在
  toolkit。
- External scanner command、args、availability、process result 和 raw output 由 adapter
  隔离。
- Scanner 依赖基线由 [Scanner 依赖选择](scanner-dependencies.md) 拥有；架构层只要求
  product core 消费 Vibe Check-owned result。
- 当前 runtime 不保留已退役 Rust 产品的 config、scanner、output 或 status contract。
