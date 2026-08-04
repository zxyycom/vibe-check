# 输出边界

本文是 Vibe Check 输出边界的行为规范，拥有 current machine output 的 identity、
field/path/unit/optional/order 语义、byte grammar、validator、publication evidence 与
published-material 边界。`src/product/quality-core/src/output/machine/schema.ts` 是 exact public
field constraints 与 field descriptions 的唯一 machine-readable owner；published schemas、
examples 和本规范都是可追溯的消费视图，不建立第二份字段清单。本文同时维护 console、
Markdown report、raw artifacts 和已退役 Rust 输出的边界，但不重新计算 scan scope、
measurement、warning、baseline、GateResult 或 quality status。

## 当前产品输出

Output owner 位于 `src/product/**`。正式入口和 dogfood wrapper 都由同一产品 core 输出
进度、summary 与 completion console text，并写入以下 artifacts：

| Artifact | Responsibility | Contract status |
| --- | --- | --- |
| `metrics.json` | 一个 `MachineMetricsV1`，包含 current metrics、completeness、aggregates、baseline/comparison、warnings、GateResult 和 invocation metadata | Current machine v1 |
| `warnings.ndjson` | 与 `metrics.warnings.changed` deep-equal 的 ordered warning stream | Current machine v1 |
| `warnings-all.ndjson` | 与 `metrics.warnings.all` deep-equal 的 ordered warning stream | Current machine v1 |
| `report.md` | 从同一 core data 产生的人读报告 | Human output，不属于 machine v1 set |
| `raw/**` | scanner、fingerprint、aggregate 与 baseline reproduction material | Scanner-private / diagnostic，不是 stable machine field |

三个 machine filenames 是 artifact directory 下的 canonical names。Console、`report.md`、
`raw/**` 和 annotation commands 不是 `MachineMetricsV1` / `MachineWarningV1` transport。

