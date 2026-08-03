本 design 说明如何建立 semantic config 与 internal scanner dependency 的单向边界。目标
public contract 已确认，但阻塞级 readiness audit 尚未闭合，产品实现尚未开始。

## Context

动机见 [proposal.md](proposal.md#why)。以下是设计所依赖的当前事实，不是目标状态声明：

| Surface | Current fact | Design consequence |
| --- | --- | --- |
| Config document | `docs/configuration.md` 和 `src/product/config-parser.ts` 要求完整 tool-shaped JSON；`QualityConfig` 同时含 public policy 与 `tools` | 必须拆开 public document type、normalized product semantics 和 dependency execution type |
| Scanner execution | `src/product/config.ts` 选择 platform command，并读取 `VIBE_CHECK_*`；current/baseline adapters 从 `QualityConfig.tools` 取 command/args | Operational resolution 必须集中且 invocation-scoped，不能只删除 schema fields |
| Quality consumers | Scope、warnings、report、cache、current 与 baseline 都直接消费一个宽 `QualityConfig` | 分层后必须显式限制每个 consumer 能看见的 config slice，避免 command/args 再次扩散 |
| External workflow | `add-external-project-config-workflow` 规划 `.vibe-check/config.json`、comment-capable JSON、init/discovery 与 sibling schema | 本 change 只交付 semantic runtime schema/mapping；external workflow 组合 `$schema` metadata 和 file lifecycle |
| Lizard port | `port-lizard-function-metrics-to-typescript` 已按活动决策延期 | 本 change 不实现 port；目标边界使未来 port 只改变 internal backend |
| Machine output | Current warnings/metrics 仍包含 tool-derived source/rule metadata | Project config decoupling 不等于 output identity redesign；后者保持不变 |

### Artifact authority and reading path

后续 implementer 按以下顺序恢复本 change；同一判断只在一个 owner 完整表达：

1. [proposal.md](proposal.md) 拥有问题、范围、capability 和 change ordering。
2. `specs/**` 拥有可观察输入、失败、兼容与 handoff contract。
3. 本 design 拥有 type/data-flow、owner、mapping、migration 与 implementation choices。
4. [tasks.md](tasks.md) 在生成后只拥有执行顺序、readiness gate 和验证证据，不重新定义 field semantics。
5. 实现完成后，`docs/configuration.md`、`docs/scanner-dependencies.md`、runtime schema source 与对应 owner docs 接替 current behavior；active change artifacts 不成为长期事实源。

### Stable terms

| Term | Meaning and owner |
| --- | --- |
| Semantic config | Project-controlled Vibe Check scope、quality checks、acceptance/report 与 artifact/cache policy；不含 dependency execution settings |
| `SemanticProjectConfigV1` | 从唯一 runtime schema source 派生的 complete public semantic value；`version` 固定为 `"1"` |
| Resolved quality config | Semantic document 通过 schema、post-validation 和 explicit CLI overrides 后形成的 readonly domain value；Core consumers 只接收所需 slices |
| Scanner dependency snapshot | Product 在 invocation 内一次解析的 backend executable/args、platform defaults、operational overrides、execution hints 和 concurrency；不是 project config |
| Semantic check ID | Config-only stable identity，用于 accepted-warning selection；target v1 包含五个 backend-neutral values |
| Backend identity | Adapter/cache/diagnostic 所需的 internal implementation identity；不写回 project config |
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
| Product Config (`src/product/**`) | Semantic runtime schema、derived type、unknown-input validation、semantic post-validation、legacy diagnostic、domain mapping、config fingerprint | Dependency command/args、availability、file discovery/init |
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

Public field grouping 按真实 consumer obligation，而不是当前 executable 名称：

| Scenario | Shared public obligations | Stable local difference | Internal-only inputs |
| --- | --- | --- | --- |
| File quality | Absolute/changed code-line threshold；low-decision-token allowance | File-level metric names and allowance | CSV protocol、executable/args、availability |
| Function quality | Absolute/changed thresholds；current/baseline comparison | Complexity、code lines、parameter count；low-complexity allowance | Python/process/CSV or future native backend |
| Duplication quality | Minimum clone size by code area；fragment changed delta | Token-based sensitivity and per-area value | Parallelism、backend format hint、temporary report config |

一个全局扁平 threshold map 会丢失合法 nested allowance；继续按三种 tool names 分组则把 backend replacement 暴露给用户。选择一个 `checks` shared root 加 `files` / `functions` / `duplication` 三个显式变体，既保留不同义务，又让全部 consumers 只依赖 product semantics。

Operational settings 不满足同一生命周期：它们随 host、installation 与 backend revision 变化，而 project quality policy 应随 repository 协作。因此不把它们做成 `checks` optional fields，也不建立 public backend variant。

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

现有 semantic subfields 尽量保留：thresholds 继续使用 `absoluteFloor` / `changedDelta`，allowances 保留 `codeLineFloor`、`maxDecisionTokens` 与 `maxCyclomaticComplexityExclusive`。以下 current fields 改为 internal：

| Current field | Target owner / mapping |
| --- | --- |
| `lizard.cyclomaticComplexity` | `checks.functions.cyclomaticComplexity` |
| `lizard.functionCodeDensity` | `checks.functions.codeLines`；修正“density”并非 ratio 的误导命名 |
| `lizard.parameterCount` | `checks.functions.parameterCount` |
| `scc.fileCodeLines` | `checks.files.codeLines` |
| `jscpd.defaultMinimumTokens` | `checks.duplication.defaultMinimumTokens` |
| `jscpd.minimumTokens` | `checks.duplication.minimumTokensByCodeArea` |
| `jscpd.duplicateFragments` | `checks.duplication.fragments` |
| `jscpd.maxParallelTasks` | Scanner Dependency bounded concurrency |
| `jscpd.formatByCodeArea` | Adapter-owned backend hint，按 normalized eligible file language/extension resolution |
| `tools.*` | Scanner Dependency executable/args and operational override |

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

Environment 只在 invocation boundary 读取一次；array values 继续按 JSON string array 严格校验。Invalid operational input 映射为 typed dependency-configuration error 并在 scanner invocation 前给出 value-shape diagnostic；diagnostic 不得打印完整敏感 environment value。Platform executable defaults、fixed backend args、jscpd bounded concurrency 和 format inference 由该 owner 维护。

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

Cache identity 不再把 caller-controlled `version` 当唯一 invalidation。各 cache owner 建立 consumer-specific deterministic projection：measurement-relevant semantic settings + normalized exact-input fingerprint + relevant backend version/args identity。Report text、accepted-warning text 等不影响 normalized measurement 的 fields 不应进入 scanner cache；全量 public config hash 也不能替代 capability-specific identity review。

### Decision 7: Use a fail-fast hard cut for legacy project configs

**Status:** 已确认；采用 hard cut，不提供限时 compatibility reader。

不保留 legacy runtime reader。识别到 top-level `lizard`、`scc`、`jscpd` 或 `tools` 时，Config boundary 返回专门 migration diagnostic 并退出 `3`，且不解析/执行 legacy command。迁移 owner docs 提供：

- exact old-to-new semantic field table（Decision 3）；
- `acceptedWarnings.ruleId` 到 `checkId` table；
- `sourceTool` 删除说明；
- command/args 迁移到 operational inputs 的说明；
- `version` 改为 `"1"`；
- canonical before/after example，但旧 example 不得作为 accepted schema fixture 保留。

选择 hard cut 是因为 external discovery/init 尚未交付；先建立新 schema 可避免首次生成已知短命的 tool-shaped config。已有显式 config 调用者需要一次人工迁移，但不会遇到 command/args 被静默忽略或两个 parser precedence 不一致。

Rollback 以 binary + config pair 为单位：回退到 change 前 binary 时必须同时恢复旧 tool-shaped config；新 binary 不会读旧 config，旧 binary 也不承诺读 semantic v1。Repository dogfood 和 fixtures 在同一 implementation change 迁移，避免 main branch 出现半状态。

### Decision 8: Make external configuration workflow a strict dependent consumer

本 change 不创建 `.vibe-check/` artifacts。完成并验证 semantic schema 后，`add-external-project-config-workflow` 必须：

1. 复用 semantic schema/type，不定义字段。
2. 将 user-facing discovered/init path 固定为 `.vibe-check/config.json`；comments/trailing commas 是 content contract，`.jsonc` 不是 public extension。
3. 只组合 optional `$schema` metadata 并生成 editor schema 消费视图。
4. `SelectedConfig` provenance 只含 explicit/discovered source、normalized path 和 semantic version；不输出 applied tool/dependency overrides。
5. `init` comments 只解释 semantic sections，不提 backend/tool identity。

Task 0.4 已完成 external change 的 planning rebase。后续修改必须继续保持该单向消费关系；
一旦 external artifacts 重新定义 semantic field tree 或 dependency provenance，就必须先修复
drift，不能进入产品实现。

### Decision 9: Rebase the deferred Lizard port onto the internal boundary

活动决策继续把 Lizard TypeScript port 留作最终提升项；本 change 不改变进入条件。Port 未来恢复时：

- 删除/替换 internal Lizard dependency slice、availability、process/CSV 与 cache backend identity；
- 保持 `checks.functions`、semantic `checkId`、scope、current/baseline 和 warning behavior；
- 不再修改 project config schema、generated config 或 external workflow；
- 如果要改 machine `sourceTool` / rule identity，另开 Output contract change。

因此本 change 先兑现用户可见的长期 config stability，而不是把 port 当作其技术前置。
Task 0.5 已完成 Lizard change 的 planning rebase；这不改变其延期状态，也不构成 implementation
evidence。

## Error Model

| Failure | Owner and observable result |
| --- | --- |
| Semantic document read/schema/post-validation | Config error，包含 selected path 与 field location；scanner/banner/artifacts 前 exit `3` |
| Legacy tool-shaped document | Config migration error；不读取/执行 legacy executable；exit `3` |
| Invalid operational override shape | Scanner Dependency configuration error；指出 override name/expected shape，隐藏完整 value；对应 scanner invocation 前受控失败 |
| Eligible dependency unavailable | Adapter normalized `failed/unavailable`；进入 existing completeness/process outcome |
| Backend process failure | Adapter normalized `failed/execution` |
| Backend output invalid | Adapter normalized `failed/invalid-result` |

不要用 built-in config、另一个 file、空 metrics 或 alternate backend 静默兜底。Config/dependency boundary 使用 typed error family 或 discriminated result；CLI 只在边界映射 stderr/exit，Core reducer 不按异常文本猜测类别。

## Migration Plan

1. 完成剩余 tasks 0.x readiness audit。Tasks 0.4/0.5 已完成 dependent changes 的 planning
   rebase；若 current facts 或 artifacts 变化，先恢复这两条单向关系。Readiness 未闭合前不改
   产品代码。
2. 建立 runtime semantic schema、derived type、post-validation、detached mapping 与 focused schema generation/validation proof；保留当前 explicit path 但切换为 semantic v1。
3. 建立 Scanner Dependency snapshot 与 typed per-capability slices；把 environment/platform/default resolution 从 default project config 移入该 owner。
4. 将 Core context、current、baseline、fallback、warnings、cache 和 adapters 逐层迁移到 semantic slices + dependency slices；删除 tool-shaped public type/parser paths 和剩余 project-to-command flow。
5. 同一 change 迁移 built-in semantic defaults、explicit external fixture、formal-entry controls、dogfood acceptance、owner docs、canonical config-related examples 和 semantic Cases。
6. 运行 full validation 并审计 public config/schema/example/help 不存在 scanner product/executable fields；保留 machine/output tool identities 作为明确 scope boundary。
7. 只有本 change 实现验收完成后，进入 external workflow 的 config file/discovery/init 实现。

## Risks / Trade-offs

- **[Breaking explicit configs]** 现有完整 JSON 立即失效 → 提供 shape-aware exit `3` migration、逐字段表与 atomic binary/config 升级说明；不以 dual reader 延长风险。
- **[Internal split touches many consumers]** 当前 `QualityConfig` 跨 scope、warnings、cache、adapters 广泛使用 → 按 consumer slice 增量迁移，并用 static search 证明 command/args 只到达 dependency owner/adapters。
- **[Format inference changes duplicate behavior]** 移除 `formatByCodeArea` 后 mixed-language area 可能与当前结果不同 → readiness audit inventory current extension/language cases；实现 product-owned deterministic inference 并加入 parity/failure tests，无法保持语义时先收窄 supported combination 而不是恢复 backend field。
- **[Operational overrides remain tool-named]** Environment escape hatch 仍随 backend 变化 → 明确其为 internal operational compatibility，不进入 schema/starter/provenance；backend replacement 在 dependency owner 集中迁移。
- **[Two identity systems]** Config `checkId` 与 current machine `ruleId` 并存 → exhaustive single mapper + focused tests；machine redesign 保持独立，避免本 change 扩张。
- **[Config version loses caller label]** `version = "1"` 不能手工 bust cache → capability-specific deterministic cache identity 取代该误用；metadata 只报告 contract version。
- **[Dependent active changes drift]** 后续修改可能让 External/Lizard artifacts 重新描述旧 fields → task 5.5 与 final audit 必须定向搜索并先修复 drift。

## Remaining readiness evidence

Public-contract 层没有未决问题。Exact `version = "1"`、semantic `checkId` 与 legacy hard cut
均已确认。

`jscpd` format inference 的 exact extension matrix 仍是 readiness inventory 和 implementation
characterization，不是新的产品选择；它不能自行改变已确认的 public field tree、owner 或
migration 策略。
