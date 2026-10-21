# Detection and lint upgrade evidence

## Baseline (2026-10-21 UTC)

- Source HEAD: `a36600da`; Bun `1.4.2`; ambient Node `v26.8.2` (not the Node 24 candidate acceptance).
- Installed baseline: csv-parse 7.0.1, markdownlint 0.41.1, jscpd 5.1.1, Oxlint 1.78.0, oxlint-tsgolint 7.0.2001.
- `bun test src/package-checks/markdown-lint src/package-checks/duplicate-detection src/package-checks/file-metrics`: 54 pass / 1 existing failure, recorded in `detection-tests-before.txt`.
- Failure: `default Check direct callbacks > detects project-relative duplicates through the public Check and fails the default strict aggregate`, `src/package-checks/duplicate-detection/constructor.test.ts:102`. Actual status is failed and counts are 1/1; `assert.deepEqual` rejects the snapshot's required null-prototype data against an ordinary-object expectation. The Check settlement owner explicitly requires null-prototype data. This is not a scanner/count failure. A direct control confirmed Bun 1.3.14 accepts a null-prototype-vs-ordinary `deepEqual`, while ambient Bun 1.4.2 rejects it; the observed failure is therefore ambient-runtime-sensitive, not a demonstrated failure under the project pin. The parser-based correction removes that irrelevant prototype coupling without changing the expected counts.
- Before installation, after correcting only the canonical-data test assertion, pinned `mise exec -- bun test src/package-checks/markdown-lint src/package-checks/duplicate-detection src/package-checks/file-metrics` passed 55/55 under Bun `1.3.14` / Node `24.18.0`. Pinned `mise exec -- bun run lint -- product` and `mise exec -- bun run lint -- scripts` both exited 0; Oxlint was still 1.78.0 before and after this sequence.
- `bun run lint -- product` and `bun run lint -- scripts`: exit 0, no diagnostics. `oxlint-config-before.json` is the effective `oxlint --print-config` output.

## Frozen comparison method

`detection-comparison.ts` calls the actual Product adapters, not a copied parser/configuration. Run from repository root with `bun changes/upgrade-detection-dependencies/evidence/detection-comparison.ts`. Its deterministic inputs cover all nine Markdown rules, reversed links, missing ATX spacing, case/Unicode/custom-id fragments, YAML/TOML/JSON/malformed front matter and a front matter/code-fence combination. Duplicate pairs cover TypeScript, TypeScript parser-diagnostic inputs (both malformed and clean-vs-malformed pairs), Markdown URL/comment-like text, Vue, JSON and embedded TypeScript fences. Each pair has a third identical but unapproved file; only exact `a`/`b` paths are passed. Minimum lines/tokens remain 3/20 throughout; no new modes are enabled. Outputs retain normalized paths, ranges, line/token counts and full backend findings.

CSV inputs exercise BOM, CRLF, quoted commas/quotes/newlines, blank lines, trim, unequal row widths and prototype-like values as ordinary array cells. SCC consumes the actual v4 header with a quoted provider path. The historical before/after JSON came from runs sharing one persistent Markdown cache across installation. The initial 0.42.0/v1 run missed the old 0.41.1/v1 entry; after the capability guard changed the contract to v2, the final run computed once and then reused the warm entry while both prior v1 entries remained present. The initial broken graph is not taken as a successful MD052 baseline.

`detection-before.json` preserves the old normalized outputs. The historical corpus, cache and logs in `.tmp/detection-lint-upgrade-baseline/` were removed after comparison. The current harness uses a fresh `mkdtemp` directory per invocation and removes only that directory in `finally`; a rerun proves clean computation followed by same-run warm reuse, not the historical cross-installation cache sequence. Historical JSON remains unchanged.

## Type-aware safe-call control

Before installation an isolated scratch fixture was linted with the root configuration copied verbatim except for file globs/ignore removal so that `.tmp` is in scope, and a scratch tsconfig extending the root compiler profile. `node:test` `describe`/`it`/`test` calls were exempt; an ordinary `Promise.resolve` call on line 6 produced exactly one `typescript(no-floating-promises)` error and exit 1. This is an engineering negative control, not a new Product test entity or rule. Scratch fixture source:

```ts
import { describe, it, test } from "node:test";
describe("known safe test callbacks", () => {
  it("safe it", async () => {});
  test("safe test", async () => {});
});
Promise.resolve("ordinary promise must not be exempt");
```

## Observed dependency changes

| Boundary | Old → new observation |
| --- | --- |
| CSV string matrices and SCC measurements | Frozen outputs identical, including all quoting/BOM/CRLF/empty-line inputs. |
| Markdown rules/ranges/front matter | Initially MD052 disappeared because of a transitive core-instance mismatch; see `markdownlint-core-identity.md`. Other frozen findings and ranges were unchanged. After alignment and the v2 capability guard, every frozen Markdown finding and range is identical to the old baseline (`detection-after.json`). |
| jscpd Markdown pair | One fragment stays at `a.md`/`b.md`, lines 1–6, lineCount 6; tokenCount changes 37 → 51. |
| jscpd Vue pair | One fragment stays in approved `a.vue`/`b.vue`; ranges 1–5 → 2–5, lineCount 5 → 4, tokenCount 61 → 46. |
| Other jscpd inputs | TS, malformed TS pairs, JSON and embedded fenced TypeScript outputs unchanged. The mixed `const invalid = ;` input remains empty in both versions; it does not establish behavior for every recoverable parse diagnostic. |
| Oxlint/tsgolint | Effective configuration is byte-identical before/after: SHA-256 `2e865e568cb04a7a89f18a11e907bf905858979dfb8b908aa6f925ffa57d82b6`; the negative control still reports only the ordinary promise on line 6, with unchanged code/severity/range. |

