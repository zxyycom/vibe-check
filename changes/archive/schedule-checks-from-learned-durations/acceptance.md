# Learned critical-path Gate acceptance

## Decision

**Adopt learned-critical-path for the repository Gate.** This file is the final
acceptance evidence for task 1.8 of `schedule-checks-from-learned-durations`.
It uses five interleaved static/learned pairs for each formal Gate profile,
with one exact reused package candidate, fixed root capacity, matching Check
membership/outcomes, and an explicit local history lifecycle. It supersedes no
Product contract and does not turn timing into a cross-host hard gate.

The accepted evidence meets every adoption condition from
`configure-project-gate-admission-priority-by-repeated-comparative-evidence`:

- `markdown-link-validation`'s scheduler-start-to-admission delay fell in all
  **5/5** required and **5/5** full pairs.
- learned wall median improved from **12,994.0ms to 11,510.0ms** for required
  and from **20,939.0ms to 17,872.0ms** for full; neither regressed.
- at least one profile improved (in fact both did).
- every accepted paired run had identical profile membership, terminal-outcome
  signature, machine records fingerprint, root capacity, and maximum running
  count for its static/learned counterpart.

## Evidence use boundary

This document owns the repository Gate adoption decision and the exact evidence behind it; the public Product contract is
owned by the README and the Configuration/Architecture/API-mechanics documents. Its timings are a same-worktree,
same-candidate, same-runtime observation, not a package performance promise, a cross-host budget, or a claim that every
future workload should enable learned scheduling. The ignored local evidence root below is retained for this capture's raw
metrics and traces; a future adoption or re-baseline must capture a new comparable dataset rather than append values here.

## Workload identity and temporary-variant control

| Fact | Value |
| --- | --- |
| Repository / `HEAD` | `/home/dev/.codex/worktrees/4a40/vibe-check` / `0ec422cb1899ad6840e5b4a24a1cd70938c57e7f` (detached) |
| Base worktree fingerprint | status `a85945cbee228a97d29125ed69d47d742a0d61a212a23d57651d06539b2dbb93`; tracked diff `286db141107d1d40e3a1b58f4cc9d3f1373dfdd3fbb444c4352adb094d37873b` |
| Runtime | Bun `1.3.14`; Node `v26.7.0`; mise `2026.7.5 linux-x64 (2026-07-09)`; Linux `6.18.33.2-microsoft-standard-WSL2`, `x86_64` |
| Exact candidate | local `0.0.0-local.0aa6c8c15451`; input fingerprint `0aa6c8c15451ab9f02c43efc8f0ae306c1d900b4e36ddfa98cfa2606905375ca`; receipt SHA-256 `f03235884d535d037bb93f8159e5ada7928c7db26642c7f60808c11ac38267e1` |
| Candidate handling | `mise exec -- bun scripts/package/command.ts build` reported `reuse (installation-current)` before sampling; status was current; each accepted Gate transcript reports that same local candidate and `no matching baseline`, not `candidate was not reused`. |
| Formal workload | `bun run verify:vibe-check-workspace:required` and `bun run verify:vibe-check-workspace:full`; sequential only; root `maxParallel: 3` |
| Static declarative fingerprint | `e200e184b4e81b52eac0bcf6186eff0c93a8d594de0356bd7c0ede86b15941bb` |
| Learned declarative fingerprint | `4a76afb8bedd38e01c3c4c5f9ddb716d49e3d0a5d4cb425059168cc8c9079141` |
| Local raw evidence | `.log/project-gate/schedule-checks-from-learned-durations-acceptance-20260902T0941Z/` (ignored; `metrics.json`, per-run `*.meta`, outer-wall files, console files, and every Gate directory) |

The only intentional tracked differences between variants were the final
configuration and its single direct assertion:

```ts
scheduler: {
  admissionPolicy: {
    kind: "learned-critical-path",
    stateDirectory: ".cache/vibe-check/scheduler-history"
  },
  maxParallel: 3
}
```

For static invocations the definition and
`scripts/project/gate/definition.test.ts` were restored from the same exact
static backups. For learned invocations both were changed together to assert
that exact policy/path, then `oxfmt` checked them. This prevents a variant
from being measured with a mismatched Gate test expectation. Package candidate
identity was unchanged by those script-only mutations.

## State lifecycle and model evidence

The explicitly authorized state path is
`.cache/vibe-check/scheduler-history/`. It was absent before sampling, is
already covered by the repository's ignored `.cache/` root, and contains only
Product-owned `scheduler-history.json`. It is a local cache-like state: remove
that directory to reset learning; no checkout or external state is needed.

