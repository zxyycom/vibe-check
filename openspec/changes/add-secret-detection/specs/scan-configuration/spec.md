本临时且未审计的 delta spec 目标是注册 complete、tool-neutral 的 optional secret config section，并保持 absent/skipped 与 override 边界明确。

## ADDED Requirements

### Requirement: Config v2 exposes a closed tool-neutral secret policy

Public semantic config v2 SHALL 允许 Product-registered optional closed `checks.secrets` section；selected file-backed document省略section MUST 保持absent、capability `skipped`，且loader不得从neutral contribution补值。Section存在时 MUST 是complete closed base object，精确包含required boolean `enabled`、required integer `maximumFileBytes`（inclusive `1..67108864`）与required `allowlist` array；不得接受partial base。Runtime schema、editor schema、post-validation、override validation与generated examples MUST使用同一inclusive bound，不得接受zero、negative、fractional或大于67108864的值。每个allowlist entry SHALL 使用`secret-detection` capability规定的安全matcher shape。Public config、generated starter、editor schema、canonical example、help与provenance MUST NOT包含detector、library、executable、command、args、raw output、secret sample或backend rule identity。

V2 neutral/default secret contribution SHALL使用`enabled: true`、`maximumFileBytes: 1048576`与empty allowlist，使ungated neutral observation扫描批准文本但不扩大global scope；该contribution只参与neutral/init composition，不补入selected file-backed config。Config v1 SHALL按`add-file-policy-overrides` single-active v2 contract作为unsupported migration source拒绝。Secret fragment metadata SHALL只把`enabled`与`maximumFileBytes`标记为overrideable leaves，把`allowlist`标记为base-only。Override MUST只patch selected base已声明的complete secret section；base absent时任何override尝试构造secret section MUST在scan work前失败。Patch不得增加text/value matcher或恢复global scope已排除path。

Common `acceptedWarnings` MUST NOT接受`checkId = "secret-detection"`或`checkId = "secret-scan-coverage"` entry；config post-validation MUST将两者拒绝并指向`checks.secrets.allowlist`，避免generic message/suggestion/metric/value matcher绕过安全identity contract。Secret acceptance只能使用本capability的fingerprint/pathGlob及optional checkId/rule conjunction。

#### Scenario: Neutral observation uses semantic secret defaults

- **WHEN** ungated invocation 选择 config v2 neutral default
- **THEN** secret detection 对不超过 1 MiB 的批准文本 enabled，allowlist 为空
- **AND** default 不包含 scanner/tool identity 或 hidden executable setting

#### Scenario: File-size policy is explicitly bounded

- **WHEN** base或per-file patch设置`maximumFileBytes`为0、67108865、fraction或其它range外值
- **THEN** config validation在inventory read、classification与detector work前拒绝document
- **AND** neutral/init仍精确使用range内的`1048576`

#### Scenario: V1 is an unsupported migration source

- **WHEN** selected file-backed document 使用 version `"1"`，无论是否尝试包含 secret fields
- **THEN** current single-active v2 loader 在 scan work 前返回 migration diagnostic
- **AND** Product 不 dual-read、补入 secret default 或删除 unknown fields 后继续扫描

#### Scenario: Per-file patch cannot authorize unsafe matching or restore scope

- **WHEN** config v2 对某 path patch secret enabled/size policy，或尝试加入 value matcher
- **THEN** valid semantic patch只在 global inventory 内解析 enabled与inclusive `1..67108864` maximum bytes
- **AND** value matcher 被 schema 拒绝，被 global policy 排除的 path 仍不进入 exact inputs

#### Scenario: Override cannot construct an absent secret section

- **WHEN** selected file-backed v2 base省略`checks.secrets`，但override尝试patch其enabled或size leaf
- **THEN** config semantic validation在scan work前拒绝该override
- **AND** resolver不从neutral contribution创建partial/complete secret section

#### Scenario: Generic warning acceptance cannot target a secret

- **WHEN** config v2 在`acceptedWarnings`中使用`secret-detection`、`secret-scan-coverage`或generic text/value matcher
- **THEN** semantic post-validation 在 scan work 前拒绝该 entry 并指向 safe secret allowlist
- **AND** Product 不允许 generic matcher 接触 secret source、redacted message 或 backend identity
