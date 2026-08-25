# Proposal

`add-json-validation` 在现有 ordinary Check contract 中新增严格、离线的 `jsonValidation` default Check，并固定首版的 input、issue 和公开 data 边界。

## Why

项目中的 manifest、配置和数据文件可能因非法 UTF-8、JSON grammar 或重复 object key 而在下游才失败。当前 Vibe Check 只有代码度量 defaults；项目若要统一发现这些问题，必须各自重写文件收集、严格解析、Record 和结果折叠逻辑。

## Outcome

完成后，package 根路径公开 ordinary value `jsonValidation`（`checkId = "json-validation"`）。该 Check 只处理当前 global scope 中由自身 case-sensitive `.json` suffix 规则选出的候选，在 invocation-owned 有界内存中验证 UTF-8、完整 JSON document grammar 和 decoded duplicate keys。

正常完成时，Check 使用 Check-local Records 报告安全的领域缺陷，并以 final data 与 `passed | failed | not-applicable | unavailable` 表达完整结果：无领域缺陷时 `passed`，有领域缺陷时 `failed`，没有 eligible input 时 `not-applicable`，不能形成正常结论时 `unavailable`。

## Scope

### Intended Change

- **Public default Check。** 新增 `jsonValidation` 与 closed `JsonValidationOptions`。首版 authoring 字段只有正 safe integer `maximumBytes`，default 为 `1_048_576`；文件 raw byte length 仅在严格大于它时为 too large。它不引入 per-file override、共享 policy resolver、第二 Check family 或新 Core entity。
- **Exact input boundary。** Check 从现有 global scope 得到候选，再只按 `path.endsWith(".json")`（小写、case-sensitive）的 eligibility 选择 exact paths。它不得自行遍历、重新发现或重新纳入 excluded、generated、vendor 或 scope 外文件。
- **Package-private strict document boundary。** 对每个 eligible input，在大小限制内完成 fatal UTF-8 decode，并以 [`@humanwhocodes/momoa@3.3.12`](../../docs/decisions/use-momoa-for-strict-json-document-boundary.md) 的 strict JSON parse/AST 语义验证完整 grammar 和 decoded duplicate key；拒绝 BOM、comments、trailing comma 和 trailing content，接受任意合法 JSON root value。owning adapter 只产出 private normalized result，不公开 parser、AST、原始 bytes 或 parser-native error。
- **Safe Check facts。** 每个 invalid file 恰产生一个 stable Check-local Record：pipeline 中第一个发现的领域 issue 决定它，identity 为 `{ id: path }`，data 恰为 `{ path, reason }`。`reason` 是 closed union：`"too-large" | "bom" | "invalid-utf8" | "invalid-json" | "duplicate-key"`。不公开 JSON pointer、decoded key、位置、原始 document、绝对路径、parser-native message、stack 或原始 bytes。正常完成的 final data 恰为 `{ scannedFileCount, validFileCount, invalidFileCount, issueCount }`，且 `scannedFileCount = validFileCount + invalidFileCount`、`issueCount = invalidFileCount`。
- **Four-state settlement。** 正常 document issues 按 `too-large` → `bom` → `invalid-utf8` → `invalid-json` → `duplicate-key` 的 per-file pipeline 优先级处理；其中 `invalid-json` 统一涵盖 grammar、comments、trailing comma 与 trailing content。任一 issue 使 Check `failed`；没有 eligible input 使其 `not-applicable`；read、cancellation 或 boundary protocol failure 使其 `unavailable`，不伪造 clean result 或 final data。
- **Public/package closure。** 同步 public value/options、Definition runtime validation、README/API example、package contract、owner docs、semantic Cases、production dependency/license evidence、isolated consumer 与 Project Gate。
- **Explicit non-goals。** 不实现 JSONC/JSON5、formatting、canonicalization、auto-fix、JSON Schema、comparison/reference、共享 Record catalog 或 Product-wide file-policy。JSON Schema 只复用 private document boundary，不读取本 Check 的 runtime result。

### Resulting Impacts

- 后续 `json-schema-validation` 必须复用同一 package-private strict-document implementation，避免同一 bytes 在两项 Checks 中产生不同的 UTF-8、grammar 或 duplicate-key 结论；两项 Checks 仍各自拥有 options、Records、final data 和 verdict。
- Momoa 必须进入 production dependency closure、license/material evidence、candidate artifact 与 isolated consumer 验证；不能仅以 dev dependency 或环境中已安装的 package 为依据。
- 该 Check 的公开 data 进入既有 Core-to-machine v4 projection，因此其 data/Record schema、排序和脱敏规则必须在 owning Check 内确定，不能由 Output 或 Core 补全。

## Success Criteria

| 场景 | 预期 Check 结论与证据 |
| --- | --- |
| 合法 object、array、string、number、boolean 与 `null` root | `passed`，并提供正常完成的 final counts。 |
| 非法 UTF-8、BOM、comments、trailing comma、trailing content、grammar error、超限或 decoded duplicate key | `failed`；每个 invalid file 仅以其首个 issue 产生一个安全 Record，其中 grammar 类问题的 reason 为 `invalid-json`。 |
| 没有 eligible `.json` input | `not-applicable`，不伪造 final data。 |
| 文件读取、cancellation 或 private boundary protocol 无法完成 | `unavailable`，不把故障降级为 clean/empty result。 |

- Check 只读取 global scope 中满足自身 eligibility 的 exact paths；处理、Record submission 和 final facts 的语义顺序可复现，且 Check 不扩大 file scope。
- Record identity 只依赖 normalized project-relative path；machine、progress、cache、log 和 error path 均不包含 document 内容、key、pointer 或位置。
- public value、options type、Definition validation、package declarations/README、isolated consumer、semantic Case closure 与 Project Gate 均覆盖该 Check。
- 实施完成前，最窄 tests、Test Evidence closure、typecheck、lint、docs/package validation、required/full Gate 与 exact candidate preparation 均通过。

## Affected Owners

| Owner | 本 Change 的消费或同步责任 |
| --- | --- |
| `docs/configuration.md` | ordinary default value、closed options、native composition 与 runtime Definition validation。 |
| `docs/scan-scope.md` | `.json` eligibility 基于 global scope，且不得扩大 exact input set。 |
| `docs/quality-metrics.md` | four-state result、Check-local Records、final data 与 failure folding。 |
| `docs/output.md` | generic v4 projection 只能承载 safe Check/Record data。 |
| `src/checks/**`、`src/definition/**`、`src/index.ts` 与 package contract/materials | private document boundary、default Check、公开 surface、installed-runtime closure。 |
| `docs/testing/cases/**` | strict bytes/grammar/duplicates/scope/failure/public-consumer evidence。 |
| `docs/decisions/complete-first-release-check-set-before-publication.md` | 只提供首版优先级方向；本 Change 完成后再按 Decision workflow 核对 alignment。 |
| `docs/decisions/use-momoa-for-strict-json-document-boundary.md` | 已确认 Momoa 为 private parser；在 package/candidate/consumer 证据闭合前保持 unaligned。 |
