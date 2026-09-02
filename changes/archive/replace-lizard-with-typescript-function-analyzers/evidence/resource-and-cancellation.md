# Function-Metrics Resource and Cancellation Evidence

## Scope and current conclusion

**Authority:** this document records the Product-owned `functionMetrics` adapter as measured from the source tree. The paired JSON is the machine-readable record; the spike is the sole generator. It does not establish a released package result.

**Implementation selected:** the Check parent reads only its approved exact paths in at-most-`32 KiB` byte chunks, checks cancellation around each chunk, and yields a macrotask after every chunk. It admits at most `8 MiB` per file and `64 MiB` across the exact input set. It then starts at most one Check-owned Worker, sends that Worker only `{ path, source }` values, and terminates the Worker on settlement or cancellation. The Worker neither discovers nor reads paths.

**Hard-cut readiness, as of this measurement:** source-tree resource and cancellation correctness is **ready**: the caps fail closed, cancellation is observed before Worker start and after Worker construction, and no rejected/cancelled prefix is returned. Package/runtime acceptance is **separate from this source-tree evidence**: candidate and installed-consumer checks must be paired with the final workspace Gates, so this document makes no release claim. The measurements expose a performance boundary rather than a benchmark pass: no latency or RSS acceptance budget has been declared for the `8 MiB`/`64 MiB` limits.

## Reproduce

```sh
bun changes/archive/replace-lizard-with-typescript-function-analyzers/evidence/spikes/resource-cancellation-spike.ts
```

The command overwrites [`baselines/resource-cancellation-observations.json`](baselines/resource-cancellation-observations.json). It runs each source-tree scenario in three fresh Bun child processes and records:

- Bun version, platform, chunk and input caps;
- wall time from actual Product admission through whole-result settlement;
- endpoint memory and process `maxRSS` high-water observation;
- Worker starts and `terminate()` calls; and
- the current `package:status` plus a direct emitted-Worker probe, clearly separated from installed-package execution.

The checked-in run used Bun `1.3.14` on Linux, `32 KiB` admission chunks, `8 MiB` per file, `64 MiB` aggregate, and an abort scheduled `30 ms` after Worker construction for the Worker-cancellation scenario.

## Source-tree observations

| Scenario (three fresh runs)                               | Whole-result observation              | Worker lifecycle     | Wall time        | Process `maxRSS`    |
| --------------------------------------------------------- | ------------------------------------- | -------------------- | ---------------- | ------------------- |
| Representative TypeScript function                        | `complete:1` in all runs              | 1 start, 1 terminate | 18.7–19.7 ms     | 57,564–57,820 KiB   |
| Exact `8 MiB` whitespace TypeScript file                  | `complete:0` in all runs              | 1 start, 1 terminate | 583.9–612.1 ms   | 236,516–237,308 KiB |
| `8 MiB + 1 byte` file                                     | `resource-limit-exceeded` in all runs | 0 starts             | 303.8–305.0 ms   | 62,496–62,572 KiB   |
| Eight `8 MiB` files plus one byte                         | `resource-limit-exceeded` in all runs | 0 starts             | 2457.0–2470.3 ms | 140,552–141,432 KiB |
| `8 MiB` admission with timer abort at `0 ms`              | `cancelled` in all runs               | 0 starts             | 2.0–2.2 ms       | 50,884–51,332 KiB   |
| `<32 KiB` 6,000-level conditional input, no abort         | `complete:1` in all runs              | 1 start, 1 terminate | 68.7–76.7 ms     | 112,008–114,140 KiB |
| Same dense input, abort `30 ms` after Worker construction | `cancelled` in all runs               | 1 start, 1 terminate | 36.6–37.2 ms     | 79,308–79,892 KiB   |

`maxRSS` is a process-wide high-water value, not isolated adapter or Worker memory. The `64 MiB` aggregate rejection retains the admitted prefix while it discovers the one-byte overage, and the exact-limit completion additionally materializes source text for the Worker; those facts explain why their high-water values exceed the input cap. They are observations, not resource budgets.

## Cancellation boundary

1. **Before Worker startup:** the `8 MiB` timer-abort scenario settled `cancelled` after the first macrotask admission yield; its Worker tracker observed zero starts in all runs. The Product regression also asserts no Records or waiver audit for this path.
2. **After Worker construction:** the dense input is below one admission chunk, so admission cannot account for the delay. It completed in 68.7–76.7 ms without an abort. With the abort armed only by the tracked Worker's constructor at `30 ms`, all runs settled `cancelled` at 36.6–37.2 ms and each called `terminate()` once. This is evidence that cancellation reaches an in-flight Worker before normal completion. It is not an internal per-token progress probe.
3. **No partial result contract:** the adapter resolves either the Worker’s complete response or one whole unavailable/cancelled reason. Product tests cover cancelled admission and in-flight Worker settlement with empty Records and no waiver audit.

## Byte admission and decode policy

The parent uses actual bytes, not JavaScript string length. It rejects a per-file or aggregate excess before creating a Worker and never falls back to Python/Lizard/CSV.

For an admitted byte sequence, [`measurement.ts`](../../../../src/package-checks/function-metrics/measurement.ts) reproduces Lizard 1.23 `auto_read` from the external checkout at `/tmp/lizard-1.23-audit.tUCD0B/lizard_ext/auto_open.py` at the Product boundary:

- strict valid UTF-8 strips an initial BOM (`utf-8-sig`) and applies universal newline translation;
- a legal UTF-8 encoding of U+FFFD remains U+FFFD; and
- a strict decode failure retries the original bytes with UTF-8 `errors="ignore"`, retaining a BOM and raw newlines on that fallback.

The direct fixed-source observations cover a valid BOM, legal U+FFFD, invalid byte, truncated multibyte sequence, BOM plus invalid byte, and strict/fallback newline behavior. A deterministic 271-sequence differential run against the fixed Lizard checkout also matched. This is a narrow Bun-host adaptation owned by the Product input adapter; `auto_open.py` remains an excluded command-side entry surface in the source ledger.

## Package boundary

At the time of this spike, package status was `stale` (`rebuild (receipt-input-mismatch)`) and had no installed entry. Its direct emitted `dist/esm/.../analyzer-worker.mjs` probe therefore established only an emitted Worker URL shape, not current package contents, public installed entry, tarball installation, or external-consumer analysis. Current candidate state is owned and verified separately by package tests; this historical source-tree spike remains neither candidate nor release evidence.

## Remaining decision boundary

The source-tree contract is sufficient for the hard cut’s correctness boundary. A maintainer must set explicit latency/RSS acceptance budgets if the observed `0.58–0.61 s` exact-file and `~2.46 s` aggregate-rejection costs are unacceptable; this evidence cannot infer such a product target. No worker pool, scanner framework, cache, or whole-invocation isolation is justified by these results.
