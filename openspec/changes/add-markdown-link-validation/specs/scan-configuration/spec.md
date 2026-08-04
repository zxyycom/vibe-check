本 delta spec 只为离线 Markdown 链接检查增加可组合的 config-v2 fragment；它是临时未审计 artifact，不表示该配置已获准实现。

## ADDED Requirements

### Requirement: Config v2 composes a complete offline Markdown link policy

Producing Product revision SHALL 注册 optional closed `checks.markdownLinks` section；section 缺失 MUST 表示 capability 未配置并返回 `skipped`，loader MUST NOT 从 neutral default 补值，override MUST NOT 创建缺失 section。Section 存在时 MUST 精确包含 boolean `enabled`、closed `local`、closed `anchors` 与 closed `boundary` objects。`local` MUST 精确包含 boolean `requireExistingFiles`；`anchors` MUST 精确包含 boolean `validateSameDocument` 与 boolean `validateCrossFile`；`boundary` MUST 精确包含 boolean `forbidAbsoluteFilesystem` 与 boolean `forbidProjectEscape`。这些 fields 只控制 deterministic local/anchor/boundary findings，不授权网络访问；external URL classification 与 internal handoff 在 enabled capability 中保持执行，不受这些 finding-policy leaves 关闭而消失。

Feature fragment SHALL 注册 capability ID `markdown-link-validation`、check IDs `markdown-link-local-target`、`markdown-link-anchor`、`markdown-link-boundary`，以及本 capability spec 声明的 finding-code/evidence catalogs。`enabled` 和五个 nested policy leaves MUST 全部标记为 overrideable；partial file patch 只可在 selected base 已声明 section 时替换这些 leaves，nested objects 保持 closed，且 patch/resolution precedence 遵循 `file-policy-resolution`。

Neutral-default contribution SHALL 显式提供 `enabled = true`、`local.requireExistingFiles = true`、`anchors.validateSameDocument = true`、`anchors.validateCrossFile = true`、`boundary.forbidAbsoluteFilesystem = true` 与 `boundary.forbidProjectEscape = true`。Quick profile MUST 返回 `skipped`。Full profile 只有在 section 已声明，且 base `enabled = true` 或 normalized inventory 中至少一个 path 的 resolved `enabled = true` 时才请求 capability；section 缺失、或 base 与全部 resolved paths 均为 disabled 时 MUST 返回 `skipped`。Capability 被请求后，selector 只选择 resolved `enabled = true` 的 Markdown exact inputs；集合为空 MUST 返回 `no-input`。Product registry SHALL 接受上述 check IDs 用于 `acceptedWarnings[].checkId`，无论 selected document 是否声明 optional section；未请求 capability 不产生 matching finding或external candidate。

#### Scenario: Neutral default performs deterministic validation only

- **WHEN** invocation 使用 composed neutral config v2 和 full profile
- **THEN** Markdown local、anchor与boundary policies完整启用并可产生deterministic findings
- **AND** external URL只被分类/移交，DNS或HTTP调用保持zero

#### Scenario: Missing or disabled section is skipped

- **WHEN** selected document省略 `checks.markdownLinks`，或base与全部resolved paths的`enabled`均为false
- **THEN** capability返回`skipped`且不解析Markdown链接
- **AND** loader不补neutral section、override不构造absent base

#### Scenario: Requested capability with no Markdown input is no-input

- **WHEN** full profile 的 declared policy effectively enabled，但 selector 找不到 resolved-enabled Markdown exact input
- **THEN** capability 返回 `no-input`
- **AND** 它不产生 finding 或 external candidate

#### Scenario: Per-file policy can disable one finding class

- **WHEN** base完整声明section，matching override设置`anchors.validateCrossFile = false`
- **THEN**该path仍执行link分类与其它enabled policies，但不为cross-file anchor产生anchor finding
- **AND**unknown leaf、tool/network field或对absent section的patch在scan work前失败
