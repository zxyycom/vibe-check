# Configured TypeScript Fixture

This checked-in project proves the formal Product CLI can load a complete explicit
`QualityConfig` from the scanned project root.

- `src/eligible.ts` is the only file that reaches the controlled scanners.
- `src/ignored.generated.ts` is removed by `generatedFiles`.
- `excluded/ignored.ts` is removed by `excludeDirs`.
- `tools/controlled-scanner.ts` supplies deterministic, test-owned Lizard and scc
  scan output plus version responses for all three tools. The one-file fixture
  intentionally skips jscpd duplicate scanning.

Run it from the Vibe Check repository root:

```bash
bun run product:cli -- scan fixtures/projects/configured-typescript \
  --config vibe-check.config.json \
  --skip-baseline
```

The config writes disposable output beneath `artifacts/configured-scan/` and cache
data beneath `.cache/configured-scan/`.
