# Design

本 Plan 已将 Markdown Link-owned parse-facts cache 实施为 caller-owned directory 内唯一的 JSONL file；per-invocation session 在现有 resolver lifecycle 中严格串行 read、fresh-parse 与 dirty collection，`execution.ts` 的同一 invocation terminal boundary 同步完成最多一次 append publication。

## Context

[`docs/checks/markdown-link-validation.md`](../../docs/checks/markdown-link-validation.md) 与活动 Decision [`enable-explicit-markdown-link-parse-cache.md`](../../docs/decisions/enable-explicit-markdown-link-parse-cache.md) 继续拥有 current cache contract：cache default-disabled；enabled branch 只接受 absolute caller-owned directory；每次 invocation 必须重新读取 current authorized bytes、完成 authorization/endpoint validation/Finding/Record/settlement；cache 只替代 parse-facts computation。miss、invalid/hostile state、read/write failure 都 fresh-parse current bytes，且不改变 terminal output。

形成时分析 [`analyze-markdown-link-cache-packing.md`](../../docs/investigations/analyze-markdown-link-cache-packing.md) 保存了 whole-file-rewrite storage-only readiness evidence。它不调用 formal Check，而实现使用 append；因此它只解释本 Plan 为何需要 formal runtime 检验，不能决定或解释当前性能验收。当前 formal result 由 [`evidence/results/formal-run.json`](./evidence/results/formal-run.json) 拥有，阅读边界见 [`evidence/verification-report.md`](./evidence/verification-report.md)。

当前 runtime 的 `parse-facts-cache.ts` 已在 Link-owned area 管理 JSONL session；generic `cacheJsonByKey` 未修改。`resolver-engine.ts` 将 source/target parse-facts 交给该 session，`execution.ts` 完成最终 publication。tests 与 Case ledger 已覆盖 session、single-file failure/cancellation 及 observable current-settlement 行为；本 Plan 的 formal runtime evidence 则覆盖相同 direct Check envelope 的性能与主 workload semantic parity。

## Goals / Non-Goals

已实现的 invocation 在首次 parse-cache use 时严格串行读取 `<directory>/markdown-link-parse-facts-v1.jsonl` 一次、从 current valid lines 恢复 Map、按 current exact bytes digest 复用或 fresh-parse，并在 `createMarkdownLocalResolver` 成功后的 `execution.ts` terminal boundary 按 cancellation boundary 至多一次严格串行 append/create 全部 dirty facts。该设计保持 existing public option、exact-byte identity、fatal UTF-8、strict serial I/O 和 current Check settlement。

非目标是实现跨 Check/Product cache、修改 `cacheJsonByKey`、读取/迁移/删除既有 per-entry `.json`、增加 cache option、提供 lock/merge/fsync/durability/atomicity/sharding/index/compaction/TTL/quota/automatic cleanup，或从 storage-only evidence 声称 formal cold gate 通过。caller 仍负责 directory 容量与删除，Product 不承诺 confidentiality、tamper resistance、remote sharing 或 cross-process writer guarantee。

## Decisions

### Intended Change

**File and envelope.** The only current-format cache file is `<directory>/markdown-link-parse-facts-v1.jsonl`. Each complete newline-terminated line is a closed canonical JSON envelope with exactly `cacheFormatVersion: "markdown-link-parse-facts-jsonl-v1"`、`identityDigest`、`parserContractVersion`、`payloadVersion` and `payload`. Only an envelope matching current format, parser contract and payload versions whose payload passes strict parse-facts validation enters the session Map. Malformed, unknown-version and unterminated trailing lines are ignored; when several valid lines have the same identity, last valid line wins.

**Session and lookup.** The existing `createMarkdownLocalResolver` remains the only construction boundary: after its current root validation, the invocation's `LinkLocalResolver` holds one Link-private, stateful parse-facts session. That session belongs in `parse-facts-cache.ts` because it owns the read-once Map, dirty Map and finish-once invariant; it needs no generic `CacheSession`, interface or second factory. Its first parse-cache use calls `readFile` exactly once and strictly serially, restores usable envelopes into a Map, and never reads the cache file again during that invocation. Every source or target still passes authorized exact-byte read and fatal UTF-8 validation before digest lookup. A Map hit returns immutable current parse facts; a miss fresh-parses current bytes. Successful fresh facts are de-duplicated by identity in a dirty Map.

