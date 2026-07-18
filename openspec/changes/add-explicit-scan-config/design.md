# Explicit Scan Configuration Design

## Context

`runScan(projectRoot, argv)` 当前始终把 `DEFAULT_CONFIG` 交给 `runQualityScan`。
`QualityConfig` 已经包含 scope、code areas、thresholds、accepted warnings、report、
artifact/cache 和 tools。首版显式配置直接复用这个完整结构，不再设计第二套 public model。

## Goals

- 调用者通过 `--config <file>` 提供完整配置。
- 显式配置整体替换 `DEFAULT_CONFIG`。
- 配置错误在扫描开始前直接返回。
- Checked-in fixture 证明正式入口确实使用显式配置。
- 未指定配置时保持当前行为。

## Non-Goals

- Partial config、默认值合并、字段映射或配置继承。
- 配置自动发现、多文件组合、preset 或 `init`。
- JavaScript / TypeScript config module。
- 新 scanner、新 warning rule 或 Lizard TypeScript port。

## Decisions

### Decision 1: 通过正式 `scan` 命令显式选择配置

Product CLI 增加单值 `--config <file>`。相对路径基于 normalized project root 解析，绝对
路径保持绝对；未指定时使用 `DEFAULT_CONFIG`，不自动搜索配置文件。

### Decision 2: 用 checked-in external project fixture 证明能力

仓库在 `fixtures/projects/configured-typescript/` 增加独立项目 fixture，并通过正式入口
同时传入 project root 与 `--config`。

### Decision 3: JSON 内容直接对应完整 `QualityConfig`

配置对象直接使用当前 `QualityConfig` 字段：`version`、`include`、`excludeDirs`、
`generatedFiles`、`codeAreas`、`lizard`、`scc`、`jscpd`、`acceptedWarnings`、
`report`、`artifactDir`、`cacheDir` 和 `tools`。

Parser 只负责读取 JSON、确认完整结构并返回新的 `QualityConfig` value；不重命名字段、
补充缺失字段或合并其它配置。由于完整配置包含 tool command / args，调用者必须只选择
可信的本地配置文件。

### Decision 4: 显式配置整体替换默认配置

指定 `--config` 后，本次 scan 的 config 只来自该文件，不与 `DEFAULT_CONFIG` 或
`VIBE_CHECK_*` environment overrides 合并。Current、baseline 与 fallback collection
接收同一个 parsed config。

现有显式 CLI options 保持最高优先级：`--top-n` 覆盖 `config.report.topN`，
`--artifact-dir` 覆盖 `config.artifactDir`；未显式提供时使用配置中的值。

### Decision 5: 配置错误立即终止

Config file 不存在、不可读、不是有效 JSON object 或不满足完整 `QualityConfig` 结构时，
CLI 直接报告包含 config path 的错误并使用既有 config-related exit `3`。失败发生在
`runQualityScan` 前，因此不启动 scanner、baseline 或 artifact generation，也不回退到
`DEFAULT_CONFIG`。

## Risks

- 完整配置较长，但行为直接且没有隐藏 merge；fixture config 同时提供可复制示例。
- Public JSON 与当前 `QualityConfig` 同步演进；后续若改变该类型，需要同时更新 parser、
  docs、fixture 和 tests。
- 配置中的 tool command 会被执行，因此 `--config` 是显式选择可信本地配置的边界。

## Implementation Order

1. 增加完整 config parser 与失败测试。
2. 增加 `--config` routing、替换和 CLI precedence tests。
3. 增加 external fixture 与正式入口 acceptance。
4. 同步 owner docs、fixture example 和 case ledger。
5. 运行 product 与 workspace validation。

## Open Questions

已收敛：完整配置直接替换默认值，解析失败立即报错；无待确认项。
