# Configuration

本文是 Vibe Check public project configuration 的主规范。它完整维护 semantic document、
neutral default、Vibe Check JSON grammar、runtime/editor schema、配置选择与 discovery、
`ResolvedQualityConfig`、CLI precedence、`init`、迁移和配置失败边界。Scan scope、scanner
dependency、quality warning 与 artifact 内容由对应 owner 维护；其它文档只说明怎样消费本层
结果并链接本文。

## Current semantic config v1

当前 public contract 是 complete、closed、backend-neutral 的 semantic config v1：

- `version` 必须精确等于字符串 `"1"`，表示 document contract，不是调用者可编辑的 cache
  bust label。
- [`src/product/config-schema.ts`](../src/product/config-schema.ts) 是 exact fields、required / optional
  status、closed shapes、types、enum 和描述的 runtime source。
- [`vibe-check-config.schema.json`](schemas/vibe-check-config.schema.json) 是从同一 source 生成的
  semantic field JSON Schema 2020-12 publication；它不是项目本地 sibling editor schema。
- [`vibe-check-config.json`](examples/json/vibe-check-config.json) 是唯一 canonical semantic
  example。External fixture 的
  [`.vibe-check/config.json`](../fixtures/projects/configured-typescript/.vibe-check/config.json)
  只用于正式入口验收，不是第二个 canonical example。
- `src/product/config.ts` 的 `NeutralProjectConfig` 通过同一 runtime schema 与 semantic
  post-validation，再映射成默认 `ResolvedQualityConfig`；不存在宽松的第二套默认 schema。
- File-backed document 可增加 optional `$schema` editor metadata；semantic v1 field tree 保持
  complete、closed，且 scanner dependency provenance 不进入 `ResolvedQualityConfig` 或
  machine output。

## Neutral default

`NeutralProjectConfig` 是 ungated scan 的 complete、repository-neutral policy，也是 `init` 创建
缺失 config target 时使用的唯一 semantic value。本节是其 exact current value 的长期文档 owner：

```json
{
  "acceptedWarnings": [],
  "artifactDir": "artifacts/vibe-check",
  "cacheDir": ".cache/vibe-check",
  "checks": {
    "duplication": {
      "defaultMinimumTokens": 75,
      "fragments": {
        "changedDelta": 1
      },
      "minimumTokensByCodeArea": {}
    },
    "files": {
      "codeLines": {
        "absoluteFloor": 300,
        "changedDelta": 80,
        "lowDecisionTokenAllowance": {
          "codeLineFloor": 500,
          "maxDecisionTokens": 10
        }
      }
    },
    "functions": {
      "codeLines": {
        "absoluteFloor": 50,
        "changedDelta": 20,
        "lowComplexityAllowance": {
          "codeLineFloor": 150,
          "maxCyclomaticComplexityExclusive": 5
        }
      },
      "cyclomaticComplexity": {
        "absoluteFloor": 10,
        "changedDelta": 5
      },
      "parameterCount": {
        "absoluteFloor": 5,
        "changedDelta": 2
      }
    }
  },
  "codeAreas": {
    "project": {
      "description": "This project",
      "excludeGlobs": [],
      "globs": ["**/*"],
      "warningPolicy": "moderate"
    }
  },
  "excludeDirs": [
    ".git",
    ".vibe-check",
    ".cache",
    ".venv",
    "artifacts",
    "build",
    "dist",
    "node_modules",
    "target",
    "vendor"
  ],
  "generatedFiles": ["**/generated/**", "**/*.generated.*"],
  "include": ["**/*"],
  "report": {
    "footerGeneratedBy": "Vibe Check",
    "footerNotice": "Review findings for this project.",
    "nonBlockingNotice": "This project scan is observational unless a gate is explicitly enabled.",
    "showWatchlist": true,
    "timeZone": "UTC",
    "title": "This project quality report",
    "topN": 20,
    "watchlistMax": 50
  },
  "version": "1"
}
```

