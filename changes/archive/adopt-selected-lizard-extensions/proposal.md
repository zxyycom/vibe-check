# Proposal

在已稳定的 Lizard 1.24.0 私有 port 上，同时交付 `complextags` 的 CCN 解释附件和 `nd` 最大嵌套深度质量门禁，并将两者闭合为受控的 `functionMetrics` Product capability。

## Why

Lizard 1.24.0 的 optional extension inventory 本身不构成 Product requirement。用户已确认两项消费者结果：现有 CCN Finding 需要说明 complexity contributors，每个函数需要以最大 nesting depth 形成可配置的质量门禁。两项都必须在 Check-private port → Product adapter 边界内闭合；upstream extension name、名称数组、loader 或通用 plugin surface 不成为兼容承诺。

## Outcome

完成后，`functionMetrics` 在既有 27 readers / 55 个大小写不敏感 suffix 的完整支持面上，按 Lizard 1.24.0 oracle 计算并发布最大 nesting depth。每个 code area 可用 `limits.nestingDepth.maximum` 配置正安全整数上限，默认值为 `7`；超限函数形成独立、可 waiver 的 `nesting-depth` Finding，进入既有 Record、message 与 final-data settlement 路径。

同时，CCN 超限 Finding 的 Product Record 保留完整、有序的 complexity contributors（token 与一基行号）。人类 message 只展示前 8 项及准确的剩余数量。这项解释不改变 CCN 数值、limit、Finding metric、waiver identity、settlement 或 final-data，也不为未超限 CCN 单独发布 Record。

## Scope

### Intended Change

- 忠实翻译并私有启用 Lizard 1.24.0 的 `lizardcomplextags` 与 `lizardnd` bodies，同步其 source-range、provenance、license、deviation 与 parity evidence；其余 optional extension bodies 继续 deferred 且不注册。
- 只经 private port façade 和唯一 Product adapter 传递必要的 Lizard-domain facts：完整有序 contributors 与每函数最大 nesting depth；Product 不公开 upstream extension identity 或通用 extension registration/loading API。
- 将 nesting depth 闭合为 `functionMetrics` 的第四个 normal metric：option/validation/default、effective per-area limit、Finding metric/identity/waiver、Record/message/final-data/docs 与 integration evidence。
- 将 `complextags` 闭合为现有 CCN Finding 的有界解释附件：完整 contributors 只在该 Finding Record；message 最多展示 8 项并说明其余项数；不产生独立 metric、limit、waiver 或 settlement。

### Resulting Impacts

- `src/package-checks/function-metrics/analyzer/**`、根 Lizard provenance/legal inventory 与当前 oracle/deviation evidence 必须把 selected pair 从 deferred 改为 translated，并保持 extension lifecycle 的 source order；未选择的 bodies 不得随之采用。
- `nesting-depth` 会影响 `functionMetrics` 的 public options、resolved policy、validation、measurement DTO、analysis、records、finding messages、waiver identity、final data、package exports 和 guide；CCN explanation 只扩展 Record data contract，不扩展 final-data schema。
- 修改或新增 native tests / Case Owner / Proves 时，必须按测试策略维护 Case ledger；source parity、Product contract、exact-input、resource、cancellation、determinism 与 27-reader/55-suffix coverage 都需要直接证据。
- shipped behavior 会改变“19 bodies all deferred”的长期基线。实施前必须按 Decision Records 规则建立 successor 或等价演进；Plan metadata 不能代替长期事实。

## Success Criteria

1. `lizardcomplextags` 与 `lizardnd` 的 Lizard 1.24.0 exact source ranges、hash/SPDX/provenance、translated targets、deviations 与 direct parity corpus 可共同复核；其余 optional bodies 保持 deferred/no registration，且没有 public extension name/array/loader/plugin API。
2. 每个已支持 reader/suffix 在 normal、edge 与 malformed corpus 上都有可复核的 ND oracle parity，覆盖 function/anonymous boundary、`else if`、ternary、条件内第一个和后续 `&&`/`||`、bracket/indent closure；不得用较窄的 `ns` 结构 nesting 替代 ND。
3. `limits.nestingDepth.maximum` 默认 `7`，只接受正安全整数；effective maximum 取 matching code areas 中最严格值。`nesting-depth` Finding、waiver identity/audit、Record、message、final data 和 blocking/non-blocking settlement 与既有三个 metric 同样闭合。
4. `complextags` 不改变 CCN 数值、limit、identity、waiver reconciliation、settlement 或 final-data schema；只有 CCN 超限 Finding 的 Record 有完整、有序 contributors，message 最多展示 8 项和准确 remainder，token/line 与 Lizard 1.24.0 oracle 一致。
5. exact-input、unsupported-input、resource limit、cancellation、failure-without-partial-analysis、determinism 与既有 27-reader/55-suffix capability 均保持成立；目标 tests、test-evidence check、typecheck/lint/dependency/public-entry checks、required 与 full workspace Gate 通过。

## Affected Owners

- `docs/checks/function-metrics.md`：公开 metric/options/limits/Finding/waiver/Record/final-data 与 consumer behavior。
- `docs/scanner-dependencies.md` 与 `docs/decisions/isolate-lizard-port-behind-check-private-interface.md`：private port → adapter boundary、exact input 与 source-fidelity responsibility。
- `docs/decisions/replace-lizard-runtime-with-product-owned-typescript-analyzers.md`、`docs/decisions/track-lizard-supported-languages-with-upstream-advisory.md`：optional body deferral baseline、27-reader/55-suffix scope 与 adoption lifecycle。
- `licenses/lizard-1.24.0-provenance.json`、`src/package-checks/function-metrics/**`、`docs/testing.md` 和相关 `docs/testing/cases/**`：source mapping/legal evidence、runtime implementation、Case evidence 与 verification。