**Final publication.** `execution.ts`, not a resolver method return, owns the finalizer call. Once resolver creation succeeds, `prepareMarkdownTraversal` uses one structured terminal boundary that reaches all normal, unavailable/failure and cancellation returns and awaits the session finalizer exactly once; the finalizer itself maps cache I/O failure to cache-only availability loss. If the signal is already aborted when finalization begins, it starts no publication. Otherwise, only nonempty dirty state causes one `mkdir` and one awaited serial append/create of all dirty envelopes as one newline-terminated block. If the successfully read prior content is nonempty but lacks a final newline, the block first supplies one newline, isolating its partial tail. Final publication stays inside the current invocation: no cache-write Promise may run in the background, outlive the terminal return or be floated into another lifecycle. Once append starts, cancellation does not abandon it: the append is awaited, the entry may remain for a future invocation, and the current invocation settles from cancellation/current facts rather than cache publication.

**Failure and compatibility.** A malformed individual line or partial trailing line is a miss for that line; unreadable whole-file state is an all-miss for that invocation. Read/parse/mkdir/append failures are all best-effort cache availability failures: fresh parsing continues and Check message, Records, final data and terminal status remain unchanged. Existing per-entry `.json` files are fully ignored; they are neither read, migrated nor deleted. The implementation offers no lock, merge, fsync, durability, atomicity, sharding, index or compaction; cross-process interference can only yield invalid/duplicate lines and future miss under this contract.

### Resulting Impacts

- The Link-owned cache implementation replaces the generic per-entry helper only in `parse-facts-cache.ts`; `cacheJsonByKey` remains unchanged and no other Check consumes this file.
- The consumer-visible option remains exactly default-disabled or enabled with caller-owned absolute directory. File naming, envelope format, parser contract and payload version govern internal availability; external cache configuration neither extends nor changes identity/invalidation.
- Full-file restoration makes cache startup proportional to cache size, including partial/small invocations. Repeated valid identity lines resolve deterministically by last-valid-wins; caller remains responsible for capacity and deleting state.
- `execution.ts` has one awaited terminal finalizer boundary after resolver creation. It covers normal completion, unavailable/failure exit and cancellation exit without extra source I/O, concurrent cache I/O, duplicate publication, settlement replay, background work or cache I/O that outlives the terminal return.
- Documentation and JSDoc now describe source-derived data in the caller directory, single-file visibility, no cleanup/concurrency guarantees, old per-entry-state ignore behavior, and best-effort line/file failure fallback.
- Formal verification used the direct `executeMarkdownLinkValidation` envelope on the deterministic 1,000-source/160-target workload. Cold, warm and single-file incremental each have five interleaved enabled/disabled pairs with raw samples, median, MAD, CPU, maxRSS, cache bytes and strict-serial disabled/enabled comparison. The raw result passes all three current thresholds; its values are observations within that run, not a storage-only causal attribution.
- Package external-consumer verification now observes the current format rather than legacy per-entry state: it verifies the one JSONL file has exactly two complete parseable lines and no partial tail. This is compatibility evidence for the package surface, not an additional storage guarantee.
- Final verification closed the narrow tests (28), `test-evidence` (385/385), static/docs/package checks, and both Project Gate profiles. The required profile passed in `.log/project-gate/2026-09-03T10-18-00...`; the repaired full profile passed 36/36 in `.log/project-gate/2026-09-03T10-20-42.799Z-3924014-8f28fc78-9584-4688-b2c0-442953a46a9b`. Independent correctness review passed; AI-ready and coding-style audits completed, with the latter making only the `try/finally` exceptional-finalize closure.

## Risks / Trade-offs

A single file removes per-entry file operations but every cache-using invocation reads/parses all stored lines; growth raises startup cost, and whole-file unreadability creates all-miss rather than a small local miss. The readiness microbenchmark used whole-file rewrite, while this implementation appends; its values do not predict or explain the formal cold, warm or incremental result.

Duplicate valid identities are intentionally last-valid-wins. Cross-process appends can interleave or leave invalid/partial lines; the contract supplies neither merge nor durability/atomicity guarantees, but line/file failures must remain cache-only availability loss. Cancellation has two explicit boundaries: an already-aborted signal prevents publication; cancellation after append starts still waits for the append while preserving cancellation settlement.

## Open Questions

无。单文件 name、envelope fields and versions、last-valid-wins、read-once session、append/create publication、failure/cancellation semantics、ignored old state、unsupported concurrency/durability features、formal performance result与 package external-consumer evidence 均已闭合；当前 Plan 仅等待显式归档授权，不保留实施或验证开放问题。
