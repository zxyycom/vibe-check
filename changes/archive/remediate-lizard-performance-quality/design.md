# Design

本 Plan 在既有 evidence 协议内拆分 command implementation；它以 plan-local module responsibilities 降低维护耦合，同时保留入口、错误文本、test seam 和 evidence schema，不把拆分或其验证材料提升为稳定 Product 事实。

## Context

`docs/script-tooling.md#lizard--typescript-performance-evidence` 规定此工具只形成 opt-in evidence，不进入普通 test、package 或 Gate；A、B、C、cold/warmed semantics、Linux `wait4` resource scope、fixed versions 和 raw evidence 彼此不可替代。`command.ts` 保持唯一入口，但原实现聚合了多种独立变化原因。实施前的 `bun run test-evidence -- check --root .` 记录 541 current entities；该闭合检查证明 Case/entity 映射，不执行测试正文，也不产生 benchmark evidence。

## Goals / Non-Goals

目标是以清晰的模块职责消除本范围 focused-quality finding，保留 CLI/输出/失败/清理兼容性，并用直接 mock/fixture test 观察可测试 seam。非目标是运行 benchmark、证明真实 A/B/C parity、改变性能结论或改动 Product/Gate/Python/Lizard analyzer；最终 lifecycle authorization 只归档和提交此 Change，不扩张这些非目标。任何性能结论或优化授权继续由对应 stable evidence owner 和单独授权决定。

## Decisions

### Intended Change

`command.ts` 保留为唯一程序入口和兼容 export façade；其余模块按下表承接本 Change 内的 implementation responsibility。表中的责任是本次拆分的维护边界，不替代 `docs/script-tooling.md#lizard--typescript-performance-evidence` 的稳定行为 owner，也不创建 Product 或 package API。

| 模块 | 本 Change 内的责任 |
| --- | --- |
| `arguments.ts` | 显式 CLI grammar 与 invocation request；只接受 own option key。 |
| `workload.ts`、`target-evidence.ts`、`evidence-shapes.ts` | workload manifest、target/supervisor DTO 与输入边界。 |
| `sampling.ts`、`comparison.ts`、`canonical.ts` | sample schedule、layer comparison、evidence/summary formation 与 canonical metric ordering。 |
| `fixed-lizard124.ts`、`analyzer-only.ts` | fixed 1.24 provisioning 与 B analyzer-only layer。 |
| `current-decomposition.ts`、`historical-product.ts` | C current decomposition 与 A historical Product layer。 |
| `benchmark-context.ts`、`benchmark-identity.ts` | path/constant context、driver snapshot 和 run identity formation。 |

P0 compatibility repair stays inside those boundaries: `arguments.ts` rejects inherited object-property option names in CLI dispatch; `canonical.ts` retains the prior truthy-fallthrough behavior when a numeric subtraction is non-finite, allowing the later text key to make the deterministic ordering decision. Neither repair measures speed, changes analyzer output policy, nor authorizes an optimization. Options objects may replace positional coupling; no generic subprocess framework is introduced.

### Resulting Impacts

- Each layer retains its own unavailable/not-comparable/failed boundary; B/C cannot substitute for missing A, and the comparison boundary only maps a layer exception to that layer's failed result.
- Manifest version/digest/source/replication, ABBA/BAAB order, 15 blocks/64 repetitions, preflight/output drift, temperature and resource wording retain their existing protocol roles.
- B cleans its `uv`/Pygments venv only after B provision; A only deletes the driver it writes into the historical worktree. `evidence.json` raw field/order/identity and `summary.md`'s non-substitution statement remain protocol material.
- The focused-quality comparison is maintainability evidence for this Change: it records 29 findings before and 13 remaining afterward, with the 16 removed findings confined to this implementation target. It neither changes repository-quality policy nor asserts a Product or performance result.
- A fake compatibility/parity fixture may compare the old façade and the split façade for CLI grammar and selected DTO/helper behavior. It does not invoke `runComparison`, provision Lizard, run an external child, sample a layer, write benchmark evidence, or establish real parity.
- No real benchmark or full workload runs in this Change. A later explicit developer invocation is required to obtain real evidence; any decision to optimize remains outside this Plan.

## Risks / Trade-offs

Module moves can change imports, object construction, serialized evidence or cleanup behavior despite stable public-facing seams. Direct mock/fixture tests and a fake helper-level comparison reduce this risk only at their controlled boundary; they cannot establish real-workload behavior, external-process compatibility, performance parity or performance improvement. The Plan therefore retains the unrun real benchmark/full-workload boundary instead of treating the focused-quality reduction as a substitute.

## Open Questions

No open question changes this Plan's implementation scope. The deliberately unverified real benchmark/full-workload path requires a future explicit developer invocation; a request to optimize based on its result requires separate authorization.

## Implementation Observations

- The implementation retains `command.ts`'s eight export seams and `import.meta.main` entry. The P0 review repair added fail-closed handling for inherited CLI keys and the non-finite canonical-order compatibility assertion in the existing `AUX-LIZARD-PERFORMANCE-EVIDENCE-001` Case; it does not add a Case, change that Case's owner, or claim an analyzer/benchmark result.
- A temporary, uncommitted fake compatibility fixture compared the original `HEAD` façade with the split façade for CLI grammar, Child/manifest DTO, temperature/digest/platform helpers, then was removed. It never called `runComparison` or a workload, so it is review input rather than durable parity or performance evidence.
- The focused-quality comparison recorded `29 → 13`: 16 target findings were removed; the 13 remaining Records were 1 duplicate, 4 file and 8 function finding outside this Change's target path. This is a plan-local maintainability observation, not a new Product, Gate or performance fact.
- 最终 lifecycle authorization 只运行一次 default `bun run check`，其 required selection 通过；该次运行先暴露 canonical 顺序 guard chain 造成的一条 target nesting-depth Record。随后恢复保持同一 non-finite truthy fallthrough 的 field-list loop，并以 focused quality 重新确认 13 条均为非目标 Records；没有第二次 default Gate、`--all`、真实 benchmark 或 full workload。
