# CLI

本文是 Vibe Check CLI 行为的主规范，固定命令面、路径、配置入口、输出模式、通道和退出码。

## 命令面

MVP 提供以下命令：

```text
vibe-check scan [project-root] [--format human|json] [--config <path>]
vibe-check --help
vibe-check scan --help
vibe-check --version
```

`scan` 是质量扫描 operation。Help 和 version 命令不启动 scan pipeline，不产生 scan report。

## Scan 执行

`vibe-check scan` 把 argv 解析成 core scan request，然后调用 core scan pipeline。

CLI 只处理命令、flag、路径、配置入口、输出模式、stdout/stderr 和顶层错误映射。指标、warning、gate、report data、JSON 字段和人读输出由下游 owner 负责。

输出模式只影响 report data 的渲染方式，不改变扫描、聚合、warning 或 gate 语义。

## Parser 与 help

Parser 必须在启动 scanner execution 前拒绝以下 invocation：

- 未知命令或未知 flag。
- 不支持的 `--format` 值。
- 无效、不可访问或不是目录的 `project-root`。
- 无效、不可访问或不是文件的显式 config path。

Help 和 version 命令成功时退出码为 `0`。它们的输出不承诺 scan report shape。

## 项目根与路径

`project-root` 是被扫描项目根目录。

省略 `project-root` 时，CLI 使用启动 cwd。相对 `project-root` 基于启动 cwd 解析；绝对路径保留文件系统语义。CLI 在调用 core 前把 project root 归一化。

归一化后的 core scan request 不携带原始 argv 字符串。Core、Scanner 和 Output 不重新解析 positional argument。

## 配置文件路径

`--config <path>` 选择本次 invocation 使用的显式配置文件。显式 path 是文件路径，不是目录；CLI 不自动追加默认文件名。

相对 config path 基于启动 cwd 解析，并在传给 core 前归一化。

未传 `--config` 时，配置发现和默认配置语义由 Config owner 定义。

## 输出模式

`scan` 支持以下输出模式：

| Mode | 用途 |
| --- | --- |
| `human` | 默认模式。面向本地阅读和定位。 |
| `json` | 固定机器格式。面向脚本、CI、agent、schema 校验和审计。 |

MVP 不支持独立 `ci` mode。CI 默认消费 `json` 输出，并结合退出码判断 gate 状态。

## 通道

- `human` scan report 写 stdout。
- `json` scan report 写 stdout，且 stdout 只包含一个 JSON object。
- Usage error、输入/config error、scanner fatal、output failure 和 report envelope 之外的顶层诊断写 stderr。
- 输入错误不向 stdout 写 scan report。

## 退出码

CLI 使用以下进程退出码：

- 扫描完成、gate 通过、输出成功退出 `0`。
- 扫描完成、gate 未通过退出 `1`。
- 用户输入或配置错误退出 `2`。
- Scanner 在 report 完成前 fatal 失败退出 `3`。
- Report data 已存在，但输出投影或写入失败退出 `4`。
