# Preflight events (reconstructed from observed tool outputs)

These notes are an event reconstruction, not preserved original failure stdout/stderr files. All events occurred before the affected formal sample series; no timing sample was dropped or edited.

1. Initial strict helper compilation rejected absolute `.ts` imports under inherited rewriteRelativeImportExtensions (TS2877) and a nonexistent NormalizedProjectDefinition.outputs property. Imports were changed to relative paths; path fixture uses normalized declarative output fields with an explicit null progress formatter to recover ProjectOutputs. No compiler rule was disabled.
2. Initial helper format check used no discovered project config and reported three helper files. Helpers were formatted, and the later pinned/final passes explicitly use project .oxfmtrc.json. No formatting rule was weakened.
3. C05 candidate Oxlint command with `../c05-candidate/src/data-boundary/closed-values.ts` was rejected: `PATH must not contain ".."`. The same target was provided by absolute path, then complete 127-rule lint succeeded.
4. C05 candidate format check without project config failed. Providing project config passed the unchanged candidate. Formal C05 timing started only after strict, lint and project format checks passed.
5. Initial sample runtime used ambient Bun 1.4.2/Node 26.8.2 rather than project Bun 1.3.14/Node 24.18.0. Ambient raw results are retained as exploration only; pinned independent before and C05 AB/BA series were newly sampled in separate namespaces. Final comparisons use only project pin.

Stored success evidence is preserved in validation/ and original raw archives. Runtime and protocol changes are stated in protocol.md. Original formal raw result files have not been overwritten.
