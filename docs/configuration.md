# Configuration

本文是 Vibe Check 产品配置的主规范，维护内置默认配置、显式完整 JSON 配置、选择规则、
路径基准、CLI precedence 和配置失败边界。Scan scope、scanner、warning 与 artifact 内容
仍由各自 owner 维护。

## 配置选择

正式入口支持：

```text
bun run product:cli -- scan [project-root] --config <file>
```

`--config` 是单值参数，重复传入会直接报错。相对 config path 基于 normalized project
root 按平台原生规则解析；绝对路径保持绝对，包含 `..` 的相对路径也只按 project root
解析，不改用启动 cwd 或 config 文件所在目录作为新基准。

未指定 `--config` 时，scan 从 `src/product/config.ts` 的当前 `DEFAULT_CONFIG` 创建本次
默认配置，并应用该分支现有的 `VIBE_CHECK_*` tool overrides。产品不在 project root、
父目录或启动 cwd 自动发现配置，也不组合多个配置文件。

## 完整 JSON 结构

显式配置必须是 UTF-8 JSON object，并完整提供当前 `QualityConfig`。JSON 顶层直接使用下列
字段，不增加 envelope、别名或另一套 public model：

| Field | 类型与内容 |
| --- | --- |
| `version` | string；写入 scan metadata 的 config version |
| `include` | string array；scan scope include globs |
| `excludeDirs` | string array；排除目录名或路径 |
| `generatedFiles` | string array；generated-file globs |
| `codeAreas` | object；每个 key 对应一个 code area definition |
| `lizard` | object；函数复杂度、代码密度和参数数量阈值 |
| `scc` | object；文件代码行与 low-decision-token allowance |
| `jscpd` | object；并发、minimum tokens、format mapping 与 duplicate threshold |
| `acceptedWarnings` | array；已接受 warning 的精确匹配条件与原因 |
| `report` | object；标题、notice、ranking、timezone 与 watchlist |
| `artifactDir` | string；相对于 project root 的默认 artifact path |
| `cacheDir` | string；相对于 project root 的 cache path |
| `tools` | object；Lizard、scc 与 jscpd 的 command / args |

Nested object 结构如下：

- `codeAreas.<name>`：`description`、`globs`、`excludeGlobs`、`warningPolicy`。
  `warningPolicy` 只能是 `strict`、`moderate`、`relaxed`、`watchlist-only` 或
  `exclude-warnings`。
- `lizard.cyclomaticComplexity` 与 `lizard.parameterCount`：
  `absoluteFloor`、`changedDelta`。
- `lizard.functionCodeDensity`：`absoluteFloor`、`changedDelta` 和
  `lowComplexityAllowance`；allowance 包含 `codeLineFloor` 与
  `maxCyclomaticComplexityExclusive`。
- `scc.fileCodeLines`：`absoluteFloor`、`changedDelta` 和
  `lowDecisionTokenAllowance`；allowance 包含 `codeLineFloor` 与
  `maxDecisionTokens`。
- `jscpd`：`maxParallelTasks`、`minimumTokens` number map、
  `formatByCodeArea` string-or-null map、`defaultMinimumTokens` 和
  `duplicateFragments.changedDelta`。
- `report`：`title`、`nonBlockingNotice`、`footerGeneratedBy`、`footerNotice`、
  `topN`、`timeZone`、`showWatchlist`、`watchlistMax`。`topN` 控制各 ranking 数量；
  `showWatchlist` 控制 Changed Files Watchlist 是否出现，`watchlistMax` 独立控制其最多
  展示条数。
- `tools.<lizard|scc|jscpd>`：`command` string 与 `args` string array。
- `acceptedWarnings[]` 必须包含 `ruleId`、`reason`；可选
  `codeArea`、`messageIncludes`、`metric`、`path`、`sourceTool`、
  `suggestionIncludes`、`value`。

Parser 拒绝缺失字段、未知字段、错误类型、非有限 number、非法 `warningPolicy` 和无效
`timeZone`。成功时返回一份新的 typed config，字段值保持输入值；parser 不从
`DEFAULT_CONFIG` 补字段或修改输入对象。

完整、可执行的 canonical example 是
[`fixtures/projects/configured-typescript/vibe-check.config.json`](../fixtures/projects/configured-typescript/vibe-check.config.json)。

## Replacement 与 CLI precedence

指定 `--config` 后，显式配置整体替换 `DEFAULT_CONFIG`。本次 scan 不把 built-in field、
`VIBE_CHECK_*` environment value 或其它文件合并进显式配置。Invocation 开始时只读取一次
config；current、baseline 与 Git-failure fallback collection 使用同一份 parsed value。

只有两个现有显式 CLI option 覆盖对应配置字段：

1. `--top-n` 覆盖 `config.report.topN`。
2. `--artifact-dir` 覆盖 `config.artifactDir`。

调用者未显式传入它们时，使用 selected config 的值；其它配置字段不接受 CLI
patch。未指定 `--config` 时，default-config selection 继续保留当前 `VIBE_CHECK_*` tool
command / args 行为。

## 可信配置边界

完整配置包含外部 tool command 与 args。Product 会执行 selected config 中的命令，因此
调用者只能选择可信的本地配置文件；配置文件与普通外部输入一样在执行前完成结构校验，但
结构校验不把不可信命令变成安全命令。

Scanner adapter 继续拥有 availability、process、protocol 和 failure normalization。
Configuration owner 只选择并校验 command / args，不把 scanner 私有输出提升为产品配置或
稳定输出。

## 错误行为

Config owner 在 `runQualityScan` 前完成 regular-file、UTF-8、JSON object 和完整
`QualityConfig` 校验。文件不存在、不是 regular file、不可读、编码无效、JSON 无效或
结构无效时：

- stderr 报告包含 resolved config path 的顶层 config error。
- Product CLI 退出 `3`。
- 不打印 scan banner，不启动 scanner 或 baseline。
- 不创建成功 scan artifacts，也不回退 `DEFAULT_CONFIG`。

配置类型演进时，必须在同一 change 同步 `QualityConfig`、严格 parser、本 owner、
canonical fixture 和对应 unit / formal-entry tests。
