This delta spec upgrades semantic config to composable v2 file-policy overrides; it is a temporary change artifact and has not passed its implementation audit.

## MODIFIED Requirements

### Requirement: Configuration JSON matches complete QualityConfig

Selected project configuration MUST 是一个完整 semantic document。Base semantic value 的 top level MUST 精确包含 `version`、`include`、`excludeDirs`、`generatedFiles`、`codeAreas`、`checks`、`overrides`、`acceptedWarnings`、`report`、`artifactDir` 与 `cacheDir`；后置 external workflow MAY 只组合 optional `$schema` metadata。`version` MUST 是 current contract discriminator `"2"`。Public runtime schema、generated schema、starter、examples 与 user-facing docs MUST NOT 声明 scanner product name、executable、argument list、dependency concurrency 或 backend format filter。

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

以上 `files`、`functions` 与 `duplication` 是 v2 required core sections。除此之外，`checks` MAY
只包含 producing Product revision 的 descriptor registry 所声明的 optional closed feature sections；
每个注册项 MUST 拥有唯一 tool-neutral config path、完整 base schema、neutral-default contribution、
stable semantic check IDs、profile/request semantics 与可覆盖 leaf metadata。Selected document 省略
optional section MUST 明确表示该 capability 未配置并返回 `skipped`；parser MUST NOT 从 neutral
default 补 section。Unknown、重复注册或 schema path 冲突 MUST 在 build/drift validation 或 config
validation 中失败。

向 v2 增加 optional registered section MUST 保持省略该 section 的既有 v2 document 有效；修改现有
required field、改变缺失语义或要求既有 document 新增 section 属于 incompatible shape，MUST 使用后续
version 与 migration，而不得把 required addition 偷渡进 v2。

`overrides` MUST 是 array；每个 element MUST 满足 `file-policy-resolution` capability 定义的
closed `{ name, files, checks }` partial-policy contract。Neutral default 与 init material MUST
提供空 array。Override patch 的 field tree MUST 从上述同一个 complete `checks` schema source
派生，而不是建立第二套 check schema。

`acceptedWarnings[]` MUST 使用 required string `checkId` 与 `reason`；`checkId` MUST 引用 producing
Product revision registry 中的 stable semantic check identity。Registry 初始 MUST 包含
`file-code-lines`、`function-cyclomatic-complexity`、`function-code-lines`、
`function-parameter-count` 与 `duplicate-code`，后续 feature change MAY 注册自身 IDs。Entry MAY 使用
现有 semantic match fields string `codeArea` / `metric` / `path`、string-array `messageIncludes` /
`suggestionIncludes` 与 finite-number `value`，但 MUST NOT 接受 dependency source matcher。Unknown
check ID MUST 在 scan work 前失败；optional feature section 是否出现不改变其 Product-level ID
registration，但未请求的 capability 不会产生 matching finding。

Parser MUST 拒绝 missing、unknown、wrong-version 或 invalid fields，并返回 detached normalized semantic config；它 MUST NOT partial merge、从默认值补字段或把 project document 映射成 executable settings。

#### Scenario: Complete configuration is accepted unchanged

- **WHEN** selected document 完整满足 current semantic runtime schema
- **THEN** parser 返回 detached normalized config，且 scope、checks、accepted-warning、report 与 artifact/cache values 对应输入
- **AND** scanner dependency execution settings 不来自该 document

#### Scenario: Public materials expose only product semantics

- **WHEN** reviewer 检查 runtime schema、derived document type、generated schema、starter、canonical config、fixture config 与 user-facing configuration docs
- **THEN** public field tree 使用 required `checks.files`、`checks.functions`、`checks.duplication` 与 producing revision 已注册的 optional tool-neutral feature sections
- **AND** 这些 materials 不包含 `lizard`、`scc`、`jscpd`、`command`、`args`、dependency
  concurrency 或 backend format filter

#### Scenario: Scanner dependency settings remain outside project config

- **WHEN** complete product invocation 需要执行 scanner dependencies
- **THEN** executable、args 与 concurrency 只保留在独立解析的 Product-owned dependency snapshot
- **AND** project document、public runtime schema 与 normalized semantic config 不包含这些 settings

#### Scenario: Semantic accepted warning selects a stable check

