# Tasks

先以当前 owner 与证据固定 public/runtime contract，再按 `handoff: true` → Definition → settlement/store → readback 顺序实施，最后闭合 publication、文档和 installed candidate。

## Readiness

- [x] 0.1 **证据 owner gate：** Test Evidence 账本一致；新增 handoff 使用独立 `WB-RUNTIME-DEPENDENCY-HANDOFF-001`，Definition、failure、string observation、machine/diagnostic absence 与 installed declarations 分别扩展既有 owner Cases。
- [x] 0.2 **Contract seam gate：** `Check`/`CheckResult`、`defineCheck` overload、Definition check-tree、terminal parsing/Core settlement、execution finalization 与 dependency reader 均有明确 owner；`handoff: true` declaration、non-null object/function grammar、provider-object success/error union 和 string/list compatibility 已固定，无待决 contract。
- [x] 0.3 **协调 gate：** 本 Change 没有其他 Change 的硬前置；project-change flags、batched project files 或 fail-fast 若与其并行实施，必须按共享 Definition/check-execution owner 串行合入并重跑受影响验证。

## Implementation

- [x] 1.1 在 `src/check/**` 以 `defineCheck({ handoff: true })` 作为唯一公开声明，内部注册 provider identity；扩展 `CheckResult<FinalData, Handoff = never>` 与完整 `defineCheck` authoring matrix。用 product typecheck corpus 证明 options/preflight/parser 组合、callable/object handoff 自动推断、必填/禁止 branch 与 ordinary source compatibility；不新增 public helper/type。
- [x] 1.2 扩展 Definition check-tree validation、materialization 与 normalized Check，只在 executable `handoff: true` provider 保留内部 identity，拒绝 own-undefined/其它值/container 使用，并在 declarative snapshot/fingerprint 前显式剥离；补 direct Definition/fingerprint tests。
- [x] 1.3 扩展 terminal result adapter 与 settlement handoff，按 provider `handoff: true` 关闭 exact branch grammar；在 Core 接受 canonical `passed` 后才提交 `{ checkId, internalIdentity, value }`，覆盖 missing/extra/wrong-reference、failed/non-data branch、malformed data/Record、throw 与 cancellation 的无 partial commit。
- [x] 1.4 在 execution state 建立 invocation-private store 并以 `try/finally` 覆盖 completed/cancelled/admission-policy/invariant exits；实现 internal-identity-matched single publication、fan-out strict identity、repeated-Run isolation 与无 store field 进入 resolved execution。
- [x] 1.5 实现 `dependencies.get(provider)` 的 typed overload 和 `DependencyHandoffReadResult<Id, T>`，从 `handoff: true` provider 自动推断，只授权 effective direct `dependsOn`，固定 `dependency-not-declared` / `upstream-handoff-unavailable`；回归 direct `observes`、transitive、lookalike/foreign provider、string `get`、`list()` 和 canonical parser usage。
- [x] 1.6 在 owner seam 补 publication absence evidence：declarative fingerprint、Core/RunResult 与 machine v4 不含 internal identity/handoff，dependency diagnostics 不读取或总结 handoff；不为未接收新字段的 cache/aggregation/progress 增加重复 adapter 或名义测试。
- [x] 1.7 更新 `docs/api-mechanics.md`、dependency/custom-Check guides、四份 internal owner、package-root JSDoc/exports、public API inventory 与 changelog；投影一份 Map/typed-bytes 示例，明确 `handoff: true` 是最小声明、内部 WeakMap identity 不公开、provider parser 仍只处理 canonical data，store clearing 不等于 disposer。
- [x] 1.8 新增/更新 Semantic Cases，并同步 package API projection、external-consumer type/runtime/docs fixtures；证明 installed package 以 `handoff: true` 自动推断 read 类型、取得 strict-equal identity，且 published Run/machine/docs contract 无 private value。
- [x] 1.9 在实现、owner 与证据全部闭合后核对长期方向完整成为 current fact，并将 `260909-provide-invocation-private-dependency-handoff` 标记为 aligned；若只交付部分方向则保持 unaligned，不用任务进度代替事实审查。

## Verification

- [x] 2.1 运行最窄 Definition typed-provider/validation/fingerprint、terminal settlement、resolved dependency/cancellation、machine v4、diagnostic 与 package API inventory 测试，并运行 `bun run typecheck -- product`。
- [x] 2.2 运行 `bun run test-evidence -- check --root .`、`bun run decisions -- check`、`bun run docs:api`、`bun run validate -- docs`、`bun run lint -- product` 和默认 `bun run check`，闭合 current source、Decision、Cases、docs/material 与 required candidate。
- [x] 2.3 运行 `bun run check -- --all`，验证 exact candidate artifact、published declarations/docs，以及 ancestry-external Node consumer 的类型、runtime identity、cleanup 边界和 publication absence。
