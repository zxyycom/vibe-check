# Design

本设计用显式 registry/binding 和 private 2020-12 engine adapter，把 JSON Schema 保持为独立、确定且零网络的 default Check。

## Context

`json-validation` 将提供 package-private strict JSON document result；本 Change 复用其 bytes/grammar/duplicate-key语义，但不读取该 Check 的 final data或建立 runtime dependency。当前 Product 支持 ordinary Check-owned options、Record reporter、four-state result和统一 scheduler，没有 shared schema registry、network authorization、comparison/reference或 private cross-Check snapshot。

仓库已有 Ajv dev dependency，但是否进入 installed Product runtime、应使用哪个 2020-12 entry以及 license/material接线仍需在 Readiness审计。首版排序由 [`complete-first-release-check-set-without-markdown-structure.md`](../../docs/decisions/complete-first-release-check-set-without-markdown-structure.md) 确认。

## Goals / Non-Goals

**Goals**

- 让 schema resources 和 instance bindings 完全显式、可验证、可复现。
- 复用同一 strict JSON document semantics，并隔离 engine-native API/errors。
- 保证 registered-only resolution、zero network 与 safe public facts。

**Non-Goals**

- 不自动发现 schema、从 `$schema`/filename推断 binding或访问 remote resources。
- 不公开 Ajv、compiled validator、schema AST、resolver或 generic validation service。
- 不实现 cache/comparison/reference、shared file overrides或自定义 format/plugin API。

## Decisions

### Intended Change

1. **Closed authoring grammar。** `schemas` 与 `bindings` 都是 dense arrays；ID为 1..64字符 lower-kebab且各自唯一。Schema `path`、binding `instancePath`必须 normalized、唯一并属于 global scope；binding只引用已声明 authoring `schemaId`。
2. **所有资源先形成 immutable plan。** Callback在 engine work前验证 options、collect scope、读取并严格解析全部引用资源。非法 options由 Definition validation拒绝；运行期 read/document issue形成 owning Check 的领域 issue或 `unavailable`，不得部分猜测 registry。
3. **Engine只允许同步离线 resolution。** 选用 2020-12 adapter，预注册所有 schema values并禁用 `loadSchema`/remote fetch。Schema内部 `$id`/`$ref`可用于 engine resolution，但 public identity和Records始终使用 authoring IDs；未注册引用映射为 safe compile reason。
4. **Safe normalized issue model。** Issue kind固定为 `schema-document | schema-compile | instance-document | keyword-violation`。Data按适用情况含 schema/binding ID、safe path、instance pointer、keyword与closed reason；丢弃 engine message、stack、raw URI和 schemaPath中可能含敏感内容的部分。
5. **Stable local Record IDs。** ID由 issue kind、authoring IDs、safe paths/pointer/keyword和同类 ordinal组成；line、column、engine顺序和native wording不参与。Issues先按 binding/schema authoring order与 normalized semantic key排序。
6. **Status和partial behavior由 Check拥有。** 空 bindings为 `not-applicable`。正常完成且无 issue为 `passed`，有任一 document/compile/keyword issue为 `failed`；engine throw、取消或内部协议失败为 `unavailable`。Schema无法编译时其 dependent bindings产生一个可解释的 blocked count，不重复生成猜测性 keyword issues。
7. **Public/package closure。** 新 value/options/runtime validator、docs/examples/declarations/contract inventory、production dependency/license与 isolated Bun consumer一起进入 exact candidate。

### Resulting Impacts

- `json-validation` 与本 Check共享实现 boundary而不共享 Check结果；严格 document behavior变化必须同时重跑两项 owner tests。
- 任何 engine dependency升级都必须重新证明 2020-12、zero-network、error redaction、Bun和package closure。

## Risks / Trade-offs

- 2020-12 reference语义复杂；显式 registry和禁止 remote显著缩小资源边界，但仍需覆盖 recursive/dynamic refs与missing refs。
- Engine errors可能嵌入 raw URI或数据；adapter只保留 allowlisted fields，credential canary覆盖 throw/compile/validation路径。
- All-errors可能产生大量 issues；首版使用 deterministic per-binding issue cap并在 final data标明 truncation，不把截断当作通过。

## Open Questions

无。具体 engine entry与 configuration是 Readiness 中审计的 private实现选择。

## Implementation Observations

2026-08-24 已删除旧 Plan 对 shared file policy、TaskPlan/Manager、named reference、cache、五类全局 Record catalog 与 `src/product/**` 的依赖；当前计划只消费 ordinary Check、strict JSON helper、global scope 与 minimal Records。
