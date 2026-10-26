# Index synchronization and full-check evidence

Execution date: 2026-10-26 (UTC). This auxiliary evidence records the authorized sync/check sequence only; it is not final independent review evidence.

## Sequence and results

1. `bun run decisions -- sync-index --preflight` — passed; complete projection not published.
2. `bun run investigations -- sync-index --preflight` — passed; 126 reports; complete projection not published.
3. `bun run decisions -- sync-index` — exit 0; rebuilt `docs/decisions/decision-index.json`.
4. `bun run investigations -- sync-index` — exit 0; synchronized 126 reports.
5. `bun run decisions -- check` — exit 0; 378 decisions checked (127 active, 251 archived), full check passed.
6. `bun run investigations` — exit 0; 126 reports checked; full index current.

Command stdout and exit codes are stored beside this file. `manifest.json` records output hashes and published index hashes/counts. No final ledger, independent-review publication, Change task update, or task completion was performed.
