# Tasks

本 Plan 先用 package consumer、execution-input consumer、policy/Gate 和 presentation consumers 固定公共边界，再执行 public/Core/machine hard cut。任何迁移问题都回到 owning capability；不得把 built-in semantics 重新加入 base Record 或 base execution context。

## Readiness

- [ ] 0.1 建立 source、declaration emit、candidate package 与 ancestry-external consumer probe，固定 `records.report({ id }, data)`、top-level export inventory 和 generic `RunResult.snapshot.records[].data`；证明 local interface/`satisfies` 写入与 Check-owned parser 读取不需要 Record generic/catalog/registry。
- [ ] 0.2 逐项追踪 `CheckExecutionContext.project`、Run Controls、default Checks、Project Gate 与 external consumer 对 `root`、`flags`、`changedFiles`、`files`、`cache`、`comparison` 的使用；按 owner/lifecycle/common-consumer test 形成矩阵，prototype 最小 shared `invocation`，并把需要 visible upstream output/type relationship 的项目显式交给 [`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/)；将本 Change 的 exact context signature 写回 `design.md`。
- [ ] 0.3 逐项追踪 `recordTypes`、field operands、acceptance/views、`reportReference`、reference facts 与 relation predicates；把每个 named policy/Gate consumer映射到 producing Check outcome/verdict 或删除结果，并将 exact Check-fact policy grammar写回 `design.md`。
- [ ] 0.4 逐项追踪 terminal report、console、GitHub annotation、machine examples 与 result-presentation Draft；明确哪些输出等待显式 presentation、哪些需要 private Check-owned parser/projection、哪些 generic fallback只显示 owner/count/IDs，并将迁移路径写回 `design.md`。
- [ ] 0.5 在修改原生测试前运行 `bun run test-evidence -- check --root .`，建立 Definition、execution context、Record/Core、policy/Gate、machine、default Checks、Project Gate、parser/projection consumer 与 package consumer 的 Case/Owner/Proves impact map。

## Implementation

- [ ] 1.1 在 public authoring owner 实现 closed `RecordIdentityInput { id }` 与 `records.report(identity, data)`；删除 `recordTypes`、Record field declarations、`CheckRecordType`、identity extractor 与 reference reporter，不新增替代 registry/helper/Schema 或默认 top-level reporter types。
- [ ] 1.2 按 Readiness 结论实现本 Change 拥有的最小 `CheckExecutionContext` 与 shared invocation facts；从 Run Controls、callback context、Definition normalization 与 execution plumbing 删除 common comparison/reference inputs，并避免把 `files`/`cache` 等 built-in capability 无证据地保留为 base facts。本任务不实现 typed Check dependency outputs。
- [ ] 1.3 在 Record/Core owner 实现 detached canonical data snapshot、deep-freeze、Check-local ID validation、composite `{ checkId, id }` ownership、duplicate/conflict、late write 与 contained failure；将 Core Record 收敛为 `{ checkId, id, data }`。
- [ ] 1.4 按 Readiness 结论把 DecisionPolicy/Gate 收敛到 Product-owned Check outcome/verdict facts；删除 record type selectors、custom field operands、reference requirements/relations 与 record-aware evidence，不以 data path、kind 或 Schema 重建同一能力。
- [ ] 1.5 实现 machine v4 minimal Record rows、canonical ordering、fingerprints、serializer 与 complete-set validators；删除 v3 Record catalog、opaque ID recomputation、reference/acceptance/views，并同步 schemas、examples 与 independent validators。
- [ ] 1.6 迁移 default Checks、repository Project Definition、Project Gate、fixtures 与 package materials；每个 Check 使用 local data types、author IDs 与明确 dependencies，仅在实际 consumer 需要时提供 local/private parser或presentation projection。
- [ ] 1.7 更新 Architecture、Configuration、Quality Metrics 与 Output owners，明确 Record API、execution input responsibility、generic readback、Check-owned parser、narrowed policy 和 machine v4；同步 presentation/package Changes 的输入关系。

## Verification

- [ ] 2.1 运行最窄 public authoring/declaration/package tests，证明无 Record catalog 的 custom Check、two-argument report、local typing、generic readback、Check-owned parser、negative identity/data cases、options inference、composition 与 isolated installed consumer。
- [ ] 2.2 运行最窄 execution-context/default/Gate tests，证明最终 context只包含 Readiness批准的 invocation facts/capabilities，Check-specific dependencies仍可实际使用，comparison/reference输入已删除且 cancellation lifecycle保持。
- [ ] 2.3 运行最窄 Record/Core tests，证明 canonical snapshot immutability、Check-local identity、cross-Check same-ID legality、same-Check duplicate/conflict、late write、contained failure 与 outcome independence。
- [ ] 2.4 运行最窄 policy/Project Gate tests，证明 Gate只消费目标 Check facts，comparison/reference/record-type/data-operand grammar已删除，current required semantics由 owning Checks承担。
- [ ] 2.5 运行最窄 machine/docs/output tests，证明 v4 `{ checkId, id, data }`、generic canonical data、composite uniqueness、no identity recomputation、Records set fingerprint、v3 rejection，以及 presentation/annotation不再把旧 fields当作 Core contract。
- [ ] 2.6 运行修改后的 `bun run test-evidence -- check --root .`，确认受影响原生测试实体与 Case/Owner/Proves闭合。
- [ ] 2.7 运行 `bun run typecheck`、`bun run lint`、`bun run format -- check`、`bun run validate -- docs`，以及 dependency、product-import、public-contract 与 package-entry checks。
- [ ] 2.8 运行 `bun run verify:vibe-check-workspace:required`，覆盖 Project Definition dogfood、Project Gate、public package、machine v4 与 current output consumers；失败时不通过恢复旧 Record/context contract规避。
- [ ] 2.9 逐项复核 Proposal Success Criteria、Design Readiness conclusions、长期 Decisions 与稳定 owners；只按实际证据勾选 tasks，在完整方向成为当前事实后核对 Decision alignment，并在另获归档授权前保持 Change active。
