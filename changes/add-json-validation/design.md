# Design

本设计以 package-private strict JSON document boundary 支撑 `json-validation`，并让 parser、领域 data、Record identity 与 verdict 始终由 owning Check 决定。

## Context

本 Change 的实施 AI 应先从下列 current owner 恢复已确认边界；Change artifacts 只承接本次交付计划，不能反向覆盖这些 owner。

| 已确认事实 | 权威 owner | 对本 Change 的约束 |
| --- | --- | --- |
| Default Check 是 ordinary value；options 是完整 closed object，consumer 通过 native object composition 自定义 | [`docs/configuration.md`](../../docs/configuration.md) | `jsonValidation` 是一个 default value；替换 `options` 时不得由 Product 填补遗漏字段。 |
| Global collection 已 normalized、stable-sorted；Check 只从中产生自己的 exact inputs | [`docs/scan-scope.md`](../../docs/scan-scope.md) | JSON Check 只过滤当前 candidates，不创建新的 file discovery 或 scope。 |
| `passed`/`failed` 有 final data；`not-applicable`/`unavailable` 没有；Records 是 Check-local supplemental facts | [`docs/quality-metrics.md`](../../docs/quality-metrics.md) | document issue、read failure 和 no-input 必须落入不同的 four-state outcome，不能从 Record 数量反推 status。 |
| Core 与 v4 output 只接受 canonical JSON-safe data，不解释业务字段或敏感性 | [`docs/output.md`](../../docs/output.md) | Check 必须在 reporter/final-data 边界前完成 safe normalization，不能输出 bytes、parser message 或 stack。 |
| 首次公开发布前要完成 `jsonValidation` 与其余选定 Checks | [`complete-first-release-check-set-before-publication.md`](../../docs/decisions/complete-first-release-check-set-before-publication.md) | 此 Change 受该优先级方向约束，但当前用户请求才授权实施范围。 |
| strict-document parser 采用 Momoa | [`use-momoa-for-strict-json-document-boundary.md`](../../docs/decisions/use-momoa-for-strict-json-document-boundary.md) | private boundary 使用 `@humanwhocodes/momoa@3.3.12`；package legal/material、candidate 与 isolated-consumer evidence 是完成条件，且不得由 native `JSON.parse` 或第三方错误文本替代 decoded duplicate-key 语义。 |

当前 Product 尚无 JSON default Check 或 shared file-policy、comparison/reference channel、Record catalog、JSON parser API 或 Check-local scheduler。`json-schema-validation` 对本 Change 是**源代码复用依赖**：它将使用 strict-document helper，但两个 Checks 不应以 `dependsOn`、共享 final data 或 runtime result 相连。

## Goals / Non-Goals

**Goals**

- 以可审计的 strict document boundary 处理 bytes、UTF-8、grammar、full consumption 与 decoded duplicate-key 语义。
- 让每个正常领域问题的 Record、final counts 与 four-state verdict 可预测、稳定且不泄露 document 内容。
- 只把一个 ordinary default value 与自己的 options type 加入 package root；私有 helper 不成为 public parser/AST contract。
- 让后续 JSON Schema Check 复用同一 document semantics，而不耦合两项 Check 的工作、Records 或结果。

**Non-Goals**

- 不提供 public parser、JSON AST、formatter、repair、JSON Schema 或 generic validation service。
- 不建立 per-file shared override、cache、baseline/comparison、reference channel、新 Core entity 或 Product-wide Record schema。
- 不把 JSON Schema document/instance verdict、Ajv/native error 或 remote loading 混入 `jsonValidation`。

## Decisions

### Intended Change

实施按以下已固定的 boundary 从输入到公开事实推进；实现不得为其增加隐式 default、数据字段或 policy 层。

