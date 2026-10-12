# Current status of 39 historical candidates

Baseline: `5cb448b23453edc90e02b25d003efd57dcdd3509`.
This is the readable summary of [candidate-status.json](candidate-status.json), which owns the full trigger,
time/space analysis, output lower bounds, source anchors and hashes. IDs retain their historical meaning.
“Resolved” combines the JSON's two resolved categories and applies to the original root cause, not all costs in a module.

## Core foundations

| ID | Status | Mechanism and current condition |
| --- | --- | --- |
| C01 | Resolved | Relation-name deduplication uses a Set: expected O(m) membership, preserving first order. |
| C02 | Resolved | Session slot Map and known-ID Set are built once; ordered publication and payload costs remain. |
| C03 | Resolved | A per-array Set removes quadratic duplicate blocker-ID checks; dense reason output may itself be quadratic. |
| C04 | Robustness candidate | Invalid shared executable DAGs may expand exponentially before duplicate-ID rejection. Container-only warnings are a separate output-sized cost. |
| C05 | Growth candidate | Exact dynamic-key validation compares keys with a growing allowed list: Θ(K²); fixed small schemas are bounded. |
| C06 | Growth candidate | Deep inherited edits repeatedly materialize prefixes: Θ(n²) work, with potentially O(n²) retained prefixes across recursive frames; peak memory unmeasured. |

## Project Run

| ID | Status | Mechanism and current condition |
| --- | --- | --- |
| R01 | Resolved | Settled-task, held-mutex and resource indexes remove the old sparse-chain cubic lookup. Boundary rebuilding remains under R05. |
| R02 | Resolved | Compiled scope/task/activation indexes and a selection fold remove the old per-candidate scope search. |
| R03 | Resolved | The immutable graph fingerprint is cached once per invocation rather than rebuilt per decision. |
| R04 | Partial | Scope grouping removes the singleton scan. Repeated nonterminal DFS can still be Θ(V²) for one sparse multi-task scope; that term is zero for public singleton scopes. Four ordered preparations remain. |
| R05 | Growth candidate | Repeated full-state projection accumulates at least Ω(N²). The capacity-membership subterm reaches Θ(N³) for independent tasks with S=P=N; default P=4 does not meet that condition. |
| R06 | Growth candidate | Repeated completion waits visit O(Σ running) ≤ O(NP) inputs; quadratic work is attainable at P=N. Reaction retention is not heap-measured. |
| R07 | Growth candidate | Shared-mutex acquire/release visits can total Θ(Σ fanout²), in addition to persistent-list update costs. |
| R08 | Resolved | Per-run flags, per-callback direct relations and per-invocation artifact directories now use indexes. |
| R09 | Growth candidate | Demand-enabled measurement repeatedly scans pending tasks; cumulative work can be quadratic. |
| R10 | Bounded extra | Preview limits follow full serialization, escaping or enumeration on some paths; extra work is input-sized, with no confirmed quadratic engine cost. |

## Learned scheduling tools

| ID | Status | Mechanism and current condition |
| --- | --- | --- |
| T01 | Resolved | Normal prediction, ranking and recording paths use Maps. Remaining private linear helpers have no production callers. |
| T02 | Partial | Normal prepared decisions reuse graph indexes; reachable static fallback rebuilds them. Activation membership and candidate sorting remain conditional costs. |

## Checks and shared file handling

| ID | Status | Mechanism and current condition |
| --- | --- | --- |
| K01 | Resolved | Operation-local directory-name indexes replace full directory scans; raw-name collision and filesystem checks remain. |
| K02 | Growth candidate | Deep subtree pruning repeatedly copies/joins path prefixes: Θ(D²) copied slots/characters in the worst shape. |
| K03 | Growth candidate | Markdown containment walks copy remaining path arrays at each step: Θ(D²); shared by link and lint checks. |
| K04 | Resolved | Area-ID Set lookup removes the old quadratic overlap search; intersection and policy ordering remain. |
| K05 | Resolved | A slug Set per reused facts instance changes repeated anchor lookup from Q×H comparisons to expected O(H+Q). |
| K06 | Resolved | Successful overlapping Git measurements share base/history/prefix results; command count is 2 + distinct bases + maximum base index. Failures remain retryable. |
| K07 | Resolved | Rolling argument-budget accounting replaces growing batch-prefix construction; work is linear in arguments/files. |
| K08 | Repetition candidate | Multiple bindings reread and strictly parse the same JSON instance; distinct schema validation and freshness semantics remain separate obligations. |
| K09 | Capacity candidate | Each run restores the full optional JSONL cache. Cumulative work can become quadratic when new distinct digests grow history linearly; frozen warm inputs do not keep appending. |
| K10 | Linear extra | Duplicate detection fingerprints all selected bytes even with cache off, before scanning. |
| K11 | Conditional | Generalized fragment normalization can cost Θ(L²); the default scanner emits two locations, bounding this dimension. |
| K12 | Uncertain | The front-matter regex needs engine evidence; source shape alone does not establish ReDoS. |
| K13 | Bounded extra | Safe reads allocate by configured byte cap; concurrent memory and RSS were not measured. |
| K14 | Resolved | Sorting compares raw range fields; public range DTOs are formed only for emitted records. Deterministic sorting remains. |

## Function analyzer

| ID | Status | Mechanism and current condition |
| --- | --- | --- |
| A01 | Growth candidate | Repeated signature appends rescan code points; cumulative work can be quadratic in final signature length. |
| A02 | Growth candidate | Linked-state dispatch visits ancestors per token, O(TD); a valid nested Go family supplies bounded quadratic counts. |
| A03 | Growth candidate | Namespace qualification repeatedly maps/joins the stack, O(KD), plus actual qualified-name bytes. |
| A04 | Growth candidate | Flat Ruby interpolation repeatedly rematches quoted suffixes; cumulative matched width is Θ(I²) in the scan model. |
| U-A01 | Partial evidence | Bounded public TS-template and C-comment samples support malformed-input degradation. Engine-wide bounds and physical Worker exit remain unknown. |
| U-A02 | Uncertain | Repeated template suffix widths do not determine actual copy cost while engine substring sharing is unknown. |
| U-A03 | Uncertain | A legal growing nested Python tokenizer family has not been established; the conditional depth bound remains unconfirmed. |

All statuses are source- and branch-scoped. Measured timings and deterministic counts retain their own protocols;
consumer scale, heap behavior, third-party internals and optimization benefit require separate evidence.
