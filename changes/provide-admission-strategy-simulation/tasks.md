# Tasks

按 Readiness → Implementation → Verification 顺序交付；只有已由本 Change 内的实际 evidence 证明的项被勾选。Decision alignment 与归档仍须单独授权。

## Readiness
- [x] 0.1 恢复并核对 current Scheduler/custom authoring/lifecycle owner、相关 active Decisions 和相邻 sources/tests；确认新 public state 是独立长期方向而不修改既有 authoring/lifecycle Decision。
- [x] 0.2 建立并激活 `provide-immutable-admission-graph-state.md` 为 active + unaligned Decision，记录双 seed、non-control boundary、private reducer/effects 和 representation choice；运行 Decision CLI trace/check。
- [x] 0.3 在 `design.md` 固化 exact public DTO、closed rejection reasons、canonical public order/precedence、binary settlement mapping、private effect order和 trace oracle；在 `readiness/consumer-proofs.md` 证明 standalone branching 与 live custom lookahead 是不同 consumer。
- [x] 0.4 创建并运行可复现 benchmark manifest/lab，保存 raw results/summary；覆盖 current real static/custom/learned unused-state baseline、compile、inspection/catalog、validation、transition/fork、DFS/BFS、high fanout 和三种 representation，并据证据选择 parent+delta。

## Implementation
- [x] 1.1 在 `src/project-run/task-scheduler/**` 提取 private compiled graph/index owner、immutable parent+delta node、canonical state projection和 pure reducer/effect model；保留当前 graph validation、policy selection layers、forced-block queue ordering及 real settlement/cancellation semantic boundary。
- [x] 1.2 实现 standalone exact factory、opaque `AdmissionGraph`/`AdmissionState` handle、frozen inspection/catalog DTO、closed reason/result unions、canonical public ordering和 lazy projection；确保 predecessor identity/branching与 select/settle rejection semantics符合 Plan。
- [x] 1.3 将 public state seed 接入 `AdmissionPolicyContext`，将 real Scheduler shell 改为只消费 shared effects并保持 Task/Promise/signal/diagnostics/measurement/RunResult ownership；在 callback return 后保留并验证所有 current hard guards。
  - 修正证据：running settlement 先记录 direct core effect，再记录每个 forced block；每个 block 有自己的 post-effect core state 与 pending-settlement measurement boundary，diagnostics 观察该 microstep 而非整个 transition 的 final snapshot。
- [x] 1.4 实现 scheduler-private trace oracle/harness，驱动 initial/live seed、public action和 private real settlement/cancellation action；使 trace comparison 不成为第二 reducer或 public effect contract。
  - 修正证据：trace steps 现在在每个 canonical effect 后公开 reducer-derived projection；product-private instrumented shell hook 比较 real deterministic effect stream、public projection 与 validation rejection matrix，而不重建 transition rules。
- [x] 1.5 新增/修改 Scheduler tests，证明 exact factory/validation/freeze/opaque identity、catalog/validator/reasons/order、arbitrary unknown/running/settled/complete ID 的 dedicated validation rejection 与 `select` precedence、divergent branches、binary settlement、scope lifecycle、trace equivalence、callback lookahead non-control和 real hard-revalidation；维护 semantic Case ledger。
- [x] 1.6 同步 `src/project-definition/**` 与 `src/index.ts` public declarations/JSDoc/exports，以及 Architecture/Configuration/API mechanics、package example/projection和 installed-consumer evidence；明确没有 Definition/fingerprint/output compatibility change。
  - 修正证据：packed external-consumer runtime fixture 现已 import 并执行 `createAdmissionGraph`、结算 standalone branch、在 real public Run 中进行 custom-callback lookahead，并证明 callback return 后的 abort 不能执行 selected Check。
- [x] 1.7 在同一 readiness benchmark matrix 上添加 implementation-path observations；只有 measurement 显示 parent+delta 的实际 chain cost是主导瓶颈时才设计有界 private compaction/dense fallback，并重新更新 Decision/Plan/evidence。
  - 证据：fixed-depth setup 单独计时；implementation inspection、warm-catalog、repeated-validation 与 high-fanout 复用 prebuilt states。当前行未证明 parent-chain lookup 是主导成本，因此没有加入 compaction 或 dense fallback。
- [x] 1.8 若 fail-fast/named-capacity Change 已在本 Change implementation 前改变 Scheduler current facts，按当时 owner 重审 public reason/settlement/trace/benchmark matrix并更新本 Plan；否则记录其未发生而不预实现其语义。
  - 证据：implementation 从记录的 Scheduler/Decision current facts 开始；当时 fail-fast 与 named-capacity behavior 均未 current，因此没有加入推测性语义或 rebaseline。

## Verification
- [x] 2.1 在任何 native test/Case modification 前后运行 `bun run test-evidence -- check --root .`，并运行最窄 Scheduler/public API/installed-consumer Bun tests；确认每个新或修改 entity 有真实 owner/Proves Case。
- [x] 2.2 运行 trace oracle matrix，证明 public successor和 deterministic real-shell path在 graph relations、mutex、root/scope capacity、forced block、wait/complete、failed mapping、private cancellation和 callback hard guard上等价。
  - 修正证据：instrumented shell/core matrix 比较每个 canonical effect 与 reducer-derived public projection（包括所有 known/unknown validation rejection）；failed-source regression 检查 direct-then-reverse-forced measurement order 与 per-block diagnostic dependency counts。
- [x] 2.3 重新运行 `bun changes/provide-admission-strategy-simulation/readiness/admission-state-benchmark.ts`，检查 manifest required timed/retained scenarios、raw p50/p95/CPU/allocation proxy/retained heap methods和 unused-state baseline；报告相同 host/profile之外的比较限制。
  - 修正证据：重新生成的 raw/summary 包含 `fixed-depth-state-setup`；closure check 发现全部 12 个 required timed 和 2 个 required retained scenario IDs。结果仍受 host/profile 限制，heap values 仍是 advisory proxies。
- [x] 2.4 运行受影响的 typecheck、lint、dependency/entry checks、`bun run validate -- docs`、`bun run decisions -- check` 和 `bun run change-plan -- check changes/provide-admission-strategy-simulation`。
- [x] 2.5 运行 `bun run verify:vibe-check-workspace:required`；若 package installed-consumer evidence需要其 package-test acceptance tag，运行 matching `required --enable-tag package-tests` or full profile并报告实际选择。
- [x] 2.6 审阅 Success Criteria、public compatibility/non-goals、Decision alignment prerequisites和 Change diff；所有项有 current evidence后才标记 Decision aligned，仍需单独的完成/归档授权。
  - Final acceptance：当前工作树的完整 evidence 通过后，已将 `provide-immutable-admission-graph-state.md` 标记为 active + aligned；本任务已获得归档授权。
