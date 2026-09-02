# Scheduler diagnostics before workload

## Valid readiness-adjusted preimplementation baseline

This is frozen before evidence for Readiness 0.3 of
`add-scheduler-performance-diagnostics`; it is not a current-runtime owner. It measures the existing
Scheduler before any `src/**` implementation from this Change was applied. The workload was run in an isolated
preimplementation tree: baseline commit `9c0171243136bf72888be60999b8d8e5fb1aba34` plus
only the governance-readiness patch documented below. It is an observation, not a
performance budget, bottleneck attribution, or expected optimization result.

## Reproducibility contract

- **Source base:** detached `9c0171243136bf72888be60999b8d8e5fb1aba34`.
- **Readiness patch SHA-256:**
  `3d3c0d75d7bfe654061b298a5e618724be209934d01453f50d4b6319f51fb92`.
  It was generated from the shared worktree relative to that `HEAD`, applied with
  `git apply`, and contained only these explicit governance paths:
  - `changes/add-scheduler-performance-diagnostics/.change-plan.json`
  - `changes/add-scheduler-performance-diagnostics/baseline.md`
  - `changes/add-scheduler-performance-diagnostics/design.md`
  - `changes/add-scheduler-performance-diagnostics/proposal.md`
  - `changes/add-scheduler-performance-diagnostics/tasks.md`
  - `docs/change-execution-order.md`
  - `docs/decisions/add-invocation-local-scheduler-performance-summary.md`
  - `docs/decisions/decision-index.json`
  No `src/**`, `scripts/**`, or other stable-document implementation diff was in the
  patch. The `baseline.md` file then present is included for exact patch provenance; this
  file was subsequently replaced with the measured result below.
- **Pre-Gate governance evidence:** in the patched detached tree,
  `bun run decisions -- check`,
  `bun run change-plan -- check changes/add-scheduler-performance-diagnostics`, and
  `bun run validate -- docs links` all passed (`markdown links ok: 289 file(s)`).
- **Candidate:** local source; preparatory
  `mise exec -- bun scripts/package/command.ts build` rebuilt the candidate because the
  temporary receipt was missing, then `bun scripts/package/command.ts status` reported
  `0.0.0-local.a21f6e66bd9d` as current. The formal Gate reported candidate source
  `local`; it does not serialize its own preparation action.
- **Command:** `mise exec -- bun scripts/project/gate/run.ts --profile required`
  (the formal Project Gate root entry). No tag overrides; package acceptance was not
  selected.
- **Diagnostic logging:** enabled by the standard Gate output override. Every sample
  produced one Product `run-*.log` diagnostic file.
- **Wall timing:** Bash `time` builtin around the complete command, sequentially.
- **Environment:** Bun `1.3.14`; mise `2026.7.5 linux-x64 (2026-07-09)`; Ubuntu 26.04
  LTS; Linux `6.18.33.2-microsoft-standard-WSL2`; `x86_64`.
- **Definition fingerprint:** **unavailable.** The formal Gate's persisted artifacts do
  not expose Product `declarativeFingerprint`; the machine `recordsFingerprint` below is
  not substituted for it.

## Matching workload facts

All three samples had the same 36 Task IDs:
`decision-records`, `docs-example-validator`, `docs-json-validator`,
`docs-links-validator`, `docs-schema-validator`, `duplicate-detection`, `file-metrics`,
`format-check`, `function-metrics`, `git-diff-whitespace`, `lint-product`,
`lint-scripts`, `markdown-link-validation`, `prepared-external-package-consumer`,
`prepared-package-candidate`, `test-evidence`, `test-evidence-rule-tests`,
`tests-package-artifact`, `tests-package-candidate`, `tests-package-consumer-docs`,
`tests-package-consumer-runtime`, `tests-package-consumer-types`,
`tests-package-supporting`, `tests-product-duplicate-detection`,
`tests-product-file-metrics`, `tests-product-function-metrics`,
`tests-product-json`, `tests-product-markdown-links`, `tests-product-runtime`,
`tests-product-supporting-checks`, `tests-scripts-project`,
`tests-scripts-test-evidence`, `tests-scripts-tooling`, `tests-scripts-validation`,
`typecheck-product`, and `typecheck-scripts`.

