# warning-generation

## Case AUX-QUALITY-WARNINGS-001: Quality warning 阈值语义稳定
Owner: `docs/quality-metrics.md#warning-rules-and-channels`
Entities:
- `bun|src/product/quality-core/src/output/warnings/generator.test.ts|quality warning generation > adds configured accepted reasons without relying on duplicate line numbers`
- `bun|src/product/quality-core/src/output/warnings/function-baseline-warnings.test.ts|function baseline warning comparison > keeps repeated and anonymous function identities incomparable`
- `bun|src/product/quality-core/src/output/warnings/function-baseline-warnings.test.ts|function baseline warning comparison > matches function baselines by unique file and name without line-number identity`
- `bun|src/product/quality-core/src/output/warnings/generator.test.ts|quality warning generation > uses complexity-aware function code density thresholds`
- `bun|src/product/quality-core/src/output/warnings/generator.test.ts|quality warning generation > uses scc code lines and low decision-token allowance for file-size warnings`
- `bun|src/product/quality-core/src/output/warnings/generator.test.ts|quality warning generation > warns when an accepted semantic check no longer matches any generated warning`
Proves:
- 文件大小 warning 使用 scc `Code` 代码行数，而不是包含注释和空行的总行数。
- 文件大小 warning 根据 scc decision-token count 选择 code-line floor，低 decision-token 文件可使用更高行数阈值。
- 函数 warning 使用复杂度感知的代码密度阈值。
- 函数 baseline 只按同文件、同名且 current/baseline 双侧唯一的稳定名称匹配，不依赖行号；新函数使用 zero baseline，跨文件同名不猜测匹配，重名与匿名 identity 保持不可比较；matched identity 的 nullable baseline metric value 不改写为 zero。
- 配置中以 semantic `checkId` 选择检查的已知可接受 warning 保留在 all/changed/regression warning records 中，并通过 `acceptedReason` 字段携带原因。
- 配置中以 semantic `checkId` 选择检查的 accepted warning 匹配不到任何 generated warning 时会生成 `quality-accepted-warning-unmatched` warning。
