# Current-baseline public Run R04 stage investigation

Status: method ready for freeze; formal timing requires main-thread explicit window. No optimization.

## Path and identity

- Repository source `/workspace/vibe-check/src/index.ts`; baseline HEAD at task start `44a49826c7a0ce73e20c65a17224a02c50c211be`; Plan-only deletion commit now `041037f61322fa1ecd279902805ec556aa2e0579`.
- Every 722 src file is SHA-256 identified; sorted lexical `{path,sha256}` JSON SHA-256 is `817a47c1ecfb19f12f74d5bac7ff55743b97e7aa4153a3c3d2db56d236129f0f`.
- `source-before.json` proves exact copy equality before instrumentation. `identity-prepared.json` and formal pre/post identity confirm same baseline inventory and exactly the three permitted copied-source edits.
- Instrumented source and collector remain outside the repository. Same cwd, explicit projectRoot, options, runtime, dependency symlink target; changes unconfigured, so neither path obtains Product Git inputs.

## Frozen workload and sampling

- Public `defineConfig` + complete `await run` API, simple passed callback and empty data; independent and sparse chain, N=8/32/128/512; static/maxParallel=1; machine/progress/diagnostics disabled, no terminalEffects.
- Import, defineConfig, collector reset, assertions, semantic hash and stdout excluded from run-only wall window. No output within timed Run. Failure captures wall boundary in finally and aborts the process; next Run starts only after reset.
- Each process 3 warmup Runs, then 9 batches; iterations/batch N8=10,N32=5,N128=1,N512=1. Four sequential processes/workload; independent B/I/I/B, chain I/B/B/I. No concurrent work in approved timing window.
- Explicit external watchdog: 60 seconds/process, TERM then 5-second KILL grace. Suggested entire-run watchdog 360 seconds. Harness 10-second per-Run bound is a post-return assertion, not a preemptive deadline.
- All warmup/sample Runs retained separately; formal summary excludes warmups and smoke. Every batch and individual Run retained. Main descriptive unit is 18 within-process batch means per variant (two processes x nine batches); each Run stage share is computed first, then batch averaged. Individual Runs are not independent inferential trials. Median, MAD and range only; no p95 or timing gate.

## Instrumentation and nonoverlap

- Inside `planStaticCheckGraph`, entry timestamp through completion of original frozen projection.
- Inside `prepareTaskGraph`, entry→normalization/catalog built→validation complete→original result/DTO freeze complete. Whole prepare is inclusive; three adjacent subintervals sum to that same inclusive span and are not added to it again.
- Successful configured public flow has four plan calls and four prepare calls; runtime requires 4/4 per Run. Ordinal responsibility from current static callsites:
  1. `invocation/run.ts:117`, `validateTaskGraph`, nested plan at 118; before `executePlannedInvocation`.
  2. `invocation/execution.ts:88`, `prepareAdmissionStrategy`, nested plan at 89; strategy provider sees validated DTO.
  3. `check-execution/resolved-checks.ts:71`, `executeResolvedChecks`, nested plan; before Check scope/callback work.
  4. `check-execution/scheduled-check-run.ts:53` plans graph passed to `runTaskGraph`; `task-scheduler/scheduler.ts:52` prepares that graph.
  This ordinal mapping is for this completed static workload, not all public failure/cancellation/custom branches. JS evaluates plan arguments before prepare entry, so plan/prepare spans are distinct.
- R04 per Run = sum 4 plan inclusive + sum 4 prepare inclusive. Then R04 share = that Run total / its own wall. Report distributions only after this per-Run construction, never sum independent medians.
- Scheduler state/setup directly brackets `createSchedulerState`; includes admission graph compile but is not a fifth `prepareTaskGraph`.
- Scheduler loop inclusive starts after initial reconcile+forced replay and ends after `buildTaskGraphRun`; includes real shell decisions/admission, awaited Check work, settlement, callbacks and result build. It is NOT pure R05, pure CPU or complete Scheduler wall.
- Unattributed per Run = wall − R04 − state/setup − coarse loop. It includes outer Run validation/normalization/invocation/finalization, observations/graph fingerprint, initial reconcile+forced replay, collector/timer overhead outside fixed spans, and other unmeasured gaps. Initial reconcile is not independently measured. Neither setup+loop nor residual may be mislabeled complete Scheduler/R05.
- Collector array recording happens after timestamps; no per-task/per-scope clock or stack sampling, no algorithm/result reuse, no scheduler measurement collector enabled.

## Semantics, disturbance and evidence

- Each Run requires completed/passed, canonical ID order, N passed Checks, zero Records/messages/warnings, all four outputs disabled and diagnostic channels disabled/null; all duration IDs/count and finite nonnegative availability checked.
- Snapshot SHA, declarativeFingerprint, and full completed-result signature must stay stable within process and match all four processes/workload. Only `checkDurations[].durationMs` replaced with finite-nonnegative marker; not a byte equality claim for durations.
- Interleaved original Run vs instrumented wall distributions estimate observational disturbance. No subtraction/correction of stage shares. Very small spans inherit clock/recorder/JIT/GC scheduling uncertainty.
- No CPU, allocation, peak-memory or optimization benefit claimed. Coarse loop only motivates later R05 isolation.
- Initial two failed setup explorations: ambiguous exact source replacement anchor aborted the copy generator before graph edit; restored the one copied plan file then corrected anchor. Locale-aware sort first gave wrong manifest ordering; replaced with default lexical ordering and verified expected baseline. Strict typecheck rejected absolute `.ts` type import under rewrite setting, resolved with standard `.js` type resolution. Initial lint found Object.values heterogeneous fallback `any` and a useless initializer; replaced with typed explicit fields. No source rule relaxed or lint directive added.

## Reproduction and lifecycle

1. Make a fresh `/tmp/vibe-check-r04-profile-*` root; copy the seven TS scripts and runner into it. Copy current src and package.json into child `instrumented/`; symlink existing unchanged node_modules to root and instrumented root. Root package.json must contain `{"type":"module"}`.
2. Check baseline source SHA; `mise exec -- bun run <root>/source-identity.ts` establishes pre-instrument equality. `mise exec -- bun run <root>/instrument-copy.ts`, then locked Oxfmt on three copied-source paths reproduces exact instrumentation. Recipe anchors intentionally fail on source drift. `instrumented.patch` retains final source diff; do not apply it to repository.
3. `validation-config.ts` copies unchanged complete implementation lint rule policy to exact profiling scope; strict project-derived noEmit config uses no incremental output, absolute @types root. Run locked tsgo, 127-rule Oxlint type-aware/no-ignore/deny-warnings, and Oxfmt --check. No rule weakening.
4. Main-thread approved isolated timing window: capture `formal-before` identity, `timeout --signal=TERM --kill-after=5s 360s bash <root>/run-formal.sh`, capture `formal-after` identity, then `bun run <root>/summarize-profile.ts`.
5. Retain scripts, patch, manifests, protocol, raw outputs and summary for main-thread archival. Source copy/dependency symlinks are reproducible temporary execution material, not formal repository additions. Exact cleanup target after archival audit: `/tmp/vibe-check-r04-profile-F7GWnj` only. No cleanup performed by this agent.
