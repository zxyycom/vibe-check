本 tasks 将 opt-in quality gate 拆成可验证步骤；当前 change 仅在 `openspec/changes/add-configurable-quality-gates/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## 1. 阻塞级实现前审计

- [ ] 1.1 审计 proposal、design、quality-metrics/CLI/output/test-fixtures deltas 与本 tasks 是否围绕“调用者显式选择哪个 normalized warning channel 可以阻断”这一核心句；确认 `make-scan-completeness-observable` 已完成、验收并归档，main specs 已包含最终 completeness contract，且本 change 未重新定义 warning generation、stable schema 或 scanner behavior。该门禁完成前不得执行任何 2.x 及后续实现任务。
- [ ] 1.2 用正式入口保存 omitted gate、warning exit `0`、`--verification-output` 只改变显示的当前证据，并固定 default `never` 的兼容预期。
- [ ] 1.3 盘点所有读取 Product CLI exit/status 的 dogfood、CI 与 workspace consumers；记录它们如何区分 `0` / `1` / `2` / `3`，并确认本 change 不替既有 invocation 静默增加非 `never` gate。

## 2. Gate model and evaluator

- [ ] 2.1 定义 `GatePolicy`、`GateResult`、evaluated channel、status、counts、blocking warnings 与 not-evaluated reason，并为无效组合增加 invariant validation。
- [ ] 2.2 实现 `never`、`all`、`changed`、`regressions` 到 normalized warning channels 的单次 evaluator。
- [ ] 2.3 在不改变 channel membership 的前提下，从 blocking set 排除具有非空 `acceptedReason` 的 warnings。
- [ ] 2.4 增加 policy/channel、accepted warning、empty channel、complete/empty 与 failed completeness 的 evaluator unit tests。

## 3. CLI and exit semantics

- [ ] 3.1 增加 `scan --gate <never|all|changed|regressions>` parser、default `never` 与完整 help text。
- [ ] 3.2 将 normalized policy 从 Product CLI 传入 quality core，证明 profile、launch cwd 与 `--verification-output` 不覆盖 policy。
- [ ] 3.3 实现 input/config `3`、runtime/completeness/output `2`、gate `1`、success `0` 的固定 precedence，并确保 gate 只在 artifacts 写出和验证后决定 exit `1`。
- [ ] 3.4 增加 omitted、各显式 policy、invalid policy、runtime failure 与普通 top-level error 的 CLI tests。

## 4. Output and consumers

- [ ] 4.1 将同一 `GateResult` 加入 metrics/report data，并让 `metrics.json` 记录 policy、channel、status、counts、blocking warnings 与 optional reason。
- [ ] 4.2 在 Markdown report 与 console completion 中区分 quality warning、gate failed 与 gate not-evaluated，且不重新过滤 warning。
- [ ] 4.3 证明 `warnings.ndjson` / `warnings-all.ndjson` 不因 selected gate 删除 accepted、non-selected 或 non-blocking records。
- [ ] 4.4 更新 repository consumers 以显式识别 exit `1` 与 gate data，同时保持现有 invocation 未显式 opt in 时使用 `never`。

## 5. Documentation and verification

- [ ] 5.1 增加正式入口 gate acceptance matrix，覆盖 all-only、changed、regression、accepted、empty、incomplete 与 output/exit consistency，并维护 fixture ownership 与唯一 `@case` markers。
- [ ] 5.2 更新 Quality Metrics、CLI、Output、Testing、CI/Script Tooling owner materials、navigation 与 case ledger。
- [ ] 5.3 运行 product unit/entry tests、typecheck、lint，以及 omitted/each-policy/invalid/incomplete smoke。
- [ ] 5.4 运行 `bun run validate` 与 `bun run verify:vibe-check-workspace:required`，确认未显式 opt-in 的既有 dogfood behavior 不变。
- [ ] 5.5 运行 OpenSpec strict validation，并汇总 completeness、quality status、gate result、artifact 与 exit code 的组合证据。
