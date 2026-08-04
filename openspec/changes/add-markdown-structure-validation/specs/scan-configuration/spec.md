本 delta spec 只为 Markdown 结构检查增加可组合的 config-v2 fragment；它是临时未审计 artifact，不表示该配置已获准实现。

## ADDED Requirements

### Requirement: Config v2 composes a complete Markdown structure policy

Producing Product revision SHALL 注册 optional closed `checks.markdownStructure` section；section 缺失 MUST 表示 capability 未配置并返回 `skipped`，loader MUST NOT 从 neutral default 补值，override MUST NOT 创建缺失 section。Section 存在时 MUST 精确包含 boolean `enabled`，closed `document`、`section`、`paragraph` objects，以及 closed `headings` object。三个 size objects MUST 各自精确包含 `minimumWords`、`maximumWords`、`minimumCharacters`、`maximumCharacters`；每个 size leaf MUST 为 `false` 或 1 至 `Number.MAX_SAFE_INTEGER` 的 positive safe integer，且同一单位的 minimum/maximum 都启用时 minimum MUST 小于等于 maximum。`headings` MUST 精确包含 boolean `requireSingleH1`、boolean `requireFirstHeadingH1`、boolean `forbidDepthSkips` 与 `maximumDepth`；`maximumDepth` MUST 为 `false` 或 integer 1..6。

Feature fragment SHALL 注册 capability ID `markdown-structure-validation`、check IDs `markdown-document-size`、`markdown-section-size`、`markdown-paragraph-size` 与 `markdown-heading-structure`，以及本 capability spec 声明的 observation/finding-evidence catalogs。上述 `enabled`、十二个 size leaves 与四个 heading leaves共十七个 leaves MUST 全部标记为 overrideable；partial file patch 只可在 selected base 已声明 section 时替换这些 leaves，nested objects 保持 closed，且 patch/resolution precedence 遵循 `file-policy-resolution`。

Neutral-default contribution SHALL 显式提供完整 section：`enabled = true`，document/section/paragraph 的十二个 minimum/maximum leaves 全部为 `false`，`requireSingleH1`、`requireFirstHeadingH1`、`forbidDepthSkips` 与 `maximumDepth` 四个 heading leaves 全部为 `false`；因此 neutral scan 产生结构 observations，但不因 structure policy 产生 finding。Quick profile MUST 返回 `skipped`。Full profile 只有在 section 已声明，且 base `enabled = true` 或 normalized inventory 中至少一个 path 的 resolved `enabled = true` 时才请求 capability；section 缺失、或 base 与全部 resolved paths 均为 disabled 时 MUST 返回 `skipped`。Capability 被请求后，selector 只选择 resolved `enabled = true` 的 Markdown exact inputs；集合为空 MUST 返回 `no-input`，不得表示为 succeeded。Product registry SHALL 接受上述 check IDs 用于 `acceptedWarnings[].checkId`，无论 selected document 是否声明该 optional section；未请求 capability 不产生 matching finding。

#### Scenario: Neutral default observes without structure findings

- **WHEN** invocation 使用 composed neutral config v2，并以 full profile 扫描 Markdown
- **THEN** `checks.markdownStructure` 完整存在、capability 被请求并产生 registered observations
- **AND** 所有 threshold/rule leaves 为 false，因此不产生 structure-policy finding

#### Scenario: File-backed omission stays unconfigured

- **WHEN** selected file-backed v2 document 省略 `checks.markdownStructure`
- **THEN** loader 保持 section absent，capability 返回 `skipped`
- **AND** neutral contribution与override都不会补建该 section

#### Scenario: Requested capability with no exact input is no-input

- **WHEN** full profile 的 declared policy effectively enabled，但 selector 找不到 resolved-enabled Markdown exact input
- **THEN** capability 返回 `no-input`
- **AND** machine output 不包含该 capability 的 observation 或 finding

#### Scenario: Override patches only declared leaves

- **WHEN** base 声明完整 Markdown structure section，matching override 只设置 `section.maximumWords = 800`
- **THEN** resolved policy只替换该 leaf并保留其它base values
- **AND** unknown leaf、unsafe integer、partial base section或对缺失 section 的 patch 在scan work前失败

#### Scenario: First-heading policy is complete and independently overrideable

- **WHEN**base section声明`requireSingleH1 = false`与`requireFirstHeadingH1 = false`，matching override只设置`headings.requireFirstHeadingH1 = true`
- **THEN**resolved policy要求存在时的首个可见heading为H1，但不因此要求文档恰有一个H1
- **AND**其余十六个leaves保持base或较早winner
