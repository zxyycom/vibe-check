### Case WB-RUNTIME-GATE-OUTCOME-005: does not publish a computed failed gate when output validation fails
Entry:
- `src/product/quality-core/src/engine.test.ts > quality scan process outcome > does not publish a computed failed gate when output validation fails`
Contract:
- Product gate process outcome 与 output priority 稳定 必须保持该原生测试节点界定的可观察行为：does not publish a computed failed gate when output validation fails。
Proves:
- 在 `quality scan process outcome` 下，该节点证明：does not publish a computed failed gate when output validation fails。
