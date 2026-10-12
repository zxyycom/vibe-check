# Product owner coverage

At `5cb448b23453edc90e02b25d003efd57dcdd3509`, 347 production files comprise Core 131, public entry 1,
Checks/shared 201 and Non-core tools 14. [source-inventory.json](source-inventory.json) owns membership, hashes,
exclusions and module-local notes; [delta-review.md](delta-review.md) records the 25 changed-file reviews.
The other 322 files reuse byte-identity-backed local analysis. Candidate call boundaries were separately rechecked.

| Owner | Files | Changed | Responsibility and current finding |
| --- | ---: | ---: | --- |
| `check` | 9 | 0 | Descriptor/options/identity snapshots; callback cost belongs to the caller. |
| `project-definition` | 16 | 1 | Authoring and inherited resolution: C01 resolved; C04 invalid-DAG expansion and C06 prefix work remain. |
| `project-run` | 81 | 9 | Invocation through scheduling/output: R01/R02/R03/R08 resolved; R04 partial; R05–R07/R09/R10 retain conditional costs. |
| `check-settlement` | 6 | 2 | Lifecycle/outcomes/Records: C02/C03 resolved; full payload and ordering costs remain. |
| `data-boundary` | 7 | 0 | Closed/canonical values, paths and file-region indexes: C05 dynamic keys; alias expansion and append rebuild have separate output/contract costs. |
| `machine-output` | 12 | 0 | Complete facts projection, fingerprint, serialization, validation and atomic publication; multiple payload-sized passes. |
| `public-entry` | 1 | 0 | Reexports only. |
| `package-checks/shared` | 27 | 1 | File collection, host, findings, authoring and strict JSON: K01 resolved; K02 deep prefixes remain. |
| `package-checks/command-check` | 5 | 0 | Prepare, environment, process transcript and result mapping; external command/callback cost is consumer-defined. |
| `package-checks/duplicate-detection` | 25 | 1 | Areas, exact inputs, fingerprint, scanner and findings: K04 resolved; K10 extra bytes and generalized K11 remain. |
| `package-checks/file-metrics` | 15 | 1 | Exact inputs, SCC batches, CSV and policies: K07 resolved; scanner and full result costs remain. |
| `package-checks/function-metrics` | 63 | 0 | Selection, Worker, analyzer and facts: 46 analyzer files use final deep review; A01–A04 remain, U-A01 partial, U-A02/U-A03 uncertain. |
| `package-checks/json-validation` | 6 | 0 | Strict read, duplicate-key checks and detached values have distinct obligations; external parser internals unreviewed. |
| `package-checks/json-schema-validation` | 12 | 0 | Schema references, compile, bindings and all-error normalization: K08 repeated instance reads remain. |
| `package-checks/maintenance-reminders` | 6 | 2 | History/base/prefix measurement: K06 successful overlap resolved; failed steps remain retryable. |
| `package-checks/markdown-link-validation` | 19 | 2 | Occurrences, live target checks, facts/anchors and optional cache: K05 resolved; K03/K09/K13 remain. |
| `package-checks/markdown-lint` | 12 | 1 | Safe reads, backend, findings and Records: K14 resolved; shared K03/K13 and uncertain K12 remain. |
| `package-checks/secret-detection` | 11 | 0 | Full selection/coverage, bounded scanner inputs and safe facts; coverage gaps are necessary output. |
| `package-tools/admission-policy` | 1 | 0 | Authoring/type-preserving helper; execution cost remains Core-owned. |
| `package-tools/cache` | 1 | 0 | Keyed JSON payload read/parse/compute/write, without whole-directory search; callbacks are trusted. |
| `package-tools/change-flag-debugging` | 1 | 0 | Collection, file-region index and formatting; actual dynamic-key consumer of C05. |
| `package-tools/finding-presentation` | 1 | 0 | Limited messages plus complete omitted-tail callback input. |
| `package-tools/finding-waivers` | 1 | 0 | Canonical identities, indexed reconciliation and complete audit: expected input-/identity-sized work. |
| `package-tools/learned-critical-path` | 9 | 5 | History, prediction, ranking, selection and recording: T01 resolved; T02 separates prepared and fallback paths. |

Production membership is unchanged from the prior inventory. Current exclusions are 259 TS test/type-test/support/declaration
files and 116 non-TS fixture materials; the prior ledger counted only 255 excluded TS files and predates four additions.
External scanner/parser algorithms, arbitrary callbacks and actual workload distributions are outside this coverage.
