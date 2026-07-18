## MODIFIED Requirements

### Requirement: Ignore file handling
Scan scope 的 current 与 baseline Git collection SHALL 通过 `--exclude-standard` 应用 Git 支持的 VCS ignore behavior。Git command 成功时，其 normalized result MUST 直接成为候选集合，包括成功的 empty result；empty result MUST NOT 触发 walker。只有 Git command 失败时，对应 fallback walker SHALL 使用 config-only best-effort policy：候选资格只由 product config 的 include、exclude directories 与 generated-file rules 决定，VCS ignore sources 不参与 fallback collection。Git 与 fallback 结果 MUST 继续进入相同的 downstream scan-scope classification，且 fallback MUST NOT 新增 ignore-parse diagnostic、partial-report contract 或 fatal outcome。

#### Scenario: Git success 的空集合具有权威性
- **WHEN** current 或 baseline Git command 成功，且 VCS ignore rules 使 normalized candidate
  set 为空
- **THEN** collection 返回 empty candidate set
- **AND** collection 不启动 fallback walker

#### Scenario: Current 与 baseline failure fallback 不解析 VCS ignore
- **WHEN** current 或 baseline Git command 失败，且一个 path 匹配 VCS ignore rule、product
  include，但不匹配 product exclude 或 generated-file rule
- **THEN** 对应 fallback walker 将该 path 保留为 normalized candidate
- **AND** VCS ignore rule 不改变 fallback eligibility

#### Scenario: Fallback 继续应用 product config
- **WHEN** current 或 baseline Git command 失败，且候选 path 不匹配 include 或匹配 product
  exclude directory / generated-file rule
- **THEN** 对应 fallback walker 从 normalized candidates 中排除该 path
- **AND** downstream scanner 不得通过自行遍历让该 path 重新进入 scan scope
