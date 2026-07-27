### Case WB-METRICS-GATE-MODEL-010: rejects missing evaluated field with a path-aware error
Entry:
- `src/product/quality-core/src/model/gate-policy.test.ts > GateResult validation > rejects missing evaluated field with a path-aware error`
Contract:
- Product gate descriptor 与 result validation 稳定 必须保持该原生测试节点界定的可观察行为：rejects missing evaluated field with a path-aware error。
Proves:
- 在 `GateResult validation` 下，该节点证明：rejects missing evaluated field with a path-aware error。
