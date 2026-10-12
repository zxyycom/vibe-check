# Measured owner results and limitations

Final sources: baseline b3c8fecce5a2ff835948f76f9fd4fa5a8e2fe853 (manifest a70cd0eda18639f14b09e3f2658029ebd3dfcff7f6488f8ea3d3968c661bd3d0) and stable after-final (manifest 8fe097928bef32df57b87a7414b7f80853acd968048d8229c5de881216478b40). Project-pinned Bun 1.3.14 / Node 24.18.0, shared Linux/WSL2 host, six logical CPUs.

Five adjacent independent-process pairs alternate B A / A B / B A / A B / B A. Each process runs 37 workload rows with three iteration-batch warmups and seven measured batches. Every final raw result is retained. All full serialized outputs and ordered workload identities agree; source/helper/config/runtime binary identities agree before/after. Formal window 2026-10-12T07:01:43Z–2026-10-12T07:02:57Z, ten processes exit 0 with empty stderr. Import, fixture construction, prepared closure setup (except explicit preparation/build workloads), correctness checks, serialization and IO are outside timing. No samples removed or timings adjusted.

These are local real-owner experiments and public learned prepare/decide measurements, NOT end-to-end Run latency. No consumer SLA/budget, statistical significance, p95, capacity promise, memory benefit or real scanner IO benefit is established. Batches are not independent host experiments. Use process-paired ratios alongside pooled batch median/MAD; shared-host/JIT/GC/frequency drift remains.

## Scaled workloads

B/A entries are pooled batch ms per owner-call with unscaled MAD. Paired A/B is the median of five adjacent process-median ratios, not a ratio of pooled medians. Detailed per-process medians and all five ratios remain in summary.json.

| Owner workload | Size | B ms (MAD) | A ms (MAD) | pooled A/B | paired median A/B |
| --- | ---: | ---: | ---: | ---: | ---: |
| C01-identifier-dedup | 512 | 1.298481 (0.458830) | 0.330381 (0.028318) | 0.254 | 0.368 |
| C03-reason-unique-and-reject | 512 | 2.056028 (0.495637) | 0.494409 (0.069075) | 0.240 | 0.354 |
| R08-flag-membership | 512 | 9.918968 (1.193953) | 0.300682 (0.051224) | 0.030 | 0.034 |
| R08-dependency-reads | 512 | 0.491489 (0.056544) | 0.042845 (0.006149) | 0.087 | 0.085 |
| R08-dependency-build-and-reads | 512 | 0.486307 (0.059681) | 0.086538 (0.015747) | 0.178 | 0.191 |
| R08-artifact-lookups | 512 | 1.730080 (0.240398) | 0.012047 (0.002645) | 0.007 | 0.007 |
| R08-artifact-build-and-lookups | 512 | 2.560215 (0.343253) | 0.485048 (0.082320) | 0.189 | 0.202 |
| R04-four-singleton-prepare | 512 | 10.647781 (1.785834) | 7.812765 (0.997752) | 0.734 | 0.745 |
| R04-four-no-scope-prepare | 512 | 4.030561 (0.743423) | 3.766930 (0.583196) | 0.935 | 1.039 |
| T01-critical-path-preparation | 512 | 0.783196 (0.131929) | 0.289004 (0.073590) | 0.369 | 0.417 |
| T01-history-prediction | 512 | 9.166199 (1.680875) | 5.981763 (1.174732) | 0.653 | 0.619 |
| T01-history-recording | 512 | 4.411929 (1.186804) | 1.738791 (0.533025) | 0.394 | 0.522 |
| T01-T02-prepared-decisions | 512 | 8.681113 (0.494744) | 0.498834 (0.081886) | 0.057 | 0.049 |
| T01-T02-public-prepare | 512 | 19.174481 (1.728451) | 9.203477 (1.801500) | 0.480 | 0.444 |
| C05-exact-keys-conditional | 512 | 0.470920 (0.033517) | 0.470259 (0.029375) | 0.999 | 1.003 |
| K04-area-intersection | 256 | 39.059817 (3.368970) | 3.259113 (0.904727) | 0.083 | 0.076 |
| K07-scc-batch-planning | 2048 | 13.005767 (2.084849) | 0.029238 (0.004845) | 0.002 | 0.002 |
| K14-ordered-findings | 2048 | 10.262461 (1.229583) | 2.568667 (0.602546) | 0.250 | 0.250 |

Scaled modified owners are faster in all five pairs except the unchanged/protective no-scope R04 and C05 paths. R04 measures four separate complete prepareTaskGraph calls, preserving four-stage cost rather than reusing prepared state; singleton-scope gain does not establish public Run gain. History prediction/recording includes per-invocation immutable index construction and bounded in-memory merging/freezing, but excludes persistence and terminalEffect delivery.

## Small paths: costs and inconclusive signs

- C01 identifiers at 8: pooled B 0.005031ms → A 0.006291ms (A/B 1.250, about +1.26µs); five pair ratios 1.570/1.104/0.782/1.206/1.232. A small-collection tradeoff is observed, not a universal win.
- R08 dependency construction plus eight reads: B 0.000925ms → A 0.001948ms (A/B 2.106, about +1.02µs); all pair ratios exceed one (2.745/1.330/1.525/1.616/2.354). Index construction has a real local small-read overhead. No hard budget was supplied; acceptability is a product decision, not disproven by the scaled gain.
- R04 singleton 8 pooled A/B 0.778 is not a stable small-path gain: four of five paired process ratios exceed one (1.074/1.261/0.619/1.083/1.032). No-scope 512 pair ratios 1.143/1.039/0.859/0.992/1.117 have no consistent direction. Do not claim no regression or stable speedup on these protective paths.
- Small artifact lookup, learned prepared three-decisions, SCC planning and finding sorting improve in all five process pairs; other tiny positive pooled signals are not treated as reliable causal wins.
- C05 source is unchanged. Final 2/5/512-key pooled A/B 1.125/0.942/0.999 and varying pair signs illustrate tiny/no-op signal noise. Separate project-pinned once-per-call Set candidate probe retained 768 equivalent cases and 5 AB/BA pairs: 2/5-key regressions A/B 3.898/9.203, while 512 keys improved to 0.302. Candidate was not adopted; large dynamic-schema gain did not justify common small-schema costs.

## Evidence and validation boundary

The measuring agent wrote only independent temporary copies/helpers, did not edit product or repository files, install dependencies, access network, write Git or run Gate. Helpers passed inherited strict TypeScript, full 127-rule implementation lint with --deny-warnings and project formatting. Final source patch was actually applied to a separate baseline clone and reconstructed an identical relative src manifest. Main thread separately reported second complete Gate 43/43 after minimal strategy wrapper repair; that is not a Gate execution by this agent and not a timing benefit. The earlier failed after source and its smoke/identity/patch are retained in appendix/after-attempt-1.tar.gz and not used in final ratios. Non-pinned exploratory raw and pinned before-only/C05 series are appendix-only, not mixed into final comparison.
