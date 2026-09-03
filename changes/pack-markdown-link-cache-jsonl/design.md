# Design

本 Plan 将 Markdown Link-owned parse-facts cache 实施为 caller-owned directory 内唯一的 JSONL file，并用 per-invocation session 将严格串行 read、fresh-parse 与 dirty collection 置于现有 resolver lifecycle 中；`execution.ts` 在同一 invocation 的 terminal boundary 同步完成最多一次 append publication。

## Context

[`docs/checks/markdown-link-validation.md`](../../docs/checks/markdown-link-validation.md) 与活动 Decision [`enable-explicit-markdown-link-parse-cache.md`](../../docs/decisions/enable-explicit-markdown-link-parse-cache.md) 继续拥有 current cache contract：cache default-disabled；enabled branch 只接受 absolute caller-owned directory；每次 invocation 必须重新读取 current authorized bytes、完成 authorization/endpoint validation/Finding/Record/settlement；cache 只替代 parse-facts computation。miss、invalid/hostile state、read/write failure 都 fresh-parse current bytes，且不改变 terminal output。

形成时分析 [`analyze-markdown-link-cache-packing.md`](../../docs/investigations/analyze-markdown-link-cache-packing.md) 保存单文件 storage-only readiness evidence：whole-file-rewrite single file cold `10.64 ms`、warm full `26.74 ms`，与约 256-entry warm full `26.59 ms` 基本相同，而 single-file incremental `8.06 ms` 高于约 256-entry 的 `2.21 ms`。它不调用 formal Check，且拟议实现是 append，因此只支持本 Plan 进入 formal runtime 验证，不预先决定性能验收结果。

当前 runtime 的 `parse-facts-cache.ts` 使用 generic `cacheJsonByKey` per-entry JSON state；`resolver-engine.ts` 在 source/target parse-facts paths 调用它。实施将只在 Link-owned area 替换该 state handling，不修改 generic helper；tests 和 Case ledger 将把新 session、single-file failure/cancellation 与 observable current-settlement 行为纳入 current evidence。

## Goals / Non-Goals

目标是让一个 cache-using invocation 只在首次 parse-cache use 时严格串行读取 `<directory>/markdown-link-parse-facts-v1.jsonl` 一次、从 current valid lines 恢复 Map、按 current exact bytes digest 复用或 fresh-parse，并在 `createMarkdownLocalResolver` 成功后的 `execution.ts` terminal boundary 按明确 cancellation boundary 至多一次严格串行 append/create 全部 dirty facts。该设计保持 existing public option、exact-byte identity、fatal UTF-8、strict serial I/O 和 current Check settlement。

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
- `execution.ts` gains one awaited terminal finalizer boundary after resolver creation. It must cover normal completion, unavailable/failure exit and cancellation exit without extra source I/O, concurrent cache I/O, duplicate publication, settlement replay, background work or cache I/O that outlives the terminal return.
- Documentation and JSDoc must explain source-derived data in the caller directory, single-file visibility, no cleanup/concurrency guarantees, old per-entry-state ignore behavior, and best-effort line/file failure fallback.
- Formal verification compares the implemented append design against the current strict-serial baseline on the deterministic 1,000-source/160-target workload. Cold, warm and single-file incremental each run at least five interleaved enabled/disabled pairs and report raw samples, median, dispersion, CPU, maxRSS, cache bytes and strict-serial before/current comparison. Each workload uses enabled/disabled medians from its current paired run: acceptance is cold enabled regression `<=5%`, plus warm and single-file incremental improvements each `>=20%` and `>=100 ms`.

## Risks / Trade-offs

A single file removes per-entry file operations but every cache-using invocation reads/parses all stored lines; growth raises startup cost, and whole-file unreadability creates all-miss rather than a small local miss. The readiness microbenchmark used whole-file rewrite, while this Plan appends, so its values cannot predict formal cold, warm or incremental gate results.

Duplicate valid identities are intentionally last-valid-wins. Cross-process appends can interleave or leave invalid/partial lines; the contract supplies neither merge nor durability/atomicity guarantees, but line/file failures must remain cache-only availability loss. Cancellation has two explicit boundaries: an already-aborted signal prevents publication; cancellation after append starts still waits for the append while preserving cancellation settlement.

## Open Questions

无。单文件 name、envelope fields and versions、last-valid-wins、read-once session、append/create publication、failure/cancellation semantics、ignored old state、unsupported concurrency/durability features and performance acceptance are all fixed by this Plan. Future evidence may change completion status but does not leave an implementation design decision open.
