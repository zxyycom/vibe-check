### Case WB-RUNTIME-GATE-OUTCOME-004: returns failed when artifact output fails after a failed gate was computed
Entry:
- `src/product/quality-core/src/engine.test.ts > quality scan process outcome > returns failed when artifact output fails after a failed gate was computed`
Contract:
- Product gate process outcome 与 output priority 稳定 必须保持该原生测试节点界定的可观察行为：returns failed when artifact output fails after a failed gate was computed。
Proves:
- 在 `quality scan process outcome` 下，该节点证明：returns failed when artifact output fails after a failed gate was computed。
