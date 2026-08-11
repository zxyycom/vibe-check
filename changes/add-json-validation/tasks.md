# Tasks

任务按基础接缝核对、JSON 领域实现、产品接线和证据闭合推进；只有真实实施与验证完成后才勾选对应项。

## Readiness

- [x] 0.1 已将 proposal、design 和 tasks 核对为同一目标，并按当前活动决策统一使用 CheckResult、QualityRecord、Project Definition 与 Check-owned policy。
- [x] 0.2 已核对当前 `docs/` owners、`src/product/**` 实现、四个基础 Change 依赖和历史 strict JSON 风险；Affected Owners 与当前稳定 owner 一致。
- [x] 0.3 已固定 exact-input arbitration、strict grammar、public identities、record fields、result/failure、resource、comparison、cache和测试边界；没有阻塞实施的开放问题。

## Implementation

- [ ] 1.1 在基础 Changes 的实际 ports 就绪后，注册 `json-validation` CheckDefinition、三个 record type、private binding、neutral built-in reference和 owner-validated `maximumBytes` / file-policy input；不建立平行 identity或policy入口。
- [ ] 1.2 按测试证据流程先建立 strict JSON document service 的失败证据，再实现 fatal UTF-8、BOM、RFC 8259 grammar、任意 root、完整消费、duplicate decoded keys、source pointer/location和资源预算。
- [ ] 1.3 从 normalized inventory构造稳定 exact-input / claimed-path plan并接入静态 per-file TaskPlan、CheckManager acknowledgement、RecordManager sink、CheckResult和 execution diagnostic；与 JSON Schema Check 共享 document service且不重复报告 claimed inputs。
- [ ] 1.4 实现三个 record catalogs 的 closed fields、location-independent identity、deterministic ordering、current/named-reference matching和单文件 cache，确认 Core/Output不增加 JSON 领域分支。
- [ ] 1.5 同步 Project Definition authoring/starter、Configuration、Scan Scope、Architecture、Output、测试 Cases、canonical Check/Record materials和实际 consumer 接线。

## Verification

- [ ] 2.1 运行最窄 parser、selector、policy、identity、comparison、cache、CheckRun/CheckResult/Record 和正式 CLI tests；覆盖合法 root、invalid UTF-8/BOM/comments/trailing comma/duplicate/oversize、JSONC exclusion、空输入及 execution failure。
- [ ] 2.2 运行 `bun run test-evidence:check`、产品 import boundary、typecheck、lint、完整 product tests、`bun run validate` 和 `bun run verify:vibe-check-workspace:required`，修复范围内失败。
- [ ] 2.3 用 adversarial fixtures 和最终 diff 复核没有 root traversal、双 parser、重复 schema-owned record、绝对路径、原始 JSON、backend wording或无关 cache input；确认 Success Criteria、owner同步和全部任务证据后再评估 lifecycle，未经授权不归档。
