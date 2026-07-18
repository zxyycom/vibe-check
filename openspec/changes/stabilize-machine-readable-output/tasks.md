本 tasks 将 current-product machine contract 拆成可验证步骤；当前 change 仅在 `openspec/changes/stabilize-machine-readable-output/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## 1. 阻塞级实现前审计

- [ ] 1.1 审计 proposal、design、output/test-fixtures deltas 与本 tasks 是否围绕“既有 metrics/warning artifacts 成为唯一 versioned machine contract”这一核心句；确认 `make-scan-completeness-observable` 与 `add-configurable-quality-gates` 已完成、验收并归档，最终 `QualityMetrics` / `WarningRecord` models 已进入 main specs，且本 change 未增加平行 result artifact、JSON stdout 或 scanner-private fields。该门禁完成前不得执行任何 2.x 及后续实现任务。
- [ ] 1.2 盘点 `metrics.json`、warning streams、pre-contract `"0.4.0"`、retired Rust schema/examples，以及 CI annotation、workspace verifier、dogfood scripts 等全部 producer/consumer；记录 current/retired ownership 和迁移表。
- [ ] 1.3 固定 v1 字段、requiredness、types、nullability、closed enums、单位、ordering 与 semantics 清单，并确认 dynamic maps、timestamps、paths 和 tool versions 的 schema/example 处理方式。

## 2. Versioned models and schemas

- [ ] 2.1 将 metrics identity 改为 `vibe-check.metrics.v1`，为每个 warning record 增加必填 `vibe-check.warning.v1` identity，并更新 TypeScript model/invariant validation。
- [ ] 2.2 创建 `docs/schemas/vibe-check-metrics.schema.json`，完整覆盖归档后最终 `QualityMetrics`、completeness、quality 与 gate records。
- [ ] 2.3 创建 `docs/schemas/vibe-check-warning.schema.json`，覆盖共享 warning record、accepted reason、comparison 与 location fields。
- [ ] 2.4 实现 producer schema validation 与 actionable error mapping，拒绝 unknown token、missing/invalid field 和 invalid enum。
- [ ] 2.5 实现 cross-artifact validator，证明 changed/all NDJSON 与 metrics channels 的 length、order 和 records deep-equal。
- [ ] 2.6 增加 valid v1 与 unknown version、field mutation、enum mutation、NDJSON parse、order/content mismatch 的 unit tests。

## 3. Current-product examples

- [ ] 3.1 在 `docs/examples/artifacts/` 生成 deterministic complete-passed、legitimate-empty、complete-warning、gate-failed 与 runtime/completeness-failed examples。
- [ ] 3.2 为每组 applicable example 生成对应 changed/all warning streams，并用生产 schema/invariant validator 验证。
- [ ] 3.3 为 dynamic timestamp、absolute path、commit 与 tool version 使用文档化 fixture values，确保重复生成无 drift。
- [ ] 3.4 将 current examples 接入 docs/product validation，同时保持 retired `docs/examples/json/` 的历史 ownership 可辨识。

## 4. Consumer migration

- [ ] 4.1 让 CI annotation consumer 验证 v1 identity并只读取 schemas 声明的 stable fields。
- [ ] 4.2 让 workspace verifier 与 dogfood consumer 验证 v1 identity、拒绝 unknown/invalid versions，并移除任何 console/Markdown/raw scanner parsing。
- [ ] 4.3 增加正式入口 producer-to-consumer acceptance，证明 valid v1 成功、unsupported contract fail closed。
- [ ] 4.4 确认 producer 与 repository consumers 原子迁移且不 dual-write `0.4.0` 与 v1 artifacts。

## 5. Documentation and verification

- [ ] 5.1 更新 Output、Quality Metrics、CLI、Testing、CI/Script Tooling owner materials、schema/example index、navigation 与 case ledger，明确 current v1 和 retired Rust contract。
- [ ] 5.2 运行 schema/example/docs validators、product unit/entry tests、typecheck、lint 与 cross-artifact mutation tests。
- [ ] 5.3 运行 `bun run validate`、`bun run verify:vibe-check-workspace:required` 与真实 quick/full scans。
- [ ] 5.4 对生成 artifacts 运行 independent schema/NDJSON validation，并重放 CI annotation、workspace verifier 与 dogfood consumers。
- [ ] 5.5 运行 OpenSpec strict validation，并汇总 artifact identity、schema、cross-artifact 与 consumer compatibility 证据。