Terminal outcomes were identical: 30 `passed`; the three package-acceptance Tasks
`not-applicable` (`tag-package-tests-not-enabled`); and
`tests-package-consumer-docs`, `tests-package-consumer-runtime`, and
`tests-package-consumer-types` `unavailable` (`dependency-not-passed`). Despite these
not-selected package Tasks, every Gate overall result was `passed` with process exit 0.
The shared terminal-outcome signature was
`a46fa270ecf1117301cad44cfab9590260bc9a2ba4f8a31d578aa93e76449660`.

Each Product diagnostic log contains 70 `scheduler.decision` observations and no
`scheduler.summary`, as expected before this Change. All three machine records
fingerprints matched:
`check-record/v2/records/sha256:d3b105ab96b457feec9f80c680993b9600fb7976267d578f0bb1492869f88290`.
This is only an additional workload-matching signal.

## Accepted raw samples

The invocation directories below were moved from the temporary worktree into the ignored
shared `.log/project-gate/` evidence root before cleanup; they are not added to Git.
`Product diagnostic bytes` is the relevant `run-*.log` size. `Gate elapsed` is the root
entry's own elapsed-to-initial-result observation and is recorded for traceability, not
substituted for external complete-command wall time.

| Sample | Wall (s) | Gate elapsed (ms) | Product diagnostic bytes | Gate log bytes | Raw evidence directory and Product diagnostic file |
| --- | ---: | ---: | ---: | ---: | --- |
| 1 | 16.371 | 16039.6 | 1,462,256 | 8,430 | `.log/project-gate/2026-09-01T16-29-51.774Z-1782133-0ee7edf6-2340-4c75-ac45-3bcaa766e4d3/` — `run-20260901T162951.873Z-378a0816-b335-4a2d-9e59-e95b43f0fb51.log` |
| 2 | 12.343 | 11999.7 | 1,461,399 | 8,424 | `.log/project-gate/2026-09-01T16-30-08.371Z-1786879-dee81137-09e4-4c2e-92bb-53908d9f274b/` — `run-20260901T163008.538Z-334db020-1bda-4c1b-8a27-035d25423d07.log` |
| 3 | 9.716 | 9441.8 | 1,461,399 | 8,429 | `.log/project-gate/2026-09-01T16-30-20.428Z-1788426-a5b5d4ae-5090-402b-96c9-305b60590757/` — `run-20260901T163020.520Z-cdcaf6ae-688f-4b4b-8921-4a20af9c6719.log` |

**Wall summary:** median **12.343 s**; range **9.716--16.371 s**. The spread is local
workstation noise. It makes no claim about an acceptable budget, an optimization benefit,
or the cause of the elapsed time.

## Excluded observations

The earlier shared-worktree failed samples and the first isolated run without the
readiness-governance patch are excluded. They do not satisfy the clean passed/exit-0
workload contract and must not be compared with this baseline.

# Scheduler diagnostics after workload and local comparison

## Supersession and frozen final implementation identity

This section supersedes the earlier after observation. Final code-style work changed the
Scheduler control-path timing, graph-ready sampling, and unavailable accepted-wait count
handling after that observation, so the earlier after patch and samples are not used for
this final comparison.

The final after runs used the same `HEAD`
`9c0171243136bf72888be60999b8d8e5fb1aba34`, Bun, mise, OS, formal required-Gate
command, no tag overrides, and diagnostic-enabled output configuration as the before
workload. At freeze, `git status --short` contained 18 tracked modifications and four
untracked files; the complete tracked/untracked patch relative to `HEAD` was captured at
`.log/project-gate/scheduler-performance-final-after-implementation-9c0171243136.patch`.
Its SHA-256 is
`dd0b96a6d6ccfd30d487de0491e9a594cfa1c73f8bf8cb8f864b6c3180572519`, and it was
byte-identical after all accepted samples and before this evidence was written.

The frozen patch file list was:

```text
changes/add-scheduler-performance-diagnostics/.change-plan.json
changes/add-scheduler-performance-diagnostics/baseline.md
changes/add-scheduler-performance-diagnostics/design.md
changes/add-scheduler-performance-diagnostics/proposal.md
changes/add-scheduler-performance-diagnostics/tasks.md
docs/api-mechanics.md
docs/architecture.md
docs/change-execution-order.md
docs/decisions/add-invocation-local-scheduler-performance-summary.md
docs/decisions/decision-index.json
docs/script-tooling.md
docs/testing.md
docs/testing/cases/quality-runtime.md
src/project-run/check-execution/resolved-checks.ts
src/project-run/invocation-creation.ts
src/project-run/invocation.ts
src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts
src/project-run/task-scheduler/execution-state.ts
src/project-run/task-scheduler/scheduler-performance-diagnostics.test.ts
src/project-run/task-scheduler/scheduler-performance-diagnostics.ts
src/project-run/task-scheduler/scheduler.ts
src/project-run/task-scheduler/task-engine.test-support.ts
```

