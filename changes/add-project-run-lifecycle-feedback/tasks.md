# Tasks

任务已关闭 stream ownership、长期方向、下游 handoff 和审计门禁；实施按 private lifecycle facts → shared formatting → TTY/plain presentation → structured duration result 的依赖顺序推进，最后用 Product、Case 账本和 exact-package consumer 闭合证据。

## Readiness

- [x] 0.1 已固定首轮 TTY stream ownership：progress renderer 在 Run 期间独占目标 stream，Check/process 详细输出进入 project-owned logs，不承诺任意同-stream interleaving。
- [x] 0.2 已建立并审核 `provide-product-owned-check-progress.md`，将 Product-owned lifecycle progress、completion/running 序号、duration reuse、stream ownership 与 progress-failure isolation 记录为 `active + unaligned`，且 `bun run decisions -- check` 通过。
- [x] 0.3 已同步 `changes/active-change-portfolio.md`、`changes/vibe-check-package-and-gate-delivery.md` 与 `changes/build-candidate-backed-project-gate/{proposal,design}.md`，下游直接启用 Product progress，并只保留 project-owned process logs/exit mapping。
- [x] 0.4 已审计实现 seam：prepared 位于 graph validation 后、Check work 前；executed started/settled 由 Run-owned adapter 承接；blocked/cancelled-before-start 在 scheduler/Core closure 后形成 settled；private handoff 无需增加 public observer 或 generic scheduler public surface。
- [x] 0.5 已按 `test-evidence-review` 运行 `bun run test-evidence -- check --root .`，160 个当前 Bun entities 全部由 40 个 Cases 映射；已恢复 lifecycle/orchestration/failure/definition/package-candidate Cases，并把新增 progress/output evidence 留给 Verification 2.1–2.8。
- [x] 0.6 已审计当前 `console.log` progress、`RunEffectStatuses`、result precedence、single-root public inventory、candidate build/allowlist 和 isolated consumer；stream/capability/monotonic clock 只建立 package-private test seam，不增加 public configuration。

## Implementation

- [ ] 1.1 在 `src/product/run/**` 建立 package-private progress model：frozen prepared/started/settled/final feedback、串行 dispatch、shared completion counter、terminal status mapping 和 effect-owned writer；可见序号只由 renderer state 计算，internal identity 始终使用 `checkId`。
- [ ] 1.2 在 Run-owned execution boundary 接入 lifecycle handoff：graph validation 成功后发送一次 prepared；每个实际进入 execution path 的 Check 恰发送一次 started；每个 canonical Check outcome 闭合后恰发送一次 settled；blocked/cancelled-before-start 只有 settled，且不得伪造 started。
- [ ] 1.3 使用可注入 monotonic clock 在 callback 前开始、Record/reference validation 与 Core settlement 后结束 per-Check measurement；实际执行值必须非负有限，未启动值为 `null`，并且 progress 是否 enabled/failed 不得影响测量或 Check facts。
- [ ] 1.4 扩展带 final snapshot 的 `RunResult` branches，加入与 `snapshot.checks` canonical 同序、同量、同 `checkId` 的 frozen `checkDurations`；没有 final snapshot 的 branches 不生成该字段，也不修改 `CheckOutcome`、QualityRecord、Core、DecisionPolicy 或 machine v3。
- [ ] 1.5 实现 shared terminal-row formatter：completion ordinal、canonical `displayName`、passed/failed/not-applicable/unavailable、duration 或 `not run`，以及仅来自既有 outcome 的安全 `reason.code`；不推断 warning、不展开 prerequisite `checkIds`、不把 ANSI 写入共享文本事实。
- [ ] 1.6 实现 TTY presentation state：维护 `completedCount`、有序 running list 和已绘制 running row 数；started 追加并重绘临时区域；settled 清除临时区域、永久写入下一个 completion row、移除对应 running Check，再以 `completedCount + runningPosition` 重绘其余 rows。
- [ ] 1.7 实现 plain presentation：非 TTY、redirect 或 `TERM=dumb` 丢弃 started，只复用 shared completion counter/terminal formatter追加 settled；输出不得包含 cursor 或 color control bytes。
- [ ] 1.8 实现 terminal capability 与私有 ANSI helpers：颜色只辅助状态并遵守无色环境，status/count/title/duration/not-run/reason 始终存在；不新增 theme、spinner、renderer dependency 或 public customization surface。
- [ ] 1.9 实现 execution elapsed：prepared 后、Check execution 前启动独立 monotonic interval，所有 canonical Check settlements 闭合后停止；final summary 显示 total/outcome counts/elapsed，并与之后的 policy/publication/log/output effect 时间分离。
- [ ] 1.10 将 progress write/rewrite failure 改为对 execution facts fail-open：首错将 progress status 置为 failed 并停止后续 progress writes，但继续 Task/Check/Record 与其他 effects；按 Design 固定 completed facts、cancellation/execution failure 和多 effect failure 的 result/diagnostic precedence。
- [ ] 1.11 同步 `src/product/run/index.ts`、`src/product/public-contract/current.ts` 与 package declarations/inventory，使 `RunResult.checkDurations` 可从正式 package surface 使用，同时证明没有导出 lifecycle feedback、renderer、stream、clock 或 scheduler internal。
- [ ] 1.12 实现完成后同步 `docs/configuration.md`、`docs/architecture.md` 与 `docs/output.md`：分别记录 progress enable/disable、Run execution/duration owner、TTY/plain human projection、effect failure 与 structured result；不得把 Change 目标提前写成实施前当前事实。

