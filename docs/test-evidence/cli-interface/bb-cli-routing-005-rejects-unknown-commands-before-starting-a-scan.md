### Case BB-CLI-ROUTING-005: rejects unknown commands before starting a scan
Entry:
- `src/product/cli.test.ts > product CLI routing > rejects unknown commands before starting a scan`
Contract:
- Product CLI routing 与顶层错误映射 必须保持该原生测试节点界定的可观察行为：rejects unknown commands before starting a scan。
Proves:
- 在 `product CLI routing` 下，该节点证明：rejects unknown commands before starting a scan。
