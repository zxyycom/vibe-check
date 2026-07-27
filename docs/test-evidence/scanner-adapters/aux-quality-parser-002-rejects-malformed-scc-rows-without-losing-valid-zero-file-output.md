### Case AUX-QUALITY-PARSER-002: rejects malformed scc rows without losing valid zero-file output
Entry:
- `src/product/quality-core/src/measurement/scanners.test.ts > quality scanner output parsing > rejects malformed scc rows without losing valid zero-file output`
Contract:
- Quality scanner parser fixtures 稳定 必须保持该原生测试节点界定的可观察行为：rejects malformed scc rows without losing valid zero-file output。
Proves:
- 在 `quality scanner output parsing` 下，该节点证明：rejects malformed scc rows without losing valid zero-file output。
