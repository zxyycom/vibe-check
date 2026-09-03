# Proposal

本 active Plan 已完成本 Change 的实施上下文：在不放宽严格串行与 exact-source-bytes 边界的前提下完成 Markdown Link parse-facts cache 的低风险局部优化与 before/after 测量，并如实形成 cold gate 未通过的结论；归档不把该结论表述为整体验收成功。

## Why

cfe715d 的严格串行复测显示 cache enabled 的 cold penalty 为 36.91%。最终实现的 enabled absolute medians 在 cold、warm、incremental 和 high-reuse workload 均下降，但 final cold paired penalty 仍为 34.26%，远高于原 `<=5%` gate。计划必须保留这种混合结论，而非以热路径改善遮蔽 cold 未通过。

## Outcome

Markdown Link cache 保持严格串行 source I/O、每次读取 exact source bytes、default-disabled explicit cache options 和 current Check settlement；最终局部优化及其同 workload before/after、语义与严格串行证据已经保存。性能验收的 cold criterion 未满足，后续是否继续优化须基于该证据重新决定。

## Scope

### Intended Change

- 已实施：复用 root-contained path containment walk 已观察到的最终 endpoint，避免重复 endpoint probe；cache hit 跳过 `TextDecoder`，但以 `isUtf8` 保留 fatal UTF-8 boundary；successful atomic rename 后不再无意义 remove。
- 已保持：source 逐项严格串行；exact bytes 继续决定 identity；disabled branch 不访问 cache filesystem；enabled branch 的 caller-owned directory、best-effort fresh-parse fallback、current authorization/endpoint/Finding/Record/settlement 均不变。
- 未实施：read-ahead、`Promise.all`、Git/revision/mtime/size source-byte skip、digest memo、packed cache、deferred/background write 和动态 buffer。

### Resulting Impacts

- final benchmark/report 表明 absolute enabled medians 下降不能完整归因，因为 disabled/public medians 与 variance 也变化；cold paired gate 仍失败。
- strict-serial、UTF-8 fatal boundary、exact-byte invalidation、malformed/I/O fallback、cancellation 与 logical target-count 继续需要由 owner-local tests 和 benchmark semantic coverage 共同证明。
- 后继 Investigation Report 连同 raw before/after resources、cfe715d-to-candidate patch、archived harness identity 与临时复制/精确清理步骤是本次形成时测量证据；raw JSON 的 `command` 仅是 inner invocation。它不修改长期 Decision 或 stable owner 文档。

## Success Criteria

- [已满足] source bytes 在每个 source 上照常读取并决定 identity；实现与审查证据未发现 Git/metadata skip 或 source-I/O 并发。
- [已满足] cache disabled/enabled contract、current endpoint/settlement、failure fallback、cancellation、exact-byte invalidation 与 logical target-read accounting 保持所测语义一致。
- [已满足] 同一 workload 的完整 before/after 证据已保存，并明确记录 final cold relative regression 为 34.26%、未达到原 `<=5%` gate；该证据结论不被表述为性能目标通过。
- [已满足] 独立 correctness reviewer 已 PASS 实现、测试、benchmark 方法与结论强度；后续 AI-ready/coding-style 收口只调整类型与测试结构，未改 runtime bytes，任务 2.4 已完成。
- [已满足] 本 Change 的完成出口是交付低风险优化、复测和可复核的混合结论，而非达到 cold `<=5%`；用户已授权在保留该未通过事实的前提下归档。后续继续优化或调整 gate 属于新的授权和 Change，不能从本 Plan 完成推导。

## Affected Owners

- `docs/checks/markdown-link-validation.md`：Markdown Link 的 current cache/I/O/consumer contract；本次不改写其稳定规则。
- `docs/decisions/enable-explicit-markdown-link-parse-cache.md`：已采用的长期 cache direction；本 Plan 不自行改变该 Decision。
- `src/package-checks/markdown-link-validation/**` 与其 tests：Link-owned parse-facts cache 实现、语义与严格串行证据。
- `changes/archive/cache-markdown-link-safe-facts/evidence/benchmark.ts`：明确授权读取的 archived harness input；它不是 current Change owner，复测说明、candidate identity 与 resources 由本 Change 和后继报告拥有。
- `docs/investigations/evaluate-markdown-link-serial-io-optimization.md`：本次复查结论、raw resources、candidate patch 与可复现步骤的形成时 owner；它不替代上述 current contract owner 或本 active Plan。
- `docs/testing/cases/scan-scope.md`：更新后的 Case owner evidence；最新 Test Evidence 为 383/383 entities mapped by 96 Cases。它不属于 performance candidate patch。
