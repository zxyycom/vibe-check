### Case WB-RUNTIME-GATE-OUTCOME-001: publishes the same warnings and GateResult across successful outputs
Entry:
- `src/product/quality-core/src/engine.test.ts > quality scan process outcome > publishes the same warnings and GateResult across successful outputs`
Contract:
- Product gate process outcome 与 output priority 稳定 必须保持该原生测试节点界定的可观察行为：publishes the same warnings and GateResult across successful outputs。
Proves:
- 在 `quality scan process outcome` 下，该节点证明：publishes the same warnings and GateResult across successful outputs。
