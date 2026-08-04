本 delta spec 将JSON check policy加入semantic config v2；它是临时 change artifact，须通过实现前审计后才可执行。

## ADDED Requirements

### Requirement: Semantic config v2 owns JSON check policy

在 prerequisite `add-file-policy-overrides` 建立 complete、closed semantic config v2 后，existing `checks.files`、`checks.functions` 与 `checks.duplication` SHALL 继续 required；common check schema source另行允许 optional closed `checks.json` feature section。Section 缺失 MUST 表示 JSON capability 未配置；loader MUST 保持缺失且不得补默认值。Section 存在时 MUST 完整、精确包含 boolean `enabled` 与 integer `maximumBytes`，且 `maximumBytes` MUST 位于 inclusive range `1..67108864`。本 feature SHALL 向 neutral default 贡献并包含完整 `checks.json`，精确使用 `enabled = true` 与 `maximumBytes = 5242880`。

`overrides[].checks.json` SHALL 是从同一 source 派生的 closed partial patch，只可声明这两个 leaves；它只可 patch selected base document 已声明的 `checks.json`。Base section 缺失而任一 override 声明 `checks.json` MUST 是 path-aware config error，resolver MUST NOT 用 partial patch 构造 section。Base 存在时，matching path 按 file-policy-resolution 的 ordered later-wins 语义得到 immutable `ResolvedFilePolicy.checks.json`。

Product capability registry SHALL 注册 `json-syntax`、`json-duplicate-key` 与 `json-unsupported-input` semantic check IDs，accepted-finding validation/matching SHALL 从该 registry 承接，不在 config schema 另建手写 enum。Runtime schema、derived types、neutral default、init/editor schema、canonical example、docs 与 mapping MUST 同步 optional-but-complete v2 shape。V1 MUST 保持 closed 并拒绝这些 fields；config 与 output MUST NOT 包含 parser/library name、command、args 或 backend error code。JSON override 只能缩小 global inventory 内的 capability inputs 或改变 maximum bytes，MUST NOT 修改 include/exclude/generated scope、report、artifact/cache、binding 或 dependency settings。

#### Scenario: Base and override resolve JSON policy

- **WHEN** complete v2 base启用JSON且两个matching overrides依次修改`maximumBytes`与`enabled`
- **THEN** `ResolvedFilePolicy.checks.json`按declared leaf的later-wins语义得到detached final values
- **AND** `explain-config`列出base、matched override names、declared leaves与final JSON policy

#### Scenario: Missing section remains unconfigured

- **WHEN** complete v2 document 省略 `checks.json` 且 overrides 也不声明 JSON patch
- **THEN** loader 保持 JSON feature absent，full/quick planning 都将 capability 标记为 `skipped`
- **AND** loader 不从 neutral default 补入 JSON section

#### Scenario: Override cannot construct missing base section

- **WHEN** complete v2 base 省略 `checks.json`，但任一 override 声明 `checks.json.enabled` 或 `maximumBytes`
- **THEN** Product Config 在 scan work 前以 path-aware diagnostic 拒绝 document
- **AND** file policy resolver 不用 partial patch 构造 JSON base policy

#### Scenario: Present section must be complete

- **WHEN** v2 document 声明 `checks.json` 但缺少 `enabled` 或 `maximumBytes`
- **THEN** closed runtime schema 在 scan work 前拒绝 incomplete section
- **AND** loader 不补齐缺失 leaf

#### Scenario: Maximum bytes is bounded

- **WHEN** v2 base或override将`checks.json.maximumBytes`设为0、负数、非整数或大于67108864
- **THEN** Product Config在scan work前以field-path diagnostic拒绝document
- **AND** loader不clamp、fallback或把超界值传给parser

#### Scenario: V1 and unknown JSON policy fail closed

- **WHEN** version `"1"` document加入`checks.json`，或v2 JSON base/patch包含unknown/backend-named field
- **THEN** Product Config在scan work前以path-aware migration/schema diagnostic拒绝document
- **AND** loader不删除field、补默认值、dual-read或执行backend设置

#### Scenario: Override cannot expand global scope

- **WHEN** excluded或generated path匹配声明`checks.json.enabled = true`的override glob
- **THEN** file policy resolver不能把该path加入normalized inventory
- **AND** JSON selector和adapter都不会收到该path
