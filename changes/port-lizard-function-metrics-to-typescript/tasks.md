# Tasks

先确认foundation并冻结fresh baseline，再按届时 Scan Scope owner 批准并交付的 exact inputs（下称 approved exact inputs）实施Product-owned TypeScript analyzers、接入function-metrics binding、hard cut Lizard runtime并完成parity/installed验证；只有实际产物与证据完成后才勾选 Implementation 或 Verification。

## Readiness

- [x] 0.1 已核对proposal、design与tasks形成可执行的fresh-baseline→TypeScript backend→hard-cut计划，且不重新定义foundation或public feature scope。
- [x] 0.2 已读取当前scanner/metrics owners、Lizard process/CSV实现与测试、直接相关活动决策、三个foundation plans和历史形成材料，并明确历史shape只作背景证据。
- [x] 0.3 已确认implementation依赖、supported-result目标、private Task/cache/reference seams、provenance/license gate与删除出口；`Open Questions`无阻塞实施的未决项。

## Implementation

- [ ] 1.1 确认Check/Record Core、Task orchestration和Project Definition已成为current owner/runtime seam；按`test-evidence-review`恢复function Check/Record、scanner、comparison/cache和failure Cases。
- [ ] 1.2 从届时formal function-metrics path和 approved exact inputs 建立checked-in versioned compatibility corpus/baseline manifest，覆盖semantic identity、measurements/order、zero/no-input、references、partial records/failure和representative runtime cost；当前范围只含`.ts`（含`.d.ts`）与`.rs`。
- [ ] 1.3 在写入translation/derived code前完成upstream revision、source responsibility、license/notice与clean-room/derivation策略审计；无法形成可追溯合法来源时停止相关实现而不猜测。
- [ ] 1.4 按1.2冻结的exact-input set在`src/product/**`实现private analyzers、shared normalized candidate validator和deterministic canonicalization；当前 analyzer categories只含`.ts`（含`.d.ts`）与`.rs`，覆盖baseline syntax/metrics及malformed-source typed failure，不自动扩展到`.tsx`、`.js`或`.jsx`。
- [ ] 1.5 将analyzers接入`function-metrics` private binding的per-file static TaskPlan、record sink、domain-work ack和completion result；Current与explicit references复用同一analysis contract。
- [ ] 1.6 更新function backend/cache identity并使旧Lizard cache不可能误命中；保持matching/comparison、record identity、policy和machine output owners不变。
- [ ] 1.7 在parity证据通过后原子切换formal runtime，删除Python/Lizardavailability、process/CSV parser、dependency slice、environment override、diagnostic和production fallback/dual path。
- [ ] 1.8 同步scanner/function-metrics/package/runtime owners、legal/provenance notes、fixtures与语义Case catalog；普通installed/dogfood路径不再要求Python或Lizard。

## Verification

- [ ] 2.1 对fresh corpus运行old-oracle/new-backend differential和owner-level expected-record tests，证明function boundaries、identity、measurements、ordering、zero/input与reference semantics一致。
- [ ] 2.2 运行各 approved exact-input category 的edge/malformed/read failure、Task partial progress、record preservation、coverage、CheckResult/CheckRun和cache invalidation tests。
- [ ] 2.3 运行representative performance observation、product import/dependency checks、`bun run typecheck -- product`、`bun run lint -- product`、`bun run test -- product`与`bun run test-evidence -- check --root .`。
- [ ] 2.4 运行`bun run decisions -- check`、`bun run validate`与针对本Change的`bun run change-plan -- check changes/port-lizard-function-metrics-to-typescript`。
- [ ] 2.5 运行`bun run verify:vibe-check-workspace:full`、installed candidate acceptance和full dogfood；focused search/process tracing确认formal runtime没有Python/Lizard probe/exec/CSV/fallback，且final diff满足source/license和授权范围。
