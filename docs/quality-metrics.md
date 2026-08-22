# Quality Metrics

本文拥有 Check、supplemental Record 与 explicit Check aggregation 的事实语义。用 [Configuration](configuration.md) author Check/Run，用 [Output](output.md)读取 machine DTO，用 [脚本工具](script-tooling.md#project-gate)处理 repository Gate adapter；本页不拥有 scanner command 配置、machine bytes、CLI 参数、generic task engine、typed dependency reader 或 human presentation grammar。

## Check and Record facts

Product validates and flattens the recursive Check tree, then Core records one fact for every executable Check. Each has exactly one terminal outcome:

| `outcome.status` | Meaning                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `passed`         | The Check completed its own quality conclusion and includes canonical final `data`.                      |
| `failed`         | The Check completed its own quality conclusion and includes canonical final `data`.                      |
| `not-applicable` | The Check intentionally had no work; a reason code is optional and no final data is fabricated.          |
| `unavailable`    | Product could not supply a normal conclusion; `reason.code` is required and no final data is fabricated. |

`passed`、`failed` 和 `not-applicable` satisfy a dependent Check's prerequisite. `unavailable` blocks dependent user work and identifies blocked IDs with `reason: { code: "prerequisite-unavailable", checkIds }`.

A callback receives a Check-owned reporter, not a Core capability. It may submit zero or more supplemental facts with:

```ts
records.report({ id: "sample:health" }, { latencyMs: 820, statusCode: 503 });
```

`id` is non-empty and unique only within the owning Check. Product makes `{ checkId, id }` the structural Core identity; distinct Checks may reuse the same local ID. Product validates final data and Record data through the same descriptor-based canonical JSON boundary. A Core snapshot guarantees only detached, null-prototype, deep-frozen data; it does not promise that JavaScript `Object.keys` enumerates integer-like keys in lexical order. Canonical text, UTF-8 bytes, and fingerprints instead apply recursive `compareText` ordering explicitly during serialization or comparison. The boundary does not invoke getters or `toJSON`. Root data must be a non-array object. Product rejects unsupported descriptors, prototypes, cycles, sparse arrays and non-finite values, but never validates Check-local fields, unions, sensitive-content policy or business semantics.

Record absence, presence, count and data never determine the Check status. Invalid final data, invalid/duplicate Record identity or data, callback throw, and Product protocol failure contain only the owning Check as unavailable; previously accepted Records remain and unrelated Checks continue. A reporter is closed after callback settlement, so late writes throw and cannot mutate frozen facts.

Completed/effect Run results provide generic readback of canonical Checks and Records. Consumers that need to interpret a Check's data own their parser and domain contract; Product does not add a data generic, catalog, schema, extractor or presentation fallback.

## Direct defaults and exact inputs

The default Checks are `duplicate-detection`, `file-metrics`, and `function-metrics`. Their direct callbacks own scanner options, operate only on Product-approved exact input paths, and report Records only when detailed findings are supplemental to their final threshold result. Adapter availability, process, parser, cache, or scope failures settle the owning Check as unavailable rather than create a parallel quality model. See [Scanner dependencies](scanner-dependencies.md) for this private adapter boundary.

The three Check results use the same four-state grammar as a custom callback. Their options influence only their own metric semantics and scanner execution; aggregation configuration and output presentation stay outside those Check options.

## Explicit aggregation and repository Gate mapping

Multi-Check aggregation is a per-invocation derived result, not a Core status or implicit quality policy. A caller that wants one must explicitly configure `RunControls.checkAggregation` with selected Checks, `all | any` mode, unavailable handling, not-applicable handling and empty-set handling. Selection is validated before work; `"all"` selects all normalized Checks, while an explicit ID list can select a repository Gate eligibility set without hiding excluded raw facts.

Run evaluates configured aggregation only from selected settled Check statuses and returns one minimal `aggregate`: `passed | failed | not-applicable | unavailable`. With no aggregation configuration, `RunResultFacts.aggregate` is `null`. Aggregate does not copy evidence and does not consume Records, definition warnings, effects, output, presentation or arbitrary final data.

Repository Gate required/full binds its own eligibility selection to an explicit aggregation config, reads `RunResult.aggregate`, and separately maps configuration/run/effect facts to process exit `0`, `1` or `2`. Its adapter does not traverse snapshot Checks to reconstruct a quality conclusion. This explicit aggregation is the shared conclusion boundary; it is not replaced by a dependent Check or a CLI-local reducer.

## Verification

Current evidence covers recursive Definition validation, direct callback four-state outcomes, canonical final/Record data, Core ownership and terminal closure, prerequisites/cancellation, explicit aggregation, default-scanner exact scope/cache behavior, and repository Gate exit mapping. Exact machine schema/example/publication evidence is documented in [Output](output.md) and the current Case catalog in [Testing](testing.md).
