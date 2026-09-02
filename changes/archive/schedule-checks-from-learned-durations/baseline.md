# Static-policy workload baseline

## Scope and status

This is the **before** evidence for Readiness 0.3 of
`schedule-checks-from-learned-durations`. It records the Gate's static scheduler
policy **at capture time** only: `maxParallel: 3`, effective `admissionPriority: 0`,
and no learned-history implementation. It is historical same-host evidence, not a
description of the current Gate, a performance budget, or a claim that the final
learned/static A/B acceptance had then passed.

The required and full workloads were warmed once each and then measured in five
sequential, interleaved `required → full` groups. All ten accepted invocations
passed with exit 0. The earlier attempted measurement directory
`.log/project-gate/schedule-checks-from-learned-durations-static-baseline-20260902T0746Z/`
contains only a shell-tool absence before any Gate invocation and is excluded.

**Readiness conclusion at capture time:** this supplied the then-current static evidence and a
reproducible A/B entrance required by 0.3. By itself it did **not** satisfy task
1.8 or authorize a learned policy; the final implementation and paired evidence are now recorded in
[`acceptance.md`](acceptance.md).

**Relationship to final adoption:** this document remains the pre-implementation static reference. The final, adopted
static/learned comparison is owned by [`acceptance.md`](acceptance.md); do not combine its later candidate, fingerprints,
or samples with this baseline, and do not reuse either document as a cross-host timing budget.

## Reproducibility and comparability contract

| Fact | Value |
| --- | --- |
| Repository / `HEAD` | `/home/dev/.codex/worktrees/4a40/vibe-check` / `0ec422cb1899ad6840e5b4a24a1cd70938c57e7f` (detached) |
| Worktree fingerprint | status `a0d516743b77d85397265bbe954bac84ead436a4dfe8bb928ea0ea07c2daac33`; tracked diff `eb5c3962bc6c58523aec4fba816b85a8c4d62082b39801a770775466fa3d47a5`; untracked content `ed70f9724230a43ddd9c7bb35b16ed1b1e5c506b6a8ed8571a0bfe2ee0c44f32` |
| Candidate | local `0.0.0-local.81bc43fc5f12`; input fingerprint `81bc43fc5f12708f4712862fc5726e65f5ff5634057adb39bac67e355f15668a`; preparation-receipt SHA-256 `71d2f715b433d5578a3eaf5d5ee301dabb79af5ca0f5a33101862e166b7dd966` |
| Candidate reuse | `mise exec -- bun scripts/package/command.ts status` was `current` before and after. Every accepted Gate transcript reports the same local candidate and `not comparable (no matching baseline)`, rather than `candidate was not reused`; the latter is the Gate's reuse guard. |
| Runtime | Bun `1.3.14`; Node `v26.7.0`; mise `2026.7.5 linux-x64 (2026-07-09)`; Linux `6.18.33.2-microsoft-standard-WSL2`, `x86_64` |
| Captured static Definition | Root scheduler `{ maxParallel: 3 }`; no non-zero admission priority |
| Formal commands | `bun run verify:vibe-check-workspace:required` and `bun run verify:vibe-check-workspace:full` |
| Timing method | Bash monotonic wall around the complete formal command; Product diagnostic `scheduler.summary` and the Gate's `elapsed-to-initial-result` are recorded separately. |
| Evidence root | `.log/project-gate/schedule-checks-from-learned-durations-static-baseline-20260902T0834Z/` (ignored local evidence; `metrics.json`, `*.meta`, `*.console.log`, `*.wall-seconds`, and each Gate directory are retained). |

The before/after capture differs only in capture timestamp and omitted repeated
runtime-description lines; `HEAD`, all three worktree fingerprints, candidate
receipt/version/input fingerprint, and candidate status were unchanged. This
makes the ten samples mutually comparable despite normal local timing noise.

## Workload membership and terminal facts

Both profiles had the same 36 configured Check IDs and the same machine
`recordsFingerprint` in every sample:
`check-record/v2/records/sha256:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`.

- **required:** 30 passed, 3 not-applicable
  (`prepared-external-package-consumer`, `tests-package-artifact`,
  `tests-package-candidate`, all `tag-package-tests-not-enabled`), and 3
  unavailable consumer dependents (`dependency-not-passed`). Terminal-outcome
  signature: `a87b1bf6441aaa516db2410d0346dbc3304bbd633bfa39330640f392fb789cbf`.
  The Scheduler admitted 33 Tasks in every sample.
- **full:** 36 passed. Terminal-outcome signature:
  `9726cab27997252620e5e71960ebce53ea013a1ed25845c1ce3d1f8222ca3dbf`.
  The Scheduler admitted 36 Tasks in every sample.

