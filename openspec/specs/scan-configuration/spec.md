# scan-configuration Specification

## Purpose
定义 Product CLI 的完整 `QualityConfig` 选择、JSON 结构、路径基准、替换与 CLI precedence
以及配置失败边界，使 current、baseline 和 fallback collection 使用同一份可信且经过严格
校验的配置。
## Requirements
### Requirement: Explicit scan configuration selection

Product CLI SHALL 按以下顺序为每次 invocation 选择唯一配置来源：

1. `--config <file>` 指定的文件；相对路径基于 normalized project root 解析。
2. 固定路径 `<project-root>/.vibe-check/config.json` 中已存在的文件。
3. gate disabled 且固定路径尚未配置时，由 Product Config 提供的 neutral default。

来源 1 和 2 统称 file-backed source。任一 gate SHALL 使用 file-backed source。文件路径一旦被选中，
该文件的读取与校验结果 SHALL 决定本次 invocation 的配置结果；固定路径是唯一 implicit file
candidate。

#### Scenario: Relative configuration uses project root

- **WHEN** 调用者从 project root 外启动正式入口，并传入显式 project root 与相对
  `--config`，同时 discovery/default 也可用
- **THEN** CLI 只解析并校验 normalized project root 下的 explicit path
- **AND** 更换 process launch cwd 不改变配置定位

#### Scenario: Explicit external configuration path is preserved

- **WHEN** 调用者传入绝对 config path 或包含 `..` 的相对 config path
- **THEN** CLI 按 normalized project root 与平台原生 path resolution 读取指定文件
- **AND** CLI 不搜索或替换该配置

#### Scenario: Tool-directory config is discovered

- **WHEN** 调用者省略 `--config`，且 `.vibe-check/config.json` 已存在
- **THEN** CLI 将该文件选为 `discovered`
- **AND** dependency preflight 前只加载一次该文件

#### Scenario: Omitted configuration preserves current behavior

- **WHEN** 调用者省略 `--config`、固定路径尚未配置，且 gate disabled
- **THEN** CLI 选择完整 neutral default
- **AND** console 报告 default provenance，且 CLI 不搜索 project root 父目录或启动 cwd

#### Scenario: Gate requires project policy

- **WHEN** 调用者启用任一 gate，而 explicit/discovered config 均不可用
- **THEN** CLI 在 scan work 前退出 `3`
- **AND** diagnostic 指向 `init` 和 `--config` 两条恢复路径

#### Scenario: Selected file determines the result

- **WHEN** selected explicit/discovered path 缺失、不是 regular file、不可读或内容无效
- **THEN** CLI 保持该 selected path 为本次配置来源，并以 path/reason diagnostic 退出 `3`
- **AND** 该 selection result 对本次 invocation 保持 final

### Requirement: Configuration JSON matches complete QualityConfig

Selected project configuration MUST 是一个完整 semantic document。Base semantic value 的 top level MUST 精确包含 `version`、`include`、`excludeDirs`、`generatedFiles`、`codeAreas`、`checks`、`acceptedWarnings`、`report`、`artifactDir` 与 `cacheDir`；后置 external workflow MAY 只组合 optional `$schema` metadata。`version` MUST 是 current contract discriminator `"1"`。Public runtime schema、generated schema、starter、examples 与 user-facing docs MUST NOT 声明 scanner product name、executable、argument list、dependency concurrency 或 backend format filter。

Unchanged semantic roots MUST 保留 current complete-config shape：`include`、`excludeDirs` 与
`generatedFiles` 是 string arrays；`codeAreas` 是 named record，每个 value 精确包含 string
`description`、string-array `globs` / `excludeGlobs`，以及取值为 `strict`、`moderate`、`relaxed`、
`watchlist-only` 或 `exclude-warnings` 的 string `warningPolicy`；`report` 精确包含
`title`、`nonBlockingNotice`、`footerGeneratedBy`、`footerNotice`、finite-number `topN`、valid IANA
time-zone string `timeZone`、boolean `showWatchlist` 与 finite-number `watchlistMax`；`artifactDir` / `cacheDir` 是
strings。本 change 除下述已确认 version、field tree、identity 与 cross-field reference 外，MUST
NOT 顺带收紧 current finite-number acceptance。

`checks` MUST 是 closed object，并完整包含以下 backend-neutral sections：

