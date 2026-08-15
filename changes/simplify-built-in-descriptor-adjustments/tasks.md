# Tasks

Readiness 先让长期 decision owners 与目标 API 对齐；Implementation 再迁移数据模型、辅助函数、parser、公开契约和证据；Verification 最后逐项证明 proposal 的成功标准。

**Dependency rule:** Readiness、Implementation 和 Verification 已按实际证据闭合。Configuration decision 已随当前事实标记 `aligned`；两条 package-facing Product Contract decisions 保持 `unaligned`，直到下游 package entry、declarations 与 exact-tarball acceptance 真正落地。

## Readiness

- [x] 0.1 已确认目标模型：Product 与项目作者使用同一套 Check definition mechanism；内置 Check 只是 Product 预先构造、带完整 defaults 的普通 Check 数据。
- [x] 0.2 已确认公开交互：使用独立 `replace(check, replacement)` / `append(check, additions)` functions；内置对象不需要 value-owned methods、private brand、self-validation 或 frozen identity。
- [x] 0.3 已读取 Configuration、composable-tree / built-in-options / field-aware-adjustment decisions、current implementation、Check tree parser、current public contract、publication naming decision 与下游 package Plan，并定位 owner migration targets。
- [x] 0.4 已按 `test-evidence-review` 读取测试策略、Case maintenance、`WB-PROJECT-DEFINITION-001` 与目标 tests，并运行起点 `bun run test-evidence:check`；实施保留 typed patch、replace/append semantics、non-mutation、invalid-input/accessor safety、normalization、custom routing 和 fingerprint evidence。
- [x] 0.5 Readiness 审计曾识别与当前 helper-surface 方向直接冲突的既有判断；后继 decisions 接管具体 public direction，本 Change 不把旧 carrier 细节作为实现前提。
- [x] 0.6 已确认 helper scope：`replace` / `append` 只支持 Product-owned built-in Checks；custom Check author 继续拥有并构造自己的完整 data、functions、binding 和 options policy。
- [x] 0.7 已通过 `decision-records` 建立并对齐 `use-standalone-built-in-check-adjustment-functions`；`use-composable-check-tree-with-run-owned-bindings` 随后修订旧 tree decision，明确 normalization 只形成声明式模型、Package Run 构造 private binding。archived method、built-in-options 与旧 tree decisions 只保留被修订的历史依据。
- [x] 0.8 已建立 `expose-built-in-check-values-and-adjustment-functions` 与 `confirm-built-in-check-and-adjustment-names-before-publication` 两条 `active + unaligned` 后继，归档冲突的前序方向，并通过 `bun run decisions:check`。

## Implementation

- [x] 1.1 已由 `built-in-data-model.ts` 表达普通 `BuiltInCheck` 判别联合与 `checkId` 到 options/replacement 的类型关联；`built-ins.ts` 拥有唯一 canonical metadata/defaults 表、closed parser 与构造路由。逐 Check replacement algorithms 位于相邻模块，`run/built-ins.ts` 拥有 runtime factories/lookup；已删除无引用 value registry 和旧 descriptor type。
- [x] 1.2 已实现顶层 pure `replace` / `append`，共享 built-in parse、definition lookup 和 result construction；目标 tests 证明 fixed/open-map replacement、branch preservation、scheduling replacement、stable dedupe、组合与 non-mutation。
- [x] 1.3 已让每个 Check tree node 只执行一次 `snapshotClosedRecord` 后再路由 variants；built-in parser 只按 `checkId` 校验公开 data，Package Run pre-work 再由 `run/built-ins.ts` lookup 构造 private runtime binding。旧 WeakMap、receiver、materialization 和 copy reconstruction 已删除。
- [x] 1.4 已更新 current public contract 与 tests：四个 functions、三个 non-callable values 和 `BuiltInCheck` 使用同一 inventory，不再保留 exactly-two-callable 或 descriptor-method fields。
- [x] 1.5 已更新 Configuration、Architecture、repository Project Definition 和下游 package Plan；示例、runtime entry 目标、declarations 任务、inventory 与 exact-tarball acceptance 均使用 standalone helpers。
- [x] 1.6 已更新目标 tests 与 `WB-PROJECT-DEFINITION-001`；覆盖三种 typed variant、helper composition、non-mutation、unfrozen copy、closed-record symbol/non-enumerable/prototype、accessor/Proxy、custom routing 与 fingerprint，并移除 provenance/method assertions。

## Verification

- [x] 2.1 最窄 definition、Package Run、repository Project Run 与 current-public-contract tests 已通过；随后 `bun run test:product` 168/168 通过，覆盖目标 helper、tree、pre-work 和 routing 行为。
- [x] 2.2 测试/Case 修改起点与完成后 `bun run test-evidence:check` 均通过；186 个当前测试实体全部由 37 个 semantic Cases 承接，`WB-PROJECT-DEFINITION-001` 不再引用 method/issuance 语义。
- [x] 2.3 `bun run typecheck:product`、`bun run lint:product`、目标 tests 与 Product test 全部通过；focused search 仅在普通字符串处理和决策的历史/不采用说明中发现同名词，不存在旧 descriptor runtime 或 value-owned helpers。
- [x] 2.4 `bun run decisions:check` 与 owner-to-artifact audit 已通过；Configuration decision 已对齐，两个 package-facing decisions 明确保留给下游真实 entry/declarations/acceptance 后再对齐。
- [x] 2.5 `bun run validate:docs`、两个受影响 Change checks、`bun run validate:diff` 与 workspace required gate 已通过；因本次 hard cut 跨 source、contract、docs、tests 和下游 Plan，额外运行 full profile，9/9 checks 通过且 repository dogfood 为零 warning。
