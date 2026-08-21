# Tasks

本 Plan 先固定最小 reporter、Core 与直接消费者迁移，再执行 public/runtime/machine hard cut。Typed dependency、presentation 和其它 execution-input 迁移只接收 handoff，不进入本 Plan。

## Readiness

- [ ] 0.1 建立 source、declaration emit、candidate package 与 ancestry-external consumer probe，固定 `records.report({ id }, data)`、top-level export inventory 和 generic `RunResult.snapshot.records[].data`；证明 local interface/`satisfies` 写入与 Check-owned parser 读取不需要 Record generic、catalog 或 registry。
- [ ] 0.2 逐项追踪 `recordTypes`、field operands、acceptance/views、`reportReference`、reference facts、comparison inputs 与 relation predicates；把每个 policy/Gate consumer 映射到 producing Check outcome/verdict 或删除结果，并将 exact Check-fact policy grammar 写回 `design.md`。
- [ ] 0.3 逐项追踪 report、console、GitHub annotation、machine examples 与 package consumers；确定可以使用 owner/count/IDs generic fallback 的路径，并把需要 domain presentation 的路径明确交给 [`add-check-associated-result-presentation`](../add-check-associated-result-presentation/)。
- [ ] 0.4 在修改原生测试前运行 `bun run test-evidence -- check --root .`，建立 Definition authoring、Record/Core、comparison/reference removal、policy/Gate、machine、default Checks、output consumers 与 package consumer 的 Case/Owner/Proves impact map。

## Implementation

- [ ] 1.1 在 public authoring owner 实现 closed `RecordIdentityInput { id }` 与 `records.report(identity, data)`；删除 `recordTypes`、Record field declarations、`CheckRecordType`、identity extractor 与 reference reporter，不新增替代 registry、helper、Schema 或默认 top-level reporter types。
- [ ] 1.2 在 Record/Core owner 实现 detached canonical data snapshot、deep-freeze、Check-local ID validation、composite `{ checkId, id }` ownership、duplicate/conflict、late write 与 contained failure；将 Core Record 收敛为 `{ checkId, id, data }`。
- [ ] 1.3 从 Run Controls、callback context、Definition normalization 与 execution plumbing 删除旧 Record contract 拥有的 common comparison/reference inputs；不重命名、移动或删除其它 execution-context fields。
- [ ] 1.4 按 Readiness 结论把 DecisionPolicy/Gate 收敛到 Product-owned Check outcome/verdict facts；删除 record type selectors、custom field operands、reference requirements/relations 与 record-aware evidence，不以 data path、kind 或 Schema 重建同一能力。
- [ ] 1.5 实现 machine v4 minimal Record rows、canonical ordering、fingerprints、serializer 与 complete-set validators；删除 v3 Record catalog、opaque ID recomputation、reference/acceptance/views，并同步 schemas、examples 与 independent validators。
- [ ] 1.6 迁移 default Checks、repository Project Definition、Project Gate、fixtures、output consumers 与 package materials；每个 Check 使用 local data type、author ID 与领域 verdict，generic output 只消费安全 identity 信息。
- [ ] 1.7 更新 Architecture、Configuration、Quality Metrics 与 Output owners，明确 Record API、generic readback、Check-owned parser、comparison/reference removal、Check-fact policy 和 machine v4；向 typed dependency、presentation 与 package documentation Changes 写入已验证 handoff。

## Verification

- [ ] 2.1 运行最窄 public authoring、declaration 与 package tests，证明无 Record catalog 的 custom Check、two-argument report、local typing、generic readback、Check-owned parser、negative identity/data cases、options inference、composition 与 isolated installed consumer。
- [ ] 2.2 运行最窄 Record/Core tests，证明 canonical snapshot immutability、Check-local identity、cross-Check same-ID legality、same-Check duplicate/conflict、late write、contained failure 与 outcome independence。
- [ ] 2.3 运行最窄 configuration/run/policy/Project Gate tests，证明 common comparison/reference inputs 与 Record-aware grammar 已删除、current required semantics 由 owning Checks 承担，且其它 execution inputs 与 cancellation lifecycle 未被本 Change 迁移。
- [ ] 2.4 运行最窄 machine/docs/output tests，证明 v4 `{ checkId, id, data }`、generic canonical data、composite uniqueness、no identity recomputation、Records set fingerprint、v3 rejection，以及 generic renderer 不再把旧 fields 当作 Core contract。
- [ ] 2.5 运行 default Checks、repository dogfood、Project Gate、public-contract inventory、candidate package 与 ancestry-external consumer tests，证明所有直接消费者完成同一 hard cut。
- [ ] 2.6 运行修改后的 `bun run test-evidence -- check --root .`，确认受影响原生测试实体与 Case/Owner/Proves 闭合。
- [ ] 2.7 运行 `bun run typecheck`、`bun run lint`、`bun run format -- check`、`bun run validate -- docs`，以及 dependency、product-import、public-contract 与 package-entry checks。
- [ ] 2.8 运行 `bun run verify:vibe-check-workspace:required`，覆盖 Project Definition dogfood、Project Gate、public package、machine v4 与 current output consumers；失败时不通过恢复旧 Record contract 规避。
- [ ] 2.9 逐项复核 Proposal Success Criteria、Design Readiness conclusions、长期 Decisions 与稳定 owners；只按实际证据勾选 tasks，在完整方向成为当前事实后核对 Decision alignment，并在另获归档授权前保持 Change active。
