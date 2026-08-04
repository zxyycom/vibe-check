# CLI

本文是 Vibe Check 产品 CLI 的主规范，固定正式 command、project root、scan flags、`init`
routing、console 通道和进程状态。Project config 内容、选择、schema 与 initialization safety
由 [Configuration](configuration.md) 维护；metrics、warning、baseline 与 artifact 内容由对应
owner 维护。

## 产品入口

正式本地入口是：

```text
bun run product:cli -- --help
bun run product:cli -- scan [project-root] [options]
bun run product:cli -- init [project-root]
```

实现归属位于 `src/product/**`。入口为 TypeScript/Bun product 提供 command routing、
project-root 归一化、scan 参数解析、configuration initialization 与进程状态映射；具体 config
workflow 由 [Configuration](configuration.md) 维护。Rust CLI 和根 Cargo 产品入口已退役。

## 命令面

Product CLI 提供两个独立 operation：

```text
bun run product:cli -- scan [project-root] [options]
bun run product:cli -- scan [project-root] --help
bun run product:cli -- init [project-root]
bun run product:cli -- init --help
```

`scan` 调用唯一的 `runQualityScan` core；`init` 只执行 project-root validation、config/schema
generation、target ensure 与 CLI result mapping。Root help 同时列出两者。未知
operation 或 flag 必须在启动 scanner 前失败；任一 help 成功时退出 `0`，不启动 scan 或
initialization mutation。

## Project root

