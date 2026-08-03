本 design 说明如何建立 semantic config 与 internal scanner dependency 的单向边界。

## Context

动机见 [proposal.md](proposal.md#why)。以下是设计所依赖的当前事实，不是目标状态声明：

| Surface | Current fact | Design consequence |
| --- | --- | --- |
| Config document | `docs/configuration.md` 和 `src/product/config-parser.ts` 要求完整 tool-shaped JSON；`QualityConfig` 同时含 public policy 与 `tools` | 必须拆开 public document type、normalized product semantics 和 dependency execution type |
| Scanner execution | `src/product/config.ts` 选择 platform command，并读取 `VIBE_CHECK_*`；current/baseline adapters 从 `QualityConfig.tools` 取 command/args | Operational resolution 必须集中且 invocation-scoped，不能只删除 schema fields |
| Quality consumers | Scope、warnings、report、cache、current 与 baseline 都直接消费一个宽 `QualityConfig` | 分层后必须显式限制每个 consumer 能看见的 config slice，避免 command/args 再次扩散 |
| Numeric validation | Current parser 对 thresholds、token values、report counts 与 accepted-warning value 只要求 finite number；除 time zone 与 warning-policy enum 外没有 range/integer validation | 本解耦不得顺带引入未确认的 positive/integer contract；schema 先保持 current finite-number acceptance |
| Duplicate format | `formatByCodeArea` 被直接写入 jscpd `format`；对同一 `.ts` / `.rs` area，`typescript` 只扫描 `.ts`，省略 format 时 pinned jscpd 5.0.11 分别扫描两类 extension | 该 field 是 backend filter，不是 quality threshold；target adapter 省略 public filter，并让 pinned backend 从 exact paths 检测 format |
| External workflow | `add-external-project-config-workflow` 规划 `.vibe-check/config.json`、comment-capable JSON、init/discovery 与 sibling schema | 本 change 只交付 semantic runtime schema/mapping；external workflow 组合 `$schema` metadata 和 file lifecycle |
| Lizard port | `port-lizard-function-metrics-to-typescript` 已按活动决策延期 | 本 change 不实现 port；目标边界使未来 port 只改变 internal backend |
| Machine output | Current warnings/metrics 仍包含 tool-derived source/rule metadata | Project config decoupling 不等于 output identity redesign；后者保持不变 |

### Artifact authority and reading path

后续 implementer 按以下顺序恢复本 change；同一判断只在一个 owner 完整表达：

1. [proposal.md](proposal.md) 拥有问题、范围、capability 和 change ordering。
2. `specs/**` 拥有可观察输入、失败、兼容与 handoff contract。
3. 本 design 拥有 type/data-flow、owner、mapping、migration 与 implementation choices。
4. [tasks.md](tasks.md) 只拥有执行顺序、readiness gate 和验证证据，不重新定义 field semantics。
5. 实现完成后，`docs/configuration.md`、`docs/scanner-dependencies.md`、runtime schema source 与对应 owner docs 接替 current behavior；active change artifacts 不成为长期事实源。

### Stable terms

| Term | Meaning and owner |
| --- | --- |
| Semantic config | Project-controlled Vibe Check scope、quality checks、acceptance/report 与 artifact/cache policy；不含 dependency execution settings |
| `SemanticProjectConfigV1` | 从唯一 runtime schema source 派生的 complete public semantic value；`version` 固定为 `"1"` |
| Resolved quality config | Semantic document 通过 schema、post-validation 和 explicit CLI overrides 后形成的 readonly domain value；Core consumers 只接收所需 slices |
| Scanner dependency snapshot | Product 在 invocation 内一次解析的 backend executable/args、platform defaults、operational overrides、availability protocol inputs 和 bounded concurrency；不是 project config |
| Semantic check ID | Config-only stable identity，用于 accepted-warning selection；target v1 包含五个 backend-neutral values |
| Backend identity | Adapter/cache/diagnostic 所需的 internal implementation identity；不写回 project config |
| Cache identity projection | 由各 measurement cache owner 从本 capability 的 semantic values、exact inputs 与 backend identity 生成；不存在全量 semantic-config fingerprint |
| Operational override | Product 支持的 invocation-level environment input；不是 project config，invalid shape 是 ordinary runtime error / exit `2` |
| External config workflow | 后置 change 所拥有的 `.vibe-check/config.json` filename、comment grammar、discovery、`init` 和 sibling schema lifecycle |

## Goals / Non-Goals

**Goals:**

- 让 public config schema 在 file/function/duplication backend replacement 后保持不变。
- 让 runtime schema、schema-derived type、normalized mapping 和 generated schema projection 只有一个 semantic field owner。
- 让 dependency execution details 只能从 Product-owned internal boundary 到达 eligible adapters。
- 在同一 invocation 内固定 semantic config 与 dependency snapshot，保持 current/baseline/fallback 可复现。
- 给现有显式 tool-shaped configs 提供 fail-fast、可操作且不执行 legacy command 的 hard-cut migration。
- 给 external config workflow 和 deferred Lizard port 提供单向、无重复 field tree 的交接契约。

**Non-Goals:**

- 不实现 `.vibe-check/config.json` discovery、comment parsing、`init` 或 sibling schema filesystem workflow。
- 不设计 plugin/provider registry、用户自选 scanner、自动安装 dependency 或 generic service framework。
- 不重命名 machine warning `ruleId` / `sourceTool`、metrics tool metadata、raw scanner artifacts 或 console scanner labels。
- 不改变 scan profiles、capability IDs、eligibility、warning algorithms、gate、completeness 或 process outcome。
- 不实现 Lizard TypeScript port，也不以本 change 改变其已记录产品优先级。

## Ownership and Dependency Direction

| Owner | Responsibility introduced or changed here | Must not own |
| --- | --- | --- |
| Product Config (`src/product/**`) | Semantic runtime schema、derived type、unknown-input validation、semantic post-validation、legacy diagnostic、domain mapping | Dependency command/args、availability、file discovery/init、measurement cache identity |
| Product CLI / scan entry | Selected config path 的现有 routing、explicit CLI overrides、top-level controlled error mapping、把两个 snapshots 交给 orchestration | 重复 schema/parser、tool mapping、scanner protocol |
| Scanner Dependencies (`src/product/**`) | Built-in backend settings、platform defaults、supported operational overrides、typed snapshot、dependency validation | Project scope/threshold/report、warning/output semantics |
| Core orchestration | 按 eligibility 把 exact semantic settings 与 capability-specific dependency slice 交给 adapters；current/baseline 复用 snapshots | 读取 environment/schema/file，或向 warning/report 传播 executable settings |
| Scanner adapter | Availability、process/protocol、backend hint、raw result、normalized model/failure | Public project schema、quality thresholds、warning/gate/output |
| External Config workflow (dependent change) | `.vibe-check/config.json` selection、comment-capable document、`$schema` composition、init/editor schema | Semantic field tree、dependency resolution/provenance |
| Dogfood wrapper (`scripts/**`) | 继续显式传入 repo root 并透明传递 args/output/status；external workflow 完成后传 `.vibe-check/config.json` | Config parsing/mapping、environment interpretation、dependency selection |

调用方向保持：

```text
caller / thin wrapper
  -> Product Config boundary -> ResolvedQualityConfig
  -> Scanner Dependency boundary -> ScannerDependencySnapshot
  -> scan orchestration
       -> scope / warnings / report consume semantic slices only
       -> eligible adapter consumes exact inputs + one dependency slice
  <- normalized capability results / metrics / warnings / output
```

Product runtime 继续位于 `src/product/**`，不得反向导入 `scripts/**`。两个 snapshots 可以由一个 orchestration context 持有，但不得重新合并为 public `QualityConfig` 或让任意 generic consumer 获得 command/args。

## Common-Denominator Analysis

本分析以 current `QualityConfig` type、parser 和所有 production field accesses 为事实边界。
下表逐项记录 public semantic owner 与 internal landing；current parser 接受某字段不自动证明它
应继续公开。

| Current field family | Consumer obligation | Target owner / representation |
| --- | --- | --- |
| `version` | Document contract identity 与 machine metadata | Public exact `version = "1"`；cache owner 不把它当 caller cache-bust label |
| `include` | Current/baseline/Git-fallback candidate selection | Public semantic root，selected document 整体替换 built-in value |
| `excludeDirs` | Collection 与 scanner exact-input exclusion | Public semantic root；adapter 不重复过滤或加入 hidden defaults |
| `generatedFiles` | Collection、classification 与 scanner exact-input exclusion | Public semantic root |
| `codeAreas.*` | Classification、warning policy、report grouping 与 per-area token override reference | Public semantic root；definition 保留 `description`、`globs`、`excludeGlobs`、`warningPolicy` |
| `scc.fileCodeLines` | File code-line warning floors/delta 与 low-decision-token allowance | `checks.files.codeLines` |
| `lizard.cyclomaticComplexity` | Function complexity warning floor/delta | `checks.functions.cyclomaticComplexity` |
| `lizard.functionCodeDensity` | Function NLOC warning floor/delta 与 low-complexity allowance；不是 ratio | `checks.functions.codeLines` |
| `lizard.parameterCount` | Function parameter warning floor/delta | `checks.functions.parameterCount` |
| `jscpd.defaultMinimumTokens` | Default duplicate measurement sensitivity | `checks.duplication.defaultMinimumTokens` |
| `jscpd.minimumTokens` | Per-code-area duplicate measurement sensitivity | `checks.duplication.minimumTokensByCodeArea`；keys 只能引用 defined code areas，missing entry 使用 default |
| `jscpd.duplicateFragments.changedDelta` | Duplicate warning changed-delta policy | `checks.duplication.fragments.changedDelta` |
| `acceptedWarnings.ruleId` | Accepted-warning check selection | Required semantic `checkId`，由 Config/Quality exhaustive mapper 投影 current machine rule identity |
| `acceptedWarnings.sourceTool` | Optional backend-source filter | 删除；不映射、不双读 |
| 其它 `acceptedWarnings` fields | Reason 与 backend-neutral warning filters | 保留 `reason`、`codeArea`、`messageIncludes`、`metric`、`path`、`suggestionIncludes`、`value` |
| `report.*` | Human report content、time zone、ranking 与 watchlist presentation | Public `report` semantic root；保留 current closed fields |
| `artifactDir` / `cacheDir` | Project-local output/cache location | Public semantic roots；CLI 只覆盖 `artifactDir` |
| `jscpd.maxParallelTasks` | Backend work scheduling | Internal duplicate dependency default；不是 project policy |
| `jscpd.formatByCodeArea` | jscpd format filter，决定 area 内哪些 extensions 被扫描 | 删除；target jscpd adapter 对 exact inputs 省略 format override，由 pinned backend 按 extension 检测；不建立 generic format abstraction |
| `tools.lizard.command` | Python/Lizard executable selection | Internal default + `VIBE_CHECK_LIZARD_CMD` |
| `tools.lizard.args` | 固定 Python module protocol | Internal fixed `-m lizard`；没有 public 或 environment args override |
| `tools.scc.command` / `args` | scc executable 与 operational args | Internal defaults + `VIBE_CHECK_SCC_CMD` / `VIBE_CHECK_SCC_ARGS` |
| `tools.jscpd.command` / `args` | jscpd executable 与 operational args | Internal defaults + `VIBE_CHECK_JSCPD_CMD` / `VIBE_CHECK_JSCPD_ARGS` |

File、function 与 duplication checks 共享“Product-owned quality intent”生命周期，但合法
threshold/allowance 结构不同。一个全局扁平 map 会丢失这些差异；继续按三个 tool names 分组
则让 backend replacement 穿透 public contract。因此选择一个 `checks` root 加
`files` / `functions` / `duplication` 三个显式变体。

全局共享、按 capability 变体和保持 tool-local 三类候选中，只有 capability variants 同时
满足 consumer sufficiency 与变化隔离。Operational settings 随 host、installation 与 backend
revision 变化，不与 repository quality policy 共享 lifecycle，因此保持 internal。Current
semantic numeric fields 继续只承诺 finite numbers；本 change 不利用新 schema 顺带增加
positive/integer limits。

## Decisions

### Decision 1: Split document, domain, and dependency types

建立三个非同义边界：

```text
unknown input
  -> SemanticProjectConfigV1 (schema-derived public value)
  -> ResolvedQualityConfig (readonly domain value + explicit CLI overrides)

process/env/platform
  -> ScannerDependencySnapshot (readonly internal value)
```

`ResolvedQualityConfig` 可以沿用适合 Core 的 domain nesting，但它的 fields 也使用 semantic names；不得继续把 tool-shaped `QualityConfig` 作为 public type 或把 `tools` 附回 domain config。Scanner adapters 接收 capability-specific dependency input，而不是整个 snapshot。

**Alternatives considered:**

- 只从 schema 隐藏 `tools`、内部仍让 parser/Core 共享旧 type：拒绝，因为 public-to-domain mapping 与 command resolution 仍耦合，未来 port 继续跨 Config/Core 修改。
- 在 `QualityConfig` 中保留 optional `tools`：拒绝，因为 optional field 仍是 public capability，并产生 explicit-config/env precedence 分支。

### Decision 2: Use one runtime schema source and a composition seam

Product Config 使用现有 `typebox` runtime/schema-derived-type pattern 建立 `SemanticProjectConfigV1Schema`；raw input 始终以 `unknown` 进入，schema validation 后才进入 typed semantic mapping。Schema source 拥有 semantic fields、closed objects、required status、enum、description 和可表达 numeric constraints；IANA time zone、code-area key reference 等 cross-field checks 留在显式 post-validation。

Base semantic schema 不拥有 filename、comments 或 sibling file。它暴露可组合 schema/type projection，使 external config workflow 只增加 optional `$schema` document metadata，并从同一 semantic source 生成 editor schema；不得复制 `checks` tree 或维护 parallel interface。当前 explicit strict JSON 是后续 comment-capable JSON 的语法子集。

**Alternatives considered:**

- 保留手写 interface + parser + JSON Schema 三份结构：拒绝，field evolution 会产生 drift。
- 让 runtime 加载 sibling schema：拒绝，因为可编辑 artifact 会成为不可信 second owner。
- 新增 schema/parser dependency：拒绝，仓库已有 `typebox`/Ajv validation pattern，且 external workflow 已有 Bun native comment parser 方案。

### Decision 3: Fix the semantic v1 field tree

**Status:** 已确认；exact `version = "1"` 与下述 field tree 是目标 public contract。

Target v1 public semantic root 是 closed shape：

```text
version = "1"
include
excludeDirs
generatedFiles
codeAreas
checks.files.codeLines
checks.functions.cyclomaticComplexity
checks.functions.codeLines
checks.functions.parameterCount
checks.duplication.defaultMinimumTokens
checks.duplication.minimumTokensByCodeArea
checks.duplication.fragments
acceptedWarnings
report
artifactDir
cacheDir
```

Exact current-to-target mapping 由上文
[Common-Denominator Analysis](#common-denominator-analysis) 的 field audit 单点拥有。
Thresholds 继续使用 `absoluteFloor` / `changedDelta`；allowances 保留 `codeLineFloor`、
`maxDecisionTokens` 与 `maxCyclomaticComplexityExclusive`。`minimumTokensByCodeArea` 只允许
引用已声明 code areas，缺少 entry 时使用 `defaultMinimumTokens`。Current semantic numeric
fields 保持 finite-number acceptance，不在本 change 增加未确认的 positive/integer limits。

`version` 是 exact document contract discriminator，不再是调用者自选 cache-bust string。Machine `metadata.configVersion` 继续是 required string 并记录 current semantic contract version；不新增 fingerprint machine field。

**Alternatives considered:**

- 把全部 current fields 原样搬进 `quality`，只改 section 名：拒绝，因为 concurrency、format 和 process config 并非 quality intent。
- 引入 enable/disable capability flags 或 language profile：拒绝，现有 profile/eligibility 已拥有选择，当前没有第二个产品义务支持新 surface。

### Decision 4: Give accepted-warning config its own semantic identity

**Status:** 已确认；采用下述 `checkId` values、legacy mapping，并从 public config 删除
`sourceTool` matcher。

Public `acceptedWarnings[]` 的 required identity 改为 `checkId`：

```text
file-code-lines
function-cyclomatic-complexity
function-code-lines
function-parameter-count
duplicate-code
```

Config owner 维护 `checkId -> current internal rule identity` 的 exhaustive mapping。保留 `reason` 和现有 optional semantic filters；移除 `sourceTool`，把 public `ruleId` 改为 `checkId`。Warning generation、machine mapper 和 Output 仍使用现有 `ruleId` / `sourceTool`，因此本 change 不造成 machine v1 schema version change。

**Alternatives considered:**

- 继续允许 arbitrary `ruleId`：拒绝，因为 current rule IDs 嵌入 scanner names，public config 仍需知道 backend。
- 同时接受 `ruleId` 和 `checkId`：拒绝，因为 dual identity 会长期保留迁移分支和冲突 precedence。
- 在本 change 同时重命名 machine warning identity：拒绝，Output consumer、schemas 和 examples 风险独立且范围过大。

### Decision 5: Centralize operational resolution without promising plugins

Scanner Dependency owner 从 built-in defaults 和 host platform 构造 internal snapshot，并保留当前明确支持的 operational inputs 作为部署/测试 escape hatch：

- `VIBE_CHECK_LIZARD_CMD`
- `VIBE_CHECK_SCC_CMD`
- `VIBE_CHECK_SCC_ARGS`
- `VIBE_CHECK_JSCPD_CMD`
- `VIBE_CHECK_JSCPD_ARGS`

Environment 只在 invocation boundary 读取一次。`*_CMD` 延续 current semantics：non-empty string
替换 built-in executable，unset/empty 表示没有 override；executable 是否存在属于 eligible
dependency 的 availability，不在 boundary validation 时探测。`VIBE_CHECK_SCC_ARGS` 与
`VIBE_CHECK_JSCPD_ARGS` 的 non-empty value 必须解析为 JSON string array，unset/empty 产生空
additional-args list。全部 supplied non-empty inputs 在 profile/eligibility 分流前完成 shape
validation；即使对应 capability 后续为 `skipped` / `no-input`，malformed args 仍以 typed
operational error、stderr 和 exit `2` 在 banner/cache/artifact 前失败。Diagnostic 不得打印完整
environment value。Platform executable defaults、fixed backend args 与 jscpd bounded concurrency
由 dependency owner 维护；duplicate per-path format detection 留在 adapter 内。

`VIBE_CHECK_LIZARD_CMD` 只替换 executable；Lizard args 固定为 `-m lizard`。本 change 不新增
`VIBE_CHECK_LIZARD_ARGS`，因此 legacy `tools.lizard.args` 的自定义值没有兼容 landing，迁移
diagnostic 必须明确说明该能力被移除，而不是声称所有旧 args 都可转移。

Formal-entry tests 用 declared operational overrides 指向 controlled scanner；lower-level tests 可以注入 typed dependency snapshot。两种方式都不增加 production project-config seam。

该 boundary 是具体 resolver + typed values，不建立 provider registry、用户选择 API 或“任意 scanner 可替换”承诺。未来 backend replacement 应在这里吸收 command/protocol 变化；只有出现真实多实现选择义务时再评估 provider abstraction。

### Decision 6: Snapshot once, then project per consumer

Invocation 顺序固定为：

1. Config boundary 读取并验证 selected semantic document，产生 detached `SemanticProjectConfigV1`。
2. 应用显式 `--top-n` / `--artifact-dir`，产生 readonly `ResolvedQualityConfig`。
3. Scanner Dependency boundary 读取 platform/operational inputs 一次，产生 readonly snapshot；不做 availability check。
4. Orchestration 把同一 resolved config 交给 current、baseline 与 Git-failure fallback。
5. 每个 revision 先独立计算 eligibility；只有 eligible capability 才使用 snapshot 中的对应 dependency 做 availability/invocation。
6. Warning/scope/report consumers 只接收 semantic slices；adapter 只接收 exact inputs、所需 semantic scan settings 和一个 dependency slice。

Cache identity 不再把 caller-controlled `version` 当唯一 invalidation。各 cache owner 建立 consumer-specific deterministic projection：measurement-relevant semantic settings + normalized exact-input fingerprint + relevant backend version/args identity。Report text、accepted-warning text 等不影响 normalized measurement 的 fields 不应进入 scanner cache；不存在 Product Config-owned 全量 fingerprint，全量 public config hash 也不能替代 capability-specific identity review。

### Decision 7: Use a fail-fast hard cut for legacy project configs

**Status:** 已确认；采用 hard cut，不提供限时 compatibility reader。

不保留 legacy runtime reader。识别到 top-level `lizard`、`scc`、`jscpd` 或 `tools` 时，Config boundary 返回专门 migration diagnostic 并退出 `3`，且不解析/执行 legacy command。迁移 owner docs 提供：

- exact old-to-new semantic field table（Common-Denominator Analysis）；
- `acceptedWarnings.ruleId` 到 `checkId` table；
- `sourceTool` 删除说明；
- supported command/args 到现有 `VIBE_CHECK_*` operational inputs 的逐项落点；明确
  `tools.lizard.args` 没有 target override，固定 protocol 为 `-m lizard`；
- `jscpd.formatByCodeArea` 的 filter 行为被移除，target 对 exact inputs 省略 format override；
  `jscpd.maxParallelTasks` 改由 internal bounded-concurrency default 拥有；
- `version` 改为 `"1"`；
- 一个 canonical semantic v1 example；旧 shape 只通过逐字段 migration table 说明，不复制为
  第二个完整 accepted-looking example。

选择 hard cut 是因为 external discovery/init 尚未交付；先建立新 schema 可避免首次生成已知短命的 tool-shaped config。已有显式 config 调用者需要一次人工迁移，但不会遇到 command/args 被静默忽略或两个 parser precedence 不一致。

Rollback 以 binary + config pair 为单位：回退到 change 前 binary 时必须同时恢复旧 tool-shaped config；新 binary 不会读旧 config，旧 binary 也不承诺读 semantic v1。Repository dogfood 和 fixtures 在同一 implementation change 迁移，避免 main branch 出现半状态。

### Decision 8: Make external configuration workflow a strict dependent consumer

本 change 不创建 `.vibe-check/` artifacts。完成并验证 semantic schema 后，`add-external-project-config-workflow` 必须：

1. 复用 semantic schema/type，不定义字段。
2. 将 user-facing discovered/init path 固定为 `.vibe-check/config.json`；comments/trailing commas 是 content contract，`.jsonc` 不是 public extension。
3. 只组合 optional `$schema` metadata 并生成 editor schema 消费视图。
4. `SelectedConfig` provenance 只含 explicit/discovered source、normalized path 和 semantic version；不输出 applied tool/dependency overrides。
5. `init` comments 只解释 semantic sections，不提 backend/tool identity。

后续修改必须继续保持该单向消费关系；一旦 external artifacts 重新定义 semantic field tree
或 dependency provenance，就必须先修复 drift，不能进入产品实现。

### Decision 9: Rebase the deferred Lizard port onto the internal boundary

活动决策继续把 Lizard TypeScript port 留作最终提升项；本 change 不改变进入条件。Port 未来恢复时：

- 删除/替换 internal Lizard dependency slice、availability、process/CSV 与 cache backend identity；
- 保持 `checks.functions`、semantic `checkId`、scope、current/baseline 和 warning behavior；
- 不再修改 project config schema、generated config 或 external workflow；
- 如果要改 machine `sourceTool` / rule identity，另开 Output contract change。

因此本 change 先兑现用户可见的长期 config stability，而不是把 port 当作其技术前置。

## Error Model

| Failure | Owner and observable result |
| --- | --- |
| Semantic document read/schema/post-validation | Config error，包含 selected path 与 field location；scanner/banner/artifacts 前 exit `3` |
| Legacy tool-shaped document | Config migration error；不读取/执行 legacy executable；exit `3` |
| Invalid operational override shape | Ordinary operational runtime error；指出 override name/expected shape，隐藏完整 value；即使 capability 将 skip/no-input，也在 banner/cache/artifacts 前 exit `2` |
| Eligible dependency unavailable | Adapter normalized `failed/unavailable`；进入 existing completeness/process outcome |
| Backend process failure | Adapter normalized `failed/execution` |
| Backend output invalid | Adapter normalized `failed/invalid-result` |

不要用 built-in config、另一个 file、空 metrics 或 alternate backend 静默兜底。Config/dependency boundary 使用 typed error family 或 discriminated result；CLI 只在边界映射 stderr/exit，Core reducer 不按异常文本猜测类别。

## Migration Plan

1. 建立 runtime semantic schema、derived type、post-validation、detached mapping 与 focused schema generation/validation proof；保留当前 explicit path 但切换为 semantic v1。
2. 建立 Scanner Dependency snapshot 与 typed per-capability slices；把 environment/platform/default resolution 从 default project config 移入该 owner。
3. 将 Core context、current、baseline、fallback、warnings、cache 和 adapters 逐层迁移到 semantic slices + dependency slices；删除 tool-shaped public type/parser paths 和剩余 project-to-command flow。
4. 同一 change 迁移 built-in semantic defaults、explicit external fixture、formal-entry controls、dogfood acceptance、owner docs、canonical config-related examples 和 semantic Cases。
5. 运行 full validation 并审计 public config/schema/example/help 不存在 scanner product/executable fields；保留 machine/output tool identities 作为明确 scope boundary。
6. 只有本 change 实现验收完成后，进入 external workflow 的 config file/discovery/init 实现。

## Risks / Trade-offs

- **[Breaking explicit configs]** 现有完整 JSON 立即失效 → 提供 shape-aware exit `3` migration、逐字段表与 atomic binary/config 升级说明；不以 dual reader 延长风险。
- **[Internal split touches many consumers]** 当前 `QualityConfig` 跨 scope、warnings、cache、adapters 广泛使用 → 按 consumer slice 增量迁移，并用 static search 证明 command/args 只到达 dependency owner/adapters。
- **[Removing format filter broadens mixed areas]** Current `formatByCodeArea` 会过滤 area 内其它 extensions；target 省略 override 后 pinned jscpd 会分别扫描其支持的 `.ts` / `.rs` 等 formats → 在 duplicate-scanning contract 与 migration table 明示该 breaking behavior，并用 pure/mixed-extension characterization 固定 exact-input handoff；不得恢复 public backend filter。
- **[Operational overrides remain tool-named]** Environment escape hatch 仍随 backend 变化 → 明确其为 internal operational compatibility，不进入 schema/starter/provenance；backend replacement 在 dependency owner 集中迁移。
- **[Two identity systems]** Config `checkId` 与 current machine `ruleId` 并存 → exhaustive single mapper + focused tests；machine redesign 保持独立，避免本 change 扩张。
- **[Config version loses caller label]** `version = "1"` 不能手工 bust cache → capability-specific deterministic cache identity 取代该误用；metadata 只报告 contract version。
- **[Dependent active changes drift]** 后续修改可能让 External/Lizard artifacts 重新描述旧 fields → task 5.5 与 final audit 必须定向搜索并先修复 drift。
