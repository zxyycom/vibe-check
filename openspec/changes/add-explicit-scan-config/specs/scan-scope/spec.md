## MODIFIED Requirements

### Requirement: Real project file collection

Core scan pipeline SHALL 从 normalized project root 下的 selected complete config include paths 构造 scan scope。Selected config 可以是未指定 `--config` 时的当前 `DEFAULT_CONFIG`，或从显式 JSON 解析的完整 `QualityConfig`。Collection MUST 先运行 `git ls-files --cached --others --exclude-standard` 取得候选 paths；该命令失败时 SHALL 保持现有提示并使用当前 fallback walker。Git 与 fallback results MUST 进入同一 selected-config filtering 与 code-area classification。

#### Scenario: Git collection uses selected include paths

- **WHEN** Git collection 成功且 selected config include paths 匹配 ordinary project files
- **THEN** core 从 Git 返回的 candidate paths 构造 scope
- **AND** 只保留符合 selected config rules 的 paths

#### Scenario: Explicit config changes candidate eligibility

- **WHEN** explicit config 的 include paths 与 `DEFAULT_CONFIG` 不同
- **THEN** collection 使用 explicit config include paths
- **AND** `DEFAULT_CONFIG` include paths 不参与该 scan

#### Scenario: Git failure keeps selected config

- **WHEN** Git collection command 失败
- **THEN** core 保持现有提示并使用当前 fallback walker
- **AND** fallback 应用同一个 selected config

### Requirement: Default exclusion baseline

Scan scope collection SHALL 在构造 scanner exact inputs 前应用 selected complete config 的 exclude directories、generated-file globs 与 code-area boundaries。未指定 `--config` 时 MUST 保持当前 `DEFAULT_CONFIG` values 与 behavior；指定配置时 MUST 只应用 explicit config，不得同时应用 built-in exclusions。

#### Scenario: Selected exclusions do not reach scanner inputs

- **WHEN** candidate path 匹配 selected config 的 excluded directory 或 generated-file rule
- **THEN** 该 path 不进入 normalized scanner exact inputs
- **AND** scanner adapter 不得通过自行遍历重新加入该 path

#### Scenario: Explicit config does not inherit hidden exclusions

- **WHEN** path 匹配 `DEFAULT_CONFIG` exclusion，但满足 explicit include 且不匹配
  explicit exclude / generated rule
- **THEN** 该 path 保持 eligible
- **AND** core 不把 built-in exclusion 与 explicit config 合并

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
