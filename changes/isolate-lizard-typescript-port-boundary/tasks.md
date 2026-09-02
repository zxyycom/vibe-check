# Tasks

任务按 Readiness、边界实施、evidence/profile 收口和验证顺序执行；checkbox 只在对应产物或命令证据存在后勾选。

## Readiness
- [x] 0.1 使用 `decision-records` 恢复相关长期方向，并建立 active+unaligned `isolate-lizard-port-behind-check-private-interface.md`；它只保存本 Change 之外仍有效的边界方向。
- [ ] 0.2 阅读 scanner-dependencies、functionMetrics guide、script-tooling、layout/package/legal owner、相邻代码/tests 和 Case owner；确认 port façade、Product adapter、Worker compiler-root、public export、test path classification 与 stable-doc owner。确认 `analyzer/**` 无收益改名不在范围内。
- [ ] 0.3 按路径审计 analyzer production/tests imports、Product deep imports、Worker/measurement/target-files data flow 与 evidence consumers；记录唯一调用链、port-root test allowlist、port 外 adapter-only test policy 和 archive-read baseline。
- [ ] 0.4 与 package/legal owner 确定 current evidence subtree、authoritative mapping、`licenses/**` relation、迁移清单、不可修改的 archive inputs 与 package staging impact。
- [ ] 0.5 采集 `bun run lint -- product`、`bun run format -- check`、`bun run typecheck` 与 `bun run verify:vibe-check-workspace:required` 的当前基线；从 required Gate 中记录 `duplicateDetection`、`fileMetrics`、`functionMetrics` 的结果，并用 `scripts/project/gate/definition.ts` 的 configuration tests 核对三者对 `src/**/*.ts` 的 product-source selection。据此形成最小 closed quality exception set；为每项例外记录 glob、rule/action、source-alignment 理由、upstream-sync review trigger，并确认 development/Gate selection 一致、保留检查与手写 façade/非翻译 Product/所有 tests 的适用检查覆盖。

## Implementation
- [ ] 1.1 在 `analyzer/**` 内建立唯一 port façade，收口 suffix capability 与已提供 source 的 Lizard-domain in-memory analysis；移除仅服务 Product 的 registry alias，保留 translated internal spellings/structure。
- [ ] 1.2 建立 port 外的 `src/package-checks/function-metrics/analyzer-adapter.ts`，使其成为 façade 唯一 production consumer，独占 Product support/error interpretation 与 Lizard-domain result → `FunctionMetric` mapping。
- [ ] 1.3 调整 target-files、measurement、Worker 及私有 contract，使其遵循 Product adapter 调用链；保持 path admission、case-insensitive suffix、failure/cancellation/resource 与 no-partial semantics。
- [ ] 1.4 新增或扩展按路径扫描 production/tests 的 fail-closed dependency/layout validation，证明唯一 façade/adapter consumer、禁止 Product deep import、允许的 port-root fidelity/unit test 深导入与不泄漏 public surface。
- [ ] 1.5 将 current identity/oracle/deviation evidence 迁至确定 owner，更新消费者以移除 archive reads，并将 identity/deviation coverage 闭合全部 translated core/extensions/readers/shared ranges；维持 legal inventory、source headers 和 package closure。
- [ ] 1.6 在 `scripts/development/lint.ts`、`format.ts`/`format-targets.ts` 与 `scripts/project/gate/definition.ts` 实现经 0.5 确认的精确 translated-only selection；为 development lint/format 和 Gate `duplicateDetection`、`fileMetrics`、`functionMetrics` 建立 configuration tests，证明它们使用一致 policy。将已证实必要的 exception set 编码为最小闭合集，并证明手写 façade、adapter、Worker、Check、tests 和其它非翻译 Product 仍受各适用普通检查覆盖。
- [ ] 1.7 更新 stable docs 与 native Cases，说明实际 private boundary、current evidence owner、profile、upstream-sync procedure 和 package-private status；不把 Change/archive 写成稳定规则 owner。

## Verification
- [ ] 2.1 运行 port façade、Product adapter、target-files、measurement、Worker、execution 与 dependency/layout 的最窄测试，证明调用链、test import policy、无反向依赖和 Product 行为不回归。
- [ ] 2.2 运行 core、extensions、readers/shared identity/deviation、oracle observations 与受影响 reader-family 的最窄验证，证明 current evidence 独立可用且无 `changes/archive/**` current read。
- [ ] 2.3 运行 port profile、`bun run lint -- product`、`bun run format -- check`、`bun run typecheck`、Gate `duplicateDetection`/`fileMetrics`/`functionMetrics` 及其 quality-target/config tests；证明 translated files 仅按确认 profile 被预期排除，手写 façade 与非翻译 Product 仍受各适用 development/Gate Check 覆盖，且 port correctness/identity tests 未受 selection 影响。逐项核对 exception ledger、保留 checks 与非-port source coverage。
- [ ] 2.4 运行 `bun run test-evidence -- check --root .`，同步并验证受影响 native Case 的 Owner、Proves 和 Topic relation。
- [ ] 2.5 运行 `bun run decisions -- check`、`bun run validate`、相关 package artifact/legal/public-API checks 与 `bun run change-plan -- check changes/isolate-lizard-typescript-port-boundary`，确认 stable owners、Decision 和 Change artifacts 一致。
- [ ] 2.6 运行 `bun run verify:vibe-check-workspace:required`；port/evidence/quality 重构完成后运行 `bun run verify:vibe-check-workspace:full`，记录未覆盖或环境阻塞的边界。
