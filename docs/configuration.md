# Configuration

本文是 Vibe Check public project configuration 的主规范。它完整维护 semantic document
schema、内置默认值、显式选择、`ResolvedQualityConfig`、CLI precedence、迁移和配置失败边界。
Scan scope、scanner dependency、quality warning、artifact 内容与 external file workflow 分别由
对应 owner 维护；其它文档只摘要本层事实并链接本文。

## Current semantic config v1

当前 public contract 是 complete、closed、backend-neutral 的 semantic config v1：

- `version` 必须精确等于字符串 `"1"`，表示 document contract，不是调用者可编辑的 cache
  bust label。
- [`src/product/config-schema.ts`](../src/product/config-schema.ts) 是 exact fields、required / optional
  status、closed shapes、types、enum 和描述的 runtime source。
- [`vibe-check-config.schema.json`](schemas/vibe-check-config.schema.json) 是从同一 source 生成的
  JSON Schema 2020-12 publication。
- [`vibe-check-config.json`](examples/json/vibe-check-config.json) 是唯一 canonical semantic
  example。External fixture 的
  [`.vibe-check/config.json`](../fixtures/projects/configured-typescript/.vibe-check/config.json)
  只用于正式入口验收，不是第二个 canonical example。
- `src/product/config.ts` 的 built-in document 通过同一 runtime schema 与 semantic
  post-validation，再映射成默认 `ResolvedQualityConfig`；不存在宽松的第二套默认 schema。

Current file workflow 通过 `--config` 显式选择 UTF-8 strict JSON。Planned
[external project config workflow](../openspec/changes/add-external-project-config-workflow/README.md)
拥有 `.vibe-check/config.json` discovery、comment-capable grammar、initializer 与 `$schema`
composition；它复用本节的 semantic runtime source，不复制 field tree，也不把 scanner
dependency provenance 加入 `ResolvedQualityConfig` 或 machine output。

## Selection and path rules

正式入口的 current explicit form 是：

```text
bun run product:cli -- scan [project-root] --config <file>
```

`--config` 是单值参数，重复传入会在 scan work 前失败。相对 path 基于 normalized project
root 按平台原生规则解析；绝对 path 保持绝对。相对 path 中的 `..` 仍只以 project root 为
基准，不改用启动 cwd 或 config 文件所在目录。