- **WHEN** config 使用 `checkId = "function-cyclomatic-complexity"` 和其它 optional semantic match fields
- **THEN** accepted-warning matching targets the corresponding Vibe Check-owned check
- **AND** config 不需要知道 internal warning source、scanner name 或 executable

#### Scenario: Omitted registered feature stays disabled without merge

- **WHEN** producing Product revision 注册 optional feature section，但 selected v2 document 省略该 section
- **THEN** document 仍通过 structural validation，resolved config 保持该 section absent，capability result 为 `skipped`
- **AND** loader 不从 neutral default 补值，override 也不能创建该 section

#### Scenario: Incomplete or invalid configuration is rejected

- **WHEN** document 缺少 required field、包含 unknown field、version 不是 `"2"`，或 nested value 无效
- **THEN** parser 在 scan 启动前失败并报告 path-aware reason
- **AND** parser 不补默认值、不修改输入，也不尝试按 dependency-specific shape 继续

### Requirement: Configuration parse failure stops the scan

Config owner SHALL 在调用 scan core 前完成 file read、UTF-8、document syntax、runtime schema 与 semantic post-validation。文件不存在、不可读或任一 parse/validation failure MUST 立即产生包含 resolved config path 的 config error；Product CLI MUST 将错误写入 stderr、退出 `3`，且 MUST NOT 回退 built-in config、启动 scanner / baseline 或创建成功 scan artifacts。

Version `"1"` semantic document 与现有 tool-shaped complete config 都是 unsupported legacy input。Loader MUST NOT dual-read、自动升级、静默删除 executable fields 或采用 legacy project-level command/args；它 MUST 返回 migration diagnostic，标明 current version、v1 到 v2 的 required `overrides` migration、semantic section mapping，以及 dependency execution settings 应迁移到 Product-owned operational boundary。

#### Scenario: Configuration file cannot be read

- **WHEN** 指定配置不存在、不是 regular file 或不可读
- **THEN** CLI 直接报告 resolved config path 与 read error
- **AND** scan 不启动并退出 `3`

#### Scenario: Configuration content cannot be parsed

- **WHEN** 配置不是 valid UTF-8 document 或不满足 current semantic schema / post-validation
- **THEN** CLI 报告 selected path 与 actionable failure location/reason
- **AND** scan 不创建 artifacts、不回退默认配置并退出 `3`

#### Scenario: Semantic v1 config fails with migration guidance

- **WHEN** selected document 是原本有效的 semantic v1 config
- **THEN** CLI 在 scanner、baseline、cache 与 artifact creation 前以 exit `3` 拒绝它
- **AND** diagnostic 要求将 version 改为 `"2"` 并提供 required `overrides` array，不自动改写文件

#### Scenario: Legacy tool-shaped config fails with migration guidance

- **WHEN** selected object 包含 legacy `lizard`、`scc`、`jscpd` 或 `tools` top-level fields
- **THEN** CLI 在 scanner、baseline 和 artifact creation 前以 exit `3` 拒绝它
- **AND** diagnostic 指向 `checks.files`、`checks.functions`、`checks.duplication` 与 operational dependency migration，不执行 legacy command/args

### Requirement: Runtime schema owns the semantic document contract

Product Config SHALL 以一个 Product-owned runtime schema source 作为 semantic document exact fields、required/optional status、closed shapes、types、enum、descriptions 与可表达 numeric constraints 的唯一 public field owner。该 source SHALL 以 Product descriptor registry 的唯一、无冲突 feature fragments 组合 optional check sections、neutral contributions、semantic check IDs 与 override metadata。`SemanticProjectConfigV2` type 与 published/generated editor schema MUST 从 composed source 派生；runtime-only cross-field 或 platform-independent semantic checks MAY 留在 Product Config post-validation，但不得形成第二个 field tree。

`add-external-project-config-workflow` 生成和发现的 `.vibe-check/config.json` MUST 直接消费该 source 所定义的 semantic document。Comment-capable JSON syntax、discovery、initializer 和 sibling schema lifecycle 仍由该 workflow 拥有，本 requirement 不创建第二条 file workflow。

#### Scenario: Runtime and generated schemas cannot drift

- **WHEN** public semantic field、required status、enum 或 numeric constraint 发生变化
- **THEN** runtime validation、derived document type、generated schema、canonical config 与 validation material 从同一 source 同步变化
- **AND** required validation 在 checked-in material 与 source 不一致时失败

#### Scenario: Feature fragments compose without replacing the owner

