## MODIFIED Requirements

### Requirement: Configuration JSON matches complete QualityConfig

Selected project configuration MUST 是一个完整 semantic document。Base semantic value 的 top level MUST 精确包含 `version`、`include`、`excludeDirs`、`generatedFiles`、`codeAreas`、`checks`、`acceptedWarnings`、`report`、`artifactDir` 与 `cacheDir`；后置 external workflow MAY 只组合 optional `$schema` metadata。`version` MUST 是 current contract discriminator `"1"`。Public runtime schema、generated schema、starter、examples 与 user-facing docs MUST NOT 声明 scanner product name、executable、argument list、dependency concurrency 或 backend format filter。

Unchanged semantic roots MUST 保留 current complete-config shape：`include`、`excludeDirs` 与
`generatedFiles` 是 string arrays；`codeAreas` 是 named record，每个 value 精确包含 string
`description`、string-array `globs` / `excludeGlobs`，以及取值为 `strict`、`moderate`、`relaxed`、
`watchlist-only` 或 `exclude-warnings` 的 string `warningPolicy`；`report` 精确包含
`title`、`nonBlockingNotice`、`footerGeneratedBy`、`footerNotice`、finite-number `topN`、valid IANA
time-zone string `timeZone`、boolean `showWatchlist` 与 finite-number `watchlistMax`；`artifactDir` / `cacheDir` 是
strings。本 change 除下述已确认 version、field tree、identity 与 cross-field reference 外，MUST
NOT 顺带收紧 current finite-number acceptance。

`checks` MUST 是 closed object，并完整包含以下 backend-neutral sections：

- `checks.files.codeLines`：`absoluteFloor`、`changedDelta` 与 `lowDecisionTokenAllowance`；allowance 包含 `codeLineFloor` 与 `maxDecisionTokens`。
- `checks.functions.cyclomaticComplexity`：`absoluteFloor` 与 `changedDelta`。
- `checks.functions.codeLines`：`absoluteFloor`、`changedDelta` 与 `lowComplexityAllowance`；allowance 包含 `codeLineFloor` 与 `maxCyclomaticComplexityExclusive`。
- `checks.functions.parameterCount`：`absoluteFloor` 与 `changedDelta`。
- `checks.duplication`：`defaultMinimumTokens`、`minimumTokensByCodeArea` 与 `fragments.changedDelta`。

每个 section、threshold、allowance 与 `fragments` object MUST 是 closed shape，并精确包含上列
fields。
上述 threshold、allowance、minimum-token 与 changed-delta values MUST 是 finite numbers。
`minimumTokensByCodeArea` MUST 是 record；每个 key MUST 引用 `codeAreas` 中的 name，缺少某个
area entry 时 duplicate scanning 使用 `defaultMinimumTokens`。

`acceptedWarnings[]` MUST 使用 required string `checkId` 与 `reason`；`checkId` MUST 是 `file-code-lines`、`function-cyclomatic-complexity`、`function-code-lines`、`function-parameter-count` 或 `duplicate-code`。它 MAY 使用现有 semantic match fields string `codeArea` / `metric` / `path`、string-array `messageIncludes` / `suggestionIncludes` 与 finite-number `value`，但 MUST NOT 接受 dependency source matcher。

Parser MUST 拒绝 missing、unknown、wrong-version 或 invalid fields，并返回 detached normalized semantic config；它 MUST NOT partial merge、从默认值补字段或把 project document 映射成 executable settings。

#### Scenario: Complete semantic configuration is accepted

- **WHEN** selected document 完整满足 current semantic runtime schema
- **THEN** parser 返回 detached normalized config，且 scope、checks、accepted-warning、report 与 artifact/cache values 对应输入
- **AND** scanner dependency execution settings 不来自该 document

#### Scenario: Public materials expose only product semantics

- **WHEN** reviewer 检查 runtime schema、derived document type、generated schema、starter、canonical config、fixture config 与 user-facing configuration docs
- **THEN** public field tree 使用 `checks.files`、`checks.functions` 与 `checks.duplication`
- **AND** 这些 materials 不包含 `lizard`、`scc`、`jscpd`、`command`、`args`、dependency
  concurrency 或 backend format filter

#### Scenario: Semantic accepted warning selects a stable check

- **WHEN** config 使用 `checkId = "function-cyclomatic-complexity"` 和其它 optional semantic match fields
- **THEN** accepted-warning matching targets the corresponding Vibe Check-owned check
- **AND** config 不需要知道 internal warning source、scanner name 或 executable

#### Scenario: Invalid semantic document is rejected

- **WHEN** document 缺少 required field、包含 unknown field、version 不是 `"1"`，或 nested value 无效
- **THEN** parser 在 scan 启动前失败并报告 path-aware reason
- **AND** parser 不补默认值、不修改输入，也不尝试按 dependency-specific shape 继续

### Requirement: Explicit configuration replaces defaults

指定 `--config` 时，该 complete semantic document SHALL 整体替换 built-in semantic config，且 MUST NOT 与其它 project file 或 built-in public values 合并。Current measurement、baseline measurement 与 Git-failure fallback collection MUST 使用 invocation 开始时解析的同一份 resolved semantic config。Scanner dependency snapshot SHALL 独立按 Product-owned operational boundary 解析；选择 explicit config MUST NOT 启用、禁用或改写 operational dependency overrides。

