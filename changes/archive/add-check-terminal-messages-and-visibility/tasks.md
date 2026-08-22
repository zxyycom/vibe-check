# Tasks

本 Change 已归档，Readiness、Implementation 与 Verification 的 17/17 项已按 public authoring、Definition、terminal settlement、RunResult、renderer、真实 Check adoption 和证据闭合的依赖顺序完成。下列勾选只保留形成时的产物与验证记录，不是当前实施指令。

## Readiness

- [x] 0.1 已记录用户对 terminal return attachment、structured payload、与现有 runtime 防护一致的 invalid containment、`RunResult` readback、visibility matrix、fingerprint 和 Check 按需采用方式的审阅结果，并同步 Proposal、Design、Decision 与 tasks 形成可执行 Plan。
- [x] 0.2 已审计 `custom-check`、closed snapshot、Core settlement、callback/execution 和 progress seams，并在 Design 冻结 exact result keys、`info | warning | error`、kebab-case code、non-empty message、无 hard cap、Core acceptance marker、颜色与 escaping；没有 collector、callback writer 或执行中 stream write。
- [x] 0.3 已审计 Definition normalization/fingerprint、RunResult branches 与 TTY/plain renderer，并在 Design 冻结 `visibility?: "always" | "attention"`、executable-only/default规则、`checkMessages` layout/canonical order、settled matrix、single-block write、ordinal/final accounting 与 writer-failure isolation。
- [x] 0.4 实施前已按 `test-evidence-review` 读取测试策略、Case owner 和目标测试；当时的 `test-evidence` check 证明 140 个 Bun 实体由 44 个 Cases 闭合。Design 已列明 Definition、failure/lifecycle、RunResult、progress、Gate 和 isolated-consumer Case 的复用、新增与 Proves 同步方式。

## Implementation

- [x] 1.1 在 `custom-check.ts` 增加 supporting `CheckMessageLevel`、`CheckMessage`、`CheckResultMessages`、`CheckVisibility` declarations，扩展四态 `CheckResult.messages` 与 `Check.visibility`；保持 `CURRENT_PUBLIC_CONTRACT.types` 和 package-root named exports不变并同步类型fixtures。
- [x] 1.2 在 Check tree authoring/materialization/normalization 增加 executable-only visibility：omitted/undefined为`always`，container或unknown value fail closed；`NormalizedCheckDeclaration.visibility`显式参与fingerprint，并证明omitted与explicit always相同、attention不同。
- [x] 1.3 新增 package-private `check-terminal-result.ts`，复用closed snapshots验证完整attachment并构造detached items；扩展Core author settlement返回`authorResultAccepted`，只在terminal和Record settlement均被接受时commit messages。
- [x] 1.4 将accepted messages加入execution state和private settled feedback；为completed、effect和execution-cancelled final-snapshot results增加canonical frozen `checkMessages`，按snapshot Check顺序和author item顺序展开，空集返回`[]`。
- [x] 1.5 重构TTY/plain/dumb renderer：始终显示TTY running row，仅隐藏attention passed+no-message settled row；一次write输出owning row与全部messages，使用info cyan/warning yellow/error red label、统一control escaping，并保持canonical completion counting与writer-failure isolation。
- [x] 1.6 更新Project Gate process Check：nonzero exit只附带`{ level: "error", code: "command-failed", message: safe exit/signal/transcript-basename text }`；保留现有Record和private transcript，fixtures拒绝stdout/stderr、完整路径及transcript内容泄漏。
- [x] 1.7 同步Configuration、Architecture、Quality Metrics、Output、public API inventory/declarations/examples、package candidate/isolated consumer owner，以及typed dependency、Gate authoring、log evidence、package documentation和active portfolio的handoff表述。
- [x] 1.8 按 Case 审阅结果新增或修改 owner-level tests，分别证明 terminal messages、visibility 与组合行为；任何 test rename/split/merge 同步 Case Owner/Proves。

## Verification

- [x] 2.1 运行最窄public-contract、Definition、Core/terminal adapter、check-execution和RunResult tests；覆盖四态、omitted/undefined/empty/单/多/长messages、三种level、code grammar，以及Proxy/accessor/`toJSON`/cycle/sparse/custom-prototype/non-finite adversarial matrix，证明无隐藏数量/长度拒绝条件。
- [x] 2.2 运行progress renderer/invocation/result-priority tests，覆盖TTY/plain/dumb、并行settlement、single-block writer failure、三色label、control escaping和完整visibility matrix；对比enabled/disabled/writer-failed的Core、Records、dependency/aggregation、duration/counts、machine v4与`checkMessages`边界。
- [x] 2.3 运行Project Gate process和isolated installed-package tests，证明无消息Check不变、nonzero failure的progress/`checkMessages`只含批准摘要、transcript材料不泄漏、code可识别、public declarations/runtime shape一致且named type roots未扩大。
- [x] 2.4 运行 `bun run test-evidence -- check --root .`、Product typecheck/lint/test、文档/链接/依赖/入口检查和 `bun run change-plan -- check changes/add-check-terminal-messages-and-visibility`。
- [x] 2.5 运行 `bun run decisions -- check` 与 `bun run verify:vibe-check-workspace:required`；全部行为和 owner 已对齐后再将 terminal-message/visibility Decision 标为 aligned，并记录下游 package documentation 与 Gate authoring handoff。
