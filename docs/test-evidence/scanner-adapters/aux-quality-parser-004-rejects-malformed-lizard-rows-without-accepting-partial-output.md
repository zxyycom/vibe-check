### Case AUX-QUALITY-PARSER-004: rejects malformed Lizard rows without accepting partial output
Entry:
- `src/product/quality-core/src/measurement/scanners.test.ts > quality scanner output parsing > rejects malformed Lizard rows without accepting partial output`
Contract:
- Quality scanner parser fixtures 稳定 必须保持该原生测试节点界定的可观察行为：rejects malformed Lizard rows without accepting partial output。
Proves:
- 在 `quality scanner output parsing` 下，该节点证明：rejects malformed Lizard rows without accepting partial output。
