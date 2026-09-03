# Proposal

本 Plan 已将 Markdown Link-owned parse-facts cache 从 per-entry JSON state 更换为单一 JSONL file，同时保持 default-disabled、严格串行、exact-byte identity 与 current Check settlement；实现、formal evidence 与计划内验证均已完成，Plan 保持 active，等待显式归档授权。

## Why

JSONL 实现前的 per-entry 严格串行审计结果中，cold enabled-vs-disabled penalty 为 `34.26%`，未通过 `<=5%` gate。形成时的 storage-only 数据仅说明单文件布局值得进入正式 runtime 检验；它不替代 formal comparator，也不证明 append 实现的性能结果。本 Change 因此以相同的正式门槛验证已实现的单一物理文件布局。

## Outcome

Markdown Link cache 现在只在 caller-owned directory 的 `<directory>/markdown-link-parse-facts-v1.jsonl` 保存当前格式的 Link-private parse facts。每次 cache-using invocation 严格串行恢复一次可用 line、按 current exact bytes 命中或 fresh-parse，并由 execution-owned terminal boundary 在返回前最多一次严格串行 publication；cache unavailable 情形保持 current Check 语义。正式 evidence 已在相同 deterministic workload 上记录 cold、warm 与 single-file incremental 三项门槛均通过；raw samples 和解释边界见 [`evidence/`](./evidence/README.md)。

## Scope

### Intended Change

- Scope 只限 Markdown Link-owned parse-facts cache；不创建跨 Product/Check 的共享文件，且不修改 generic `src/cache/cache-json-by-key.ts`。
- 公开 cache option 保持 default-disabled 与现有 enabled + absolute caller-owned `directory` 形状；不增加 cache grouping、packing 或容量配置。
- 该 directory 中的当前格式 cache entries 使用唯一文件 `markdown-link-parse-facts-v1.jsonl`。既有 per-entry `.json` state 被完全忽略，不迁移、不删除。
- 每一 newline-terminated line 是 closed canonical JSON envelope，固定字段为 `cacheFormatVersion: "markdown-link-parse-facts-jsonl-v1"`、`identityDigest`、`parserContractVersion`、`payloadVersion` 和 `payload`。只有 current format/parser/payload versions 和 strict payload 都有效的 line 才恢复；同一 identity 的多个 valid line 以最后一个 valid line 为准。
- 首次 parse-cache use 时，session 严格串行 `readFile` 一次并恢复 Map；每个 source/target 仍先 authorized-read exact bytes 并通过 fatal UTF-8 boundary，再按 digest hit。miss fresh-parse current bytes；成功 facts 以 identity 去重进入 dirty Map。
- `createMarkdownLocalResolver` 成功后，`execution.ts` 为每个带 resolver 的 terminal return 负责一次 awaited finalization；resolver 只把 source/target fresh facts 交给其 Link-private session。signal 已 aborted 时 finalizer 不启动 publication；否则 dirty 非空时只 `mkdir` 一次，并以一次 awaited serial append/create 写入所有 dirty envelopes 的 newline-terminated block。已有可读内容非空但未终止于 newline 时，block 先补 newline 隔离 partial tail。该 finalization 留在当前 invocation 内，执行入口不得把它移到 background、return 之后或浮置其 Promise。append 启动后即使取消仍 await；entry 可以留存，而 invocation 仍按 cancellation/current facts settlement。

### Resulting Impacts

- read、line restoration、parse、append/create failure 都只降低 cache availability：受影响 entry 或整个 file fresh-parse/miss，且不改变 Check message、Record、final data 或 terminal status。malformed、unknown-version 或 unterminated line 被忽略；whole file unreadable 使该 invocation 的全部 cache entries miss。
- 单一文件不提供 lock、merge、fsync/durability/atomicity、sharding/index/compaction/TTL/quota/automatic cleanup。caller 继续监控容量并可删除 directory state；cross-process interference 最多产生 invalid/duplicate line 和 future miss，不建立并发保证。
- 单文件全量 read/parse、duplicate identity last-valid-wins、partial tail、append cancellation、current authorization、fatal UTF-8、strict serial source I/O、logical target accounting 与 current settlement 已由实现与 tests 覆盖。
- consumer documentation、JSDoc、test Case ledger、formal deterministic harness/evidence 及 Plan-owned verification materials 已随实现同步。package external-consumer 验证已将 legacy `*.json` counter 的最小检查改为当前唯一 JSONL file，确认恰有两条完整、可解析 line，且没有 partial tail。活动 Decision 只作契约核对，不因本 Change 自动演进；若后续实现暴露冲突，仍须按 Decision 流程处理。

