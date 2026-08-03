# 架构

本文是 Vibe Check 组件职责、源码所有权、输出分层、scanner 边界和运行边界的主规范。

## 核心定位

Vibe Check 的产品实现是 `src/product/**` 下由本仓库拥有的 TypeScript/Bun 源码。
`bun run product:cli -- scan [project-root]` 是正式本地入口，负责 operation 分流、
project-root 归一化、现有 scan flags、顶层 error 和进程状态映射。扫描编排由 product core
拥有，负责文件收集、scanner 调用、指标聚合、baseline comparison、warning、GateResult、
artifact orchestration，以及彼此独立的 quality status 与 process outcome。Product Output
在 Core business models 与 public machine transport 之间维持显式 DTO/schema boundary；完整
machine contract 由 [Output](output.md#machine-v1-contract-and-ownership) 拥有。

仓库 dogfood 命令 `quality:check`、`quality:full-check` 与 `quality:scan` 保持省略 gate
的观察行为；`quality:gate` 通过 full `regressions` policy 显式 opt-in 阻断。所有
`quality:*` 命令及保留的 `scripts/quality/scan.ts` 都只作为单向薄 wrapper：它们显式
传入 Vibe Check 仓库根并调用同一产品入口。`src/product/**` 不反向导入 `scripts/**`
或 toolkit gitlink。

### 当前实现状态

`src/product/**` 已拥有正式 CLI、参数解析、默认与显式完整配置、扫描 core、scanner
adapters、warnings 和 output。`src/product/config.ts` 拥有内置默认值，
`src/product/config-file.ts`、`config-parser.ts`、`config-thresholds.ts` 与
`config-validation.ts` 分别拥有显式 JSON 的 file boundary、完整结构 mapping、threshold
sections 和 path-aware primitive validation；
`src/product/quality-core/**` 与产品静态可达的 `src/product/foundation/**` 闭包均由本仓库
直接拥有。

`quality:*` 与 `scripts/quality/scan.ts` 只显式传入 Vibe Check 仓库根并单向调用正式
产品入口；wrapper 不选择、评价或重写 gate result。Rust crate、根 Cargo 产品 workspace
和 quality-core gitlink 已移除；
`foundation` 与 `parallel-task-runner` gitlinks 只保留为开发脚本依赖，不进入产品 runtime
import closure。

核心流程保持产品化时固定的 TypeScript consumer 顺序：

```text
collect + classify
  -> fingerprint + changed scope
  -> capability eligibility + scan
  -> aggregate + current completeness
  -> baseline + compare
  -> warnings
  -> evaluate GateResult once
  -> validate final core model
  -> project one machine DTO + serialize three in-memory candidates
  -> validate complete candidate set + publish three canonical machine files
  -> write human report
  -> calculate quality status
  -> publish success | gate-failed | failed process outcome
```

GateResult 只在 completeness、comparison 和 warning data 全部最终确定后评价一次，不回写
quality status。`passed` / `warning` / `failed` quality status 描述扫描质量结论；
`success` / `gate-failed` / `failed` process outcome 描述 CLI 执行结果。Core validation
先于 machine projection；Output 从一个 DTO 生成三个 candidates，并在任何 canonical write
前验证 complete set。三个 canonical machine writes 与 human report 完成后才打印 trusted
paths 并发布 outcome；handled output failure 直接发布 `failed`，不能被 computed gate
覆盖。Published files 还必须结合 producing invocation outcome 才构成 current-run evidence，
完整模型见 [Validated publication and evidence](output.md#validated-publication-and-evidence)。

`project root` 定位被扫描项目；`scan scope` 表示 product config 解析后的文件集合；
`scanner result` 表示检测能力的归一化输出；`quality metrics` 表示指标、聚合、baseline、
warning channels、GateResult 和 metadata。CLI 不解析 scanner 私有输出；Output 不重新计算
指标或 GateResult；Scanner 不拥有 warning policy、quality status 或 process outcome。

## 输出分层

TypeScript 产品扫描结果分为以下层次：

| 输出 | 用途 | Owner |
| --- | --- | --- |
| Console summary | 本地进度、summary、warning preview、completion 与 fatal 定位 | Product CLI / Output |
| `metrics.json` 与 warning NDJSON | 单一 current machine v1 set，供自动化、comparison 和 CI consumer | Output runtime schema / DTO / validators |
| `report.md` | 人读审查和定位 | Output |
| `raw/**` | 复现 scanner 与 baseline behavior | Scanner / Output |
| CI annotation | 经 Product warning-stream validator 完整验证后消费 warning NDJSON，不进入产品 runtime | `scripts/**` consumer |

这些输出复用同一份 Vibe Check-owned metrics、warnings 和 GateResult，但 machine v1、human
report 与 scanner raw material 的稳定性承诺不同。Core 的 `QualityMetrics` /
`WarningRecord` 不获得 transport identity；Output explicit mapper 产生 schema-derived
`MachineMetricsV1` / `MachineWarningV1`，两个 streams 只从该 DTO channels 产生。Public
field、byte grammar、set invariants、publication/evidence 与 schema/example index 统一由
[Output](output.md) 维护。CI consumer 只读取并验证产品 artifact，不形成第二条扫描管线。

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
- 从每项 current capability 的 shared final result 归约 overall completeness。
- 聚合 current/baseline metrics 并生成 warning channels。
- 在 final completeness、comparison 和 warnings 后一次性评价 GateResult，不让 gate
  evaluation 改写 quality status。
- 先验证 final core model，再协调一个 machine DTO 的 candidate validation/publication 与
  human report 写入；成功后计算独立 quality status，并发布 `success`、可信的
  `gate-failed` 或 `failed` process outcome。Handled output failure 直接发布 `failed` / exit
  `2`。

Product core 不解析 CLI operation 或 project-root positional，也不把 scanner-private
protocol 提升为 public model。

### Scanner adapter

负责：

- 使用 product config 选择的 external component 提供检测能力；默认 stack 由
  [Scanner 依赖选择](scanner-dependencies.md) 维护。
- 只消费 product core 已批准的 exact inputs。
- 隔离 availability check、process invocation、CSV/JSON report 与 parser。
- 返回 Vibe Check-owned metrics/fragments 和 shared capability result。
- 保存复现问题所需的 raw material 或 normalized scanner artifact。

Product core 先确定 capability eligibility；profile 未请求或没有 eligible input 时不解析、
检查或启动 component。有 eligible input 时，dependency unavailable、process failure 与
invalid result 进入 normalized failed capability result，不能伪装成 successful empty
result。Scanner adapter 不拥有 overall reducer、warning、baseline、artifact envelope 或
进程状态。

### Output

负责：

- 在 final core `QualityMetrics` / `WarningRecord` 与 public machine transport 间维持显式
  mapper，不把 transport identity 写回 Core。
- 维护 runtime schema 唯一 field owner、schema-derived DTO types、deterministic serializers、
  warning-stream/artifact-set validators 与 `src/product/machine-output.ts` shallow export。
- 从一个 DTO 产生并在 canonical write 前验证 `metrics.json` 与两个 warning streams；
  published set 完成后写 `report.md`，并保持 handled failure cleanup / exit priority。
- 写入 `report.md` 和 raw artifacts；raw material 不进入 machine v1 set。
- 从同一 metrics data、completeness record 与 GateResult 生成 summary、ranking、warning
  preview 和 completion text。
- 维护 artifact 路径、JSON/NDJSON serialization、Markdown report 与 stdout/stderr
  placement。
- 保持 quick/full、baseline 和 accepted-warning context 的输出一致。

Output 不拥有 file collection、scanner invocation、metrics aggregation、warning generation、
GateResult evaluation、quality status 或 process outcome decision。Output 保持当前
single-active v1；新增或改变 public field、unit、path、order、identity、schema 或 output mode
必须作为独立 contract version change 处理。Multi-file transaction 与 same-directory
concurrent writer support 不属于当前承诺，详见
[Validated publication and evidence](output.md#validated-publication-and-evidence)。

### 源码分组

当前产品源码保持既有文件分组、类型和控制流。逻辑职责包括：

- `config`：default config、完整 JSON parsing、code areas、thresholds、scanner commands
  和 artifact paths。
- `input` / `model`：file collection、fingerprints、changed scope 和 Vibe Check-owned types。
- `measurement`：scc、Python/Lizard、jscpd adapters、cache 和 aggregation。
- `warnings`：warning rules、channels、accepted reason 和 ordering。
- `output`：artifacts、Markdown report、summary、GateResult projection、output validation
  和 status text。
- `scan-command` / engine：runtime orchestration、baseline、final evidence、一次性
  GateResult evaluation 和 process outcome。

这些是 owner 边界，不要求平行的 domain、adapter、service 或 provider hierarchy。新增
共享模块必须有独立变化原因和验证证据，不能只为源码移动制造抽象。

## 调用链

```text
caller
  -> product CLI：分流 scan、归一化 project root、解析 flags、选择完整 config
  -> product core：消费 selected config、收集文件、构造 scan context
  -> scanner adapters：执行 scc / Python-Lizard / jscpd 并归一化结果
  <- product core：聚合 current results、归约 completeness、comparison 与 warnings
  -> product core：在 final evidence 与 warnings 后一次性评价 GateResult
  -> product core：验证 final QualityMetrics
  -> output：投影一个 machine DTO、序列化并验证 complete candidate set、发布 canonical machine set、写 human report
  <- product core：成功后计算 quality status，并结合 GateResult 发布 success | gate-failed | failed；handled output failure 直接发布 failed
  <- product CLI：保留 stdout/stderr 与进程状态 mapping
```

Dogfood 调用只在链首增加一个显式传入仓库根的 wrapper。正式入口和 wrapper 必须到达同一
core，产品源码不得回调脚本入口。

## 运行边界

- 产品运行时源码闭包全部位于 `src/product/**`，由本仓库直接拥有；正式入口不得在运行时
  import `scripts/**` 或 toolkit gitlink。
- Product runtime 只拥有静态可达的 foundation helper；开发脚本专用 helper 留在
  toolkit。
- Machine schema/types/mappers/serializers/validators 位于 `src/product/**`，repository
  consumer 只经 `src/product/machine-output.ts` shallow boundary 复用；product runtime 不读
  `docs/**` / `scripts/**`，scripts 不 deep-import quality-core machine internals。
- External scanner command、args、availability、process result 和 raw output 由 adapter
  隔离。
- Scanner 依赖基线由 [Scanner 依赖选择](scanner-dependencies.md) 拥有；架构层只要求
  product core 消费 Vibe Check-owned result。
- 当前 runtime 不保留已退役 Rust 产品的 config、scanner、output 或 status contract。