All Product summaries report `timing.availability="available"`,
`discrete.maxRunning=3`, and `discrete.lastSettledTaskId="markdown-link-validation"`.

## Admission traces

The following admission sequences were identical across the five samples of
the respective profile. Their SHA-256 signatures are recorded so final A/B
work can distinguish a membership/outcome match from a scheduling-order
change: required
`ef718f5294a67d3beaa17e4a8519653355103255f7d22b61252afe5d866f40a4`; full
`145709ada84ff489f488d8c1de7b34db87c6bb5f37be2ff3731064398d7f063b`.

<details>
<summary>required (33 admitted Tasks)</summary>

```text
typecheck-product → lint-product → typecheck-scripts → lint-scripts → format-check → prepared-package-candidate → prepared-external-package-consumer → tests-package-supporting → tests-package-candidate → tests-package-artifact → tests-product-duplicate-detection → tests-product-file-metrics → tests-product-function-metrics → tests-product-json → tests-product-markdown-links → tests-product-supporting-checks → tests-product-runtime → tests-scripts-project → tests-scripts-test-evidence → tests-scripts-validation → tests-scripts-tooling → duplicate-detection → file-metrics → function-metrics → markdown-link-validation → docs-json-validator → docs-links-validator → decision-records → docs-schema-validator → docs-example-validator → test-evidence → test-evidence-rule-tests → git-diff-whitespace
```
</details>

<details>
<summary>full (36 admitted Tasks)</summary>

```text
typecheck-product → lint-product → typecheck-scripts → lint-scripts → format-check → prepared-package-candidate → prepared-external-package-consumer → tests-package-supporting → tests-package-artifact → tests-package-candidate → tests-package-consumer-types → tests-package-consumer-docs → tests-package-consumer-runtime → tests-product-duplicate-detection → tests-product-file-metrics → tests-product-function-metrics → tests-product-json → tests-product-markdown-links → tests-product-supporting-checks → tests-product-runtime → tests-scripts-project → tests-scripts-test-evidence → tests-scripts-validation → tests-scripts-tooling → duplicate-detection → file-metrics → function-metrics → markdown-link-validation → docs-json-validator → docs-links-validator → decision-records → docs-schema-validator → docs-example-validator → test-evidence → test-evidence-rule-tests → git-diff-whitespace
```
</details>

## Warm-up and raw accepted samples

Warm-ups are excluded from statistics: required `10,302ms` at
`2026-09-02T08-33-46.172Z-2602061-c96089a7-a61a-42bc-ae12-27869ef2c0f6/`; full
`19,560ms` at
`2026-09-02T08-33-56.469Z-2603590-5bd1bb9f-a092-4142-983a-070f996a1536/`.

`wall` is the outer formal-command wall; `initial`, `span`, `tail`, `slots`,
and `accepted wait` are milliseconds from the Gate/Product observations;
`util.` is the Product root-slot utilization. Each `evidence` value is the
child directory of the evidence root above and contains `gate.log`, `run.json`,
`records.ndjson`, and the Product `run-*.log` admission trace and summary.

| Pair | Profile | Wall | Initial | Span | Util. | Tail | Slots | Accepted wait | Evidence |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | required | 16,077.0 | 15,732.9 | 14,980.517 | 0.912548 | 2,151.685 | 41,011.320 | 12,604.213 | `2026-09-02T08-34-16.306Z-2605613-ca85f54d-bbd1-4219-b6a8-def03a6c4e92/` |
| 1 | full | 19,387.0 | 19,081.8 | 18,351.631 | 0.950974 | 1,510.520 | 52,355.787 | 16,704.109 | `2026-09-02T08-34-32.304Z-2607293-50df5100-d2d3-401c-8523-b2c9a52f627b/` |
| 2 | required | 10,044.0 | 9,764.5 | 9,241.817 | 0.905234 | 1,477.862 | 25,098.019 | 7,662.172 | `2026-09-02T08-34-51.561Z-2609276-048b8729-8659-4bb9-9ba4-c55c56c24b05/` |
| 2 | full | 19,096.0 | 18,810.9 | 18,154.636 | 0.931181 | 1,969.834 | 50,715.760 | 16,059.172 | `2026-09-02T08-35-01.643Z-2610823-5355c5b0-386a-453f-8801-242d04f2c533/` |
| 3 | required | 13,855.0 | 13,520.4 | 12,896.971 | 0.907774 | 1,922.228 | 35,122.611 | 10,820.474 | `2026-09-02T08-35-20.855Z-2612936-92ca59e6-cead-47dd-ab54-2f3221c76df6/` |
| 3 | full | 19,125.0 | 18,787.2 | 18,078.827 | 0.949166 | 1,575.206 | 51,479.421 | 16,374.462 | `2026-09-02T08-35-34.750Z-2614557-d8b85774-7e93-4a95-bcde-cb23f3d5e3f3/` |
| 4 | required | 12,505.0 | 12,111.4 | 11,496.690 | 0.898888 | 2,061.346 | 31,002.697 | 9,279.230 | `2026-09-02T08-35-53.921Z-2616630-0757a76c-4fa0-4622-a66c-946b57132d83/` |
| 4 | full | 19,671.0 | 19,360.2 | 18,633.788 | 0.950383 | 1,513.505 | 53,127.707 | 16,976.824 | `2026-09-02T08-36-06.415Z-2618294-b6c0a1c6-6b7b-4b9c-af81-4c410d08d120/` |
| 5 | required | 10,760.0 | 10,487.9 | 9,951.401 | 0.906366 | 1,624.957 | 27,058.842 | 8,201.145 | `2026-09-02T08-36-25.956Z-2620349-b404ef90-9abf-4406-a136-89e0111ee6b8/` |
| 5 | full | 17,740.0 | 17,465.8 | 16,851.885 | 0.946296 | 1,505.604 | 47,840.596 | 15,207.360 | `2026-09-02T08-36-36.742Z-2621941-d9b19958-7e6c-41cb-ab82-7bb399ca2b08/` |