The candidate was already current before sampling:
`0.0.0-local.b9c067123920`. All three formal Gate invocations used its current/reuse
path (the performance observation reported `no matching baseline`, not `candidate was
not reused`) and reported candidate source `local`.

## Accepted final-after samples

All accepted samples had the same 36 Task membership and terminal-outcome semantics as
the before samples: 30 `passed`, the same three package-acceptance Tasks
`not-applicable` (`tag-package-tests-not-enabled`), and the same three package-consumer
Tasks `unavailable` (`dependency-not-passed`). Every aggregate was `passed` with exit 0;
the terminal-outcome signature remained
`a46fa270ecf1117301cad44cfab9590260bc9a2ba4f8a31d578aa93e76449660`.

Each Product log has exactly 70 `scheduler.decision` events and exactly one
`scheduler.summary` event. The records fingerprint was identical across the three final
after samples:
`check-record/v2/records/sha256:19e805a95e63d4f7bdbd3d8fc91dcf2520154d3b13e5ad6265a45e0911f38aac`.

| Sample | Wall (s) | Gate elapsed (ms) | Product diagnostic bytes | Gate log bytes | `scheduler.summary` principal values | Raw evidence directory and Product diagnostic file |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | 10.265 | 10001.8 | 1,464,765 | 8,880 | span 9371.029 ms; control 75.573 ms; decision observation 93.452 ms; task slots 25336.141 ms; root/effective capacity 28113.088 ms; root/effective utilization 0.901222; accepted wait 7599.791 ms (30); max running 3; tail 1594.990 ms | `.log/project-gate/2026-09-01T16-58-08.441Z-1815593-f80bef14-7aad-4de4-978b-db974bceda8f/` — `run-20260901T165808.555Z-5d9e91bb-2cea-4793-bfbd-83fd6c4141e7.log` |
| 2 | 10.396 | 10123.9 | 1,464,760 | 8,881 | span 9574.735 ms; control 43.336 ms; decision observation 91.662 ms; task slots 25820.471 ms; root/effective capacity 28724.204 ms; root/effective utilization 0.898910; accepted wait 7716.987 ms (30); max running 3; tail 1719.931 ms | `.log/project-gate/2026-09-01T16-58-18.666Z-1816981-7b8155c3-6fd8-4cfb-acb9-de4eabc3af91/` — `run-20260901T165818.756Z-5718e2e1-dbe8-4b63-a935-39e5c0114329.log` |
| 3 | 9.943 | 9667.2 | 1,464,762 | 8,875 | span 9090.560 ms; control 39.679 ms; decision observation 87.256 ms; task slots 24927.084 ms; root/effective capacity 27271.681 ms; root/effective utilization 0.914028; accepted wait 7547.114 ms (30); max running 3; tail 1413.543 ms | `.log/project-gate/2026-09-01T16-58-29.077Z-1818350-53fba3db-8c34-4af1-a811-e3c5051cb221/` — `run-20260901T165829.201Z-8446555a-9910-4d6c-bb55-e1be2a804371.log` |

`lastSettledTaskId` was `markdown-link-validation` and `discrete.admittedCount` was 33
in every summary. All timing projections reported `timing.availability="available"`.

## Local advisory comparison

| Measure | Before median / range | Final-after median / range | Absolute median delta | Percent median delta |
| --- | --- | --- | ---: | ---: |
| Complete command wall time | 12.343 s / 9.716--16.371 s | 10.265 s / 9.943--10.396 s | -2.078 s | -16.835% |
| Product diagnostic log bytes | 1,461,399 / 1,461,399--1,462,256 | 1,464,762 / 1,464,760--1,464,765 | +3,363 | +0.230% |
| Gate log bytes | 8,429 / 8,424--8,430 | 8,880 / 8,875--8,881 | +451 | +5.351% |

These are same-host, three-sample advisory observations only. They do not establish a
performance budget, a causal observer-cost attribution, or a general improvement claim.
The summary values describe this invocation's Product-managed Task timeline; they do not
measure CPU, thread, or OS resource utilization.