省略 `--config` 时，本次 invocation 使用 built-in semantic document。当前 runtime 不在
project root、父目录、启动 cwd、home 或 sibling file 中发现 config，也不组合多份 document。
Operational overrides 不参与 semantic document selection 或 merge；其独立边界见
[Scanner 依赖选择](scanner-dependencies.md#invocation-scoped-dependency-snapshot)。

## Complete semantic document

Base semantic document 顶层精确包含以下字段：

| Field | Contract |
| --- | --- |
| `version` | literal string `"1"` |
| `include` | project-root-relative include glob string array |
| `excludeDirs` | excluded directory name/path string array |
| `generatedFiles` | generated-file glob string array |
| `codeAreas` | named code-area definitions |
| `checks` | file、function 与 duplication quality semantics |
| `acceptedWarnings` | semantic warning acceptances |
| `report` | human report presentation settings |
| `artifactDir` | project-root-relative artifact directory string |
| `cacheDir` | project-root-relative cache directory string |

`checks` 是 closed object：

| Path | Fields |
| --- | --- |
| `checks.files.codeLines` | `absoluteFloor`、`changedDelta`、`lowDecisionTokenAllowance.codeLineFloor`、`lowDecisionTokenAllowance.maxDecisionTokens` |
| `checks.functions.cyclomaticComplexity` | `absoluteFloor`、`changedDelta` |
| `checks.functions.codeLines` | `absoluteFloor`、`changedDelta`、`lowComplexityAllowance.codeLineFloor`、`lowComplexityAllowance.maxCyclomaticComplexityExclusive` |
| `checks.functions.parameterCount` | `absoluteFloor`、`changedDelta` |
| `checks.duplication` | `defaultMinimumTokens`、`minimumTokensByCodeArea`、`fragments.changedDelta` |

`codeAreas.<name>` 精确包含 `description`、`globs`、`excludeGlobs` 与 `warningPolicy`。
`warningPolicy` 的 closed values 是 `strict`、`moderate`、`relaxed`、`watchlist-only` 和
`exclude-warnings`。`minimumTokensByCodeArea` 的每个 key 必须引用已声明 code area；未为某个
area 提供 entry 时使用 `defaultMinimumTokens`。

`report` 精确包含 `title`、`nonBlockingNotice`、`footerGeneratedBy`、`footerNotice`、
`topN`、`timeZone`、`showWatchlist` 与 `watchlistMax`。`timeZone` 必须是有效 IANA time zone。
当前 numeric fields 保持 finite-number acceptance；本 contract 不额外推断正数或整数约束。

`acceptedWarnings[]` 必须包含 `checkId` 与 `reason`。`checkId` 的 closed values 是：

- `file-code-lines`
- `function-cyclomatic-complexity`
- `function-code-lines`
- `function-parameter-count`
- `duplicate-code`

Backend-neutral optional filters 是 `codeArea`、`messageIncludes`、`metric`、`path`、
`suggestionIncludes` 与 `value`。Public config 不接受 arbitrary warning `ruleId` 或 dependency
`sourceTool` matcher。Semantic identity 到 current warning identity 的行为和 machine compatibility
由 [Quality Metrics](quality-metrics.md#warning-rules-and-channels) 维护。

Runtime schema 与每个 nested object 都拒绝 unknown、missing 或 wrong-type fields；semantic
post-validation 另检查 time zone 与 minimum-token code-area references。成功解析返回 detached
document，不修改 raw input，也不从 defaults 补字段。

## ResolvedQualityConfig and precedence

Product Config 把 selected document 显式映射为 deeply readonly、invocation-owned
`ResolvedQualityConfig`。只有两个 public CLI overrides 在 mapper boundary 应用：

1. `--top-n` 覆盖 `report.topN`。
2. `--artifact-dir` 覆盖 `artifactDir`。

调用者未显式传入这两个 options 时使用 selected document value；其它字段没有 CLI patch。
显式 document 整体替换 built-in semantic document，不执行 partial merge。Current、baseline 与
Git-failure fallback collection 复用同一个 resolved value，不重新读取文件、重建 defaults 或
读取 scanner execution settings。

Scanner executable、args、availability protocol、platform default 与 bounded concurrency 不属于
`ResolvedQualityConfig`。它们由独立的 `ScannerDependencySnapshot` 承接；operational override
与 cache backend identity 的完整规则见
[Scanner 依赖选择](scanner-dependencies.md#invocation-scoped-dependency-snapshot)。Fixed public
`version` 不是调用者手工 cache-bust 入口。

## Failure and hard-cut behavior

Config owner 在 banner、scanner、baseline、cache 和 artifact work 前完成 regular-file、UTF-8、
strict JSON、runtime schema 与 semantic post-validation。文件不存在、不是 regular file、不可读、
编码/JSON 无效或 contract 不匹配时：

- stderr 报告包含 resolved config path 的 config error；
- Product CLI 退出 `3`；
- 不打印 scan banner，不启动 scanner/baseline，不创建 scan artifacts，也不回退 built-in
  config。

包含 legacy top-level `lizard`、`scc`、`jscpd` 或 `tools` 的 object 执行 hard cut：新 binary
以同样的 pre-scan exit `3` 拒绝，diagnostic 给出 current version、semantic landing 和
operational landing，但不读取、回显或执行旧 command/args。不存在 compatibility reader、
silent field deletion 或 legacy-to-default fallback。

Malformed supported scanner `_ARGS` environment 是独立 operational input error：它在同一
pre-work boundary 退出 `2`，即使 profile 会跳过该 capability或 project 没有 eligible input；
完整规则由 [Scanner 依赖选择](scanner-dependencies.md#operational-overrides) 拥有。

## Legacy tool-shaped migration

迁移必须从一份 trusted old config 手工建立新的 complete semantic document；不要让新 binary
读取旧 executable fields。以下表覆盖旧 public field tree 的全部 landing：

| Legacy field | Semantic v1 landing / action |
| --- | --- |
| `version` arbitrary string | 替换为 exact `version: "1"`；不再作为手工 cache-bust label |
| `include` | 保持 `include` |
| `excludeDirs` | 保持 `excludeDirs` |
| `generatedFiles` | 保持 `generatedFiles` |
| `codeAreas` | 保持 `codeAreas` closed definitions |
| `report` | 保持 `report` closed settings |
| `artifactDir` | 保持 `artifactDir` |
| `cacheDir` | 保持 `cacheDir` |
| `scc.fileCodeLines` | `checks.files.codeLines` |
| `lizard.cyclomaticComplexity` | `checks.functions.cyclomaticComplexity` |
| `lizard.functionCodeDensity` | `checks.functions.codeLines` |
| `lizard.parameterCount` | `checks.functions.parameterCount` |
| `jscpd.defaultMinimumTokens` | `checks.duplication.defaultMinimumTokens` |
| `jscpd.minimumTokens` | `checks.duplication.minimumTokensByCodeArea` |
| `jscpd.duplicateFragments` | `checks.duplication.fragments` |
| `jscpd.formatByCodeArea` | 删除；duplicate adapter 对 Product-approved exact paths 不传 format override，由 backend 按 path extension 检测 |
| `jscpd.maxParallelTasks` | 删除；bounded concurrency 是 Product internal dependency setting |
| `acceptedWarnings[]` | 保留 backend-neutral filters 与 `reason`；按下表把 `ruleId` 改为 required `checkId`，删除 `sourceTool` |

Legacy accepted-warning identity 使用以下 exhaustive migration：

| Legacy `ruleId` | Semantic v1 `checkId` |
| --- | --- |
| `scc-file-code-lines` | `file-code-lines` |
| `lizard-cyclomatic-complexity` | `function-cyclomatic-complexity` |
| `lizard-function-code-density` | `function-code-lines` |
| `lizard-parameter-count` | `function-parameter-count` |
| `jscpd-duplicate-code` | `duplicate-code` |

Legacy execution settings 不进入 semantic document：

| Legacy field | Current operational landing |
| --- | --- |
| `tools.scc.command` | `VIBE_CHECK_SCC_CMD` |
| `tools.scc.args` | `VIBE_CHECK_SCC_ARGS`，non-empty value 必须是 JSON string array |
| `tools.lizard.command` | `VIBE_CHECK_LIZARD_CMD` |
| `tools.lizard.args` | 无 landing；Product 固定使用 `-m lizard`，不支持 Lizard args override |
| `tools.jscpd.command` | `VIBE_CHECK_JSCPD_CMD` |
| `tools.jscpd.args` | `VIBE_CHECK_JSCPD_ARGS`，non-empty value 必须是 JSON string array |

这些 environment variables 是 internal operational compatibility，不是下一版 public config
field。它们的默认、empty-value、validation、availability 和可见性规则只在
[Scanner 依赖选择](scanner-dependencies.md#operational-overrides) 完整定义。

Rollback 以 binary/config pair 为单位：回退 old binary 时同时恢复与它匹配的 old config；
运行 new binary 时使用 semantic v1 document。New binary 不承诺读取 legacy shape，不能只回退
其中一侧。迁移后的完整结构以本页链接的唯一 canonical example 为准，不在 migration 文档中
复制第二份完整 config。

## Change synchronization

改变 public field、version、required status、enum、CLI precedence 或 migration behavior 时，
必须在同一 change 同步 runtime schema source、derived type、generated schema、canonical
example、本 owner 与对应 tests。External discovery/init/comment grammar 变化进入 external
workflow；scanner executable/args/concurrency 变化进入 Scanner Dependencies；machine warning
`ruleId` / `sourceTool` 或 serialized shape 变化必须进入独立 Output contract change。