## Static baseline summary

`p90` uses nearest rank; `σ` is population standard deviation across the five
accepted observations. The required series has material local noise, so its
median and paired future deltas—not one observation—must drive a conclusion.

| Profile | Wall raw (ms) | Wall median / p90 / σ (ms) | Initial median / p90 (ms) | Span median (ms) | Root util. median | Tail median / p90 (ms) | Slot-ms median | Accepted-wait median |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| required | 16,077.0, 10,044.0, 13,855.0, 12,505.0, 10,760.0 | 12,505.0 / 16,077.0 / 2,171.7 | 12,111.4 / 15,732.9 | 11,496.690 | 0.906366 | 1,922.228 / 2,151.685 | 31,002.697 | 9,279.230 |
| full | 19,387.0, 19,096.0, 19,125.0, 19,671.0, 17,740.0 | 19,125.0 / 19,671.0 / 665.2 | 18,810.9 / 19,360.2 | 18,154.636 | 0.949166 | 1,513.505 / 1,969.834 | 51,479.421 | 16,374.462 |

The raw scheduler summaries retain further admission diagnostics, including
root-capacity and mutex-blocked task-ms, active pending time, scheduler control
path and diagnostic-observation cost, and the top admission-delay/tail
contributors. The final summary event in every Product log is the authoritative
source; `metrics.json` is only a mechanical extraction of it.

## At-capture final learned/static A/B procedure

At baseline capture, the final comparison was required to use the **same formal commands** above
from one unchanged worktree and one newly prepared exact candidate. Record its
`HEAD`, worktree hashes, receipt SHA, candidate version/input fingerprint,
runtime, Definition fingerprint, membership/outcome signatures, and reuse
status before measuring. Do not compare across candidate preparation, runtime,
membership, tag, capacity, or trace-log availability changes.

1. Prepare once, confirm `package freshness: current`, then run one warm-up for
   each `(profile, variant)` using that candidate. The warm-ups are excluded.
2. For each profile, collect five static/learned pairs and alternate order:
   `static→learned`, `learned→static`, `static→learned`,
   `learned→static`, `static→learned`. Interleave profiles within each group so
   ambient drift is not wholly assigned to one profile or variant.
3. Every measured invocation must use `bun run
   verify:vibe-check-workspace:<required|full>` and report reuse, the same
   candidate identity, matching task membership and terminal outcomes, and
   available scheduler timing. Preserve its full gate directory and record
   outer wall, `elapsed-to-initial-result`, `scheduler.summary`, ordered
   admission trace, ready-to-start/admission delay for the target long task,
   dependency/mutex wait, root/effective slot utilization, tail, and last
   settled Task.
4. Apply the active Decision's adoption rule only to those paired samples: the
   target ready-to-start delay must fall in at least four pairs; learned median
   wall must not increase for either profile; at least one profile's learned
   median must decrease; and membership/outcomes must match. Otherwise retain
   static Gate configuration and record the non-adoption reason.

No learned variant exists in this static baseline. Therefore this document itself
claims no static-versus-learned delta, target-delay improvement, or final policy
adoption; the subsequently completed comparison belongs only to
[`acceptance.md`](acceptance.md).
