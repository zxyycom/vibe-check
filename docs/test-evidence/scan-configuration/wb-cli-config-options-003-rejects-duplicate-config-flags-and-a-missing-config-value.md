### Case WB-CLI-CONFIG-OPTIONS-003: rejects duplicate config flags and a missing config value
Entry:
- `src/product/args.test.ts > product config argument parsing > rejects duplicate config flags and a missing config value`
Contract:
- Product config option presence 稳定 必须保持该原生测试节点界定的可观察行为：rejects duplicate config flags and a missing config value。
Proves:
- 在 `product config argument parsing` 下，该节点证明：rejects duplicate config flags and a missing config value。
