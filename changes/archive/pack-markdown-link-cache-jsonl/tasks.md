# Tasks

按已闭合的单文件 JSONL 设计先实施 Link-owned session 与 resolver lifecycle，再以语义、严格串行、正式性能和全工作区门禁决定是否达到 Plan 的完成出口。

## Readiness

- [x] 0.1 审计 `analyze-markdown-link-cache-packing` 的 formal/storage-only 边界、活动 cache Decision、`docs/coding-style.md`、当前 `parse-facts-cache.ts` / `resolver-engine.ts` 与相邻 tests，并运行当前 Test Evidence 门禁（383/383 test entities mapped by 96 Cases）；确认单文件 JSONL、current contract 和 strict-serial integration 没有未决实施决定。
- [x] 0.2 依据用户确认的单一物理 JSONL file、无 shard/grouping 配置、strict serial 与 performance-only 边界，闭合本 Plan 的 envelope/session/finalizer/failure/performance acceptance 工程选择并写入 proposal、design 与本 tasks；核对活动 Decision 无需演进，若实现中出现冲突则停止并走 Decision 流程。

## Implementation

- [x] 1.1 在 `parse-facts-cache.ts` 实现 Link-private per-invocation stateful session、single-file JSONL closed envelope、current-version strict restore、last-valid-wins、exact-byte hit/miss、dirty identity de-dup 和 old per-entry `.json` ignore；session 只承接 read-once/dirty/finalize lifecycle，不建立 generic session/factory，也不修改 `cacheJsonByKey`。
- [x] 1.2 保持 `createMarkdownLocalResolver` 为现有唯一 construction boundary，使 `LinkLocalResolver` 持有该 session，并在 Link-owned resolver contract 中提供 finalization；将 source/target parse 交给 session，在 `execution.ts` 的 resolver-bearing structured terminal boundary 为每条 normal/unavailable/cancellation return await 最多一次 finalizer：aborted-before-publication、one `mkdir`、one awaited append/create、partial-tail newline isolation，以及 append-started cancellation await。禁止 background、post-return 或 floating cache-write Promise。
- [x] 1.3 在修改 tests 前后运行 `bun run test-evidence -- check --root .`，增加/更新最窄 tests 与 Case ledger evidence，覆盖 envelope/version/payload validity、malformed/unterminated/unreadable state、last-valid-wins、one read/one publication、strict serial、exact-byte/fatal UTF-8、old-state ignore 和 unchanged Check settlement；明确证明 finalizer 覆盖 normal/unavailable/cancellation terminal paths、abort-before-finalize 不执行 `mkdir`/append、append-started cancellation 仍 await，及 cache I/O failure 不能改变 settlement。
- [x] 1.4 同步 Markdown Link consumer documentation 与必要 JSDoc，说明 single-file caller-owned state、source-derived content、capacity/deletion owner、no concurrency/durability guarantees、old-state ignore 及 best-effort fallback。
- [x] 1.5 建立并保存正式 deterministic 1,000-source/160-target harness/evidence；cold、warm 与 single-file incremental 各至少 5 个 interleaved enabled/disabled pairs，包含 raw samples、median、dispersion、CPU、maxRSS、cache bytes、strict-serial before/current comparison 与语义 parity。

## Verification

- [x] 2.1 运行最窄 Link/cache/resolver tests 和 `bun run test-evidence -- check --root .`，确认 current entities 与 Case ledger 闭合，且语义、strict serial、failure/cancellation 证据通过。
- [x] 2.2 运行正式 cold/warm/single-file-incremental performance protocol：每个 workload 各至少 5 个 interleaved enabled/disabled pairs，并以当次 paired run 的 enabled/disabled median 验证 cold enabled relative regression `<=5%`，warm 与 incremental 各 `>=20%` 且 `>=100 ms`；否则保存未通过结论而不伪称性能成功。
- [x] 2.3 运行 typecheck、lint、docs/package validation、dependency/entry checks 及 `bun run verify:vibe-check-workspace:required` 与 `bun run verify:vibe-check-workspace:full`。
- [x] 2.4 完成独立 correctness、AI-ready docs 和 coding-style optimizer audit，复核实现/测试/benchmark/evidence 主张没有将 storage-only、Plan stage 或单一 timing 表述为 formal gate 通过。