`project-root` 是 scan target 或 initialization target。两个 operation 都接受零或一个
positional；省略时使用 startup cwd，相对路径基于 startup cwd 解析并归一化。正式入口不得把
Vibe Check 仓库根硬编码为所有调用者的默认值。`init` 要求 normalized root 已是 directory；
完整 filesystem contract 见 [Initialization](configuration.md#initialization)。

仓库 dogfood wrapper 是例外：`quality:check`、`quality:full-check`、`quality:scan`、
`quality:gate` 和 `scripts/quality/scan.ts` 必须显式传入 Vibe Check 仓库根，以保持当前
仓库自动化行为。

## Scan flags

正式入口接收当前 TypeScript product flags：

| Flag | 现有语义 |
| --- | --- |
| `--profile <quick\|full>` | 选择 quick 或 full；默认 `full` |
| `--baseline <revision>` | 显式选择一个本地可解析的 commit revision，并生成 baseline comparison |
| `--changed-files <file>` | 读取每行一个 project-relative path 的显式 changed-file 输入 |
| `--config <file>` | 显式选择一份 complete semantic document v1（UTF-8 Vibe Check JSON） |
| `--top-n <n>` | 设置报告 ranking 数量 |
| `--artifact-dir <dir>` | 设置 artifact 目录 |
| `--skip-baseline` | 显式声明只扫描当前快照；为兼容保留，省略 baseline 时行为相同 |
| `--gate <all\|changed\|regressions>` | 显式选择 blocking gate；省略时 gate disabled |
| `--verification-output` | 使用现有 accepted-warning-aware verification summary |
| `--help` | 输出 scan help 并成功退出 |

Quick profile 继续拒绝 `--baseline`。`--baseline` 是单值非空参数，重复传入、与
`--skip-baseline` 组合或无法解析为 commit 都是 usage error。已移除的
`--with-baseline` 不再启用任何兼容行为，只返回带迁移提示的 usage error。其它正整数校验
和错误文本保持当前 product parser 行为；`--config` 也是单值参数，重复传入直接失败。
Product CLI 不提供 `--format` 或 `--version`。

`--gate` 至多出现一次；合法 values 与 help text 从 product-owned policy descriptor 派生。
省略时 CLI 传递 disabled request，warning 或 empty quality result 继续非阻断。Missing
value、duplicate option 或 unknown value 是 usage error，在 scanner 和 artifacts 启动前
退出 `3`。

Gate scan planning 保持以下边界：

- `all` 只评价 resolved profile 的 `warnings.all`，不改变调用者选择的 quick/full
  capabilities 或显式 baseline plan。
- 省略 `--baseline` 的 quick/full scan 都只生成 current snapshot；产品不从 previous
  commit、nearest code commit、merge base、upstream、branch 或 remote 推断 baseline。
- `changed` / `regressions` 必须使用 full profile 和显式 `--baseline <revision>`；缺少
  baseline 在 scanner、cache 与 artifacts 启动前作为 usage error 退出 `3`。
- Comparison policy 与 quick profile 或显式 `--skip-baseline` 冲突，在 scanner 和 artifacts
  启动前作为 usage error 退出 `3`。
- `--verification-output` 只改变人读 warning preview，不选择或覆盖 gate policy。

Raw revision 在 project root 和 arguments 归一化后立即通过本地 Git 解析一次；branch、tag、
abbreviated SHA 或 full SHA 都必须 peel 到 commit。成功后，CLI 只把 canonical full commit
object ID 作为 comparison identity 交给 core；changed-scope、cache、materialization、metadata
和 artifacts 复用该 identity，不重复解析原始 spelling，也不 fetch。Config selection 与 current
scanner preflight 只在解析成功后启动，但不消费 raw revision 或推断 baseline。无效、非 commit
或本地不可用的 revision 退出 `3`，且不输出 config provenance、不启动 scanner/cache，也不创建
artifact 目录。

相对 `--changed-files` 列表文件路径基于 normalized project root 按平台原生规则解析，
包括 `.` / `..` segments；解析结果可以位于 project root 外。绝对列表文件路径保持绝对。
列表中的 entries 始终作为 normalized project root 下的 project paths 解释，不相对于列表
文件所在目录解释。Product parser、正式入口和 dogfood wrapper 只透传该选项值，不增加
其它 rebasing 基准。

列表读取失败继续报告 `failed to read --changed-files`；错误分类与 exit mapping 由
[进程状态](#进程状态)统一定义。

相对 `--config` path 同样基于 normalized project root 按平台原生规则解析；absolute path 保持
absolute。Config selection 由 Product Config 在 scan work 前执行：explicit `--config` 优先，
否则发现 fixed `.vibe-check/config.json`，两者都 absent 且 gate disabled 时使用 non-persisted
neutral default。任一 gate 要求 complete file-backed policy。Vibe Check JSON grammar、selected
file finality、`ResolvedQualityConfig` mapping 与 CLI field precedence 由
[Configuration](configuration.md#selection-and-path-rules) 维护。

## CLI 边界

Product CLI 只负责：

- 分流 `scan` 与 `init` operation。
- 解析并归一化 project root。
- 把其余 flags 交给 product parser，并归一化 gate prerequisite-aware scan plan。
- 在 config、dependency、scanner、cache 与 artifact work 前，把唯一显式 baseline revision
  解析为 canonical full commit object ID。
- 让 Product Config 在 core 启动前选择并映射唯一 semantic value，再报告 config provenance。
- 在 banner/cache/artifact work 前构造一次 `ScannerDependencySnapshot`。
- 把同一 `ResolvedQualityConfig`、`ScannerDependencySnapshot` 与 normalized gate request 交给
  scan core。
- 对 `init` 只调用 Product Config initializer，并投影 target paths、state 或 failure。
- 把 core process outcome 映射为进程状态，并保持顶层 error 边界。

CLI 不重新实现 file collection、scanner 调用、metrics、warning、baseline、artifact
serialization、scan completeness、gate evaluation 或 report rendering。CLI 不按 capability
ID/status 增加分支，只消费 core 已决定的 `success` / `gate-failed` / `failed` process
outcome。产品源码不得导入 dogfood wrapper。

## Console 与 artifacts

Scan 在 request 与显式 baseline input 通过 pre-work validation 后、dependency preflight 前，
把 `default (not persisted)` 或 file-backed source/path provenance 写入 stdout，随后继续写
banner、profile、进度、artifact paths、summary、warning preview 和 completion status。
Machine paths 只有在一个 DTO 产生的 `metrics.json`、
`warnings.ndjson`、`warnings-all.ndjson` candidates 通过 complete-set validation、三个
canonical writes 和 human report write 都成功后才作为 trusted paths 输出。Core 收集到的
fatal issues 和未处理顶层 error 写入 stderr；scanner process 的原生 stdout/stderr 不直接
成为产品 console contract。首次或重复 `init` success 都向 stdout 中性地报告两个 absolute
target paths 与 `discovery-ready` state；initialization diagnostic 写入 stderr。

产品不提供旧 Rust CLI 的 `human` / `json` stdout mode。机器与人读结果继续通过
`metrics.json`、warnings NDJSON、`report.md` 和 raw artifacts 交付，具体语义由
[输出边界](output.md) 维护。Current machine output 只有
`vibe-check.metrics.v1` / `vibe-check.warning.v1` single-active structure；CLI 不选择 legacy
format、schema version 或 alternate writer。

## 进程状态

Product Core 在 final core validation、complete candidate-set validation、canonical
publication 与 human report write 完成后产生 process outcome，CLI 只做以下映射：

| Process outcome | CLI exit |
| --- | --- |
| `success`：gate disabled/passed，且 core/output 成功 | `0` |
| `gate-failed`：evaluated gate failed，且 artifacts 已写出并验证 | `1` |
| `failed`：gate not-evaluated，或 completeness/runtime/output failure | `2` |

Configuration workflow 在 scan process outcome 之前拥有独立 mapping：

| Configuration result | CLI exit |
| --- | --- |
| `init` 确保两个 safe target files 存在，包括 repeated no-op 或 single-file fill | `0` |
| Gate 缺少 file-backed policy，或 selected config 读取/校验失败 | `3` |
| `init` usage、root、target、creation 或 handled cleanup failure | `3` |

省略 gate 时，`empty` 仍是 non-fatal warning 并退出 `0`，但 human completion 必须说明
质量未评价；requested gate 遇到 empty 时为 not-evaluated 并退出 `2`。Evaluated gate
failure 本身不等于 runtime failure，只有已验证 artifacts 才能形成 exit `1`；artifact
write 或 output validation failure 优先并退出 `2`。

Output `failed` 包括 projection/candidate validation、publication cleanup、temp write、rename
或 report write failure。Handled publication failure best-effort 清除三个 canonical machine
files 与 product-owned temps，不打印 trusted machine paths；computed gate failure 不得把它
改写成 exit `1`。这不构成 multi-file transaction，canonical files alone 也不证明 current
run；publication/evidence 与 concurrent-writer 边界见
[Validated publication and evidence](output.md#validated-publication-and-evidence)。

未处理 scan 顶层 error 默认退出 `2`；typed operational override error 也退出 `2`，但发生在
banner、scanner、baseline、cache 和 artifact work 前。现有 mapping 对 `ENOENT`（包括 missing
`--changed-files` list）、config-related error 或 CLI usage error 返回 `3`。Missing/invalid
baseline、explicit/discovered config、gate prerequisite、legacy config 与 usage failure 同样在
scan work 前发生；baseline input validation 先于 config selection，因此不会产生 config
provenance 或其它 scan side effect。详细 pre-work failure ownership 分别见
[Configuration](configuration.md#failure-and-hard-cut-behavior) 与
[Scanner 依赖选择](scanner-dependencies.md#operational-overrides)。

已退役 Rust CLI 的 output-failure exit `4` 不属于当前 CLI contract；当前 TypeScript
Product CLI 的 exit `1` 只表示可信的 evaluated gate failure。

## Dogfood wrapper

Dogfood wrapper 可以为仓库验证选择既有 profile 或 artifact 参数，但必须把用户显式提供的
baseline revision、其它参数、stdout、stderr 和进程状态透明传给正式入口。Wrapper 不得拥有
baseline 推断策略，也不得拥有第二套 parser、默认
配置、scan core、gate evaluator、output renderer 或 status mapping。`quality:check`、
`quality:full-check` 与默认 `quality:scan` 保持省略 gate，且 `quality:full-check` 是无 baseline
的 full current snapshot；`quality:gate` 只通过 thin wrapper 固定传入
`--profile full --gate regressions`，调用者必须另行透传 `--baseline <revision>`。Wrapper 只
显式传入 Vibe Check repository root，
因此 Product Config 从该 root 发现 repository policy；调用者传入 `--config` 时仍保持 public
explicit precedence。具体 consumer contract 由 [脚本工具](script-tooling.md) 维护。
