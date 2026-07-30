# report-output

## Case AUX-QUALITY-REPORT-001: Quality report 排名和 changed-file 摘要稳定
Owner: `docs/output.md#typescript-product-output-boundary`
Entities:
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > applies configured watchlist visibility and limit independently from ranking top N`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > keeps changed-file watchlist useful without baseline annotations`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > keeps disabled gates silent in human reports`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > labels scc file Complexity as decision-token count and shows total-token share`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > projects a passed all gate for the resolved profile before detailed output`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > projects failed gate blocking warnings in GateResult order`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > shows accepted reasons next to warning records`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > shows actionable diagnostics for failed capabilities`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > shows code-area decision-token hotspots by total-token share`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > shows completeness states and explains an empty quality evaluation`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > sorts rankings by metric without mutating scanner output order`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > uses baseline owner status for comparison-unavailable actions`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > uses failed capability actions for scan-incomplete gates`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > uses resolved profile and scan scope for no-eligible-input actions`
Proves:
- baseline unavailable 时 changed-file watchlist 仍按风险展示有用文件。
- rankings 排序不修改 scanner output 原始顺序。
- Report config 控制 Changed Files Watchlist visibility 与独立展示上限。
- scc `Complexity` 文件列在人类报告中展示为 decision-token count，并补充热点占比。
- Code Area 汇总表展示 decision-token count 和总量占比，用于定位热点区域。
- 带 `acceptedReason` 的 warning 在报告中贴近对应 warning 展示原因，不从单独质量扫描中消失。
- Disabled gate 保持 report human silence；requested gate section 位于 summary/comparison context 与 detailed output 之间，并投影 state-specific fields。
- Failed gate 按 GateResult ordering 展示 blocking warnings；not-evaluated action 分别来自 capability diagnostic、resolved profile/scope 或 baseline owner status。

## Case WB-OUTPUT-GATE-CONSOLE-001: Product gate console projection 稳定
Owner: `docs/output.md#gate-projection`
Entities:
- `bun|src/product/quality-core/src/scan-command/command-output.test.ts|gate console projection > keeps disabled gates silent`
- `bun|src/product/quality-core/src/scan-command/command-output.test.ts|gate console projection > prints evaluated passed and failed state fields to stdout`
- `bun|src/product/quality-core/src/scan-command/command-output.test.ts|gate console projection > prints not-evaluated reasons and owner actions to stderr`
Proves:
- Disabled gate 不写 human gate output。
- Evaluated passed/failed gate 将 state-specific policy、channel 和 counts 写 stdout。
- Not-evaluated gate 将 closed reason 与 owner-derived action 写 stderr，不伪装成 evaluated conclusion。

## Case WB-OUTPUT-NOTICES-001: Product report notice 所有权和位置稳定
Owner: `docs/output.md#typescript-product-output-boundary`
Entities:
- `bun|src/product/config.test.ts|product report notices > renders current TypeScript/Bun release ownership at the stable notice positions`
Proves:
- 顶部 non-blocking notice 紧随报告标题，并将 TypeScript/Bun 产品 CLI、报告契约和产品测试标识为 release contract。
- Footer notice 保持为报告末行，并将 TypeScript/Bun 产品测试和契约校验标识为 release gates。
- 两处 notice 不再将已退役的 Rust CLI、schema 或测试标识为当前 release owner。
