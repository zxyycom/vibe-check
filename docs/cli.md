# CLI

本文是 Vibe Check 产品 CLI 的主规范，固定正式命令、project root、scan flags、console
通道和进程状态。Metrics、warning、baseline 与 artifact 内容由对应 owner 维护。

## 产品入口

正式本地入口是：

```text
bun run product:cli -- scan [project-root] [options]
```

实现归属位于 `src/product/**`。入口只为现有 TypeScript/Bun scan 提供最薄的 operation 与
project-root 分流；不提供配置文件入口、输出 mode、version operation 或另一套参数语义。
Rust CLI 和根 Cargo 产品入口已退役。

## 命令面

Product CLI 只提供 `scan` operation：

```text
bun run product:cli -- scan [project-root] [options]
bun run product:cli -- scan [project-root] --help
```

`scan` 调用唯一的 `runQualityScan` core。未知 operation 或 flag 必须在启动 scanner
前失败；`--help` 成功时退出 `0`，不启动 scan pipeline。

## Project root

`project-root` 是被扫描项目根目录。省略时使用启动 cwd；相对路径基于启动 cwd 解析，并在
交给 scan core 前归一化。正式入口不得把 Vibe Check 仓库根硬编码为所有调用者的默认值。

仓库 dogfood wrapper 是例外：`quality:check`、`quality:full-check`、`quality:scan` 和
`scripts/quality/scan.ts` 必须显式传入 Vibe Check 仓库根，以保持当前仓库自动化行为。

## Scan flags

正式入口接收当前 TypeScript product flags：

| Flag | 现有语义 |
| --- | --- |
| `--profile <quick\|full>` | 选择 quick 或 full；默认 `full` |
| `--baseline <sha>` | 使用显式 commit 生成 baseline comparison |
| `--with-baseline` | 自动选择已有 comparison 逻辑的 baseline |
| `--changed-files <file>` | 读取每行一个 project-relative path 的显式 changed-file 输入 |
| `--top-n <n>` | 设置报告 ranking 数量 |
| `--artifact-dir <dir>` | 设置 artifact 目录 |
| `--skip-baseline` | 跳过 baseline 选择与扫描 |
| `--verification-output` | 使用现有 accepted-warning-aware verification summary |
| `--help` | 输出 scan help 并成功退出 |

Quick profile 继续拒绝 `--baseline` 和 `--with-baseline`。默认值、重复 flag precedence、
正整数校验和错误文本保持当前 product parser 行为。Product CLI 不提供 `--format`、
`--config` 或 `--version`。

相对 `--changed-files` 列表文件路径基于 normalized project root 按平台原生规则解析，
包括 `.` / `..` segments；解析结果可以位于 project root 外。绝对列表文件路径保持绝对。
列表中的 entries 始终作为 normalized project root 下的 project paths 解释，不相对于列表
文件所在目录解释。Product parser、正式入口和 dogfood wrapper 只透传该选项值，不增加
其它 rebasing 基准。

列表读取失败继续报告 `failed to read --changed-files`；错误分类与 exit mapping 由
[进程状态](#进程状态)统一定义。

## CLI 边界

Product CLI 只负责：

- 分流 `scan` operation。
- 解析并归一化 project root。
- 把其余现有 flags 交给 product parser。
- 绑定默认 product config，并调用同一 scan core。
- 保持顶层 error、stdout/stderr 和进程状态映射。

CLI 不重新实现 file collection、scanner 调用、metrics、warning、baseline、artifact
serialization 或 report rendering。产品源码不得导入 dogfood wrapper。

## Console 与 artifacts

Scan 继续把 banner、profile、进度、artifact paths、summary、warning preview 和 completion
status 写入 stdout。Core 收集到的 fatal issues 和未处理顶层 error 写入 stderr；scanner
process 的原生 stdout/stderr 不直接成为产品 console contract。

产品不提供旧 Rust CLI 的 `human` / `json` stdout mode。机器与人读结果继续通过
`metrics.json`、warnings NDJSON、`report.md` 和 raw artifacts 交付，具体语义由
[输出边界](output.md) 维护。

## 进程状态

Product CLI 使用以下状态映射：

- Core 返回 `passed` 或 `warning` 时退出 `0`；warning 仍是 non-blocking development
  result。
- Core 返回 `failed` 时退出 `2`。
- 未处理顶层 error 默认退出 `2`；现有 mapping 对 `ENOENT`（包括 missing
  `--changed-files` list）或 config-related error 返回 `3`。

已退役 Rust CLI 的 gate exit `1` 和 output-failure exit `4` 不属于当前 CLI contract。

## Dogfood wrapper

Dogfood wrapper 可以为仓库验证选择既有 profile、baseline 或 artifact 参数，但必须把用户
参数、stdout、stderr 和进程状态透明传给正式入口。Wrapper 不得拥有第二套 parser、默认
配置、scan core、output renderer 或 status mapping。
