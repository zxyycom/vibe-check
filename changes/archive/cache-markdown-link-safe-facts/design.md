# Design

本设计记录已实现的 Markdown Link persistent parse-facts cache 与 invocation-local target memo：它们优化 private parse computation，而不接管 current filesystem facts 或 Check settlement。

## Context

`markdownLinkValidation` 已实现 **persistent exact-content parse-facts cache + invocation-local target memo**。cache 由 Markdown Link owner 直接拥有：它只替换由已授权 bytes 决定的解析计算；每次 invocation 仍拥有 current filesystem facts 与 Check settlement。这是局部性能优化，不是通用 cache framework 或 Run cache manager。

仓库拥有的 deterministic corpus 是性能证据 owner。当前 formal runtime evidence 见 [verification review](evidence/verification-review.md)；historical prototype 的采用理由见 [readiness review](evidence/readiness-review.md)。

## Goals / Non-Goals

**Goals**

- 在 explicit opt-in 下复用 exact-content Link-private parse facts，并在一次 invocation 内减少重复 target parse。
- 保持 options、logical limits、current filesystem validation、Findings、Records、messages 与 terminal settlement 契约。
- 用 deterministic corpus 的 formal runtime evidence 验收性能，而不依赖不可访问的 private workload。

**Non-Goals**

- 不缓存或重放 whole Check，不建立 generic cache manager、public Markdown AST 或 cross-Check cache abstraction。
- 不提供 confidentiality、secret protection、tamper resistance、default directory、TTL/LRU、quota、automatic cleanup、remote sharing 或 machine cache telemetry。

## Decisions

### Intended Change

#### Public contract

`MarkdownLinkValidationOptions.cache` 是 closed discriminated union：

- omitted 或 `{ enabled: false }`：解析为 disabled，Check 不读取或创建 cache directory；
- `{ enabled: true, directory: string }`：`directory` 必须为非空、无 U+0000 的 host-absolute path；它启用 best-effort persistent parse facts。

resolved union 会 validation、detached/frozen 并参与 fingerprint。没有 default global directory，也不从 machine 或 diagnostic output path 推断目录。完整 consumer contract 和 example 分别由 [`docs/checks/markdown-link-validation.md`](../../docs/checks/markdown-link-validation.md) 与 [`docs/examples/package-api/markdown-link-validation.ts`](../../docs/examples/package-api/markdown-link-validation.ts) 拥有。

#### Persistent facts

1. resolver 先完成既有的 authorized bounded source read，再以 exact bytes digest、fixed Link parser-contract version 与 payload version 形成 identity。path、mtime、project-wide fingerprint 和 Check options 都不能代替 content identity。
2. `cacheJsonByKey(...)` 拥有 canonical envelope、strict identity validation 与 atomic best-effort publication。Markdown 拥有 caller key、strict payload parser 与 compute；helper 不拥有 Markdown semantics 或 settlement。
3. payload 是 Link-private occurrences、headings 与 decoded ranges 的 canonical closed projection；不含 source path、filesystem probe、target state、options、Finding、Record、message、duration 或 terminal outcome。
4. payload 可包含 raw destination 与 heading slug。能读取该目录的调用方可见 source-derived material、known-content equality 与 old entries；目录是性能状态，**不是** confidential 或 tamper-resistant storage。
5. miss、stale identity、malformed/hostile payload 与 read/write failure 都 fresh-parse current bytes；它们不向 Check output 添加 cache telemetry，也不能 replay settlement。

#### Invocation memo and invariants

每个 resolver invocation 都保留 successful parsed-heading snapshot 的 promise map，按 authorized canonical Markdown target 复用。key 含 canonical path、`maxMarkdownBytes` 和 parser-contract version；仅 successful read/decode/parse 会保留，failure 会删除且不 replay。

每个 logical endpoint occurrence 仍独立完成 destination classification、source-relative path resolution、root-external policy、containment authorization、current endpoint probe 和 specific anchor resolution。它在 memo lookup **之前**增加 `targetReadCount` 并消耗 `maxTargetReads`。因此 memo hit 只减少 physical target work，绝不减少 logical count/limit 或复用 final resolution。

同一次 invocation 中，target 在首次成功 snapshot 后发生变化时仍使用该 snapshot；endpoint probe 继续使用 current state。这是刻意的 reuse boundary。source/occurrence、persistent compute 与 memo boundary 都检查 cancellation。immutable facts 交给 atomic publication 后若发生 cancellation，entry 可以保留；cancelled invocation 不能消费 cache facts 来发布 settlement。

### Resulting Impacts

#### Lifecycle and non-goals

caller 选择 directory、监控容量并删除它。entries 随 content 增长；version upgrade 只使旧 entry 不命中。Product 不提供 TTL/LRU、quota、automatic cleanup、cross-process single-flight、remote sharing、secret protection、access control 或 default directory。

设计不缓存 whole Check outcome、Findings、Records、messages、target state、file selection 或 filesystem probes；不公开 Markdown AST/model、generic parser registry 或 machine/diagnostic cache telemetry，也不把该能力扩展到其他 Check。

## Risks / Trade-offs

formal five-pair retest 的 cold **21.74% faster**、warm **61.61% faster**、incremental **61.78% faster**，已满足所有 selected performance gates。direct tests 建立 output parity、option closure、invalidation/failure、memo reuse/logical limits 与 cancellation 边界；full workspace verification 通过 `36/36` checks。精确命令、raw samples 和 limits 见 [verification review](evidence/verification-review.md)。

unavailable private corpus 仍只是产品动机。formal corpus 不 flush OS page cache，`maxRSS` 是 cumulative process peak。runtime 不公开 physical read/parse counters；不将未测量的 formal counter reduction 作为事实。

## Open Questions

implementation 和 evidence 均已成为 current fact。Task 2.6 仍未勾选，只等待 final semantic owner review 与独立的 Decision alignment 决定；它不重新打开设计、不削弱已验证 runtime result，也不授权归档 Change。
