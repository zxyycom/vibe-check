# translated-function-analyzers-golike

## Case FM-ANALYZER-READERS-E-001: Go-like reader 保持 Lizard 1.24 的 observable metrics

Owner: `docs/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/function-metrics/analyzer/readers/golike-readers.test.ts|Go-like readers preserve every oracle suffix and edge fixture`
- `bun|src/package-checks/function-metrics/analyzer/readers/golike-readers.test.ts|Go-like readers preserve all Lizard 1.24 upstream language scenarios`

Proves:

- Go、Rust、Scala、Solidity、Zig、Swift 与 Kotlin 的全部当前 suffix、normal/edge oracle fixture 保持 Lizard 1.24 function name、range、NLOC、CCN 与 parameter count。
- 与固定 upstream `testGo`、`testRust`、`testScala`、`testSolidity`、`testZig`、`testSwift`、`testKotlin` 对应的全部分析输入保留 source-specific function、receiver/impl、type/generic、Scala expression-body、Rust lifetime/match、Zig type alias、Swift declaration/label/protocol、Kotlin accessor/lambda/when/interface 的 observable metrics；Swift 与 Kotlin 的 backtick tokenization 也直接校准。两者以 named `SwiftReplaceLabel` composition 在各自 reader preprocessing boundary 保留 Python multiple-inheritance 的 source order 与 label transform。
