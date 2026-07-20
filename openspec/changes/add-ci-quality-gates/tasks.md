## 1. 审计门禁与兼容基线

- [x] 1.1 审计门禁：确认 `make-scan-completeness-observable` 已归档，`scan-completeness` main spec 拥有 `complete` / `empty` / `failed` contract，`quality-metrics` owner docs 与 pinned TypeScript source 拥有 comparison status 语义；strict validation 通过，所有 artifacts 均服务于“有充分 evidence 且无 blocking warning 才通过”的核心目的。
- [x] 1.2 通过正式入口保存省略 `--gate` 时 complete passed、complete warning、empty warning 与 completeness failed 的 exit、artifacts 和 human-output baseline；证明 `--verification-output` 只改变 preview。
- [x] 1.3 盘点 `scripts/quality/scan.ts`、package `quality:*`、workspace verifier、CI annotation 及其它 status/artifact consumers，记录每个 consumer 对新增 `gate` field、exit `1` 与 requested-not-evaluated exit `2` 的同步需求。

## 2. Gate policy、model 与 evaluator

- [x] 2.1 先增加 descriptor 与 `GateResult` model tests，覆盖 derived policy values/help、policy/channel/prerequisite mappings、disabled/evaluated/not-evaluated shapes、closed reasons 和非法 invariant combinations。
- [x] 2.2 实现单一 policy descriptor、derived `GatePolicy`、discriminated `GateResult`、`QualityMetrics.gate` / empty metrics 和 path-aware validation；局部结构审计确认没有平行 policy list。
- [x] 2.3 先增加 evaluator tests，覆盖 fixed prerequisite order、all/changed/regressions selection、`input-unchanged`、accepted-only/mixed warnings、warning identity/ordering 与 blocking counts。
- [x] 2.4 实现一次性 evaluator，在 final completeness、comparison、channels 与 accepted reasons 确定后产生 core-owned `GateResult`，且不修改 warning records、channels 或 quality status。

## 3. CLI planning 与 process outcome

- [x] 3.1 先增加 parser/help/plan tests，覆盖 omitted、三个合法 values、缺失/重复/unknown value、quick all、comparison auto-baseline，以及 comparison policy 与 quick/显式 skip-baseline 的启动前冲突。
- [x] 3.2 实现 `--gate` parsing、single-occurrence validation、descriptor-derived help 与 prerequisite-aware scan-plan normalization；usage error 在 scanner/artifacts 启动前退出 `3`。
- [x] 3.3 将 normalized request 经 `QualityScanOptions` 传入 core，并在 final evidence 与 warnings 确定后接入 evaluator。
- [x] 3.4 实现独立 `success` / `gate-failed` / `failed` process outcomes 及 exit `0` / `1` / `2` mapping，保留 input/config/usage exit `3`。
- [x] 3.5 增加 CLI/core boundary tests，证明 exit `1` 只发生在 evaluated failed gate 且 artifacts 已验证；not-evaluated、completeness/runtime/output failure 使用 exit `2`，usage conflicts 使用 exit `3`。

## 4. Output、dogfood 与 repository consumers

- [x] 4.1 先增加 metrics/report/console tests，覆盖 disabled human silence、evaluated passed/failed、三个 not-evaluated reasons、state-specific fields、report placement 与 stdout/stderr boundary。
- [x] 4.2 让 `metrics.json` 总是记录同一 `GateResult`，report/console 只为 requested gate 投影该 result，并从 completeness/baseline owner data 提供 not-evaluated action。
- [x] 4.3 增加 cross-output assertions，证明 selected policy 不改变 warning streams 的 records、ordering、accepted reasons 或 non-selected warnings，且 output validation failure 优先于 computed gate status。
- [x] 4.4 新增 `quality:gate` package script，通过 thin wrapper 执行 `--profile full --gate regressions`；按 1.3 inventory 同步 wrapper types、consumer classification、package assertions 和 owner docs，既有 invocations 继续省略 gate。

## 5. 正式入口、文档与交付验证

- [x] 5.1 增加 deterministic acceptance matrix：omitted disabled、quick all 与 skipped capability、all-only、changed non-regression、regression、input-unchanged/unavailable comparison、accepted-only/mixed、zero-warning、empty、failed capability、invalid prerequisite 与 output failure；证明每种 result、artifact、human output 与 exit。
- [x] 5.2 为 proof targets 选择最窄 product unit 或 formal-entry 层级，更新 Quality Metrics、CLI、Output、Testing、CI/Script Tooling owner materials、navigation 与 case ledger，并保持实际 test/fixture path 和唯一 `@case` marker。
- [x] 5.3 运行受影响 product tests、`bun run typecheck:product`、`bun run lint:product`，以及 omitted/three-policy/prerequisite-conflict/comparison-unavailable/empty/incomplete/output-failure formal-entry smoke。
- [x] 5.4 运行真实 `quality:check`、`quality:full-check`、`quality:gate`、`bun run validate` 与 `bun run verify:vibe-check-workspace:required`；证明既有 consumers 保持非阻断，并记录 regression gate evidence 与 exit。
- [x] 5.5 运行 OpenSpec strict validation，并汇总 completeness、quality status、GateResult、process outcome、artifacts 与 exit `0` / `1` / `2` / `3` 的组合证据。