1. **Input and applicability。** Callback 只消费当前 global file scope；它从现有 collector 的 normalized、stable-sorted candidates 中选择 `path.endsWith(".json")` 的小写、case-sensitive JSON eligible paths，且所有后续 read 都必须留在该 exact set。没有 eligible path 时直接返回 `{ status: "not-applicable", reason: { code: "no-eligible-input" } }`。
2. **Strict document boundary。** `JsonValidationOptions` 是只含 `maximumBytes` 的 closed object；它必须是 positive safe integer，default 为 `1_048_576`。每个 eligible file 先将 raw byte length 与该值比较，只有 `byteLength > maximumBytes` 时产生 `too-large`。未超限文件依次检查 UTF-8 BOM bytes、以 fatal UTF-8 decode、再由 `@humanwhocodes/momoa@3.3.12` 在 strict JSON mode 解析，并由 owning adapter 遍历 private AST，在 object materialization 前按 decoded property name 检测 duplicate key。它必须完整消费一个合法 JSON value、拒绝 comments、trailing comma 和 trailing content，并接受 object、array、string、number、boolean 与 `null` root。boundary 返回 private normalized document result 或 closed issue，绝不泄漏 Momoa types、raw source 或 parser-native wording。
3. **Outcome classification。** 下表是 owning Check 的唯一分类路径；`unavailable` 不是可报告 document defect 的别名。

   | 情形 | Check 行为 | 可公开事实 |
   | --- | --- | --- |
   | 单个 file 的第一个 `too-large`、`bom`、`invalid-utf8`、`invalid-json` 或 `duplicate-key` issue | 按该固定优先级为该 file 产生恰一个 Record；有任一 issue 时最终 `failed`。`invalid-json` 统一表示 grammar、comments、trailing comma 或 trailing content。 | `{ id: path }` 与 `{ path, reason }`；正常完成时的 final counts。 |
   | 没有 JSON eligible input | 不读取或伪造空结果，返回 `not-applicable`。 | 可选受控 reason；没有 final data。 |
   | read/IO、cancellation 或无法把 parser/boundary result 规范化的协议失败 | 结算为 `unavailable`，不把失败当作 clean result，也不创建代表该失败的 document Record。 | 受控 reason；没有 final data 或 parser-native detail。已接受的先前 Records 按 Core 既有语义保留。 |
4. **Records, identities and final data。** 每个 invalid file 只报告第一个按 pipeline 发现的 issue；其 local identity 恰为 `{ id: path }`，data 恰为 `{ path, reason }`，其中 `path` 是 normalized project-relative exact input，`reason` 是 `"too-large" | "bom" | "invalid-utf8" | "invalid-json" | "duplicate-key"`。该 Record 不含 JSON Pointer、decoded key、offset、line/column 或其他位置字段。normal completion 的 final data 恰为 `{ scannedFileCount, validFileCount, invalidFileCount, issueCount }`；四个字段均为 non-negative safe integer，`scannedFileCount = validFileCount + invalidFileCount`，`issueCount = invalidFileCount`。因此不另设 issue cap、truncation 字段或 version；scope 的 stable input order 与每-file 单一 Record 使提交可复现，Core 再按 id canonicalize。
5. **Private reuse and package closure。** strict-document helper 位于 package-private module boundary；JSON Schema Check 可调用它，但不得导入或解释 `jsonValidation` 的 Check result。`@humanwhocodes/momoa@3.3.12` 是 production runtime dependency；其 license/material、candidate artifact、Bun compatibility 和 isolated consumer 都是同一交付的一部分。它不形成 public parser 或 AST contract。

### Resulting Impacts

- `json-schema-validation` 必须在 helper 落地后重用它；strict-document semantics 变更时，两项 Check 的 owner tests 都要重跑，避免彼此漂移。
- 任何 parser dependency 升级或替换都必须重新证明 strict mode、duplicate-key detection、safe normalization、Bun compatibility、license 和 installed runtime closure。
- 公开 Check/Record data 会进入 existing v4 machine projection；只有 Check 本地 schema 能说明字段、排序和脱敏，Output 不会为其补充业务验证或 redaction。

## Risks / Trade-offs

| 风险或取舍 | 处理边界 |
| --- | --- |
| `JSON.parse` 会在 object materialization 后丢失 duplicate-key 证据 | Readiness 必须证明候选 parser 能在此之前观察 decoded names；否则采用最小可审计实现，不以普通 `JSON.parse` 伪装满足需求。 |
| 大文件、深层对象或大量 duplicate keys 可能放大内存和 Record 数量 | default `maximumBytes = 1_048_576` 限制单文件 bytes；每个 invalid file 最多一个 Record，故不需要 cap/truncation contract。用户若显式提高限制，接受相应 AST 内存风险。 |
| parser error、原始 bytes 或 source excerpt 可能泄露项目内容 | private boundary 只能产出 allowlisted path/reason；测试覆盖 throw/error 路径，且不公开 pointer、key 或位置。 |
| Momoa 单入口会带入 AST/print/traverse 代码，深层或大文件会产生 AST 内存峰值 | 接受约 92 KB 的直接 ESM 代码面；以 `maximumBytes` 控制单文件，若产品以后提出严格内存/吞吐预算则重新评估流式方案，而不在本 Change 预置优化。 |
| Momoa 使 package 运行时依赖与许可面扩大 | 只有通过 Bun、license、production dependency、candidate 和 isolated consumer 审计的 Momoa 才能进入实现。 |

## Open Questions

无。Readiness task `0.4` 已固定 `maximumBytes`、eligibility、每-file issue cardinality、data schema 和不公开位置的首版契约；这些选择没有扩大 Product-wide public surface、scope 或风险边界，因此不新增 Decision Record。