- required learned warm-up: `scheduler.history.read` reported `MISSING`, then
  recorded 33 admitted Task samples and atomically stored 33 series.
- full learned warm-up loaded that state and extended it to 69 series.
- every accepted learned sample recorded and stored 33 (required) or 36 (full)
  admitted intervals; history diagnostics exposed model version,
  prediction digest, retained-series count, target score/estimate, and source
  without exposing identity inputs or raw options.
- after the final accepted pair, the state SHA-256 was
  `d18df22d139ef3eba3d453e55db5c07e2d50aac71881190da65578a49e5221ef`;
  model version was `scheduler-duration-model-v1`, with 69 series,
  observation sequence 450, and per-series sample counts 6 or 7.

One full learned attempt is excluded from timing statistics:
`pair-4-full-learned` at
`2026-09-02T09-49-52.517Z-2753444-74f1d5d6-fe8a-40e2-b3ca-1d8504a31b9d/`.
It failed an internal package-candidate test while Bun extracted a temporary
fixture tarball (`ENOENT` / receipt-input-mismatch), not a Scheduler, model,
configuration, or terminal-contract failure. Its immediately repeated
`learned → static` full pair passed and is the accepted pair 4. The failed Run
was nevertheless allowed to record real admitted intervals, as the Product
contract requires; no raw timing from that failed Gate contributes to the
comparison.

## Warm-ups and accepted samples

Four passing warm-ups are excluded from all statistics:

| Variant / profile | Outer wall | Gate evidence directory |
| --- | ---: | --- |
| static / required | 14,982ms | `2026-09-02T09-43-18.658Z-2712037-f5cae7a7-9519-4b26-98e7-90fea233be71/` |
| static / full | 27,572ms | `2026-09-02T09-43-36.274Z-2716028-287e85d0-af7a-47d8-9932-cadcb415cf91/` |
| learned / required | 14,304ms | `2026-09-02T09-44-07.036Z-2719362-c370b0e6-a21f-40a4-b2c7-5aa12cfb97ea/` |
| learned / full | 25,206ms | `2026-09-02T09-44-24.488Z-2724861-529b0a0b-eb4e-4267-a716-69d8ec2e98da/` |

Pairs 1, 3, and 5 use `static → learned`; pairs 2 and 4 use
`learned → static`. `wall` is complete formal-command wall; `initial` is the
Gate elapsed-to-initial-result observation; `target` is the Product diagnostic
scheduler-start-to-admission time for `markdown-link-validation`; `util.` and
`tail` come from `scheduler.summary`. All timing values are milliseconds.

| Pair | Profile | Static wall / initial / target / util. / tail | Learned wall / initial / target / util. / tail | Learned − static wall / target |
| ---: | --- | --- | --- | ---: |
| 1 | required | 12,994 / 12,677.4 / 7,401 / 0.914624 / 1,751.882 | 11,039 / 10,739.5 / 34 / 0.995470 / 21.469 | -1,955 / -7,367 |
| 2 | required | 17,719 / 17,409.8 / 8,956 / 0.873563 / 3,055.208 | 12,470 / 12,186.6 / 19 / 0.995177 / 30.258 | -5,249 / -8,937 |
| 3 | required | 17,495 / 17,096.4 / 9,758 / 0.907882 / 2,385.827 | 15,281 / 14,943.4 / 26 / 0.995475 / 45.311 | -2,214 / -9,732 |
| 4 | required | 10,724 / 10,446.5 / 5,939 / 0.892533 / 1,792.272 | 11,510 / 11,205.7 / 30 / 0.995291 / 22.818 | +786 / -5,909 |
| 5 | required | 10,808 / 10,517.3 / 6,316 / 0.904763 / 1,558.300 | 9,621 / 9,345.3 / 23 / 0.995568 / 23.515 | -1,187 / -6,293 |
| 1 | full | 18,880 / 18,571.5 / 13,297 / 0.942934 / 1,934.898 | 16,955 / 16,666.3 / 28 / 0.997643 / 22.329 | -1,925 / -13,269 |
| 2 | full | 21,101 / 20,795.1 / 12,690 / 0.883446 / 3,956.891 | 16,702 / 16,435.8 / 29 / 0.997792 / 22.396 | -4,399 / -12,661 |
| 3 | full | 21,796 / 21,494.6 / 15,963 / 0.948773 / 1,848.305 | 33,236 / 32,950.2 / 34 / 0.705803 / 6,129.462 | +11,440 / -15,929 |
| 4 | full | 20,939 / 20,647.1 / 15,883 / 0.947455 / 1,780.232 | 18,525 / 18,262.4 / 25 / 0.997978 / 20.184 | -2,414 / -15,858 |
| 5 | full | 17,959 / 17,684.5 / 13,288 / 0.948762 / 1,604.053 | 17,872 / 17,581.6 / 31 / 0.997842 / 30.114 | -87 / -13,257 |

