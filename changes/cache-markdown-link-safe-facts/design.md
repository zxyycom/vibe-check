# Design

本设计把可复用的 Markdown 内容解析与每次必须重做的 filesystem resolution 分开，并在任何持久化前先闭合 raw destination 与 heading material 的安全边界。

## Context

- `MarkdownLinkValidationOptions` 当前只有 file selection、finding policy、target modes 与 work limits，没有 cache option。
- `LinkLocalResolver.readSource(...)` 对每个选中 source 执行 root probe、read、UTF-8 decode 和 `parseMarkdownLinkFacts(...)`；cross-document anchor validation 还会再次读取并解析 Markdown target。
- 当前 resolver 只计数 target reads，没有跨 occurrence promise memo 或跨 invocation persistent cache。
- Package 当前内置 Check 的缓存现状与适用性并不相同：
  - `duplicateDetection` 已默认启用 Check-owned persistent raw-scan cache；它的 identity 包含 exact-input fingerprint、scanner provenance 与阈值，write failure 还会形成 owning unavailable，不能迁入通用 Run cache。
  - `jsonSchemaValidation` 已在单次 execution 内用 promise map 合并同一 normalized remote reference 的加载；远端内容、allowlist、schema graph 与 Ajv validator 都不适合在没有独立安全和失效设计时跨 invocation 复用。
  - `fileMetrics` 与 `functionMetrics` 当前分别执行一次 batch SCC/Lizard scan。两者可能复用 content-keyed measurement，但预先 hash 全部文件也会产生完整读取成本；`functionMetrics` 还处于 analyzer owner 迁移期，当前没有证据支持先为旧 adapter 固化 cache contract。
  - `jsonValidation` 逐文件完成 bounded read、UTF-8、严格语法和 duplicate-key 检查；content cache 不能消除读取成本，现阶段没有大 corpus 基线证明 parser cache 的净收益。
  - `maintenanceReminders` 复用一次 first-parent history，但会按每个 entry 和 commit 重复执行 `rev-parse` / `diff-tree --numstat`；它是独立的 Git-history measurement 优化候选，不与 Markdown payload、路径或失效语义共用一个 cache owner。
- aligned Markdown parser Decision 把 dependency AST 收敛为 Link-private occurrences、headings 和 ranges，不允许公开 AST、shared Markdown model 或 cross-Check snapshot。
- aligned caller-keyed cache Decision 只提供 storage mechanics；consumer 必须拥有 key、payload parser、失效和 failure policy，并禁止用 cache hit 重放 Check settlement。

## Goals / Non-Goals

**Goals**

- 用可复现 benchmark 判断千文件 cold、warm 和单文件增量 workload 的真实瓶颈与收益。
- 只缓存能由已授权 source bytes 完整决定、且经过安全持久化投影的 Link-private facts。
- 在一次 invocation 内避免同一 canonical target 的重复 read/decode/parse，同时保持 target-read limits 的可解释语义。
- 让 cache failure 不改变成功解析和 Check settlement，并证明 stale/invalid payload 不形成 hit。

**Non-Goals**

- 不缓存完整 Check outcome、Finding、Record、message、duration、target existence 或 directory/symlink状态。
- 不建立公共 Markdown AST、通用 parser registry、跨 Check cache manager、remote cache、TTL/LRU 或自动 cleanup。
- 不以本 Change 为其它内置 Check 添加 cache；`maintenanceReminders`、function/file metrics 或 JSON 的优化必须由各自 measurement owner 和性能证据独立成立。
- 不把 HTML 或 Network Link Change 并入同一 parser/cache owner。
- 不让 Secret Detection、raw external URL、userinfo、query、credential 或其低熵 digest 进入持久 cache。

## Decisions

### Intended Change

以下方向在 Plan 前仍需由 benchmark 与安全 payload 设计确认：

1. 以授权读取的 exact source bytes 计算 SHA-256 content key，并把 parser contract/payload version 放入 cache identity；路径、mtime 或 project-wide fingerprint 不代替内容 identity。
2. cache payload 只保存 Markdown Link owner 明确允许持久化的 closed facts。当前 `rawDestination` 与完整 heading slug 不自动合格；Plan 必须选择安全 local-destination projection、不可逆且不用于匹配的摘要，或放弃对应 facts 的 persistent cache。外链 raw URL 只能在 invocation memory 中分类后丢弃。
3. 每次 invocation 仍重新收集 exact source paths、读取 bytes 形成 hash、执行 root containment 与 endpoint probes。缓存优化 AST/fact extraction，不声称避免所有 filesystem reads。
4. cross-document target 的 invocation-local memo 以 canonical target 和本次解析要求为边界，共享 in-flight/completed promise；取消、read limit、error folding 和 source-relative target descriptor必须保持当前 contract。
5. 若 persistent payload 能安全闭合，优先复用 `cacheJsonByKey(...)` 的 canonical envelope、parser validation 与 atomic publication；Markdown owner仍负责 relative directory resolution、namespace/version、observation policy和是否公开 cache options。
6. 只有 cold run 无显著回退、warm/增量 corpus 有稳定收益且结果/Records/limits完全相同时才默认启用；否则保持 opt-in或只采用 invocation memoization。
7. persistent cache directory 不从 machine publication 或 diagnostic logging directory 推断。若公共 invocation path context 在本 Change 进入 Plan 前成立，Markdown owner 可以消费其中明确声明为 cross-run state 的路径；仅暴露 Run output target 不能替代持久 cache 配置。

### Resulting Impacts

- `src/package-checks/markdown-link-validation/**` 需要拆出可验证的 safe parsed-facts payload、cache key/version、invocation memo 与 failure mapping，但 parser和resolver继续是 Link-private owner。
- 若增加 public `cache` option，需要同步 closed authoring/resolved options、默认值、deep freeze、fingerprint、README/Check guide、declaration projection和installed consumer；不得复用 duplicate cache 的领域 identity或 write-failure settlement。
- 若公共 invocation path context 先落地，需要同步其只读 path facts 与 writable state ownership；不得因目录相同就把 machine canonical files、diagnostic log 或 Check cache 合并为一个 output owner。
- Tests需要覆盖 cold/miss/hit、单文件变化、parser version、损坏/hostile payload、read/write failure、concurrent publication、cancel、target变化、limits及raw secret canary不落盘。
- Test Evidence和performance evidence需要证明相同 source/target facts与terminal outputs；machine/Check/Record schema不增加cache字段。

## Risks / Trade-offs

- 读取全部 source bytes生成hash仍有O(total bytes)成本；若瓶颈主要是目录枚举或I/O而非AST解析，persistent cache收益可能有限。
- 每内容一个entry可实现细粒度增量复用，但没有cleanup时会随历史内容增长；批量entry减少文件数量却使任一变化失效整个集合。
- invocation memo可能改变`maxTargetReads`的计数语义；必须明确该limit约束实际filesystem validation还是logical occurrences，不能以优化名义静默放宽。
- parsed facts可能携带原文派生的敏感片段。即使cache目录受信，也不能假设所有Markdown内容都适合复制到持久状态。

## Open Questions

- 哪个一千文件以上的representative corpus或synthetic fixture用于固定cold、warm、incremental budget？
- persistent safe payload能否在不保存raw destination和完整heading material的情况下支持足够多的解析复用？
- cache默认启用还是opt-in；默认目录、版本升级和无cleanup边界如何向consumer说明？
- invocation memo命中是否消耗`maxTargetReads`，以及同一target的不同anchor/options如何共享endpoint与parsed-heading facts？
