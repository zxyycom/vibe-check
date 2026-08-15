# Tasks

Readiness confirms the formal supported contract. Implementation performs a local hard cut of descriptor recovery. Verification proves retained authoring behavior and the explicit issuance boundary.

**Dependency rule:** complete tasks 0.3–0.5 before `1.x`. 用户已确认 spread-copy chaining 不属于目标 API；task 0.4 找到的现有引用进入 migration inventory，不重新打开兼容性决策，也不保留 shim。

## Readiness

- [x] 0.1 已确认用户目标：`.replace/.append` 是正式 API；`{ ...descriptor }.replace()` 不需要支持。
- [x] 0.2 已读取 Configuration、field-aware adjustment decision、descriptor implementation/patch validation、Project Definition tests、current public contract 与下游 package acceptance；已确认本 Change 可独立于 Task/Core 收敛。
- [ ] 0.3 修改测试前按 `test-evidence-review` 恢复 built-in descriptor、Check tree 与 Project Definition Case ledger；区分必须保留的 typed replace、append/dedupe、immutability、normalization/fingerprint evidence 与待删除的 spread-chain evidence。
- [ ] 0.4 核对 current public-contract source、generated declarations、Configuration/examples 和 package exact-tarball acceptance 中的 enumerable methods、borrowed `this` 或 spread-copy recovery 引用；逐项记录 target owner、hard-cut 修改和验证入口，不把 current-state reference 当成 compatibility blocker。
- [ ] 0.5 按 `decision-records` 核对 `use-field-aware-built-in-check-adjustments` 只承诺 field-aware immutable API；在无需维护 decision 的情况下运行 `bun run decisions:check`，不得为了实现简化新建无必要 decision。

## Implementation

- [ ] 1.1 由 canonical input/state 创建 frozen Product-issued descriptor；附加 closure-bound、non-enumerable `.replace/.append`，并确保每次调用返回新的 issued descriptor，保持 descriptor-specific TypeScript patch typing。
- [ ] 1.2 让 materialization 只接受 exact Product-issued object，并以 private marker 读取 canonical data；删除 global `descriptorInputs`、dynamic-`this` receiver、Reflect/property-descriptor scan 与 copied-metadata reconstruction。
- [ ] 1.3 保持 field-aware semantics：fixed/scalar replacement、omitted branch preservation、open-map whole-field replacement、local scheduling replacement，以及 `dependsOn`/`mutex` append+stable-dedupe；不引入 generic deep merge。
- [ ] 1.4 删除 spread-copy chaining compatibility 与对应旧测试；新增或更新 tests，使 spread copy 没有 adjustment methods，且任何 non-issued object claiming `kind: "built-in"` 在 Check tree/`defineConfig` fail closed；合法 custom node 继续按自身 closed contract 验证。
- [ ] 1.5 同步 Configuration、current public-contract、examples 与 Case materials，说明 Product-issued identity、supported chains、non-enumerable methods 和 non-issued built-in fail-closed boundary；只读核对 package Change，不修改其 artifacts。

## Verification

- [ ] 2.1 运行最窄 descriptor adjustment、Project Definition/Check tree normalization 与 public-contract tests；证明 built-in identity/defaults、typed replace、append/dedupe、immutability、chaining、private materialization 和 declarative fingerprint 保持预期。
- [ ] 2.2 在测试修改前后运行 `bun run test-evidence:check`；证明删除的 spread-chain Case 不再是产品义务，保留 Cases 仍独立覆盖 field-aware behavior、invalid closed input、accessor safety 与 descriptor provenance。
- [ ] 2.3 运行 Product typecheck、lint、definition/run target tests 与 import-boundary audit；搜索确认不存在 `descriptorInputs`、dynamic receiver 或 Reflect/property-descriptor recovery path，且 methods 不进入 enumerable declarative data。
- [ ] 2.4 对 Configuration、current public contract、generated declarations、examples 与 package exact-tarball acceptance 做 owner-to-artifact audit；证明 package-facing supported chains 不依赖 spread behavior。
- [ ] 2.5 运行 `bun run decisions:check`、本 Change `change-plan -- check` 和 `bun run verify:vibe-check-workspace:required`。若实施期间实际修改了 decision、machine schema 或 package artifacts，则运行 `bun run verify:vibe-check-workspace:full`。