## Aggregate evidence, traces, and outcomes

`p90` is nearest-rank and `σ` is population standard deviation over the five
accepted values. Full learned's valid 32.95s p90 observation is intentionally
retained rather than discarded; it makes the advisory range conservative.

| Profile / variant | Wall raw (ms) | Wall median / p90 / σ | Initial median / p90 | Target median / p90 | Root util. median | Tail median / p90 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| required / static | 12,994, 17,719, 17,495, 10,724, 10,808 | 12,994 / 17,719 / 3,097.3 | 12,677.4 / 17,409.8 | 7,401 / 9,758 | 0.904763 | 1,792.272 / 3,055.208 |
| required / learned | 11,039, 12,470, 15,281, 11,510, 9,621 | 11,510 / 15,281 / 1,887.2 | 11,205.7 / 14,943.4 | 26 / 34 | 0.995470 | 23.515 / 45.311 |
| full / static | 18,880, 21,101, 21,796, 20,939, 17,959 | 20,939 / 21,796 / 1,459.3 | 20,647.1 / 21,494.6 | 13,297 / 15,963 | 0.947455 | 1,848.305 / 3,956.891 |
| full / learned | 16,955, 16,702, 33,236, 18,525, 17,872 | 17,872 / 33,236 / 6,322.7 | 17,581.6 / 32,950.2 | 29 / 34 | 0.997792 | 22.396 / 6,129.462 |

Within each profile, every accepted static trace is stable:

- required: `ef718f5294a67d3beaa17e4a8519653355103255f7d22b61252afe5d866f40a4`
  (33 admitted Tasks).
- full: `145709ada84ff489f488d8c1de7b34db87c6bb5f37be2ff3731064398d7f063b`
  (36 admitted Tasks).

Learned trace signatures vary with rolling observations, as expected; each is
retained in that run's Product diagnostic log and `metrics.json`. Unlike the
static trace, learned admits the target nearly immediately and its final tail
is normally a different Task. This trace variation is not a membership or
outcome variation.

For all accepted required runs, 30 Checks passed, 3 were
`not-applicable` by the required profile's package-test tag, and 3 dependents
were unavailable; the terminal signature was
`a87b1bf6441aaa516db2410d0346dbc3304bbd633bfa39330640f392fb789cbf`. For
all accepted full runs, all 36 Checks passed; the terminal signature was
`9726cab27997252620e5e71960ebce53ea013a1ed25845c1ce3d1f8222ca3dbf`.
Every accepted run used records fingerprint
`check-record/v2/records/sha256:101f651338b3ead3f076486183620a8e4256d46ddf4854521ab3c05f76475e83`,
`timing.availability="available"`, and `discrete.maxRunning=3`.

## Adopted Gate baseline

The central Gate Definition now retains learned policy with the state path
above. `scripts/project/gate/runtime/performance-baseline.ts` is updated only
for this adopted learned fingerprint, using the five raw accepted
`elapsed-to-initial-result` values per profile:

| Profile | Samples (ms) | Median | p90 | Advisory threshold |
| --- | --- | ---: | ---: | ---: |
| required | 10,739.5, 12,186.6, 14,943.4, 11,205.7, 9,345.3 | 11,205.7 | 14,943.4 | 18,680 |
| full | 16,666.3, 16,435.8, 32,950.2, 18,262.4, 17,581.6 | 17,581.6 | 32,950.2 | 41,188 |

The threshold remains advisory and only applies when candidate reuse, runtime,
profile, and declarative fingerprint all match. It is not an external timing
budget.

## Final selected-policy verification

With the learned configuration and its retained local state directory, the
formal Gate then passed both profiles against the same exact candidate
`0.0.0-local.0aa6c8c15451`:

| Profile | Final initial-result observation | Advisory threshold | Gate evidence directory |
| --- | ---: | ---: | --- |
| required | 10,534.2ms | 18,680ms | `2026-09-02T09-56-03.957Z-2771013-07ba878f-b59d-4bb3-b46b-dd60fb60d4cb/` |
| full | 22,990.7ms | 41,188ms | `2026-09-02T09-56-19.218Z-2774820-d472484a-cec2-43b2-af13-b7ca9205ba2f/` |

These are post-selection smoke validations, not additional A/B samples; the
five accepted pairs above remain the baseline dataset. Both observations are
within their matching advisory range and both Gate aggregates passed.