- **WHEN** independent feature change 注册唯一 optional check section、neutral contribution、check IDs 与 overrideable leaves
- **THEN** runtime schema source deterministically组合该 fragment，并保持 required core sections 与其它 feature fragments
- **AND** duplicate path/check ID、unknown fragment shape或第二套feature-local merge/schema owner使drift validation失败

#### Scenario: External workflow consumes the semantic owner

- **WHEN** external config workflow 生成 comment-capable `.vibe-check/config.json` 与 sibling schema
- **THEN** document field tree 和 schema bytes 来自本 change 建立的 semantic runtime schema source
- **AND** external workflow 不重新定义 tool-named fields 或 applied dependency-override provenance

#### Scenario: Sibling schema cannot change scan semantics

- **WHEN** external workflow 的 sibling editor schema 缺失、被编辑或无效，但 selected config 满足 Product-owned runtime contract
- **THEN** scan 仍只按 built-in runtime schema 与 semantic checks 判定 document
- **AND** sibling schema 不成为 runtime input 或 second owner

### Requirement: Neutral default configuration

Product Config SHALL 从以下 repository-neutral exact core template 与 producing revision registry
中每项 feature 的 neutral-default contribution 组合完整 neutral semantic value。Template 的 `checks`
固定 required core sections；每个 registered feature contribution MUST 在自身唯一 optional check path
提供一份 complete closed base section。Composition MUST 保留其它 template fields、拒绝 path/check-ID
冲突，并且不得从用户选择的 file-backed document 补入这些 neutral contributions。

本 requirement 固定 core template；交付后的 composed current value 由
[Configuration](../../../docs/configuration.md#neutral-default) 与
[Product runtime source](../../../src/product/config.ts) 维护：

```json
{
  "acceptedWarnings": [],
  "artifactDir": "artifacts/vibe-check",
  "cacheDir": ".cache/vibe-check",
  "checks": {
    "duplication": {
      "defaultMinimumTokens": 75,
      "fragments": {
        "changedDelta": 1
      },
      "minimumTokensByCodeArea": {}
    },
    "files": {
      "codeLines": {
        "absoluteFloor": 300,
        "changedDelta": 80,
        "lowDecisionTokenAllowance": {
          "codeLineFloor": 500,
          "maxDecisionTokens": 10
        }
      }
    },
    "functions": {
      "codeLines": {
        "absoluteFloor": 50,
        "changedDelta": 20,
        "lowComplexityAllowance": {
          "codeLineFloor": 150,
          "maxCyclomaticComplexityExclusive": 5
        }
      },
      "cyclomaticComplexity": {
        "absoluteFloor": 10,
        "changedDelta": 5
      },
      "parameterCount": {
        "absoluteFloor": 5,
        "changedDelta": 2
      }
    }
  },
  "codeAreas": {
    "project": {
      "description": "This project",
      "excludeGlobs": [],
      "globs": ["**/*"],
      "warningPolicy": "moderate"
    }
  },
  "excludeDirs": [
    ".git",
    ".vibe-check",
    ".cache",
    ".venv",
    "artifacts",
    "build",
    "dist",
    "node_modules",
    "target",
    "vendor"
  ],
  "generatedFiles": ["**/generated/**", "**/*.generated.*"],
  "include": ["**/*"],
  "overrides": [],
  "report": {
    "footerGeneratedBy": "Vibe Check",
    "footerNotice": "Review findings for this project.",
    "nonBlockingNotice": "This project scan is observational unless a gate is explicitly enabled.",
    "showWatchlist": true,
    "timeZone": "UTC",
    "title": "This project quality report",
    "topN": 20,
    "watchlistMax": 50
  },
  "version": "2"
}
```

#### Scenario: Default provides neutral full-project policy

- **WHEN** Product Config 映射 neutral default
- **THEN** 该值由 exact core template 与全部 registered neutral feature contributions 组成、通过 semantic v2 validation，并将所有 supported、eligible project files 归入 `project` area
- **AND** runtime 获得一份 detached、invocation-owned config

#### Scenario: File-backed config does not inherit a new neutral feature

- **WHEN** producing revision 注册新 optional feature section，但 selected file-backed v2 document 省略该 section
- **THEN** selected resolved config 保持 section absent，相关 capability 为 `skipped`
- **AND** registry neutral contribution 只参与 neutral default/init generation，不 partial merge 到用户 document