The observed Markdown-token and Vue-range changes correspond to upstream's removal of C-style comments from Markdown and exclusion of Vue wrapper tags from the source-ordered HTML stream. The Vue range can be independently checked against the four template content lines in the fixture. These are accepted measurement corrections, not threshold adjustments. The adapter still requests only exact matching and the same minimum 3 lines / 20 tokens in the comparison; no renamed/near-miss/semantic feature is enabled. [jscpd 5.2.0 release](https://github.com/kucherenko/jscpd/releases/tag/v5.2.0)

The new real-scanner test fixes both measurements and approved-path membership. Existing Check tests continue to own area thresholds, policy and waiver reconciliation; changed ranges can intentionally make an old exact waiver unused. This small frozen corpus does not establish unchanged Findings on arbitrary consumer projects or quantify performance.

Initial pinned owner execution had three genuine MD052 failures and one 5-second duplicate-constructor timeout under concurrent repository work. An isolated repeat of that constructor file passed 3/3 (longest 2.2 seconds); its timeout was not raised. Initial scripts lint found one newly detected `prefer-optional-chain` warning at `scripts/package/artifact/esm-module-specifiers.ts:198`; the compiler owner replaced the explicit undefined/length guard with the equivalent optional-chain comparison. The public scripts lint repeat exited 0. No severity, threshold, suppression, plugin or rule was changed.

## Consumer mixed-graph fail-closed completion

A root override alone cannot repair a consumer retaining an old transitive lock. Root therefore approved a small Product guard, not a copied parser: only the reference rule invokes a fixed public strings-API capability probe. One process-local Promise shares the observation, and direct lint plus cache lookup both require it. Missing capability uses the existing `backend-failed`; unrelated rules stay available and probe facts never enter project output. Cache contract v2 rejects older facts, including 0.42.0/v1 facts computed in the initial incompatible graph.

`reference-capability.test-support.ts` runs in a separately spawned Bun child. Its only backend fault injection replaces the public `markdownlint/promise` API with valid per-path empty arrays, reproducing the actual mixed-core symptom without modifying node_modules or using upstream private paths. The parent first creates a real, trusted v2 reference cache and confirms warm reuse. The child then proves direct/concurrent calls, cold cache, that existing warm cache and the Check outcome fail closed with no project Records; two unrelated-rule calls (before and after probe failure) still succeed. Exactly three backend calls are observed: two ordinary non-reference calls and one shared probe. This test was added after the full-tree registration check had passed at 765 entities/189 Cases; the new full-tree check passed at 766/190.

Final pinned commands after the guard: owner tests 58/58; Product typecheck exit 0; Product lint exit 0; materials validation exit 0 (496 strict JSON files, five schemas, current/historical examples and 599 Markdown files); Test Evidence 766 entities/190 semantic Cases. A final local repeat of the five findings-cache tests also passed after strengthening the non-reference-after-failure control. Full Gate, fresh Node24 candidate and platform distribution acceptance remain the root/integration owner's final validation, not claims from this local corpus.

Final closure also verified `mise exec -- bun run lint -- scripts` (exit 0 after the type-fixture owner consumed its negative-control promises with `await`), `mise exec -- bun run format -- check` (all 987 matched files formatted), and the last Test Evidence registration after the isolated-child test update (766/190). `git diff --check` is clean for the affected owner paths. No Git staging, commit, publication or Change finalization was performed.

## First complete Gate and test-owner split

Root reported the first complete Gate at 42/43, with candidate `0.0.0-local.2b1720941546`; its installed types/docs/runtime acceptance passed. The sole blocking result was file-metrics: `src/package-checks/duplicate-detection/jscpd/scanner.test.ts` had 320 code lines against the existing maximum of 300. This was not a completed passing Gate.

The real Markdown/Vue measurement matrix was moved, unchanged, into `src/package-checks/duplicate-detection/jscpd/scanner.measurement.test.ts`, under the suite `quality jscpd real language measurements`. The original file retains process failures, command/version provenance and basic normalization; the new file owns the real-language golden measurements and exact membership. All input text, 3/20 line/token thresholds, expected counts/ranges and assertions remain unchanged. No threshold, policy, waiver or dependency was changed. The existing `AUX-JSCPD-ADAPTER-OUTCOMES-001` Case is retained; only that entity's file/suite identity was updated.

Before and after this move, the full registration check passed at 766 entities/190 Cases. Local pinned verification passed: all 10 jscpd tests across three files; public format check on 988 matched files; materials validation (496 JSON files, five schemas, current/historical examples and 601 Markdown files); local diff whitespace check. Direct SCC measurement using the existing by-file CSV protocol reports 247 code lines in the original scanner test and 82 in the new measurement test, both below the unchanged 300 maximum. The complete Gate and candidate must be rerun by root after this split; they are not claimed passed here. No temporary files were created for this follow-up.