Default source 只用于没有 file-backed policy 的 ungated invocation，provenance 是
`default (not persisted)`。每次 mapping 都产生 detached、invocation-owned value；显式 CLI
overrides 仍按 [ResolvedQualityConfig and precedence](#resolvedqualityconfig-and-precedence)
应用。`init` 新建的 config 移除 `$schema` 后必须与此 semantic value 相等。

## Selection and path rules

正式 scan form 是：

```text
bun run product:cli -- scan [project-root] [--config <file>]
```

Product Config 在 dependency preflight 前按以下顺序选择唯一 source：

1. `--config <file>` 指定的 explicit file。
2. `<project-root>/.vibe-check/config.json` 中存在的 discovered file。
3. 固定 candidate 不存在、gate disabled 时的 neutral default。

Explicit 与 discovered 统称 file-backed source。任一 gate 必须使用 file-backed policy；两者
都不存在时，gate 在 scan work 前失败，不回退 neutral default。`--config` 是单值参数，重复
传入会在 scan work 前失败。Explicit relative path 基于 normalized project root 按平台原生
规则解析；absolute path 保持 absolute。相对 path 中的 `..` 仍只以 project root 为基准，
不改用启动 cwd 或 config 文件所在目录。

Fixed path 是唯一 implicit candidate；runtime 不向父目录、启动 cwd、home 或 sibling file
继续搜索。Explicit path 一经提供即为 final selection。省略 flag 时，fixed candidate 只在
确实不存在时允许 gate-disabled invocation 使用 default；candidate inspection 的其它失败，
以及 selected explicit/discovered file 的 missing、non-regular、unreadable 或 invalid result
都是 terminal config error，不尝试其它 source。

Selected file 每次 invocation 只加载、校验和映射一次。Readonly selection context 保存
resolved config、`default` / `explicit` / `discovered` source，以及 file-backed source 的
normalized absolute path；downstream scan stages 只消费 resolved config。Operational overrides
不参与 selection 或 merge；其独立边界见
[Scanner 依赖选择](scanner-dependencies.md#invocation-scoped-dependency-snapshot)。

## Vibe Check JSON and schema authority

File-backed `config.json` 使用 UTF-8 Vibe Check JSON。Production loader 执行 fatal UTF-8 decode，
并接受 line comments、block comments、trailing commas 与 strict JSON subset；随后使用 embedded
`ConfigDocumentSchema` 和 semantic post-validation。Optional `$schema` 只用于 editor linkage，
loader 在 mapping 前移除它；其它 unknown field 仍被 closed document schema 拒绝。

Schema authority 分为三个明确 surface：

1. `SemanticProjectConfigV1Schema` 是 semantic field tree 的 runtime source；published
   [`vibe-check-config.schema.json`](schemas/vibe-check-config.schema.json) 带稳定 `$id`，供
   public schema consumer 与独立验证使用。
2. Embedded `ConfigDocumentSchema` 在同一 semantic source 上只增加 optional `$schema`，并
   单独决定 file-backed runtime acceptance。
3. `init` 生成的 sibling `config.schema.json` 是 composed document schema 的 anonymous、
   deterministic editor projection。Runtime 不读取或信任该 sibling；修改、缺失或损坏它
   不改变 embedded runtime validation result。

因此 `$schema` reference 不授权 external schema 改写字段契约，也不允许 runtime 在 sibling
schema 与 embedded schema 之间选择。Strict JSON document 和等价的 annotated document 必须
映射为相同 detached semantic value。

## Initialization

正式初始化入口是：

```text
bun run product:cli -- init [project-root]
```

省略 project root 时使用 startup cwd；relative root 基于 startup cwd 归一化。`init` 是
non-interactive configuration operation，不启动 dependency、scanner、baseline、cache 或 scan
artifact work。缺失 target 由 neutral default 与 editor projection materialize 为：

```text
<project-root>/.vibe-check/config.json
<project-root>/.vibe-check/config.schema.json
```

两份 candidate 在任何 filesystem mutation 前于内存中完成 UTF-8/LF、schema projection 与
neutral-value round-trip self-validation。`config.json` 使用 two-space indentation、section
comments、trailing newline 和 `"$schema": "./config.schema.json"`；sibling schema 使用 JSON
Schema 2020-12。

`init` 是可重复的 ensure operation：

1. Project root 必须是 existing directory。Missing `.vibe-check` 由本次 invocation 创建；已存在
   的 normal、non-symlink directory 原样复用。
2. Existing normal non-symlink target file 保持原 bytes；missing target 使用 exclusive creation
   写入对应 candidate。两份 target 都已存在时不写文件并退出 `0`。
3. Unsafe target 或 exclusive-create race 以 exit `3` 失败。Handled failure 只清理本 invocation
   已创建的 target；tool directory 也只在本 invocation 创建且仍为空时尝试清理。

Scan-time production loader 拥有 selected config 的内容校验；sibling schema 继续只服务 editor。
成功时 stdout 报告两个 normalized absolute target paths 和 `discovery-ready` state；该 state
表示固定 discovery paths 已就位，不替代 scan-time config validation。

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

Product Config 把 selected semantic value 显式映射为 deeply readonly、invocation-owned
`ResolvedQualityConfig`。只有两个 public CLI overrides 在 mapper boundary 应用：

1. `--top-n` 覆盖 `report.topN`。
2. `--artifact-dir` 覆盖 `artifactDir`。

调用者未显式传入这两个 options 时使用 selected semantic value；其它字段没有 CLI patch。
Explicit 或 discovered document 是 complete policy，不执行 partial merge；neutral default 也
通过同一 mapper。Current、baseline 与 Git-failure fallback collection 复用同一个 resolved
value，不重新选择 source、读取文件、重建 defaults 或读取 scanner execution settings。

Scanner executable、args、availability protocol、platform default 与 bounded concurrency 不属于
`ResolvedQualityConfig`。它们由独立的 `ScannerDependencySnapshot` 承接；operational override
与 cache backend identity 的完整规则见
[Scanner 依赖选择](scanner-dependencies.md#invocation-scoped-dependency-snapshot)。Fixed public
`version` 不是调用者手工 cache-bust 入口。

## Failure and hard-cut behavior

Config owner 在 banner、dependency preflight、scanner、baseline、cache 和 artifact work 前完成
source selection，以及 file-backed source 的 regular-file、UTF-8、Vibe Check JSON、runtime
document schema 与 semantic post-validation。Gate 缺少 file-backed policy，selected file
不存在、不是 regular file、不可读、编码/syntax 无效或 contract 不匹配时：

- stderr 报告包含 resolved config path 的 config error；
- Product CLI 退出 `3`；
- 不打印 scan banner，不解析 scanner dependency，不启动 scanner/baseline，不创建 scan
  artifacts，也不回退其它 config source。

`init` 的 invalid root、unsafe tool-directory/target、exclusive-create race、write/close failure
或 incomplete cleanup 同样以 operation/path/stage diagnostic 退出 `3`。Initialization failure
不进入 scan pipeline；handled cleanup 只按 [Initialization](#initialization) 的 ownership 边界处理。

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

改变 public field、version、required status、enum、neutral default、Vibe Check JSON grammar、
document/schema composition、selection/discovery、CLI precedence、initializer 或 migration
behavior 时，必须在同一 change 同步 runtime source、derived type、published/generated schema、
canonical example、本 owner 与对应 tests。Scanner executable/args/concurrency 变化进入 Scanner
Dependencies；machine warning `ruleId` / `sourceTool` 或 serialized shape 变化必须进入独立
Output contract change。
