# SCC 3.7.0 → 4.0.0 differential evidence

`corpus/` is the checked-in representative input set: repository languages (TypeScript/JavaScript), known v4 correction
families (Rust `?`, Python docstrings, C/C++/CUDA and Patch), a path containing spaces, and a file that creates a stable
non-blocking `fileMetrics` finding. It is a migration corpus, not a claim to cover every SCC language, every consumer
configuration, empty-input behavior, malformed output, or a Windows runtime.

## Artifact roles

- `observe.ts` is the controlled raw-observation writer. It receives two caller-provided direct binaries and rewrites
  `observations.json`; it does not classify drift, execute Product Record conversion, or change production configuration.
- `observations.json` records the raw version/header/row result for the checked-in corpus.
- `classification.json` is the reviewed Linux x64/glibc conclusion. It classifies CSV/header, Provider/path, `Code`,
  `Complexity`, Record and finding outcomes. Its only approved drift is Rust `?` Complexity `0 → 1`.
- Production has one independent contract: SCC 4.0.0 with `--no-config --by-file --format csv`. SCC 3.7.0 exists here
  only as the historical comparison oracle; it is neither a production dependency nor a fallback.

## Re-run the raw observation

Supply direct executable paths for both versions; `/absolute/path/...` below is a placeholder, not a repository-local
path or a required installation location.

```bash
bun changes/upgrade-scc-file-metrics-to-v4/evidence/differential/observe.ts \
  --v3 /absolute/path/to/scc-3.7.0 \
  --v4 /absolute/path/to/scc-4.0.0
```

The command rewrites `observations.json`. Before accepting a rerun, review the exact version outputs, corpus paths and
CSV header, then update `classification.json` only when every drift is classified. An unclassified CSV/header,
Provider/path, `Code`, `Complexity`, Record or finding drift blocks a production change.

SCC 3.7.0 does not implement `--no-config`, so its historical baseline runs in the controlled fixture directory with no
SCC config; SCC 4.0.0 explicitly receives `--no-config`. Production never uses the v3 invocation and always uses v4
`--no-config`.
