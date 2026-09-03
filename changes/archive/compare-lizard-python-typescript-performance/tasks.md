# Tasks

任务先锁定可比性与边界，再实现 developer-only measurement 和正式调查。**完成本 Change 只表示形成可复核性能 evidence，不表示授权或实施优化。** 本 Change 的当前授权禁止修改 source-aligned `src/package-checks/function-metrics/analyzer/**` core/readers/shared/protocol。只有直接 profile 与同 workload 的 before/after raw evidence 都证明 Product-owned 外围问题时，才可另行实施最小修复；深层 port 瓶颈只进入 Investigation Report，等待独立 decision/Change。A historical Product、B fixed-1.24 analyzer-only 与 C current decomposition 是互不替代的结果层，cold 与 `warmed-operation` 也必须分别解释。

## Readiness
- [x] 0.1 复核 `d356dcb^`（精确 parent `853b30eaaa1a0545edf24b3622a5245d16c94a63`）historical Product invocation、Lizard 1.23 CLI/CSV parser 与 toolchain：隔离 worktree public Product smoke 接受 `/home/dev/.local/share/mise/installs/pipx-lizard/1.23.0/lizard/bin/lizard` 的 `1.23.0`，但 pin 未提供 bit-for-bit Python/Pygments/PathSpec provenance；A full samples 仍不得由 B/C 替代。
- [x] 0.2 复核 current measurement → Worker → adapter → façade chain、package staging与layout guard；选择外围 `measurement-performance-harness.test-support.ts` 和 analyzer-root `performance-harness.test-support.ts`，scripts 只以 exact path spawn，不静态 import private analyzer。既有 layout policy继续限制 package compiler roots和 analyzer consumers。
- [x] 0.3 定义 versioned workload manifest、source snapshot digest、canonical metric ordering/equality 和 `not-comparable` category：manifest 定义 A/C 的 160-byte TS/JS Product corpus，及 B 的 27 reader-family representative fixtures normal+edge ×64 representative batch；checksum在运行前 fail closed。
- [x] 0.4 以 checked-in parent/child fixture完成 Linux collector CPU、RSS unit/scope validation；在 process-tree aggregate RSS 不可得时保留 diagnostic 并拒绝 RSS comparative claim。
- [x] 0.5 完成 cold/warmed-operation protocol：15 deterministic ABBA blocks/side，fresh target 内未计入同进程 warm-up 后以 driver 计时第二次 operation，cold statistics 取 supervisor wall，warm CPU/RSS只保留 session diagnostics；临时 Python runtime 精确清理。long-lived session 不在本 Change 范围。
- [x] 0.6 在实现/优化前形成正式 Investigation Report，保存 raw evidence、已知 A/B/C 边界、source-alignment 风险和“外围仅 evidence-driven、core 仅报告”的授权边界。

## Implementation
- [x] 1.1 在 `scripts/development/lizard-performance/**` 实现显式 opt-in command、manifest validation、machine-readable evidence 和 summary；它不进入 Product API、package、normal test command或 default Gate。
- [x] 1.2 实现并验证 path-specific private benchmark harnesses；不扩张 production consumer、public export或 generic backend interface。现有 layout/package compiler-root guard继续证明它们不是 package entry。
- [x] 1.3 实现 A historical Product end-to-end driver：以 byte-identical fixture root运行 exact historical/current public Product，canonicalize final metrics并先做 equality preflight；缺少旧工具、version mismatch或输出差异输出 actionable non-comparable evidence。
- [x] 1.4 实现 B fixed-Lizard-1.24 upstream source/ephemeral task-owned venv Python API 与 TypeScript port drivers；每个计数 sample stable-sort 后复核 equality digest，cold/warmed statistic分别取 supervisor/driver operation wall。Python/Lizard只存在于显式 development driver。
- [x] 1.5 实现 C current Product decomposition harness，采集 normal Product total、read/decode、direct port-façade harness、Worker roundtrip/inside-worker adapter+port diagnostics，并标示 overlap、机械差分与 adapter mapping 不可隔离；每个 sample以 normal output digest校验。
- [x] 1.6 实现 Linux per-sample supervisor/result writer，保存 monotonic wall、wait4 CPU、single-process max RSS scope/unit、host/runtime/worktree/dirty/source identity、schedule和raw outputs；资源 scope不支持 tree aggregate时拒绝 RSS ratio/优劣结论。
- [x] 1.7 实现 raw-preserving statistics/summary：IQR marker、paired ABBA geometric ratios、deterministic bootstrap 95% CI和5% band classification；不把 threshold/result 变成 Gate policy。
- [x] 1.8 创建并同步 Investigation Report；报告同步 corrected A/B cold、driver-timed warmed-operation、B tiny/representative scope、C overlap、resource/optimization边界和 core optimization 未授权。

## Verification
- [x] 2.1 运行新增 workflow unit tests（argument boundary、canonical equality、ABBA/bootstrap classification、IQR marker）和 Test Evidence strict closure。
- [x] 2.2 在已验证 Linux x64 host执行 A/B/C smoke、A full cold/warmed-operation、B tiny cold-start与representative-batch full cold/warmed-operation ABBA comparison，以及C 30次 current phase observations；raw evidence已随 Investigation 保存，每个统计 condition均先通过所需 equality preflight，且A/B/C不互相替代。long-lived session 是本 Change 明确未覆盖边界。
- [x] 2.3 审阅 A/B/C raw result并形成报告：报告按 exact equality、fixed version与统计规则分别记录 tiny cold `typescript-faster`、representative cold/warmed-operation `python-faster`、A historical Product cold/warmed-operation `typescript-faster`、RSS/CPU `not-comparable` 与 C overlap；不把该 scope 翻转合成为单一语言结论，也不作跨 scope/platform 泛化或优化授权。
- [x] 2.4 运行受影响 owner tests、development lint/format/typecheck、package/privacy/layout validation与 `bun run change-plan -- check changes/compare-lizard-python-typescript-performance`；确认 Product exports、functionMetrics runtime、package contents和 Gate advisory/blocking policy没有变化。
- [x] 2.5 已运行 `bun run verify:vibe-check-workspace:required` 与 `bun run verify:vibe-check-workspace:full`，两者均通过；它们只证明仓库集成验收，不替代或改变 benchmark evidence 的 A/B/C 结果。
