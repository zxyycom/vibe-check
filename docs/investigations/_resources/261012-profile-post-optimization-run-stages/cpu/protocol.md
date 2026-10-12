# Conditional whole-process CPU sampling

Approved only after the formal stage round showed N512 coarse loop predominance. Source and existing frozen TS/runner/patch unchanged before/after; identity-cpu-before/after and cpu/frozen-before/after-check record it.

For each of independent and chain N512, one uninstrumented baseline process executes the original frozen public-run-profile.ts with 3warmup+9samples×1, same cwd/projectRoot/static/maxParallel1/disabled outputs. CPU-profile context wall samples are separate in cpu/*stdout.json and MUST NOT enter formal stage summary.

Actual command shape:

```sh
timeout --signal=TERM --kill-after=5s 60s mise exec -- bun \
  --cpu-prof --cpu-prof-dir=/tmp/vibe-check-r04-profile-F7GWnj/cpu \
  --cpu-prof-name=<shape>-512.cpuprofile \
  run /tmp/vibe-check-r04-profile-F7GWnj/public-run-profile.ts \
  --mode baseline --shape <shape> --size 512 --warmups 3 --samples 9 --iterations 1
```

No interval override: locked Bun1.3.14 default1000us. Outer total150s watchdog. Both process/runner exit0; native profiles, stdout/stderr/exits and window metadata retained.

The native profile spans entire process: import, source-manifest hashing, defineConfig, assertions/digest, warmups, all Runs and JSON output. Sampling overhead is not measured as a benefit. Captured asynchronous/inlined ancestry may be incomplete; functions/frame attribution is descriptive. `self` counts each leaf once; `inclusive` includes descendants and nested percentages cannot be summed. Named R05-related observation union(snapshotSchedulerState/schedulerInspectionForCore/decisionContext plus nested blockers/capacity) counts each matching captured sample once; not total R05 or run-only time. Native freeze appears under multiple parent paths and cannot all be labeled R05. Delta-weighted observed intervals are approximate, not exact CPU milliseconds; no allocation or peak-memory measurement.

The offline summarize-cpu.ts validates unknown native JSON fields, unique IDs/tree links/samples/deltas and self partition; it preserves exact sourceFrame coordinates and leaf-to-root contexts. CPU/source/harness SHA and target definitions are in summary.json. Analyzer passes strict project-derived types, complete127-rule implementation lint, and Oxfmt with no exceptions. Re-running analyzer does not execute Product or collect further samples.
