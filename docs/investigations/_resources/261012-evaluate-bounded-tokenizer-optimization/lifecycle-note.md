# Tokenizer evidence and helper lifecycle

This page routes formation-time evidence and the later helper review. Final v3.1 adoption, costs and validation boundaries are owned by the
[investigation report](../../evaluate-bounded-tokenizer-optimization.md), not by an intermediate experiment plan.

## Evidence identities

- The 348-module manifest, per-candidate source hashes and exact patches identify the measured source. The 526 frozen texts identify input.
  Full working copies remain under `/workspace/vibe-check/tmp/optimization-20261012/tokenizer/`; the resource tree does not duplicate them.
- v1/v2 were rejected for Node legal-corpus regression; v3 was not adopted after the leading-addition counterexample. Final v3.1 evidence is separately named.
  `v3-experiment-design.md` is the historical static design, including proposed attribution experiments that were not all executed.
- `harness-source-history.json` preserves review-before helper source text and SHA-256. Current helpers have explicit argv/JSON/unknown-error and
  child-output protocol handling. They are reviewed revisions, not the byte identity that generated old timing rows. No performance rerun was made for this cleanup.
- Raw observations, module/input identities, patches and upstream oracle remain unchanged. Duplicate versions were moved to record-level metadata;
  row order, deadlines, exit events, failures and invalid live-drift rows remain. Invalid drift rows never enter legal A/B medians.

## What the evidence proves

- Factory text/UTF-16 offset/LF line and final transformed token streams are separate full comparisons before digest/count summaries.
  Transformed inserted tokens do not independently carry source offsets. The final Node long-input objects provide additional full evidence beyond the shorter matrix.
- The 82 lifecycle probes cover shared CodeReader, not TS/TSX split directly. The initial v3.1 lifecycle output loaded v3 by mistake and is retained as rejected;
  the correctly bound rerun is separate. Candidate resolve hooks retained original tests/fixtures and did not replace real production identity checks.
- Bun N24 template before/candidate outputs differ for an unknown reason; candidate outputs match the supported Node baseline. Neither shorter-input equality
  nor cancelled Run timing proves all long-input equality. The report also preserves Node's four pre-existing source-test assertion failures.
- Worker diagnostics use the real Worker and production settlement with an extra retained exit listener. Port return, terminate request/resolution and physical exit
  are different events. The 3-second observer wait occurs after timed return; a missing event in the earlier 500-ms window was not evidence of continued CPU use.
- File timestamps bound artifact creation/modification, not exact operation start/end. v3/v3.1 per-row UTC fields own those sample windows; v3's overwritten
  top-level startedAt does not represent the whole matrix. Historical rows, not later controller block parameters, own sample counts.

## Reading and rerunning

Helpers contain formation-time absolute paths and can write fixtures/results or spawn bounded child processes. They are not package entry points or a maintained benchmark CLI.
Read the report and source/input manifests first. A rerun requires explicit scope, a coordinated timing window, prepared snapshots and fresh outputs; never overwrite old raw.
Input/protocol review probes do not execute analyzers, Workers or the performance controller and are not new performance observations.

Temporary snapshots remain for source/input review. Future cleanup must first confirm the exact retained evidence and authorized targets; the current task does not delete them.
