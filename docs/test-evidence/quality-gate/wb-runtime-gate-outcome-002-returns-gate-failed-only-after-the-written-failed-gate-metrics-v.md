### Case WB-RUNTIME-GATE-OUTCOME-002: returns gate-failed only after the written failed-gate metrics validate
Entry:
- `src/product/quality-core/src/engine.test.ts > quality scan process outcome > returns gate-failed only after the written failed-gate metrics validate`
Contract:
- Product gate process outcome 与 output priority 稳定 必须保持该原生测试节点界定的可观察行为：returns gate-failed only after the written failed-gate metrics validate。
Proves:
- 在 `quality scan process outcome` 下，该节点证明：returns gate-failed only after the written failed-gate metrics validate。