## Success Criteria

- Markdown Link parse-facts cache 只在 caller-owned directory 的单一 `markdown-link-parse-facts-v1.jsonl` 中读写；generic cache helper 未改，旧 per-entry `.json` 不被读取、迁移或删除。
- strict closed envelope、current format/parser/payload version、last-valid-wins、single malformed/unknown/unterminated-line miss 和 whole-file-unreadable all-miss 都保持 best-effort fresh parse，且不改变 Check output。
- 每个 cache-using invocation 最多一次 initial `readFile` 和最多一次 final append/create；`execution.ts` 的 resolver-bearing terminal path await 一次 finalizer，aborted signal 不开始 publication，append 开始后仍 await，且没有 background、post-return 或 floating cache write。
- source/target 仍先 authorized-read exact bytes 并执行 fatal UTF-8；hit/invalidation 仅按 `identityDigest`、parser contract 与 payload version，miss/dirty de-dup、cancellation、logical target accounting 和 settlement 均保持正确。
- 最窄 28 个 Link/cache/resolver tests、Case ledger / `test-evidence`（385/385）、consumer documentation/JSDoc、typecheck、lint、format、docs/package、dependency/entry 与 external-consumer verification 均通过。required Gate 在 `.log/project-gate/2026-09-03T10-18-00...` 为 passed；修复后的 full Gate 在 `.log/project-gate/2026-09-03T10-20-42.799Z-3924014-8f28fc78-9584-4688-b2c0-442953a46a9b` 为 36/36 passed。
- 已在 deterministic 1,000-source/160-target workload 上为 cold、warm 与 single-file incremental 各运行 5 个 interleaved enabled/disabled pairs，并保存 raw、median、MAD、CPU、maxRSS、cache bytes 与 current strict-serial disabled/enabled comparison。当前 raw 的三项结果均通过：cold enabled regression 为 `-1.24%`（即快 1.24%）；warm 改善 `36.73%`、节省 `1061.52 ms`；incremental 改善 `35.89%`、节省 `1023.14 ms`。这些是当前 paired-run 观察，不归因于 storage layout 本身；复核入口与边界见 [`evidence/verification-report.md`](./evidence/verification-report.md)。

## Affected Owners

- `src/package-checks/markdown-link-validation/parse-facts-cache.ts`：Link-owned JSONL envelope、stateful session、identity、line restore、dirty publication 与 cache-only failure handling 实现。
- `src/package-checks/markdown-link-validation/local-resolver.ts`、`local-resolution.ts` 与 `resolver-engine.ts`：保持现有 resolver factory；由 invocation resolver 持有唯一 Link-private session，并通过 Link-owned resolver contract 暴露 finalization，将 source/target bytes 交给 session，且不建立 generic session/factory。
- `src/package-checks/markdown-link-validation/execution.ts`：以结构化 terminal boundary 调用并 await finalizer，保持 cancellation/current settlement，而不把 cache publication 交给 resolver return 或后台工作。
- `src/package-checks/markdown-link-validation/parse-facts-cache.test.ts`、`src/package-checks/markdown-link-validation/local-resolver.test.ts` 与 `src/package-checks/markdown-link-validation/default-check.test.ts`：单文件 cache、strict serial、failure/cancellation 与 observable settlement proof。
- `docs/testing/cases/scan-scope.md` 及相关 Case ledger owner：current test entities 的语义 Case / mapping evidence。
- `docs/checks/markdown-link-validation.md`：consumer cache lifecycle、caller-owned state、single-file visibility 与 best-effort boundary。
- `docs/decisions/enable-explicit-markdown-link-parse-cache.md`：只核对既有长期 cache contract；不修改或演进，发现冲突即阻塞实施。
- `changes/pack-markdown-link-cache-jsonl/`：本 Change 的 formal benchmark harness、raw evidence、性能门槛和完成验收上下文。
