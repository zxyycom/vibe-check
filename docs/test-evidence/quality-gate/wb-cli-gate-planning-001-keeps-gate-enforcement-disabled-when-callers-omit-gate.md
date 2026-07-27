### Case WB-CLI-GATE-PLANNING-001: keeps gate enforcement disabled when callers omit --gate
Entry:
- `src/product/args.test.ts > quality gate argument parsing and scan planning > keeps gate enforcement disabled when callers omit --gate`
Contract:
- Product gate parser、help 与 scan plan 稳定 必须保持该原生测试节点界定的可观察行为：keeps gate enforcement disabled when callers omit --gate。
Proves:
- 在 `quality gate argument parsing and scan planning` 下，该节点证明：keeps gate enforcement disabled when callers omit --gate。
