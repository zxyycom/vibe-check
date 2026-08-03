## ADDED Requirements

### Requirement: Semantic check configuration drives quality warnings

Quality core SHALL 从 resolved semantic config 的 `checks.files`、`checks.functions` 与 `checks.duplication` 读取 product-owned threshold behavior。File code-line、function cyclomatic-complexity、function code-line、function parameter-count 与 duplicate-code warnings MUST 保持 current absolute-floor、changed-delta 和 allowance semantics；current、baseline 与 comparison MUST 使用同一 resolved values。

Dependency name、command、args、availability 或 backend format MUST NOT 参与 warning policy selection。Internal metric source identity MAY 继续服务 machine/report diagnostics，但不得成为设置 threshold 所需的 public config knowledge。

#### Scenario: File checks use semantic thresholds

- **WHEN** resolved config 提供 `checks.files.codeLines` threshold 与 low-decision-token allowance
- **THEN** file code-line warnings 按这些 semantic values 选择 floor 与 changed delta
- **AND** config 不需要声明 file-metrics backend name

#### Scenario: Function checks use semantic thresholds

- **WHEN** resolved config 提供 `checks.functions` complexity、code-line 与 parameter thresholds
- **THEN** function warnings 按这些 values 和既有 low-complexity allowance behavior 生成
- **AND** config 不需要声明 structural backend name

#### Scenario: Duplication checks use semantic sensitivity

- **WHEN** resolved config 提供 default/per-code-area minimum token values 与 fragment changed delta
- **THEN** duplicate detection 和 warning generation 使用这些 product-semantic settings
- **AND** dependency concurrency 与 backend syntax hint 不来自 project config

### Requirement: Accepted warnings use stable semantic check identity

Accepted-warning matching SHALL 以 public semantic `checkId` 作为 required check identity，并保留 optional `codeArea`、message、metric、path、suggestion 与 value filtering。Config owner MUST 将 check identity 映射到当前 internal warning rule；matcher MUST NOT 要求或接受 scanner source identity。

本 change MUST NOT 改写 machine warning `ruleId`、`sourceTool`、metric、ordering、channel membership 或 `acceptedReason` behavior。后续 machine identity redesign 必须作为独立 output-contract change。

#### Scenario: Semantic acceptance marks the corresponding warning

- **WHEN** accepted-warning entry 的 `checkId` 与 generated semantic check 匹配，且所有 supplied optional filters 也匹配
- **THEN** warning 保留 identity/order/channel membership 并获得 configured `acceptedReason`
- **AND** matching 不读取 dependency source matcher

#### Scenario: Semantic acceptance still detects stale entries

- **WHEN** accepted-warning entry 没有匹配任何 generated semantic check result
- **THEN** current unmatched-acceptance warning behavior 保持
- **AND** diagnostic 使用 semantic check identity 描述 stale entry，而不是要求 scanner name

#### Scenario: Machine warning identity remains compatible

- **WHEN** semantic config 生成 file、function 或 duplicate warning
- **THEN** current machine/report projection 保持本 change 前的 rule/source fields 与 ordering
- **AND** public config 的 `checkId` 只作为 config boundary identity，不建立第二个 machine format
