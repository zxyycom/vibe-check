# Readiness 0.5 — quality baseline and translated-only exception ledger

**Status:** baseline captured on 2026-09-02. This is Readiness evidence, not a stable tooling-policy owner.
For current policy, read `docs/script-tooling.md`; the historical “implementation must” wording below describes the
then-pending work and does not supersede the completed exact configuration.

## Scope and evidence boundary

The current active Change is
`isolate-lizard-typescript-port-boundary` (Plan, 1/18 at capture).  Its quality
profile must not treat `analyzer/**` as a homogeneous exemption.  The authoritative source-identity/provenance boundary is
[`licenses/lizard-1.23.0-provenance.json`](../../licenses/lizard-1.23.0-provenance.json):
36 unique translated `targetPath` values plus
`analyzer/extensions/protocol.ts` in `additionalTargetPaths`, for 37 translated
targets under `src/package-checks/function-metrics/analyzer/`. The profile
exception ledger is narrower than that closure: it excludes only paths with an
evidenced Gate finding. `protocol.ts` is translated and participates in the
37-target identity closure, but remains under ordinary Gate selection because
there is no evidenced exception for it. No test, fixture, Worker, Check,
measurement, target-file selector, future port façade, or Product adapter may
inherit a translated-only exception. This exact evidence-derived boundary,
rather than an `analyzer/**` glob, is the admission boundary.

The current `analyzer/source-identity.test.ts` still consumes identity material
from an archived Change.  That is an existing Readiness 0.3 / Implementation
1.5 migration obligation, not evidence that archive may become the quality
profile owner.  The present ledger and per-file source headers establish the
provenance basis for this baseline; the eventual profile must be retested
against the current evidence owner once that migration lands.

## Commands actually run

| Command | Result |
| --- | --- |
| `bun run lint -- product` | passed |
| `bun run format -- check` | passed; 628 matched files |
| `bun run typecheck` | passed (product and scripts) |
| `bun run verify:vibe-check-workspace:required` | passed; 30 passed, 3 intentional package-test `not-applicable`, and 3 dependent `unavailable` entries not selected for required aggregation |

The required Gate evidence is local to this invocation:
`.log/project-gate/2026-09-02T17-01-27.773Z-3142637-e02c3590-446b-488e-b944-598f5acead78/`.
Its `run.json` reports all three repository-quality Checks as `passed`, with
`blockingFindingCount: 0`: duplicate detection has 17 findings, file metrics
15, and function metrics 39.  They are advisory (`non-blocking`), not absent
or waived findings.  The complete, exact rows are in that invocation's
`records.ndjson`.

## Current selection and configuration-test entry points

At capture, all five relevant paths select the whole product TypeScript
surface:

| Consumer | Current product source selection | Existing configuration characterization |
| --- | --- | --- |
| product lint | `src` (only generated analyzer fixtures are ignored) | `scripts/development/quality-targets.test.ts` |
| format | `src/**/*.ts` (only generated analyzer fixtures are negated) | `scripts/development/quality-targets.test.ts` |
| Gate duplicate detection | `product-source.files.include = ["src/**/*.ts"]` | `scripts/project/gate/checks/repository-quality.test.ts` |
| Gate file metrics | `product-source.files.include = ["src/**/*.ts"]` | `scripts/project/gate/checks/repository-quality.test.ts` |
| Gate function metrics | `product-source.files.include = ["src/**/*.ts"]` | `scripts/project/gate/checks/repository-quality.test.ts` |

`scripts/project/gate/definition.ts` owns the three Gate declarations;
`scripts/project/gate/definition.test.ts` characterizes their required/full
membership and quality tag.  `scripts/development/lint.ts`,
`format.ts`, and `format-targets.ts` own development invocations.  The narrow
test commands for a future policy change are the two named test files above;
the required Gate already executes them through its script/tooling lanes.

## Baseline classification

The Gate records were filtered to findings whose every affected path is a
non-test file in the provenance-qualified set:

| Check | All findings | Qualified translated-production findings | Findings deliberately retained under normal coverage |
| --- | ---: | ---: | --- |
| duplicate detection | 17 | 2, both internal fragments in `readers/plsql.ts` | all 15 analyzer-test-involved findings |
| file metrics | 15 | 6 | 6 analyzer-test findings and 3 script-tooling findings |
| function metrics | 39 | 26 | 4 analyzer-test findings and 9 script-tooling findings |

Lint and format produced no finding or failure.  Therefore this audit defines
**no lint or format exception**: all qualified translations stay in the normal
development lint and formatting inputs.  Typechecking also remains over
`tsconfig.product.json`'s `src/**/*.ts` input (apart from the pre-existing
generated-fixture exclusion).

## Minimal closed Gate exception set