- `checks.files.codeLines`：`absoluteFloor`、`changedDelta` 与 `lowDecisionTokenAllowance`；allowance 包含 `codeLineFloor` 与 `maxDecisionTokens`。
- `checks.functions.cyclomaticComplexity`：`absoluteFloor` 与 `changedDelta`。
- `checks.functions.codeLines`：`absoluteFloor`、`changedDelta` 与 `lowComplexityAllowance`；allowance 包含 `codeLineFloor` 与 `maxCyclomaticComplexityExclusive`。
- `checks.functions.parameterCount`：`absoluteFloor` 与 `changedDelta`。
- `checks.duplication`：`defaultMinimumTokens`、`minimumTokensByCodeArea` 与 `fragments.changedDelta`。

每个 section、threshold、allowance 与 `fragments` object MUST 是 closed shape，并精确包含上列
fields。
上述 threshold、allowance、minimum-token 与 changed-delta values MUST 是 finite numbers。
`minimumTokensByCodeArea` MUST 是 record；每个 key MUST 引用 `codeAreas` 中的 name，缺少某个
area entry 时 duplicate scanning 使用 `defaultMinimumTokens`。

`acceptedWarnings[]` MUST 使用 required string `checkId` 与 `reason`；`checkId` MUST 是 `file-code-lines`、`function-cyclomatic-complexity`、`function-code-lines`、`function-parameter-count` 或 `duplicate-code`。它 MAY 使用现有 semantic match fields string `codeArea` / `metric` / `path`、string-array `messageIncludes` / `suggestionIncludes` 与 finite-number `value`，但 MUST NOT 接受 dependency source matcher。

Parser MUST 拒绝 missing、unknown、wrong-version 或 invalid fields，并返回 detached normalized semantic config；它 MUST NOT partial merge、从默认值补字段或把 project document 映射成 executable settings。

#### Scenario: Complete configuration is accepted unchanged

- **WHEN** selected document 完整满足 current semantic runtime schema
- **THEN** parser 返回 detached normalized config，且 scope、checks、accepted-warning、report 与 artifact/cache values 对应输入
- **AND** scanner dependency execution settings 不来自该 document

#### Scenario: Public materials expose only product semantics

- **WHEN** reviewer 检查 runtime schema、derived document type、generated schema、starter、canonical config、fixture config 与 user-facing configuration docs
- **THEN** public field tree 使用 `checks.files`、`checks.functions` 与 `checks.duplication`
- **AND** 这些 materials 不包含 `lizard`、`scc`、`jscpd`、`command`、`args`、dependency
  concurrency 或 backend format filter

#### Scenario: Scanner dependency settings remain outside project config

- **WHEN** complete product invocation 需要执行 scanner dependencies
- **THEN** executable、args 与 concurrency 只保留在独立解析的 Product-owned dependency snapshot
- **AND** project document、public runtime schema 与 normalized semantic config 不包含这些 settings

#### Scenario: Semantic accepted warning selects a stable check

- **WHEN** config 使用 `checkId = "function-cyclomatic-complexity"` 和其它 optional semantic match fields
- **THEN** accepted-warning matching targets the corresponding Vibe Check-owned check
- **AND** config 不需要知道 internal warning source、scanner name 或 executable

#### Scenario: Incomplete or invalid configuration is rejected

- **WHEN** document 缺少 required field、包含 unknown field、version 不是 `"1"`，或 nested value 无效
- **THEN** parser 在 scan 启动前失败并报告 path-aware reason
- **AND** parser 不补默认值、不修改输入，也不尝试按 dependency-specific shape 继续

### Requirement: Explicit configuration replaces defaults

Explicit 或 discovered document SHALL 提供一份完整 semantic project config，并且 MAY 包含可选
`$schema` authoring metadata。该 document SHALL 是本次 invocation 唯一 project-policy source。
Document validation 完成后，显式 `--top-n` 和 `--artifact-dir` SHALL 覆盖对应字段。Current、
baseline 与 Git-failure fallback SHALL 共享最终 resolved config。

#### Scenario: Explicit config is authoritative

- **WHEN** selected explicit 或 discovered document 通过校验
- **THEN** 每个 project-policy field 都来自该 document，再应用 CLI field overrides
- **AND** loader 将 `$schema` 分离为 authoring metadata，resolved semantic config 只包含政策字段

#### Scenario: Explicit CLI option overrides its config field

- **WHEN** 调用者显式传入 `--top-n` 或 `--artifact-dir`
- **THEN** resolved config 对应字段使用 CLI value
- **AND** 其余字段保持 selected semantic value

#### Scenario: Current and baseline share one config

- **WHEN** invocation 执行 current、baseline 或 Git-failure fallback collection
- **THEN** 每个阶段接收同一份 invocation-owned resolved config
- **AND** config selection 只执行一次

