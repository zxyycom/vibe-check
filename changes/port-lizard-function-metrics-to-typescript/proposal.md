# Proposal

本 Plan 在首次公开发布后，以 fresh compatibility corpus 将 `function-metrics` 的 private Python/Lizard backend替换为 Product-owned TypeScript analyzers。

## Why

当前 `functionMetrics` default Check仍探测并执行 Lizard、解析 CSV并维护外部 process failure。移除 Python/Lizard可简化 installed runtime，但不会新增用户可见 Check；TypeScript/Rust function boundary、NLOC、complexity与 parameter parity的实现和 provenance成本较高。长期决策要求它在 Check foundations之后重新基线，并在没有交付阻塞证据时保持后置。

## Outcome

`function-metrics` 以恢复实施时的稳定 constructor、area limits/finding policy、Check-local Records、final data 与 public identity 为兼容目标，只把 `.ts`/`.d.ts`/`.rs` exact inputs 的 private measurement backend hard-cut 为 Product-owned TypeScript implementation；formal runtime 不再 probe/execute Python/Lizard 或解析其 CSV，constructor 同时删除不再需要的 scanner executable policy。

## Scope

### Intended Change

- 恢复时从当前 `src/package-checks/function-metrics/**`、其 local Lizard adapter与 tests采集 fresh observable compatibility corpus。
- 为 `.ts`/`.d.ts` 与 `.rs`分别实现 private analyzers，保持 current function boundaries、NLOC、cyclomatic complexity、parameter count、record IDs/order、no-input与 failure semantics。
- 在写 derived/translated code前完成 source revision、license/provenance与 clean-room判断。
- Parity通过后一次 hard cut并删除 Lizard availability/process/parser/dependency/cache identity；不保留 production fallback或 dual backend。
- 除删除已失去消费者的 scanner executable policy 外，不改变 public area/finding/Record/machine contract，不扩大到 `.tsx`/`.js`/`.jsx`，不纳入首次公开 release gate。

### Resulting Impacts

Fresh corpus、analyzers、cache invalidation、dependency removal、license/provenance与 installed/full Gate证据必须同一 Change闭合；不能只替换 command调用。

## Success Criteria

- 恢复实施时 owner 定义的 exact-input rules、expected Records、final data 与 failures 在 fresh corpus 中固定；新 backend 对全部 supported fixtures 等价。
- Analyzer只读取 callback提供的 approved exact paths，不收集 project root；unsupported/malformed source按 owning Check现行语义关闭。
- Formal product/package/dogfood import/process trace中无 Python/Lizard probe、exec、CSV或 fallback；旧 cache不能命中新 backend。
- Source/license/provenance、performance observation、product/package/full Gate与 installed Bun evidence完整。

## Affected Owners

- `docs/scanner-dependencies.md`：function backend与 external dependency removal。
- `docs/scan-scope.md`：`.ts`/`.d.ts`/`.rs` exact inputs，只消费不扩大。
- `docs/quality-metrics.md`：保持现有 function Records/final result语义。
- `src/package-checks/function-metrics/**`、`src/package-checks/function-metrics/lizard/**` 与 cache/dependency owners：analyzers、hard cut和 tests。
- Package dependency/license materials与 `docs/testing/cases/**`：parity、failure、performance和 absence evidence。
