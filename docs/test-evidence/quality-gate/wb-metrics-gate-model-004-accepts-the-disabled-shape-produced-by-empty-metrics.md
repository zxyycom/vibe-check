### Case WB-METRICS-GATE-MODEL-004: accepts the disabled shape produced by empty metrics
Entry:
- `src/product/quality-core/src/model/gate-policy.test.ts > GateResult validation > accepts the disabled shape produced by empty metrics`
Contract:
- Product gate descriptor 与 result validation 稳定 必须保持该原生测试节点界定的可观察行为：accepts the disabled shape produced by empty metrics。
Proves:
- 在 `GateResult validation` 下，该节点证明：accepts the disabled shape produced by empty metrics。
