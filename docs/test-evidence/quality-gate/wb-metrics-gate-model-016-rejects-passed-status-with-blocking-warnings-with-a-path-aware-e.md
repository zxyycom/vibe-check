### Case WB-METRICS-GATE-MODEL-016: rejects passed status with blocking warnings with a path-aware error
Entry:
- `src/product/quality-core/src/model/gate-policy.test.ts > GateResult validation > rejects passed status with blocking warnings with a path-aware error`
Contract:
- Product gate descriptor 与 result validation 稳定 必须保持该原生测试节点界定的可观察行为：rejects passed status with blocking warnings with a path-aware error。
Proves:
- 在 `GateResult validation` 下，该节点证明：rejects passed status with blocking warnings with a path-aware error。
