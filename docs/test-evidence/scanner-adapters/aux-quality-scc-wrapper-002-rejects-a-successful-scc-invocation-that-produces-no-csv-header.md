### Case AUX-QUALITY-SCC-WRAPPER-002: rejects a successful scc invocation that produces no CSV header
Entry:
- `src/product/quality-core/src/measurement/scanners.test.ts > quality scc exact input projection > rejects a successful scc invocation that produces no CSV header`
Contract:
- Quality scc zero-input boundary 稳定 必须保持该原生测试节点界定的可观察行为：rejects a successful scc invocation that produces no CSV header。
Proves:
- 在 `quality scc exact input projection` 下，该节点证明：rejects a successful scc invocation that produces no CSV header。