## Verification

- [ ] 2.1 为 private progress state/formatter 新增 focused Product tests 和语义 Case：证明 completion ordinal 与 running display index 是两种序号，临时 `[2/3]` Check 可以成为永久 `[1/3]`，其余 running rows 保持相对顺序并重新编号。
- [ ] 2.2 用 injected TTY stream/capability 验证 prepared header、started list、settled rewrite、final empty running region、cursor row count、zero Check、alignment 与 no-color；测试输出必须检查最终可见屏幕和关键 write sequence，而不是只检查 helper 返回值。
- [ ] 2.3 用 injected non-TTY、redirect 和 `TERM=dumb` 验证 started 完全不可见、settled/summary append-only、与 TTY terminal rows 信息同源，且没有 ANSI/cursor bytes。
- [ ] 2.4 覆盖 completed passed/failed、executed not-applicable with/without reason、executed unavailable、prerequisite unavailable 和 cancellation-before-start；证明 executed outcome 显示 duration，未启动 outcome 显示 `not run`，reason 只来自既有 grammar。
- [ ] 2.5 用 controllable monotonic clock 与并行 Check fixture 证明每项 duration 非负有限、progress/`checkDurations` 同值、未启动为 `null`、structured summary canonical order，以及 elapsed 不等于重叠 duration 之和且不包含后续 effects。
- [ ] 2.6 注入首次、中途和 rewrite progress write failure，证明只记录首错、停止后续 writes、Check/Record facts 与其他 effects 继续闭合，并覆盖 completed、execution cancellation、execution failure 和多 effect failure 的确定 precedence。
- [ ] 2.7 证明 progress 与现有 logs/output 分责：默认同时启用时 execution summary 与 quality summary 不互相替代；machine v3、report、Core、QualityRecord、DecisionPolicy 和 existing output schemas/examples没有 timing/presentation drift。
- [ ] 2.8 更新 public contract tests 并构建 fresh package candidate；建立 isolated installed-package consumer，在真实非 TTY capture 下证明默认 progress completion/summary 与 `RunResult.checkDurations`，同时证明 package root 没有新增 observer/renderer/internal exports。
- [ ] 2.9 修改测试与 Case 后运行最窄 `bun test` targets、`bun run test-evidence -- check --root .`、`bun run typecheck -- product`、`bun run lint -- product`、`bun run validate -- docs`、`bun run decisions -- check` 和本 Change 的 `bun run change-plan -- check`。
- [ ] 2.10 运行 `bun run verify:vibe-check-workspace:required`，复核 Proposal Success Criteria、stream ownership、下游 handoff consistency 和 fresh candidate evidence；未获明确授权不得归档、公开发布或切换 workspace verifier。
