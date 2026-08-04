本 delta spec 只为文本路径引用检查增加可组合的 config-v2 fragment；它是临时未审计 artifact，不表示该配置已获准实现。

## ADDED Requirements

### Requirement: Config v2 composes a complete path-reference policy

Producing Product revision SHALL 注册 optional closed `checks.pathReferences` section；section 缺失 MUST 表示 capability 未配置并返回 `skipped`，loader MUST NOT 从 neutral default 补值，override MUST NOT 创建缺失 section。Section 存在时 MUST 精确包含 boolean `enabled`、boolean `reportAbsolutePaths`、boolean `includeInlineCode`、boolean `includeCodeBlocks`、string-array `allowedLiterals` 与 string-array `forbiddenLiterals`。两个 arrays 中每个值 MUST 是 non-empty string且在各自 array 内唯一；它们是完整 array leaves，不是 glob、prefix、substring或regex patterns。

Candidate 与 array value 的 literal match MUST 使用 parser 提取的原始 Unicode code-point sequence 做 case-sensitive exact equality，不执行 path normalization、URL decoding或platform case folding。判定 precedence MUST 固定为：exact `allowedLiterals` match 首先抑制该 candidate；否则 exact `forbiddenLiterals` match 产生 `forbidden-path-literal` finding；否则 absolute-form candidate 仅在 `reportAbsolutePaths = true` 时产生 `absolute-path-reference` finding；否则无 finding。同一值同时出现在两个 arrays 时 allowed match MUST 胜出。Matching override 替换整个 array，不与base或较早override拼接。

Feature fragment SHALL 注册 capability ID `path-reference-validation`、check IDs `absolute-path-reference`、`forbidden-path-literal`，以及本 capability spec 声明的 finding-code/evidence catalogs。全部六个 leaves MUST 标记为 overrideable；partial file patch 只可在 selected base 已声明 section 时替换这些 leaves，object 保持 closed，且 patch/resolution precedence 遵循 `file-policy-resolution`。

Neutral-default contribution SHALL 显式提供 `enabled = true`、`reportAbsolutePaths = true`、`includeInlineCode = false`、`includeCodeBlocks = false`、`allowedLiterals = []` 与 `forbiddenLiterals = []`。Quick profile MUST 返回 `skipped`。Full profile 只有在 section 已声明，且 base `enabled = true` 或 normalized inventory 中至少一个 path 的 resolved `enabled = true` 时才请求 capability；section 缺失、或 base 与全部 resolved paths 均为 disabled 时 MUST 返回 `skipped`。Capability 被请求后，selector 只选择 resolved `enabled = true` 的 supported text exact inputs；集合为空 MUST 返回 `no-input`。Product registry SHALL 接受上述 check IDs 用于 `acceptedWarnings[].checkId`，无论 selected document 是否声明 optional section；未请求 capability 不产生 matching finding。

#### Scenario: Neutral default checks prose absolute paths

- **WHEN** invocation 使用 composed neutral config v2 和 full profile
- **THEN** path-reference capability检查普通可见文本中的absolute path，且默认排除inline/block code
- **AND** empty literal arrays不产生额外literal match

#### Scenario: Allowed exact literal wins deterministically

- **WHEN**同一raw literal同时位于allowed和forbidden arrays且也是absolute form
- **THEN**allowed exact match抑制finding
- **AND**prefix、case-folded或normalized-equivalent string不算exact match

#### Scenario: Requested capability with no supported text is no-input

- **WHEN** full profile 的 declared policy effectively enabled，但 selector 找不到 resolved-enabled supported text exact input
- **THEN** capability返回`no-input`
- **AND**它不读取候选path或产生finding

#### Scenario: Override replaces arrays and declared booleans only

- **WHEN** base完整声明section，matching override设置新的`forbiddenLiterals`与`includeCodeBlocks`
- **THEN**resolved policy整体替换该array并替换该boolean，其它leaves保持base或较早winner
- **AND**unknown leaf、non-string item或对absent section的patch在scan work前失败