#### Scenario: Operational override is independent of project selection

- **WHEN** 同一 invocation 同时具有 selected semantic config 与 supported operational dependency
  override
- **THEN** semantic config 只决定 project policy，operational override 只决定 internal dependency
  execution
- **AND** 任一方都不覆盖或序列化另一方的 fields

### Requirement: Configuration parse failure stops the scan

Config owner SHALL 在调用 scan core 前完成 file read、UTF-8、document syntax、runtime schema 与 semantic post-validation。文件不存在、不可读或任一 parse/validation failure MUST 立即产生包含 resolved config path 的 config error；Product CLI MUST 将错误写入 stderr、退出 `3`，且 MUST NOT 回退 built-in config、启动 scanner / baseline 或创建成功 scan artifacts。

现有 tool-shaped complete config 是 unsupported legacy input。Loader MUST NOT dual-read、静默删除 executable fields 或采用 legacy project-level command/args；它 MUST 返回 migration diagnostic，标明 current version、semantic section mapping，以及 dependency execution settings 应迁移到 Product-owned operational boundary。

#### Scenario: Configuration file cannot be read

- **WHEN** 指定配置不存在、不是 regular file 或不可读
- **THEN** CLI 直接报告 resolved config path 与 read error
- **AND** scan 不启动并退出 `3`

#### Scenario: Configuration content cannot be parsed

- **WHEN** 配置不是 valid UTF-8 document 或不满足 current semantic schema / post-validation
- **THEN** CLI 报告 selected path 与 actionable failure location/reason
- **AND** scan 不创建 artifacts、不回退默认配置并退出 `3`

#### Scenario: Legacy tool-shaped config fails with migration guidance

- **WHEN** selected object 包含 legacy `lizard`、`scc`、`jscpd` 或 `tools` top-level fields
- **THEN** CLI 在 scanner、baseline 和 artifact creation 前以 exit `3` 拒绝它
- **AND** diagnostic 指向 `checks.files`、`checks.functions`、`checks.duplication` 与 operational dependency migration，不执行 legacy command/args

### Requirement: Runtime schema owns the semantic document contract

Product Config SHALL 以一个 Product-owned runtime schema source 作为 semantic document exact fields、required/optional status、closed shapes、types、enum、descriptions 与可表达 numeric constraints 的唯一 public field owner。`SemanticProjectConfigV1` type 与 published/generated editor schema MUST 从该 source 派生；runtime-only cross-field 或 platform-independent semantic checks MAY 留在 Product Config post-validation，但不得形成第二个 field tree。

`add-external-project-config-workflow` 生成和发现的 `.vibe-check/config.json` MUST 直接消费该 source 所定义的 semantic document。Comment-capable JSON syntax、discovery、initializer 和 sibling schema lifecycle 仍由该 workflow 拥有，本 requirement 不创建第二条 file workflow。

#### Scenario: Runtime and generated schemas cannot drift

- **WHEN** public semantic field、required status、enum 或 numeric constraint 发生变化
- **THEN** runtime validation、derived document type、generated schema、canonical config 与 validation material 从同一 source 同步变化
- **AND** required validation 在 checked-in material 与 source 不一致时失败

#### Scenario: External workflow consumes the semantic owner

- **WHEN** external config workflow 生成 comment-capable `.vibe-check/config.json` 与 sibling schema
- **THEN** document field tree 和 schema bytes 来自本 change 建立的 semantic runtime schema source
- **AND** external workflow 不重新定义 tool-named fields 或 applied dependency-override provenance

#### Scenario: Sibling schema cannot change scan semantics

- **WHEN** external workflow 的 sibling editor schema 缺失、被编辑或无效，但 selected config 满足 Product-owned runtime contract
- **THEN** scan 仍只按 built-in runtime schema 与 semantic checks 判定 document
- **AND** sibling schema 不成为 runtime input 或 second owner

### Requirement: Neutral default configuration