Rust CLI、renderer 和根 Cargo 产品入口已移除。仓库仍保留的
`vibe-check.report.v1` schema 与 examples 只记录已退役 Rust 输出，见
[历史材料](#已退役-rust-cli-输出的历史材料)；它们不进入 current schema registry 或
current artifact examples。

## TypeScript product output boundary

`metrics.json`、`report.md` 与 console 投影同一 core-owned evidence；Output 不在不同 surface
重算 capability status、overall completeness、warning、baseline 或 GateResult。Human report
保持以下当前行为：

- Detailed rankings 可以按展示 metric 排序，但不修改 scanner/Core source-array order。
- Changed Files Watchlist 的 visibility 与 limit 由 report config 独立控制；baseline
  unavailable 时仍展示可定位的 changed-file risk context。
- scc file `Complexity` 在 human report 中明确标为 decision-token count，并在 file/code-area
  hotspots 中展示 total-token share，不把它误称为 cyclomatic complexity。
- `acceptedReason` 紧邻对应 warning 展示；requested gate section 的 state-specific placement
  和 blocking order 由 [Gate projection](#gate-projection) 维护。
- Report 顶部 non-blocking notice 紧随 title，footer notice 保持末行；两者都把当前
  TypeScript/Bun product CLI、report contract 与 product tests 标识为 release owners，不把
  已退役 Rust CLI/schema/tests 标为 current。

Report config、ranking、accepted-reason display 与 notices 属于 human output，不改变 machine
v1 instances。Raw artifacts 只用于 reproduction，也不成为 stable machine fields。

## Core-to-machine projection

Product Core 拥有 final `QualityMetrics` / `WarningRecord` business data、capability results、
overall completeness、warning channels、baseline/comparison metadata、`GateResult` 和
normalized fatal issues。Output 从 final core data 显式投影一个 `MachineMetricsV1`；所有
embedded warnings 与 streamed warnings 都经过同一个 `MachineWarningV1` mapper。

边界固定如下：

- Core models 不获得 `vibe-check.metrics.v1` / `vibe-check.warning.v1` transport identity。
- Human console 与 `report.md` 继续消费 core data，不反向消费 machine DTO。
- `metrics.warnings.all`、`changed`、`regressions` 与 evaluated gate 的
  `blockingWarnings` 复用同一个 warning mapper。
- `warnings.ndjson` 与 `warnings-all.ndjson` 只从同一 DTO 的 `warnings.changed` / `all`
  序列化，不从 core warnings 建立第二条 projection path。
- Explicit mapper 只投影 runtime schema 声明的 v1 fields；未声明的 core-only、human-only 或
  scanner-private 字段不会因相邻实现变化自动进入 machine contract。
- Core private field、scanner backend 或 human-only output 改变而 DTO projection 不变时，
  machine instances、schemas、examples 与 consumer behavior 也保持不变。

Output 不重新收集文件、运行 scanner、计算 aggregates/completeness/warnings/baseline/gate，
也不重新排序或过滤 warning records。scc CSV、Lizard CSV、jscpd reporter object、process
result 和临时配置不得直接提升为 machine fields。

## Machine v1 contract and ownership

### Single-active hard cut

Current repository 只接受一套 machine structure。V1 在同一 repository revision 中 hard-cut
替换 pre-v1 bytes 与 permissive warning reader；仓库不保留 legacy reader、dual writer、
deprecation/migration window 或第二个 accepted structure。

未来若改变 public field set、requiredness、type、nullability、enum、unit、semantic order 或
meaning，必须进行显式 output-contract version cut，并同步 instance identities、runtime
schemas、published schemas/examples、producer、validators、consumers、owner docs 和 tests。

### Runtime schema 是唯一 field owner

`src/product/quality-core/src/output/machine/schema.ts` 内的 JSON-serializable runtime schema
source 是 public field names、requiredness、types、closed enums、nullability、numeric/string
constraints、typed dynamic-map values 和 field descriptions 的唯一 owner。Fixed objects 都是
closed；dynamic maps 只允许 schema 声明的 value shape。

`MachineMetricsV1` 与 `MachineWarningV1` TypeScript types 通过 `Type.Static` 从同一
schema-authoring source 派生，不维护第二份手写 field inventory。Published JSON Schemas 是
该 runtime source 的 deterministic projection；product runtime 不读取 `docs/**` 或
`scripts/**`。

Product 通过 shallow boundary `src/product/machine-output.ts` 暴露 DTO types、schema
constants、mappers、serializers、artifact-set validator 与 warning-stream validator。
Product internals 和 repository consumers 使用该 boundary；`scripts/**` 不 deep-import
`quality-core` machine internals，也不建立 render-only parser。

### Identities and canonical paths

| Surface | Identity / dialect | Immutable schema `$id` | Canonical location |
| --- | --- | --- | --- |
| Metrics instance | `metadata.schemaVersion = "vibe-check.metrics.v1"` | `urn:vibe-check:schema:metrics:v1` | artifact `metrics.json`; [published schema](schemas/vibe-check-metrics.schema.json) |
| Warning instance | `schemaVersion = "vibe-check.warning.v1"` | `urn:vibe-check:schema:warning:v1` | artifacts `warnings.ndjson` / `warnings-all.ndjson`; [published schema](schemas/vibe-check-warning.schema.json) |

两个 schemas 显式声明 JSON Schema 2020-12 dialect
`https://json-schema.org/draft/2020-12/schema`。Metrics schema 通过 warning immutable URN 引用
同一个 warning definition；runtime 与 docs registries 都显式注册两者。

## Public field semantics

Runtime schemas 是 exact field inventory 和 constraints 的 owner；本节是该 inventory 的完整
consumer-semantic index。路径中的 `?` 表示 field 可以 absent；没有 `?` 的 `null` 表示 field
必须存在但值可以为 `null`。JSON object member order 与 insignificant whitespace 没有
instance meaning。

### Metadata, scope, tools and fingerprints

| Public path | Presence / value | Meaning |
| --- | --- | --- |
| `metadata.schemaVersion` | Required literal | Current metrics instance identity `vibe-check.metrics.v1`。 |
| `metadata.repository` | Required non-empty string | Invocation 使用的 normalized absolute project root；是 host context，不是 portable repository identity。 |
| `metadata.timestamp` | Required string | UTC invocation instant，ISO-8601 millisecond form。 |
| `metadata.commitSha` | Required string | Invocation 使用的 current repository commit identifier。 |
| `metadata.commitDate?` | Optional string | Repository metadata 能提供时的 current commit UTC timestamp。 |
| `metadata.commitTitle` | Required string or `null` | Current commit title；不可用时为 `null`。 |
| `metadata.configVersion` | Required string | Invocation 使用的 quality config version。 |
| `metadata.scope.include` | Required string array | Resolved include globs。 |
| `metadata.scope.excludeDirs` | Required string array | Resolved excluded directory names or paths。 |
| `metadata.scope.generatedFiles` | Required string array | Resolved generated-file globs。 |
| `metadata.tools[]` | Required array of `{name, source, version}` | Normalized current measurement-tool identity、resolution source 与 reported version。 |
| `currentFingerprints.<codeArea>` | Required typed dynamic map | 每个 code-area ID 对应 `{fileCount, fileList, fingerprint}`；fingerprint 是 Core-owned opaque deterministic value。 |
| `baselineFingerprints?.<codeArea>` | Optional typed dynamic map | Baseline fingerprints 未产生时整个 field absent；value shape 与 current fingerprints 相同。 |

`metadata.scope.*` values 保留 resolved config 语义，不是 artifact discovery paths。
Fingerprint `fileList` entries 是 product-normalized project-relative paths，使用 `/`。

### Current measurements and aggregates

| Public path | Presence / unit | Meaning |
| --- | --- | --- |
| `fileMetrics[].path` / `codeArea` / `language` | Required strings | Project-relative normalized file path、Vibe Check code-area ID 与 normalized scanner language。 |
| `fileMetrics[].isChanged` | Required boolean | File path 是否属于 invocation changed-file scope。 |
| `fileMetrics[].lines` | Required non-negative integer, physical lines | File total physical-line count。 |
| `fileMetrics[].codeLines?` / `commentLines?` / `blankLines?` | Optional non-negative integers, physical lines | File scanner 提供时的 code/comment/blank physical-line counts；缺失时 absent，不补猜测值。 |
| `fileMetrics[].decisionTokens` | Required `{source, value}` | Normalized source 加 scc decision-token count；source 无法提供数值时 `value` 为 `null`。 |
| `functionMetrics[].file` / `codeArea` / `name` | Required strings | Project-relative normalized file path、code-area ID 与 normalized function name。 |
| `functionMetrics[].startLine` / `endLine` | Required positive integers, source lines | One-based inclusive source-line bounds。 |
| `functionMetrics[].lines` | Required non-negative integer, function code lines | Normalized function code-line count。 |
| `functionMetrics[].parameterCount` | Required non-negative integer, count | Function parameter count。 |
| `functionMetrics[].cyclomaticComplexity` | Required `{source, value}` | Normalized source 加 cyclomatic-complexity count；不可用时 `value` 为 `null`。 |
| `functionMetrics[].isChanged` | Required boolean | Function file 是否属于 changed-file scope。 |
| `duplicateCode[].id` | Required non-negative integer | Producer-assigned duplicate-fragment identifier。 |
| `duplicateCode[].tokenCount` / `lineCount` | Required non-negative integers | 每个 fragment occurrence 的 normalized duplicate token / line count。 |
| `duplicateCode[].hitsChangedScope` | Required boolean | 任一 location 是否与 changed-file scope 相交。 |
| `duplicateCode[].codeAreas` | Required string array | Fragment 涉及的 code-area IDs。 |
| `duplicateCode[].locations[]` | Required array | `{path, codeArea, startLine, endLine}`；path project-relative，line bounds one-based inclusive。 |
| `aggregates.overall.totalFiles` / `totalFunctions` / `totalLines` / `totalCodeLines` | Required non-negative integers | 全部 eligible current inputs 的 file/function/physical-line/code-line totals。 |
| `aggregates.overall.totalDuplicateFragments?` | Optional non-negative integer | Normalized duplicate-fragment total。 |
| `aggregates.overall.totalFileDecisionTokens?` | Optional non-negative number | scc decision-token total。 |
| `aggregates.overall.totalFunctionLines?` / `totalFunctionCyclomaticComplexity?` / `totalFunctionParameters?` | Optional non-negative numbers | Function line、complexity 与 parameter totals；对应 scanner value 缺失时 absent。 |
| `aggregates.byLanguage[]` | Required array | 每项包含 required `language`, `files`, `lines`, `codeLines`, `commentLines`, `blankLines`；optional `comments?` 是与 comment lines 不同的 scanner-provided count。 |
| `aggregates.byCodeArea[]` | Required array | 每项包含 required `codeArea`, `warningPolicy`, `files`, `functions`, `lines`；`codeLines?`, `cyclomaticComplexity?`, `duplicateFragments?`, `fileDecisionTokens?`, `functionLines?`, `parameterCount?` 在 source value 可用时出现。 |

除 line-position fields 外，line/token/file/function/parameter/fragment/complexity values 都是
对应名称所指的 counts。Optional aggregate fields absent 与 measured zero 不等价。

### Baseline, comparison and trends

| Public path | Presence / value | Meaning |
| --- | --- | --- |
| `baseline.status` | Required closed enum | `generated`、`baseline-skipped`、`history-unavailable`、`no-baseline-commit`、`baseline-materialization-failed` 或 `baseline-scan-failed`。 |
| `baseline.commitSha` | Required string or `null` | Explicit revision 一次解析得到的 canonical full commit object ID；没有 selected commit 时为 `null`。 |
| `baseline.commitDate` | Required string or `null` | 从 selected canonical commit 读取的 commit time；没有 selected commit 或读取失败时为 `null`。 |
| `baseline.metadata` | Required object or `null` | Materialized baseline metadata；未产生时为 `null`。Object 包含 required canonical `commitSha`, nullable `commitDate` / `commitTitle`, `configVersion`, `selectionReason`, `toolMetadata`。 |
| `baseline.metadata.toolMetadata[]` | Required inside non-null metadata | `{name, source, version}` normalized baseline tool metadata。 |
| `comparisonStatus` | Required closed enum | `compared`、`input-unchanged` 或 `baseline-unavailable`。 |
| `trends[]` | Required array | 每项 required `metric`, `unit`, nullable `baseline`, `current`, `delta`, `percentChange`；`delta` 是 current minus baseline，前三个数值使用 `unit`，`percentChange` 使用 percentage。 |

当前 explicit-only producer 在省略 baseline 时写入 `baseline-skipped`，显式 revision 选择成功时
写入 `generated`，并把 `baseline.metadata.selectionReason` 固定为 `explicit`；只有随后发生的
materialization 或 baseline scan failure 才写入对应 failure status。`history-unavailable` 与
`no-baseline-commit` 继续保留在 machine v1 closed enum 中用于 shape compatibility，但不表示
产品仍会自动检查历史或推断 baseline。

### Completeness, warning channels and gate

| Public path | Presence / value | Meaning |
| --- | --- | --- |
| `scanCompleteness.capabilities[]` | Required array | 每个 stable ID `file-metrics`、`function-metrics`、`duplicate-detection` 恰好一个 result。`status` 是 `skipped` / `no-input` / `succeeded` / `failed`；只有 failed shape 含 required `{kind, message, action}` diagnostic。 |
| `scanCompleteness.overall` | Required closed enum | Shared reduction：任一 failed → `failed`；否则任一 succeeded → `complete`；否则 `empty`。 |
| `warnings.all` | Required warning array | 全部 normalized warnings。 |
| `warnings.changed` | Required warning array | Changed warnings，是 `all` 的 order-preserving subsequence。 |
| `warnings.regressions` | Required warning array | Baseline regressions，是 `changed` 的 order-preserving subsequence。 |
| `gate` disabled shape | Required `{policy: null, status: "disabled"}` | 未请求 gate。 |
| `gate` passed/failed shape | Required closed shape | `policy`, `status`, `evaluatedChannel`, `evaluatedWarningCount`, `blockingWarningCount`, `blockingWarnings`；counts 与 arrays/set predicate 一致。 |
| `gate` not-evaluated shape | Required closed shape | `policy`, `status: "not-evaluated"`, `reasonCode`；reason 是 `scan-incomplete` / `no-eligible-input` / `comparison-unavailable`。 |

### `MachineWarningV1`

Every embedded or streamed warning uses this one closed shape:

| Field | Presence / unit | Meaning |
| --- | --- | --- |
| `schemaVersion` | Required literal | `vibe-check.warning.v1` instance identity。 |
| `ruleId` / `metric` | Required strings | Stable normalized warning-rule / metric identifiers。 |
| `level` | Required closed enum | `info`、`warning` 或 `error`。 |
| `message` | Required string | Human-readable normalized warning statement。 |
| `suggestion?` | Optional string | Human-readable remediation suggestion。 |
| `sourceTool` / `codeArea` | Required strings | Normalized measurement source 与 associated code-area ID。 |
| `path` | Required string | Product-normalized project-relative path，使用 `/`，绝不包含 absolute host path。 |
| `line` | Required positive integer or `null` | One-based source line；warning 没有单一 line 时为 `null`。 |
| `value` | Required number | Current observed value，unit 由 `metric` semantics 决定。 |
| `baselineValue` | Required number or `null` | 同一 metric unit 的 baseline value；没有 comparable baseline 时为 `null`。 |
| `deltaValue` | Required number or `null` | Current minus baseline，使用同一 metric unit；不可比较时为 `null`。 |
| `comparisonBasis` | Required string | Producer-owned threshold/comparison basis explanation。 |
| `isChanged` | Required boolean | Warning 是否关联 invocation changed-file scope。 |
| `acceptedReason?` | Optional string | Owner-supplied acceptance reason；absent 或 empty string 仍 blocking，non-empty（包括 whitespace-only）视为 accepted。 |

### Path and ordering rules

Artifact paths 由 artifact directory 加 canonical filename 组成。Instance 内 path context：

- `metadata.repository` 是 normalized absolute project root。
- `fileMetrics[].path`、`functionMetrics[].file`、`duplicateCode[].locations[].path`、
  fingerprint `fileList[]` 与 warning `path` 是 product-normalized project-relative paths，
  使用 `/`。
- `metadata.scope.*` 是 resolved config values；`include` / `generatedFiles` 是 globs，
  `excludeDirs` 是 configured directory name 或 path。

DTO mapper 保留每个 source array 的 order，但 consumer meaning 分为：

| Order kind | Arrays |
| --- | --- |
| Semantic | `metadata.scope.*` config order；fingerprint `fileList` deterministic evidence；`duplicateCode`、其 `codeAreas` / `locations`；`fileMetrics`、`functionMetrics`、`trends`；三个 warning channels；gate `blockingWarnings`。 |
| Presentation-only / identify by key | `metadata.tools` 与 baseline `toolMetadata` 按 `name`；`aggregates.byLanguage` 按 `language`；`aggregates.byCodeArea` 按 `codeArea`。 |
| No array-position identity | `scanCompleteness.capabilities`；consumer 按 `capabilityId`，validator 检查 exact membership/no duplicates。 |

Warning-channel order、multiplicity 与 gate blocking order 属于 contract；JSON object member
order 不属于 contract。

## Serialization and byte grammar

### Producer serialization

- `metrics.json` 使用 deterministic two-space JSON，无 final LF。
- Warning stream 每个 record 使用 compact one-line JSON 加 LF。
- Empty warning channel 序列化为 exact zero-byte file。
- Object member order 与 serialization whitespace 不属于 parsed instance semantics。

### Accepted `metrics.json` bytes

1. Bytes 必须经 fatal UTF-8 decode；禁止 leading UTF-8 BOM。
2. Decoded content 必须恰好包含一个 JSON value；允许 ordinary leading/trailing JSON
   whitespace。
3. Root 必须是 non-null、non-array object。
4. Object 必须通过 current metrics runtime schema；key order 与 insignificant whitespace
   不改变 verdict。

### Accepted warning-stream bytes

1. Zero records 必须是 exact zero bytes。
2. Non-empty stream 必须以 exactly one LF byte (`0x0A`) 结束。
3. 移除 required final LF 后，其余 bytes 是一个或多个由 LF 分隔的 non-empty record
   segments；interior blank、whitespace-only segment 或 extra final LF 都拒绝。
4. 每个 segment 必须是一个 JSON object 并通过 current warning schema。
5. LF 只作 record delimiter。Segment 内允许 JSON 的 `SP`、`HTAB`、`CR` non-LF
   whitespace，因此 CRLF 可接受，其中 CR 属于 preceding record 的 trailing whitespace。
6. Invalid UTF-8、leading BOM、missing/extra final LF、malformed/non-object/schema-invalid
   record 拒绝整个 stream，不返回 valid prefix。

Parsed equality 使用 recursive JSON-value equality：object member order ignored，array order、
member names、values 与 multiplicity preserved。

## Validator boundaries

Product shallow boundary 暴露两个 all-or-nothing validators：

| Entrypoint | Input | Success | Failure |
| --- | --- | --- | --- |
| Warning-stream validator | 一个 warning `Uint8Array` 加 logical artifact label | 完整 typed `MachineWarningV1[]` | 无 partial array；返回 logical artifact、stable category 与适用 pointer / 1-based line / 0-based index diagnostic |
| Artifact-set validator | metrics、changed stream、all stream 三组 `Uint8Array` | Typed metrics 与两个完整 parsed streams | 无 partial set；返回 logical artifact、stable category 与适用 pointer/line/index/set relationship diagnostic |

Failure categories 是 `decoding`、`framing`、`syntax`、`schema`、`set-invariant`。Readable
message 可用于定位；底层 parser-library wording 不是 stable contract。

### Artifact-set validation

Schemas 与 byte grammar 通过后，complete-set validator 还必须证明：

1. Parsed `warnings.ndjson` 与 `metrics.warnings.changed` 在 length、order、multiplicity 和
   recursive values 上 deep-equal。
2. Parsed `warnings-all.ndjson` 与 `metrics.warnings.all` deep-equal。
3. `changed` 是 `all` 的 order-preserving subsequence；`regressions` 是 `changed` 的
   order-preserving subsequence。
4. Capability results 包含每个 stable capability ID 恰好一次，没有 unknown/duplicate ID，
   且按 Core shared reducer 得到 `scanCompleteness.overall`。
5. Evaluated gate 使用 policy descriptor 指定的 channel；evaluated count 等于该 channel
   length；ordered blocking list 等于 `acceptedReason` absent 或 empty 的 records。
6. Blocking count 等于 blocking list length；empty list 只允许 `passed`，non-empty list 只
   允许 `failed`。

Validator 只检查 serialized relationships；不 rescan、不 regenerate warnings、不应用
threshold，也不复制 comparison/gate business decisions。

## Validated publication and evidence

Final output flow 是：

```text
validate final Core QualityMetrics
  -> project one MachineMetricsV1
  -> serialize three in-memory candidates
  -> validate the complete candidate set
  -> clean prior canonical files and product-owned temps
  -> same-directory temp writes
  -> rename all three temps to canonical names
  -> write report.md
  -> print trusted artifact paths and publish process outcome
```

Core 或 candidate validation failure 发生在 canonical write 前，并 best-effort 删除该
artifact directory 的 prior three canonical machine files 与
`.vibe-check-machine-*.tmp` owned temps；
write/rename 使用 same-directory temporary files。Handled cleanup、temp-write、rename 或
subsequent report-write failure 会 best-effort 删除三个 canonical files 与 owned temps，记为
output failure，并由 Product CLI 退出 `2`；computed failed gate 不能覆盖 output failure。

这不是 multi-file transaction。Abrupt process termination 仍可能留下 residual files，file
existence 不能单独证明 current invocation。证据层次是：

- **Contract-valid set**：三个 candidates 同时通过 schemas、byte grammar 与 set invariants。
- **Published set**：三个 canonical writes 都已完成的 contract-valid set。
- **Current-run evidence**：published set 加 producing Product CLI outcome；files alone 不充分。
- **Scan-incomplete set**：可 contract-valid 地描述 measurement domain failure，并随 producing
  outcome 退出 `2`；它不是 output-contract failure。
- **Output-contract failure**：projection、validation、cleanup、write 或 report publication
  failure；handled failure 退出 `2`，不发布 trusted machine paths。

同一 artifact directory 不支持 concurrent writers；concurrent invocations 必须使用不同
artifact directories。下一次 invocation 拥有并清理自己 artifact directory 内的 prior
canonical files / owned temps。

## Published schemas, examples and drift checks

### Current materials

| Material | Purpose |
| --- | --- |
| [Metrics v1 schema](schemas/vibe-check-metrics.schema.json) | Current metrics instance schema；通过 warning URN 引用 warning v1。 |
| [Warning v1 schema](schemas/vibe-check-warning.schema.json) | Current embedded/streamed warning schema。 |
| [complete-passed](examples/artifacts/complete-passed/README.md) | Complete、zero warnings、gate disabled、producer outcome `success` / exit `0`。 |
| [complete-warning](examples/artifacts/complete-warning/README.md) | Complete、non-empty all warnings、gate disabled、`success` / exit `0`。 |
| [legitimate-empty](examples/artifacts/legitimate-empty/README.md) | Empty completeness、zero-byte streams、gate disabled、`success` / exit `0`。 |
| [gate-failed](examples/artifacts/gate-failed/README.md) | Complete、regression blocks evaluated gate、`gate-failed` / exit `1`。 |
| [scan-incomplete](examples/artifacts/scan-incomplete/README.md) | Failed completeness、not-evaluated gate、contract-valid set、`failed` / exit `2`。 |

每个 outcome directory 只包含 `metrics.json`、`warnings.ndjson`、
`warnings-all.ndjson` 和 README。Examples 从 fixed core values 经 production mapper/
serializers 生成；timestamp、repository、commits、paths、config version 和 tool metadata 在
serialization 前固定。README 的 outcome / exit 是 scenario metadata，不能从 files alone
推导。

Validation 有两个故意不同的边界：

1. Product validator 从 runtime schemas 检查实际 producer/consumer bytes。
2. Independent docs validator 使用 checked-in schemas、raw example bytes、独立 UTF-8/
   framing/schema/set-invariant implementation 验证五组 current examples；它不 import
   product validator 作为 acceptance implementation。

另有 deterministic generation drift checks 将 runtime schema/example projection 与
checked-in files 按 bytes 比较。`bun run validate:docs` 同时运行 current schema strict
compile、independent example acceptance、schema/example drift、historical report checks 与
Markdown links。Current artifact traversal 不包含 historical report examples。

## Console channels

当前 TypeScript product 的 console behavior：

- stdout 显示 banner、profile、scan input progress、trusted artifact paths、summary、warning
  preview 和 completion status。
- Summary 显示 overall completeness 与每项 capability 的 ID/status；failed result 同时显示
  normalized reason 和恢复动作。
- Gate disabled 时不增加 human gate 文本；requested gate 的 console 只投影同一
  `GateResult`。
- Normalized measurement failure 与 fatal issues 在 failure summary 中可见；top-level
  error 写 stderr。
- Scanner process 的原生 stdout/stderr 不直接成为 product console contract。
- Quick/full、complete/empty/failed 和 warning/passed/failed 结论必须与已验证 artifacts
  一致。

正式入口只负责命令分流、project-root/flags 与 exit mapping。Dogfood wrapper 不重新定义
console text 或 artifact locations。

## Completeness conclusion

Human output 从同一 overall completeness 得出结论：

- `complete`：没有 normalized quality warnings 时可显示 passed，有 warnings 时显示 warning。
- `empty`：显示 warning，说明没有 capability 有 eligible measurement input、质量未评价；
  不显示绿色通过，也不伪造 normalized quality warning record。
- `failed`：显示 failed capability、原因与恢复动作；其它 capability 的 partial/success data
  不能形成可信质量结论。

Capability status 保持产品语义：profile 未请求为 `skipped`，已请求但没有 eligible input
为 `no-input`，eligible work 正常完成（包括 zero findings）为 `succeeded`，required work
未完成为 `failed`。Output 不重分类这些状态。

## Gate projection

`metrics.json` 序列化完整 `GateResult`；只有 validated publication 与 producing invocation
outcome 一起才构成 current-run gate evidence。Human surfaces 按 state 投影：

- `disabled`：report 与 console 保持 omitted-gate silence。
- `passed` / `failed`：report 的 `Quality Gate` section 位于 summary/comparison context 后、
  detailed rankings/findings 前；report 与 console 显示同一 policy、status、channel 和
  counts。Blocking warnings 保持 `GateResult` semantic order。
- `not-evaluated`：report 与 console 显示同一 policy、status、closed reason code 和
  owner-derived action。

`all` gate 的 human conclusion 限定为 resolved profile，并继续展示 skipped capability
evidence。Evaluated passed/failed conclusion 写 stdout；evaluated gate failure 本身不写 fatal
stderr。Not-evaluated、runtime、completeness 与 output failure 使用 failure stderr boundary，
不得伪装成 passed 或 trusted evaluated failure。

Gate selection 不删除 accepted、non-selected 或 non-blocking warning records。Artifact
publication failure 优先于 computed `GateResult`。

## 已退役 Rust CLI 输出的历史材料

以下 `human` / `json` 内容只记录已删除 Rust CLI 的历史 contract，不是当前可执行入口、
TypeScript product contract 或迁移输入。

### `json`

历史 Rust `vibe-check scan --format json` 输出曾是 stdout 的单一 JSON object，使用
`schema_version = vibe-check.report.v1`，包含 tool/run/scope/summary/metrics/warnings/gate/
diagnostics envelope。完整历史材料是：

- [Historical report schema](schemas/vibe-check-report.schema.json)
- [Historical JSON examples](examples/json/)

它们与 current metrics/warning schemas 分别注册、分别验证，不进入 current artifact
example traversal。

### `human`

历史 Rust `vibe-check scan` / `--format human` report 从同一 Rust report data 派生，呈现
summary、metrics、gate、warnings 和 diagnostics；它不是当前脚本解析接口。

### Rust channel boundary

历史 Rust human/json report 写 stdout，usage/input/config/scanner/output/top-level diagnostics
写 stderr。这些要求已随 Rust 产品路径退役；不得把 Rust renderer、CLI fixtures 或 schema
当作当前 `src/product/**` 的输出要求。

## Verification

修改 Output 契约或实现时，按影响面选择以下证明：

- Runtime schema source、schema-derived DTO types、explicit mapper、serializers、两个
  validators 与 shallow export 保持一个 contract boundary。
- V1 identities、canonical filenames/paths、field/path/unit/optional/order semantics 和
  warning mapper 没有漂移。
- Metrics/warning positive byte grammar 与 invalid decoding/framing/syntax/schema failures
  维持 all-or-nothing diagnostics。
- Artifact-set invariants 覆盖 stream/channel、subsequence、capability/completeness 与
  evaluated-gate relationships。
- Candidate validation precedes canonical writes；handled publication/report failure 清理
  canonical machine files/owned temps，exit `2` 优先于 computed gate。
- Complete-passed、complete-warning、legitimate-empty、gate-failed、scan-incomplete 五组
  canonical examples 同时通过 product 与 independent docs boundaries，generation 无 drift。
- Formal producer-to-consumer acceptance 把实际 Product CLI non-empty/zero-byte warning
  streams 交给 actual annotation CLI，并证明 invalid input 不产生 partial annotations。
- Console/report/machine artifacts 投影同一 core evidence；historical report materials 不进入
  current registry/traversal。

初次产品化 quick/full/baseline/explicit-changed-files parity 是一次性迁移证据，不是每次
output change 的固定 gate。
