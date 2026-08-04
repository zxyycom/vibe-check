# scan-scope Specification

## Purpose
Define how Vibe Check constructs scan scope before metric and scanner adapters run, including file collection ownership, default exclusions, supported file classification, ignore rule handling, recoverable diagnostics, and fatal collection failures.
## Requirements
### Requirement: Scan scope owner documentation
Scan scope behavior SHALL have a long-term owner document under `docs/` that records file collection ownership, default exclusions, supported file classification, ignore rule handling, generated/vendor/cache path boundaries, recoverable diagnostics, fatal collection failures, and verification expectations. `docs/navigation.md` MUST reference this owner document.

#### Scenario: Navigation points to scan scope owner
- **WHEN** reviewer uses `docs/navigation.md` to locate file collection and scan scope rules
- **THEN** the navigation document points to the scan scope owner document

### Requirement: Real project file collection

Core scan pipeline SHALL 从 normalized project root 与 selected semantic config 的 include paths 构造 scan scope。Selected document 必须先通过 Product Config runtime contract 并归一化为 invocation-owned config；collection 不得读取 scanner dependency settings。Collection MUST 先运行 `git ls-files --cached --others --exclude-standard` 取得候选 paths；该命令失败时 SHALL 保持现有提示并使用当前 fallback walker。Git、fallback、current 与 baseline MUST 使用同一 resolved semantic scope 和 code-area classification。

#### Scenario: Git collection uses selected include paths

- **WHEN** Git collection 成功且 selected semantic config include paths 匹配 ordinary project files
- **THEN** core 从 Git 返回的 candidate paths 构造 scope
- **AND** 只保留符合同一 resolved scope rules 的 paths

#### Scenario: Explicit config changes candidate eligibility

- **WHEN** explicit semantic config 的 include paths 与 built-in semantic config 不同
- **THEN** collection 使用 explicit config include paths
- **AND** built-in include paths 和 scanner dependency settings 不参与 scope

#### Scenario: Git failure keeps selected config

- **WHEN** current 或 baseline Git collection command 失败
- **THEN** core 保持现有提示并使用 fallback walker
- **AND** fallback 复用 invocation 开始时解析的同一个 semantic config snapshot

### Requirement: Default exclusion baseline

Scan scope collection SHALL 在构造 scanner exact inputs 前应用 selected semantic config 的 exclude directories、generated-file globs 与 code-area boundaries。使用 built-in config 时 MUST 保持 current default scope behavior；使用 explicit 或 external-workflow-discovered config 时 MUST 只应用该 selected document 解析出的 public scope，不得同时应用 built-in exclusions 或 dependency-private filtering rules。

#### Scenario: Selected exclusions do not reach scanner inputs

- **WHEN** candidate path 匹配 selected semantic config 的 excluded directory 或 generated-file rule
- **THEN** 该 path 不进入 normalized scanner exact inputs
- **AND** dependency resolver 或 adapter 不得通过自行遍历重新加入该 path

#### Scenario: Explicit config does not inherit hidden exclusions

- **WHEN** path 匹配 built-in exclusion，但满足 selected external include 且不匹配 selected external exclude / generated rule
- **THEN** 该 path 保持 eligible
- **AND** core 不把 built-in 或 backend-private exclusion 与 selected semantic config 合并

### Requirement: Ignore file handling

Scan scope 的 current 与 baseline Git collection SHALL 通过 `--exclude-standard` 应用 Git 支持的 VCS ignore behavior。Git command 成功时，其 normalized result MUST 直接成为 candidate set，包括成功的 empty result；empty result MUST NOT 触发 fallback walker。只有 Git command 失败时，对应 fallback walker SHALL 使用 selected-config-only best-effort behavior：候选资格只由 selected config 的 include、exclude directories 与 generated-file rules 决定，VCS ignore sources 不参与 fallback collection。Git 与 fallback results MUST 继续进入相同 downstream classification，且 fallback MUST NOT 新增 ignore-parse diagnostic、partial-report contract 或 fatal outcome。

#### Scenario: Git success empty remains authoritative

- **WHEN** current 或 baseline Git command 成功，且 VCS ignore rules 使 normalized
  candidate set 为空
- **THEN** collection 返回 empty candidate set
- **AND** collection 不启动 fallback walker

#### Scenario: Fallback ignores VCS ignore sources

- **WHEN** current 或 baseline Git command 失败，且 path 匹配 VCS ignore rule 与 selected
  include，但不匹配 selected exclude 或 generated-file rule
- **THEN** fallback walker 将该 path 保留为 normalized candidate
- **AND** VCS ignore rule 不改变 fallback eligibility

#### Scenario: Fallback applies the selected config

- **WHEN** current 或 baseline Git command 失败，且 candidate 不匹配 selected include 或
  匹配 selected exclude / generated-file rule
- **THEN** fallback walker 排除该 path
- **AND** downstream scanner 不得让该 path 重新进入 scan scope

### Requirement: Every project scan uses one complete selected config

Scan scope SHALL 消费 Product Config 选出的唯一完整 config。Default、explicit 与 discovered source
SHALL 共用同一套 normalization、collection、classification 和 exact-input pipeline；selection
source 只影响 provenance。

#### Scenario: Neutral default covers supported project files

- **WHEN** ungated scan 选择 neutral default
- **THEN** 既有 Git/fallback collection 应用 `**/*`、default exclusions 与 `project` area
- **AND** supported eligible files 进入常规 scanner exact-input pipeline

#### Scenario: Materialized default preserves scope

- **WHEN** 同一 neutral value 先以内存 default、再以 initialized discovered document 参与 scan
- **THEN** 两次 invocation 产生相同 normalized scope、code areas 与 scanner exact inputs
- **AND** provenance 分别表达实际 selection source

#### Scenario: File-backed policy controls scope

- **WHEN** explicit 或 discovered config 定义 include、exclude 与 code-area values
- **THEN** collection 和 classification 使用该完整 selected value
- **AND** current、baseline 与 Git-failure fallback 共享同一 scope policy