Each glob below is a shorthand only for the named, ledger-qualified paths. Completion encoded the exact expanded paths as
hardcoded arrays in `scripts/project/gate/definition.ts`; it did **not** export or derive runtime selection from the ledger.
The configuration test reads root provenance and each selected source header, and fails if an exact path is omitted, a
non-`translated` path is used, or header/provenance drift occurs. Brace expansion must not be used as a future-directory wildcard.

| Gate Check / rule | Exact glob(s) to exclude from that Check's `product-source` selection | Baseline fact and source-alignment reason | Mandatory upstream-sync review trigger |
| --- | --- | --- | --- |
| duplicate detection / duplicate-token comparison | `src/package-checks/function-metrics/analyzer/readers/plsql.ts` | Both qualifying fragments are internal PL/SQL reader state/preprocessing repetitions (83 and 84 tokens).  Splitting or abstracting them solely to remove a project duplicate finding risks changing source-ordered state behavior. | Any change to this module's ledger range/hash, its source header, the Lizard tag/revision, or a new/changed duplicate record for it. Re-evaluate the two exact fragments rather than carry the exclusion forward automatically. |
| file metrics / `code-lines` (300; including its low-decision allowance) | `src/package-checks/function-metrics/analyzer/core.ts`; `src/package-checks/function-metrics/analyzer/readers/{erlang,perl,typescript}.ts`; `src/package-checks/function-metrics/analyzer/shared/{clike,code-reader}.ts` | These are the six qualifying over-limit files (304–1150 code lines).  Their ledger ranges/source headers identify retained upstream analyzer, reader, or shared-state-machine structures; file splitting for a local length preference needs parity evidence, not a quality-metric-only refactor. | Any target path, source range/hash/header, upstream version, or file-metric value/limit change; inspect whether the changed upstream structure still requires the file-level exception. |
| function metrics / cyclomatic complexity and function-code-density (10 and 50 respectively) | `src/package-checks/function-metrics/analyzer/core.ts`; `src/package-checks/function-metrics/analyzer/readers/{erlang,fortran,php,plsql,python,r,st,typescript}.ts`; `src/package-checks/function-metrics/analyzer/shared/{clike,code-reader,js-style-regex,rubylike}.ts` | These 13 translated files account for all 26 qualifying records.  The flagged functions preserve upstream tokenizer/state-machine branch ordering and language-specific reader lifecycles; extracting or normalizing solely to satisfy project complexity/density thresholds needs identity/oracle proof first. | Any target path, source range/hash/header, upstream version, or function-metric record/threshold change; review every changed function against oracle/identity evidence before retaining an exclusion. |

There is no catch-all `analyzer/**`, `readers/**`, `shared/**`, or
`*.ts` exclusion.  The union above is minimal for this snapshot: removing any
listed path reintroduces an actual translated-production Gate finding; adding a
path would pre-exempt a file with no qualifying baseline record.

## Required preserved coverage and future configuration proof

The profile is a repository-quality selection exception only.  It must **not**
exclude TypeScript parse/type/build, runtime behavior, exact-input and resource
boundaries, import/public-surface boundary checks, source identity/oracle and
reader/extension behavior, provenance headers/ledger, license inventory, or
package evidence.  It is not a waiver and does not change the Gate's
non-blocking finding policy or failure/unavailable settlement.

The implementation configuration tests must prove all of the following:

1. Development lint and format retain their current complete `src` /
   `src/**/*.ts` inputs; they receive no translated-only exclusion from this
   audit.
2. Each Gate Check expands exactly its row above from the common
   ledger-qualified source set, while every other `src/**/*.ts` path remains
   selected for that Check.
3. Negative examples remain selected: current
   `analyzer/extensions/protocol.ts`, `analyzer-worker.ts`,
   `analyzer-worker-contract.ts`, `target-files.ts`, `measurement.ts`,
   `execution.ts`, all `*.test.ts`, and generated fixtures according to their
   existing owner.  The same assertions must cover the future hand-written
   port façade and `analyzer-adapter.ts` by their final paths.
4. A newly added analyzer file, a ledger status other than `translated`, or a
   target path without a matching ledger/header must fail closed instead of
   inheriting an exception. The exact hardcoded Gate lists are deliberately
   reviewed and updated only when evidence warrants it; they are not regenerated at runtime. Upstream synchronization must run the review
   triggers in the table and then rerun lint, format, typecheck, the two
   configuration tests, and required Gate.

## Readiness conclusion and remaining boundary

This is the smallest evidenced quality exception ledger for the current
snapshot: three Gate-only exclusion rules with 20 row-path instances across 14
distinct translated paths (one duplicate, six file-metric, and 13
function-metric paths); lint and format have zero new exceptions.  It is ready to guide Implementation 1.6,
but does not complete the separate current-evidence migration: the archived
identity-manifest read must be removed before claiming the completed profile
has a current source-identity owner.
