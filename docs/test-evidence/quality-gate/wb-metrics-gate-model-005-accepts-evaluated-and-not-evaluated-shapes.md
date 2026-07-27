### Case WB-METRICS-GATE-MODEL-005: accepts evaluated and not-evaluated shapes
Entry:
- `src/product/quality-core/src/model/gate-policy.test.ts > GateResult validation > accepts evaluated and not-evaluated shapes`
Contract:
- Product gate descriptor 与 result validation 稳定 必须保持该原生测试节点界定的可观察行为：accepts evaluated and not-evaluated shapes。
Proves:
- 在 `GateResult validation` 下，该节点证明：accepts evaluated and not-evaluated shapes。
