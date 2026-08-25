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

实施按以下 boundary 从输入到公开事实推进；未在本节确定的数值和字段契约必须先按 `Open Questions` 收敛，不能由实现静默猜测。

1. **Input and applicability。** Callback 只消费当前 global file scope；它从现有 collector 的 normalized、stable-sorted candidates 中选择 JSON eligible paths，且所有后续 read 都必须留在该 exact set。没有 eligible path 时直接返回 `{ status: "not-applicable", reason: { code: "no-eligible-input" } }`。
2. **Strict document boundary。** 对每个 eligible file，先按 `maximumBytes` 执行大小边界，再以 fatal UTF-8 decode；BOM 是领域 issue，而不是被 decoder 隐式吞掉的格式细节。boundary 必须完整消费一个合法 JSON value，拒绝 comments、trailing comma 和 trailing content，并在 object materialization 前以 decoded property name 检测 duplicate key。object、array、string、number、boolean 与 `null` 都是合法 root。boundary 返回 private normalized document result 或 closed issue，绝不泄漏 parser types、raw source 或 native wording。
3. **Outcome classification。** 下表是 owning Check 的唯一分类路径；`unavailable` 不是可报告 document defect 的别名。

   | 情形 | Check 行为 | 可公开事实 |
   | --- | --- | --- |
   | `invalid-utf8`、`bom`、`syntax`、`trailing-content`、`duplicate-key` 或 `too-large` | 作为正常 document issue 继续完成该 Check；有任一 issue 时最终 `failed`。 | safe Check-local Record；正常完成时的 final counts。 |
   | 没有 JSON eligible input | 不读取或伪造空结果，返回 `not-applicable`。 | 可选受控 reason；没有 final data。 |
   | read/IO、cancellation 或无法把 parser/boundary result 规范化的协议失败 | 结算为 `unavailable`，不把失败当作 clean result。 | 受控 reason；没有 final data 或 parser-native detail。 |
4. **Records, identities and final data。** Check 先以 normalized path、semantic subject、reason 与同类 occurrence ordinal 建立 local Record identity，再按 path、offset、reason 的确定顺序提交。Record data 只允许 safe path、closed reason、适用的 JSON pointer/decoded key 和经确认的位置字段。正常完成的 final data 必须表达 scanned、valid、invalid file counts 与 issue count；field names、version、issue-cap/truncation 与位置的精确契约在本 Change 内收敛，不交给 Core、Output 或 parser dependency 决定。
5. **Private reuse and package closure。** strict-document helper 位于 package-private module boundary；JSON Schema Check 可调用它，但不得导入或解释 `jsonValidation` 的 Check result。若选用 external parser，其 runtime dependency、license、candidate artifact、Bun compatibility 和 isolated consumer 都是同一交付的一部分。

### Resulting Impacts

- `json-schema-validation` 必须在 helper 落地后重用它；strict-document semantics 变更时，两项 Check 的 owner tests 都要重跑，避免彼此漂移。
- 任何 parser dependency 升级或替换都必须重新证明 strict mode、duplicate-key detection、safe normalization、Bun compatibility、license 和 installed runtime closure。
- 公开 Check/Record data 会进入 existing v4 machine projection；只有 Check 本地 schema 能说明字段、排序和脱敏，Output 不会为其补充业务验证或 redaction。

## Risks / Trade-offs

| 风险或取舍 | 处理边界 |
| --- | --- |
| `JSON.parse` 会在 object materialization 后丢失 duplicate-key 证据 | Readiness 必须证明候选 parser 能在此之前观察 decoded names；否则采用最小可审计实现，不以普通 `JSON.parse` 伪装满足需求。 |
| 大文件、深层对象或大量 duplicate keys 可能放大内存和 Record 数量 | `maximumBytes` 限制单文件 bytes；issue cap 的 scope、计数和 truncation 表达必须在实现前明确。 |
| parser error、原始 bytes 或 source excerpt 可能泄露项目内容 | private boundary 只能产出 allowlisted reason/path/pointer/key/location；测试覆盖 throw/error 路径。 |
| 外部 parser 使 package 运行时依赖与许可面扩大 | 只有通过 Bun、license、production dependency、candidate 和 isolated consumer 审计的候选才能进入实现。 |

## Open Questions

以下都是 **Change-local public-contract choices**，不是新的 Product-wide architecture direction；它们必须在 task `0.4` 完成后再实现 `1.1`/`1.2`。除非答案扩大本 Change 的 public surface、scope 或风险边界，否则不需要新增 Decision Record。

1. **`maximumBytes` grammar and default：** 它的允许数值域、default、边界比较（是否仅 `>` 为 too-large）以及 Definition validation 的拒绝行为尚未确定。该选择会影响 native composition、fixtures 与 public documentation。
2. **Issue cardinality and cap：** 同一 document 的多个 duplicate keys 是否各自报告、cap 是 per-file 还是 per-Check、`issueCount` 是发现数还是已报告数、以及是否需要 explicit truncation count/flag 尚未确定。该选择会影响 bounded-memory claim、Record identity、final data 与 machine output。
3. **Safe data shape：** final data 的 field names/version，Record 的必填/可选字段，JSON Pointer escaping，以及“可选位置”是 omitted、byte offset、UTF-16 offset 还是 line/column，尚未确定。若 parser candidate 不能稳定、可测试地提供位置，首版应删除位置字段而不是暴露不稳定 contract。
4. **Eligibility literal：** `.json` suffix 的大小写规则需要与当前 scope tests 一起固定；无论选择为何，都不得改变 global scope 或重扫 filesystem。

## Implementation Observations

2026-08-24 已按当前 `src/{checks,definition,core,run,output}/**` seam 重置；旧 `src/product/**`、TaskPlan/Manager、named reference、comparison/cache 与 shared file-policy 内容不再适用。本次 AI-ready 审阅仅重组并显式化既有计划，并把原先隐含的 feature-local contract gaps 列为待收敛项；尚未实现 JSON validation，也未更新稳定 owner 文档。
