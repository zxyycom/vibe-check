# Tasks

本 Plan 先闭合三个指标型 Check（`fileMetrics`、`functionMetrics` 与 `duplicateDetection`，下称 metric trio）的 identity 与 shared/local owner，再实施 public contract、行为证据和 package 文档，最后通过项目门禁。

## Readiness

- [x] 0.1 恢复 generic waiver、Finding settlement、public Check authoring 与测试账本 owner，并确认既有 aligned Decision 允许 Product-provided Check 独立接入。
- [x] 0.2 比较 file、function、duplicate 与 Markdown Finding 义务，选定 metric trio，并固定 function/location identity、no-input 与 unavailable 边界。

## Implementation

- [x] 1.1 实现共享 closed waiver authoring/evidence boundary，并让 fileMetrics 在不改变现有行为的前提下复用或保留等价局部边界。
- [x] 1.2 为 functionMetrics 增加 public identity/waiver options、resolved validation、reconciliation、Record/message settlement 与直接测试。
- [x] 1.3 为 duplicateDetection 增加 public identity/waiver options、resolved validation、reconciliation、Record/message settlement 与直接测试。
- [x] 1.4 更新 package root exports/public inventory、README、Configuration、API navigation 和 metric trio Check guides。
- [x] 1.5 审阅新增/变化测试的 owner、证明信号与 Case 粒度，并同步语义 Case 账本。

## Verification

- [x] 2.1 运行 functionMetrics、duplicateDetection、fileMetrics、generic reconciliation 与 package documentation 的最窄测试。
- [x] 2.2 运行 `bun run test-evidence -- check --root .`、`bun run decisions -- check` 与 Change Plan check。
- [x] 2.3 运行 `bun run validate` 和 `bun run verify:vibe-check-workspace:required`，审阅局部 diff 与未覆盖边界。
- [x] 2.4 使用 `ai-ready-docs` 审核本次文档消费路径，并以完整 `docs/coding-style.md` 审核新增和修改代码；整改后重跑受影响验证。
