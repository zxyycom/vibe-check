# Tasks

任务先闭合内部policy与directed graph，再建立最小trusted selector contract、guard和console归属，最后证明公共扩展不能越过Scheduler不变量。

## Readiness

- [ ] 0.1 确认`extract-scheduler-admission-selection-policy`已归档，`require-passed-dependencies-and-observe-outcomes`已闭合publicgraph所需的directed readiness vocabulary，并记录performance diagnostics与learned policy的实施顺序。
- [ ] 0.2 使用Decision Records建立或演进trusted caller-runtime、priority、fingerprint和console router判断，固定candidate-only selector、id/version责任、fault fallback与非sandbox边界。
- [ ] 0.3 按`test-evidence-review`恢复Definition function、fingerprint、Scheduler guard、console capture、diagnostic和installed consumer Case owner，确认publicview没有复制privateenginecontract。

## Implementation

- [ ] 1.1 从package root提供`defineAdmissionPolicy`和最小supporting types，扩展closedstatic/customDefinition grammar、defaults、validation、normalization、deep-freeze、declarativeprojection与fingerprint。
- [ ] 1.2 在preparedgraph闭合后从privateSchedulerfacts投影并deep-freezepubliclayer、candidate、graph、running/settled和capacityview，排除options、functions、data、Records、messages、logger、clock、signal与mutablecollections。
- [ ] 1.3 将同步`selectNext`适配到privatepolicy边界，只接受candidate ID或undefined delegation；保持reservation、hard layer、capacity和imperativeguard优先。
- [ ] 1.4 实现throw、thenable、malformed和non-candidatefault的staticfallback及first-fault invocation disable，确保不重复hook副作用或形成新Run result branch。
- [ ] 1.5 为custom policy增加独立console capture context与有界diagnostic/timing，保持Check message、progress、machine和diagnostic failure owner不变。
- [ ] 1.6 更新Configuration、Architecture、API mechanics、testing、public inventory与installed consumer example，明确trusted host风险、version责任、undefinedfallback和不支持的lifecycle hooks。

## Verification

- [ ] 2.1 运行Definition/helper type inference、closed validation、function preservation、id/version fingerprint、explicit/omitted static canonicalization与package declaration tests。
- [ ] 2.2 运行valid selection、undefined delegation、各fault分支、invocation-local first-fault disable、frozeninput、stablearrayorder、reservation/layer/capacityguard、cancellation和shared-closure overlappingRun Scheduler tests。
- [ ] 2.3 运行policy console capture、direct process-stream边界、diagnostic disabled/enabled、hook timing anomaly与logger failure containment tests，证明Check messages、progress和RunResult不变。
- [ ] 2.4 运行真实installed consumer和public inventory/example validation，并运行`bun run test-evidence -- check --root .`。
- [ ] 2.5 运行format、typecheck、lint、dependency/public-entry检查和`bun run verify:vibe-check-workspace:required`；公共contract与output边界闭合后运行full Gate。
- [ ] 2.6 按编码规范审阅public/privateprojection、trusted callback containment、exhaustive unions与文件职责，并用AI-ready审阅确认实现者不会把selector误解为dependency、wait、settlement或dynamic Task hook。
