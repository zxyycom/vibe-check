## MODIFIED Requirements

### Requirement: Explicit scan configuration selection

Product CLI SHALL 按以下顺序为每次 invocation 选择唯一配置来源：

1. `--config <file>` 指定的文件；相对路径基于 normalized project root 解析。
2. 固定路径 `<project-root>/.vibe-check/config.json` 中已存在的文件。
3. gate disabled 且固定路径尚未配置时，由 Product Config 提供的 neutral default。

来源 1 和 2 统称 file-backed source。任一 gate SHALL 使用 file-backed source。文件路径一旦被选中，
该文件的读取与校验结果 SHALL 决定本次 invocation 的配置结果；固定路径是唯一 implicit file
candidate。

#### Scenario: Explicit path has highest precedence

- **WHEN** 调用者传入相对或绝对 `--config`，同时 discovery/default 也可用
- **THEN** CLI 只解析并校验 explicit path
- **AND** 相对路径基于 normalized project root，而不是 launch cwd

#### Scenario: Tool-directory config is discovered

- **WHEN** 调用者省略 `--config`，且 `.vibe-check/config.json` 已存在
- **THEN** CLI 将该文件选为 `discovered`
- **AND** dependency preflight 前只加载一次该文件

#### Scenario: Ungated scan uses neutral default

- **WHEN** 调用者省略 `--config`、固定路径尚未配置，且 gate disabled
- **THEN** CLI 选择完整 neutral default
- **AND** console 报告 default provenance，scan 直接进入观察流程

#### Scenario: Gate requires project policy

- **WHEN** 调用者启用任一 gate，而 explicit/discovered config 均不可用
- **THEN** CLI 在 scan work 前退出 `3`
- **AND** diagnostic 指向 `init` 和 `--config` 两条恢复路径

#### Scenario: Selected file determines the result

- **WHEN** selected explicit/discovered path 缺失、不是 regular file、不可读或内容无效
- **THEN** CLI 保持该 selected path 为本次配置来源，并以 path/reason diagnostic 退出 `3`
- **AND** 该 selection result 对本次 invocation 保持 final

### Requirement: Explicit configuration replaces defaults

Explicit 或 discovered document SHALL 提供一份完整 semantic project config，并且 MAY 包含可选
`$schema` authoring metadata。该 document SHALL 是本次 invocation 唯一 project-policy source。
Document validation 完成后，显式 `--top-n` 和 `--artifact-dir` SHALL 覆盖对应字段。Current、
baseline 与 Git-failure fallback SHALL 共享最终 resolved config。

#### Scenario: File-backed document is complete and authoritative

- **WHEN** selected document 通过校验
- **THEN** 每个 project-policy field 都来自该 document，再应用 CLI field overrides
- **AND** loader 将 `$schema` 分离为 authoring metadata，resolved semantic config 只包含政策字段

#### Scenario: CLI fields retain highest precedence

- **WHEN** 调用者显式传入 `--top-n` 或 `--artifact-dir`
- **THEN** resolved config 对应字段使用 CLI value
- **AND** 其余字段保持 selected semantic value

#### Scenario: One config serves the whole scan

- **WHEN** invocation 执行 current、baseline 或 Git-failure fallback collection
- **THEN** 每个阶段接收同一份 invocation-owned resolved config
- **AND** config selection 只执行一次

## ADDED Requirements

### Requirement: Neutral default configuration

Product Config SHALL 持有以下完整、repository-neutral 的 exact semantic value；本 requirement 是
该默认值的唯一数值 owner：

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

Product CLI SHALL 提供 non-interactive `init [project-root]`。Init SHALL 以 UTF-8/LF 和确定性内容
生成两个文件：`config.json` 包含完整 neutral default 及相对引用
`"$schema": "./config.schema.json"`，`config.schema.json` 使用 JSON Schema 2020-12。通过 production
loader 重新加载生成的 config SHALL 得到 neutral semantic value。

`.vibe-check` directory 尚不存在时，Init SHALL 创建它；已存在的 non-symlink directory SHALL 被
复用。两个 target file SHALL 使用 exclusive creation。Handled failure cleanup SHALL 只处理本次
invocation 创建的 entries；本次创建的 directory 仅在 empty 时清理。

#### Scenario: Init materializes neutral policy

- **WHEN** project root 可写，且两个 target path 可创建
- **THEN** init 创建内容确定且完整的 config/schema，并退出 `0`
- **AND** stdout 报告两个 created paths 与 discovery-ready state

#### Scenario: Existing tool directory is reusable

- **WHEN** `.vibe-check` 是包含其它 entries 的既有 normal directory
- **THEN** init 在其中创建两个可用 target files
- **AND** 既有 entries 保持原有 bytes

#### Scenario: Existing target or handled write failure preserves state

- **WHEN** 任一 target 已存在、concurrent creator 先创建 target，或 target write 失败
- **THEN** init 保留既有 entries，并退出 `3`
- **AND** invocation-owned partial entries 按 ownership rule 清理

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