Product Config SHALL 持有以下完整、repository-neutral 的 exact semantic value；本 requirement
固定本 change 的 target value，交付后的 current value 由
[Configuration](../../../docs/configuration.md#neutral-default) 与
[Product runtime source](../../../src/product/config.ts) 维护：

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

#### Scenario: Default provides neutral full-project policy

- **WHEN** Product Config 映射 neutral default
- **THEN** 该值通过 semantic v1 validation，并将所有 supported、eligible project files 归入
  `project` area
- **AND** runtime 获得一份 detached、invocation-owned config

### Requirement: Project configuration initialization

Product CLI SHALL 提供 non-interactive `init [project-root]`。Init SHALL 为两个 fixed target 生成
UTF-8/LF deterministic candidate bytes：`config.json` 包含完整 neutral default 及相对引用
`"$schema": "./config.schema.json"`，`config.schema.json` 使用 JSON Schema 2020-12。通过 production
loader 重新加载由 init 新建的 config SHALL 得到 neutral semantic value。

`.vibe-check` directory 尚不存在时，Init SHALL 创建它；已存在的 non-symlink directory SHALL 被
复用。Init SHALL 分别确保两个 fixed target 存在：existing normal non-symlink file SHALL 保持原
bytes 并满足对应 target，missing target SHALL 使用 exclusive creation。两个 target 都已存在时，
Init SHALL 作为 no-op 退出 `0`。后续 scan 由 production loader 校验 selected config。Unsafe target
或 create race SHALL 形成 failure。
Handled failure cleanup SHALL 只处理本次 invocation 创建的 entries；本次创建的 directory 仅在
empty 时清理。

#### Scenario: Init materializes neutral policy

- **WHEN** project root 可写，且两个 target path 可创建
- **THEN** init 创建内容确定且完整的 config/schema，并退出 `0`
- **AND** stdout 报告两个 absolute target paths 与 discovery-ready state

#### Scenario: Existing tool directory is reusable

- **WHEN** `.vibe-check` 是包含其它 entries 的既有 normal directory
- **THEN** init 在其中创建两个可用 target files
- **AND** 既有 entries 保持原有 bytes

#### Scenario: Repeated init preserves and fills target files

- **WHEN** 两个 target 均为 existing normal non-symlink files，或其中一个 target missing
- **THEN** init 保留所有 existing target bytes，只 exclusive-create missing target，并退出 `0`
- **AND** 两个 target 均已存在时不执行 file write

#### Scenario: Unsafe target or handled write failure preserves state

- **WHEN** target 是 unsafe existing node、concurrent creator 先创建 missing target，或 target
  write 失败
- **THEN** init 保留既有 entries，并退出 `3`
- **AND** invocation-owned partial entries 按 ownership rule 清理

#### Scenario: Scan owns existing config validation

- **WHEN** init 复用 existing config 或 sibling schema
- **THEN** init 将 existing normal file 视为已满足的 target，保持其 bytes 并退出 `0`
- **AND** 后续 scan 以 embedded Product schema 校验 selected config

### Requirement: Comment-capable JSON authoring and editor schema

Product Config SHALL 解析 UTF-8 Vibe Check JSON，包括 line comments、block comments 与 trailing
commas；strict JSON SHALL 作为其 subset 获得支持。Product-owned semantic runtime schema SHALL
持有 project fields，composed document schema 在其上增加可选 `$schema`。Generated editor schema
SHALL 是 composed source 的 deterministic projection。每次 runtime config validation SHALL 使用
embedded Product schema。

#### Scenario: Annotated and strict documents share one loader

- **WHEN** 两份等价的完整 document 分别使用 annotated Vibe Check JSON 与 strict JSON
- **THEN** production loader 为二者生成相同 detached semantic value
- **AND** 可选 `$schema` 只提供 editor linkage

#### Scenario: Invalid document fails before scan work

- **WHEN** selected bytes 未通过 UTF-8、syntax、structural 或 semantic validation
- **THEN** CLI 在 scan work 前以 exit `3` 报告 selected path 与可定位的 reason
- **AND** diagnostic 保留本次 selected source，便于直接修复该 document

#### Scenario: Runtime schema authority is embedded

- **WHEN** runtime 加载一份 semantic content 有效的 config
- **THEN** embedded Product schema 单独决定 runtime validation 结果
- **AND** sibling generated schema 由独立 drift validation 负责 editor consistency

### Requirement: Selected configuration context

Product Config SHALL 创建一个 readonly context，其中包含 resolved config、source（`default`、
`explicit` 或 `discovered`），以及 file-backed source 的 normalized absolute path。Console SHALL 在
dependency preflight 前报告简洁 provenance。Downstream scan stages SHALL 只消费 resolved config；
stable machine v1 output SHALL 保持现有 shape。

#### Scenario: Default provenance is pathless

- **WHEN** neutral default 被选中
- **THEN** console 报告 `default (not persisted)`
- **AND** selection context 使用 pathless default source

#### Scenario: File-backed provenance identifies selected path

- **WHEN** explicit 或 discovered config 被选中
- **THEN** console 报告 source 与 normalized path
- **AND** downstream scan 使用该 context 中的 resolved config