现有显式 CLI options 保持最高 public precedence：`--top-n` MUST 覆盖 `config.report.topN`，`--artifact-dir` MUST 覆盖 `config.artifactDir`；未显式提供时 MUST 使用 selected semantic config 中的值。

#### Scenario: Explicit semantic config is authoritative for product policy

- **WHEN** valid explicit semantic config 的 scope、checks、accepted-warning、report 或 artifact/cache fields 与 built-in semantic config 不同
- **THEN** 本次 scan 使用 explicit document 解析出的 values
- **AND** built-in public values 不参与该 scan

#### Scenario: Explicit CLI option overrides its semantic config field

- **WHEN** 调用者同时传入 valid config 与显式 `--top-n` 或 `--artifact-dir`
- **THEN** 本次运行使用显式 CLI value
- **AND** 其它 public fields 保持来自 selected semantic config

#### Scenario: One semantic config serves current baseline and fallback

- **WHEN** 一次 invocation 执行 current、baseline 或 Git-failure fallback collection
- **THEN** 所有阶段使用 invocation 开始时得到的同一个 resolved semantic config snapshot
- **AND** baseline 或 fallback 不重新读取 document、不重新应用 defaults，也不接触 dependency settings

#### Scenario: Operational override is independent of project selection

- **WHEN** 同一 invocation 同时具有 valid explicit semantic config 与 supported operational dependency override
- **THEN** semantic config 只决定 product policy，operational override 只决定 internal dependency execution
- **AND** 任一方都不覆盖或序列化另一方的 fields

### Requirement: Configuration parse failure stops the scan

Config owner SHALL 在调用 scan core 前完成 file read、UTF-8、document syntax、runtime schema 与 semantic post-validation。文件不存在、不可读或任一 parse/validation failure MUST 立即产生包含 resolved config path 的 config error；Product CLI MUST 将错误写入 stderr、退出 `3`，且 MUST NOT 回退 built-in config、启动 scanner / baseline 或创建成功 scan artifacts。

现有 tool-shaped complete config 是 unsupported legacy input。Loader MUST NOT dual-read、静默删除 executable fields 或采用 legacy project-level command/args；它 MUST 返回 migration diagnostic，标明 current version、semantic section mapping，以及 dependency execution settings 应迁移到 Product-owned operational boundary。

#### Scenario: Configuration file cannot be read

- **WHEN** 指定配置不存在、不是 regular file 或不可读
- **THEN** CLI 直接报告 resolved config path 与 read error
- **AND** scan 不启动并退出 `3`

#### Scenario: Semantic configuration cannot be parsed

- **WHEN** 配置不是 valid UTF-8 document 或不满足 current semantic schema / post-validation
- **THEN** CLI 报告 selected path 与 actionable failure location/reason
- **AND** scan 不创建 artifacts、不回退默认配置并退出 `3`

#### Scenario: Legacy tool-shaped config fails with migration guidance

- **WHEN** selected object 包含 legacy `lizard`、`scc`、`jscpd` 或 `tools` top-level fields
- **THEN** CLI 在 scanner、baseline 和 artifact creation 前以 exit `3` 拒绝它
- **AND** diagnostic 指向 `checks.files`、`checks.functions`、`checks.duplication` 与 operational dependency migration，不执行 legacy command/args

## ADDED Requirements

### Requirement: Runtime schema owns the semantic document contract

Product Config SHALL 以一个 Product-owned runtime schema source 作为 semantic document exact fields、required/optional status、closed shapes、types、enum、descriptions 与可表达 numeric constraints 的唯一 public field owner。`SemanticProjectConfigV1` type 与 published/generated editor schema MUST 从该 source 派生；runtime-only cross-field 或 platform-independent semantic checks MAY 留在 Product Config post-validation，但不得形成第二个 field tree。

`add-external-project-config-workflow` 生成和发现的 `.vibe-check/config.json` MUST 直接消费该 source 所定义的 semantic document。Comment-capable JSON syntax、discovery、initializer 和 sibling schema lifecycle 仍由该 workflow 拥有，本 requirement 不创建第二条 file workflow。

#### Scenario: Runtime and generated schemas cannot drift

- **WHEN** public semantic field、required status、enum 或 numeric constraint 发生变化
- **THEN** runtime validation、derived document type、generated schema、canonical config 与 validation material 从同一 source 同步变化
- **AND** required validation 在 checked-in material 与 source 不一致时失败

#### Scenario: External workflow consumes the semantic owner

- **WHEN** external config workflow 生成 comment-capable `.vibe-check/config.json` 与 sibling schema
- **THEN** document field tree 和 schema bytes 来自本 change 建立的 semantic runtime schema source
- **AND** external workflow 不重新定义 tool-named fields 或 applied dependency-override provenance

#### Scenario: Sibling schema cannot change scan semantics

- **WHEN** external workflow 的 sibling editor schema 缺失、被编辑或无效，但 selected config 满足 Product-owned runtime contract
- **THEN** scan 仍只按 built-in runtime schema 与 semantic checks 判定 document
- **AND** sibling schema 不成为 runtime input 或 second owner
