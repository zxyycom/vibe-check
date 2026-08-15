# Tasks

Readiness 先让长期 decision owners 与目标 API 对齐；Implementation 再迁移数据模型、辅助函数、parser、公开契约和证据；Verification 最后逐项证明 proposal 的成功标准。

**Dependency rule:** Readiness 已完成，可以进入 `1.x`。implementation 不得用 compatibility layer、private brand 或 copy recovery 恢复旧 descriptor model；三条新 decisions 在完整事实落地前保持 `unaligned`。

## Readiness

- [x] 0.1 已确认目标模型：Product 与项目作者使用同一套 Check definition mechanism；内置 Check 只是 Product 预先构造、带完整 defaults 的普通 Check 数据。
- [x] 0.2 已确认公开交互：使用独立 `replace(check, replacement)` / `append(check, additions)` functions；内置对象不需要 value-owned methods、private brand、self-validation 或 frozen identity。
- [x] 0.3 已读取 Configuration、composable-tree / built-in-options / field-aware-adjustment decisions、current implementation、Check tree parser、current public contract、publication naming decision 与下游 package Plan，并定位 owner migration targets。
- [x] 0.4 已按 `test-evidence-review` 读取测试策略、Case maintenance、`WB-PROJECT-DEFINITION-001` 与目标 tests，并运行起点 `bun run test-evidence:check`；实施保留 typed patch、replace/append semantics、non-mutation、invalid-input/accessor safety、normalization、custom routing 和 fingerprint evidence。
- [x] 0.5 已按 `decision-records` 核对直接冲突：aligned field-aware adjustment decision 要求 value-owned methods并拒绝 package helpers；unaligned package-surface direction 和下游 Plan 要求 exactly two callable exports。
- [x] 0.6 已确认 helper scope：`replace` / `append` 只支持 Product-owned built-in Checks；custom Check author 继续拥有并构造自己的完整 data、functions、binding 和 options policy。
- [x] 0.7 已通过 `decision-records` 建立 `use-standalone-built-in-check-adjustment-functions` 为 `active + unaligned` 后继并归档旧 method decision；已确认 composable-tree contract 无语义冲突，archived built-in-options predecessor 无需改写。
- [x] 0.8 已建立 `expose-built-in-check-values-and-adjustment-functions` 与 `confirm-built-in-check-and-adjustment-names-before-publication` 两条 `active + unaligned` 后继，归档 exactly-two-callable 与旧 naming directions，并通过 `bun run decisions:check`。

## Implementation

- [ ] 1.1 建立唯一的内置定义表和普通 `BuiltInCheck` family：保留 recognized identity、canonical metadata、完整 typed default options、optional scheduling fields 与 private binding lookup，移除 value-owned methods；使用 `BuiltInCheckById` mapping 或等价 overloads 避免 literal-default return typing。
- [ ] 1.2 实现顶层 pure `replace` / `append`，共享 safe built-in parsing、内置定义查询和 result construction；保持 scalar/fixed replacement、omitted-branch preservation、open-map whole-field replacement、scheduling replacement，以及 `dependsOn` / `mutex` append+stable-dedupe，且不修改输入或 shared defaults。
- [ ] 1.3 让 Check tree parser 对 node 执行一次 safe plain-record snapshot，再按公开字段路由 group、built-in 和 custom；built-in 以 `checkId` 校验 canonical metadata/options 并解析 private binding。删除 `descriptorData`、recovery-only `descriptorInputs`、dynamic receiver、`materializeBuiltInDescriptor` 和 descriptor copy reconstruction。
- [ ] 1.4 更新 `src/product/public-contract/current.ts` 及 tests：记录 `defineConfig` construction、`run` execution、`replace` / `append` Check adjustment 四个 function exports，以及三个内置 values 和 `BuiltInCheck` type；不再保留 exactly-two-callable inventory。
- [ ] 1.5 更新 `docs/configuration.md` 和下游 `changes/establish-api-only-npm-product-boundary/**`：示例使用 `replace(fileMetrics, patch)` 与 `append(replace(...), additions)`；runtime entry、declarations、inventory 和 exact-tarball acceptance 使用同一 public surface。
- [ ] 1.6 更新 target tests 与 `WB-PROJECT-DEFINITION-001`：覆盖三个内置 Checks 的 helper types/runtime behavior、function composition、input/default non-mutation、合法 unfrozen plain copy、invalid data/patch/accessor/Proxy fail-closed、custom routing 与 declarative fingerprint；删除 methods、enumerability、receiver 和 issued/non-issued provenance assertions。

## Verification

- [ ] 2.1 运行最窄 built-in adjustment、Check tree normalization、Project Definition / Package Run pre-work 和 current-public-contract tests；证明 defaults、field-aware replace、append/dedupe、function composition、non-mutation、structural acceptance、custom routing 和 fail-closed behavior。
- [ ] 2.2 测试或 Case 修改前后运行 `bun run test-evidence:check`，并审计 retained entities 的独立证明价值；确认 Case 不再引用 method/issuance assertions。
- [ ] 2.3 运行 Product typecheck、lint、definition/run target tests 与 import-boundary audit；搜索 current source 和非历史 docs，确认不存在 `descriptorData`、recovery-only `descriptorInputs`、dynamic receiver、`materializeBuiltInDescriptor`、value-owned `.replace/.append` 或 issued-descriptor validity。
- [ ] 2.4 运行 `bun run decisions:check`，并对 Configuration decisions、Product Contract decisions、current public contract、Configuration 与下游 package Plan 做 owner-to-artifact audit；证明 names、exact exports、examples、declarations 和 acceptance 一致。
- [ ] 2.5 运行 `bun run validate:docs`、本 Change `change-plan -- check`、`bun run validate:diff` 与 `bun run verify:vibe-check-workspace:required`；若实际修改范围触发项目声明的 full verification 条件，再运行对应 full gate。
