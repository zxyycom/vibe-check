# Tasks

本 Change 已实施并验证 **persistent + memo**。本文件是 task ledger：0.x 是历史 Readiness，1.x–2.5 是已完成 current work；只有 2.6 的最终语义/Decision 对齐核对尚未完成。正式性能结论以 [formal verification review](evidence/verification-review.md#22-formal-retest) 为准，历史 prototype 只保留在 [Readiness review](evidence/readiness-review.md)。

## Readiness

- [x] 0.1 在修改测试前运行 `bun run test-evidence -- check --root .`，查询并审阅 Markdown Link options、parser、resolver、failure 与 runtime Cases；在 [Readiness Case review](evidence/readiness-review.md#01-test-evidence-case-review) 记录预计复用、修改或新增 Case 的独立证明边界。
- [x] 0.2 在仓库内实现 deterministic synthetic corpus generator/fixture：固定 seed、1,000 source files、file/byte 与 occurrence distributions、target-reuse topology、single-file mutation rule、Check API/options、Bun/OS/storage 和 cold/warm reset procedure；不使用或要求用户私有项目的内容、路径、command 或 options。见 [evidence README](evidence/README.md#fixture-and-sequence) 与 [原始结果](evidence/results/latest.json)。
- [x] 0.3 对 current public surface 以 `0.2` 的 exact workload 采集五组交错 cold、warm、single-file-incremental 与 high-target-reuse baseline；原始结果记录 wall time、median、MAD、CPU、maxRSS、filesystem read/probe 的可复核 Link-private control、cache size 与 stage profile。结论和边界见 [Readiness review](evidence/readiness-review.md#02-03-workload-and-measurement)。
- [x] 0.4 用 Link-private prototype 在 `0.2` workload 上验证 exact-byte identity、strict canonical payload parser、parser/version invalidation 与 target promise memo；证明 current facts、logical limits、pre-abort cancellation 与 failure folding parity，并记录 entry size 和 source-derived material boundary。见 [semantic evidence](evidence/readiness-review.md#04-prototype-and-semantic-parity)。
- [x] 0.5 以 historical prototype evidence 选择 **persistent + memo**；它证明可行性和 memo 的独立 physical-work reduction，未选 memo-only/no-adoption 不再有任务义务。该选择现已由 formal runtime retest 复核：cold `21.74%` faster、warm `61.61%`、incremental `61.78%`；正式 runtime 不公开 physical counters，memo 的 scoped proof 由直接 resolver test 承担。

## Implementation

- [x] 1.1 实施最小 Link-owned runtime change：分离 fresh parse、strict payload projection/parser 与 exact-content identity，并实现 bounded canonical-target read/decode/parsed-headings memo；不缓存 Finding 或 Check settlement。
- [x] 1.2 实现 resolved default-disabled / explicit-enabled `cache` union、closed validation、deep freeze 和 fingerprint；enabled branch 通过 caller absolute directory 消费 `cacheJsonByKey(...)`，disabled branch 不访问 cache filesystem。
- [x] 1.3 persistent cache source 和 cross-document Markdown target parse facts；memoize canonical target 的成功 read/decode/parse snapshot。所有 logical endpoint occurrence 仍独立计数、授权、probe 和形成 resolution。
- [x] 1.4 保持 miss、invalid/hostile payload、version change、read/write failure、concurrent publication 与 cancellation 的 best-effort/fresh-parse semantics；不新增 Check/Record/machine cache field，且不以 cache 重放 settlement。
- [x] 1.5 更新 README、Markdown Link guide、JSDoc、canonical example、public declarations 和 package candidate/installed-consumer materials，明确 explicit switch、absolute directory、source-derived payload、无保密保证、无 cleanup 与 caller-owned lifecycle。
- [x] 1.6 新增或修改最小直接 tests，并按测试策略维护对应 semantic Cases；覆盖 persistent public options、hit/miss/invalidation、default no-I/O 与 persistent failure，以及 memo target reuse/logical limits/failure/cancel/concurrency 和 settlement parity。

## Verification

- [x] 2.1 运行 Markdown Link parser/options/resolver/default Check 与 cache helper 最窄 Bun tests；证明 enabled/disabled、payload、memo 行为以及 Findings、Records、messages、limits 和 terminal result parity。见 [formal verification review](evidence/verification-review.md#21-narrow-behavior-tests)。
- [x] 2.2 用 `0.2` 的 exact workload 和环境执行至少五组交错 disabled/enabled retest；报告 cold/warm/incremental raw samples、median、dispersion、peak memory、cache size 和 selected-outcome gate result。正式 runtime 的 five-run medians 为 cold `3380.79 → 2645.96 ms`（`21.74%` faster / `734.83 ms` saved）、warm `3124.95 → 1199.77 ms`（`61.61%` / `1925.18 ms`）、incremental `3192.93 → 1220.20 ms`（`61.78%` / `1972.73 ms`），均满足 selected-outcome gate；formal runtime 不公开 physical read/parse counters，其 scoped memo proof 由直接 resolver test 承担。见 [formal verification review](evidence/verification-review.md#22-formal-retest)。
- [x] 2.3 运行 `bun run test-evidence -- check --root .`、`bun run typecheck`、`bun run lint` 与受影响 package/public-contract tests；审阅每个新增或变化 Case 的 owner、proof signal 和 entity closure。Test Evidence `382/382`；full Gate 同时通过其 typecheck、lint、runtime 与 Case ledger。
- [x] 2.4 运行 `bun run validate -- docs`、package build/verify 及包含 types/docs/runtime 的 candidate installed-consumer acceptance，确认 public option、declarations、README/guide/example 与 runtime 一致。full Gate `36/36` 包含 docs、package candidate 和 installed-consumer acceptance。
- [x] 2.5 运行 `bun run verify:vibe-check-workspace:full`，复核 exact candidate、full Gate 与所有跨 owner result；任何未运行或 environment-limited evidence 在验收中明确其影响。修复后 2026-09-02 full profile `36/36` passed；warnings 与 performance boundary 见 [formal verification review](evidence/verification-review.md#remaining-verification-state)。
- [x] 2.6 对照 selected outcome 的 Success Criteria 完成语义审阅，同步 stable owner，并仅在全部 persistent + memo 方向成为 current fact 后核对 `enable-explicit-markdown-link-parse-cache.md` alignment。已核对 formal runtime evidence、runtime/options/tests、`docs/checks/markdown-link-validation.md` consumer owner、README/example/package projection 与 full Gate；Decision 已由 CLI 标记 `active + aligned`。归档 Change 仍需当前任务另行明确授权。
