### Case WB-CONFIG-FILE-003: rejects non-object input
Entry:
- `src/product/config-file.test.ts > complete quality config parsing > rejects non-object input`
Contract:
- Product 完整 JSON 配置 parsing 稳定 必须保持该原生测试节点界定的可观察行为：rejects non-object input。
Proves:
- 在 `complete quality config parsing` 下，该节点证明：rejects non-object input。
