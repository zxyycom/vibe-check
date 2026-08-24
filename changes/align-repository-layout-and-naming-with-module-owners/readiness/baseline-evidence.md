# Readiness Baseline Evidence

本文件固定 repository layout/naming 迁移前的可对照事实。它记录摘要与 digest，不把 ignored 大型日志、credential、环境变量或本地绝对安装状态当作可移植证据。

## Capture

| Field | Value |
| --- | --- |
| Captured at | `2026-08-24T02:27:01Z` |
| Baseline commit | `ddc83dd3c4b620fea561a77b7176d3d27972486f` |
| Branch | `main` |
| Bun | `1.3.14` |
| mise | `2026.7.5` |
| Pinned Node reported by mise | `24.18.0` |
| Local raw summary directory | `.log/layout-readiness/2026-08-24T-readiness-1121527/` |
| Full Gate invocation log | `.log/project-gate/2026-08-24T02-27-25.806Z-1122866-44408150-5384-4ad4-9028-29069b1755ff/` |

Ambient `node --version` reported `v26.7.0`, but repository tooling resolved the pinned Node `24.18.0` through mise. The ambient binary is not accepted as Product host evidence and did not replace the locked Gate environment.

## Import Graph

The baseline graph excludes `*.test.ts`, `*.test-support.ts`, declarations and type-only import/export statements. It resolves tracked relative TypeScript imports and records dynamic literal imports.

| Root | Production modules | Value-import edges | Cyclic SCCs |
| --- | ---: | ---: | ---: |
| `src/product` | 114 | 206 | 0 |
| `scripts` | 88 | 152 | 0 |

`src/product/** -> scripts/**` value-import edges: **0**. The complete cross-owner edge summaries are in the local `import-graph.json`; migration verification must regenerate the same graph against target owners rather than trust this one-time parser as a permanent checker.

## Public Package Inventory

Approved runtime exports, sorted:

```text
defineCheck
defineConfig
duplicateDetection
fileMetrics
functionMetrics
inherit
run
```

The exact installed candidate exported the same seven names.

Approved public named types, sorted:

```text
Check
CheckAggregate
CheckAggregation
CheckExecution
CheckExecutionContext
CheckOutcome
CheckResult
CheckUnavailableReason
DuplicateDetectionOptions
FileMetricsOptions
FunctionMetricsOptions
InheritableCheckCollection
ProjectDefinition
ProjectEffects
ProjectQualityConfiguration
RunControls
RunResult
SchedulerPolicy
```

Effect defaults were captured from `CURRENT_PUBLIC_CONTRACT`: cache `.cache/vibe-check` enabled, output `artifacts/vibe-check` enabled, and progress enabled. These defaults must remain byte-for-byte equivalent after their owner moves to Definition.

## Exact Package Candidate

| Fact | Value |
| --- | --- |
| Version | `0.0.0-local.1057c5d542f0` |
| Reuse result | reused and re-audited |
| Input fingerprint | `1057c5d542f0453654c1702010659573394eb0331c8e5e8ae6d89fe82cfbeab7` |
| Tarball SHA-256 | `f467dc9aff1436fb8f4f37d4586a9e92a7fea26e3dd51d337d67d0879a5ea76e` |
| Receipt file count | 116 |
| Installed entry SHA-256 | `74a201506adf85dd2ef743f5a0525acb1e2af3ad2fbee43bc20c95618c1acb59` |

The current declaration root is `package/types/scripts/package-candidate/entry.d.ts`; this is a migration input, not the accepted target. Target acceptance must instead prove `src/index.ts` owns runtime build and declaration entry while preserving the runtime/type inventory above.

## Machine V4 Fixture Digests

| Fixture | `records.ndjson` SHA-256 | `run.json` SHA-256 |
| --- | --- | --- |
| `complete-failed-with-record` | `e8c63a589519eeabd32e0e81a49c94c3e916970967c82767a76e3b57b5392cfd` | `e4371223c91db2409a639dbeb291a8a4208e9d18bb68f62769d9ae7c8586f873` |
| `complete-passed` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `50f6cb09d0235c62829fc6ff71786e488e3a66cf8e2ab0e4c125a9fe6904f1ff` |
| `legitimate-empty` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `bd86c5467379fa2e094716901fa1da7b733999b8289f1182321b5d2eb3ddceb6` |
| `unavailable` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `a6c0fd031a26f266c6bf8fa263cf7bf13d9c345e85e1b39dd732db7164a806d9` |

## Quality Facts

`bun run quality` exited `0`; it is an observation command, so individual Check conclusions are recorded rather than converted into a root failure:

| Check | Outcome | Final fact |
| --- | --- | --- |
| `duplicate-detection` | passed | `findingCount: 0` |
| `file-metrics` | failed | `findingCount: 6` |
| `function-metrics` | failed | `findingCount: 35` |

Published quality artifacts:

- `artifacts/vibe-check-quality/run.json`: `319a5d6a47d5b3c8130bcb4f6b68b3afe424f51064831a000699992571e7357b`
- `artifacts/vibe-check-quality/records.ndjson`: `8eae25887ea3de6400247cc7a42145a1e5fc5933a52337af71fa85a42dc53cf6`
- Records fingerprint: `check-record/v2/records/sha256:0adc2d5e93fdd6628c3aa0f9df97d0a77f291d2e643b7bf9da7d335ad463f225`

Invocation ID and timestamp are intentionally excluded from equality assertions; migration comparison uses schema, Check/Record facts, canonical bytes for fixed fixtures, and controlled digests.

## Gate Results

| Command | Result |
| --- | --- |
| `bun run test-evidence -- check --root .` | passed: 158 current Bun entities mapped by 49 Cases across 10 topics |
| `bun scripts/package-candidate/prepare.ts` | passed: exact candidate reused and installed entry matched receipt |
| `bun run quality` | exited 0; facts recorded above |
| `bun run verify:vibe-check-workspace:full` | passed: 14/14 Checks, 0 failed, 0 unavailable |

The full Gate covered Product/scripts typecheck, format, current docs JSON/schema/examples/links, Product/scripts lint, Test Evidence rule tests, whitespace, Decision records, candidate-backed repository Package Run dogfood and semantic Case closure.

## Baseline Disposition

There are no unclassified baseline failures. The two failed quality metric Checks are expected Product facts from the non-blocking observation entry and are independently bounded by a passing full Project Gate. This baseline therefore permits Readiness to continue to the ledger and active-Change impact review; it does not authorize Implementation by itself.
