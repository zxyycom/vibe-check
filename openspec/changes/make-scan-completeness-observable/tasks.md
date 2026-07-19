## 1. Contract and regression evidence

- [ ] 1.1 用正式入口保存至少一个 required component unavailable 时的当前 false-green evidence，并先增加预期 overall `failed`、无绿色 completion、exit `2` 的 failing regression test。
- [ ] 1.2 定义稳定 capability IDs、`skipped` / `no-input` / `succeeded` / `failed` result union、normalized failure diagnostic 和 `complete` / `empty` / `failed` overall type。
- [ ] 1.3 为 shared reducer 增加 table-driven tests，覆盖 succeeded、mixed succeeded/no-input、all skipped/no-input 和任一 failed。

## 2. Runtime and quality outcome

- [ ] 2.1 在 component resolution 前完成 normalized input 与 capability-specific eligibility 判断；`skipped` / `no-input` 不解析或启动 component。
- [ ] 2.2 让 file-metrics、function-metrics 与 duplicate-detection execution 返回相同 final result contract；successful zero findings 返回 `succeeded`。
- [ ] 2.3 将 unavailable、execution 和 invalid normalized result 映射为 `failed`，并提供 normalized `kind`、`message` 与 `action`。
- [ ] 2.4 从 capability results 计算 overall completeness，不在 reducer 中增加 capability-specific 分支。
- [ ] 2.5 让 `complete` 根据 normalized quality warnings 返回 `passed` / `warning`，`empty` 固定返回 `warning`，`failed` 固定返回 `failed`。
- [ ] 2.6 保证 failed capability 的缺失或部分数据不被当作 measured zero，也不形成可信质量结论。

## 3. Output and CLI

- [ ] 3.1 在 metrics model、`metrics.json`、`report.md` 和 console 中投影同一 overall completeness、capability ID/status 与 failure diagnostic。
- [ ] 3.2 更新 human completion：complete 使用现有质量结论；empty 显示没有 eligible input、质量未评价的 warning；failed 显示 capability、原因与恢复动作。
- [ ] 3.3 更新 CLI mapping：complete passed/warning 与 empty warning 退出 `0`，completeness/runtime failure 退出 `2`，现有 input/config error 继续退出 `3`。
- [ ] 3.4 增加 cross-surface tests，证明 core outcome、console conclusion、report、machine artifact 与 CLI exit 使用同一 source result。

## 4. Maintainability and verification

- [ ] 4.1 保留显式 current orchestrator，让 adapter/wrapper 返回 shared result；确认 overall reducer、quality outcome 与通用 output 不按 capability ID 分支。
- [ ] 4.2 增加正式入口矩阵，覆盖 quick profile skip、legitimate empty warning、mixed succeeded/no-input、successful zero findings、component unavailable、execution/invalid-result failure 与 complete scan。
- [ ] 4.3 更新 Quality Metrics、Output、CLI、Scanner Dependencies、Testing owner 和 case ledger；stable JSON schema/examples 保持由后续 machine-output change 承接。
- [ ] 4.4 运行受影响 product tests、typecheck、lint，以及 unavailable/no-input/zero-finding smoke。
- [ ] 4.5 运行真实 quick/full scan、`bun run validate` 与 `bun run verify:vibe-check-workspace:required`。
- [ ] 4.6 运行 OpenSpec strict validation，并汇总 capability status、overall completeness、core outcome、human conclusion 与 CLI exit 的对应证据。
