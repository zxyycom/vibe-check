# Configured TypeScript Fixture

This checked-in project proves the formal Product CLI can explicitly load a complete semantic
document from the scanned project root.

- `src/eligible.ts` is the only file that enters the configured scan scope.
- `src/ignored.generated.ts` is removed by `generatedFiles`.
- `excluded/ignored.ts` is removed by `excludeDirs`.
- The one-file fixture intentionally leaves duplicate detection without an eligible multi-file
  area. Formal tests provide deterministic measurement results through operational overrides that
  only affect `ScannerDependencySnapshot`; they are not semantic document fields.

From the Vibe Check repository root, the explicit semantic-config invocation is:

```bash
bun run product:cli -- scan fixtures/projects/configured-typescript \
  --config .vibe-check/config.json \
  --skip-baseline
```

The config writes disposable output beneath `artifacts/configured-scan/` and cache
data beneath `.cache/configured-scan/`.
