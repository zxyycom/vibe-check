# Proposal

`markdownLinkValidation` 现已提供两个互补但边界明确的性能优化：调用方显式启用的 **persistent parse-facts cache**，以及单次 invocation 内的 **canonical Markdown target memo**。它们只复用由已授权 Markdown bytes 决定的 Link-private parse facts；每次 Check 仍以当前 filesystem 和 options 独立形成 Findings、Records 与 terminal settlement。

## Why

用户曾报告一个上千 Markdown 文件项目约需五秒，但其 path、command、revision 和 options 均不可取得。该报告只是产品动机，不是本 Change 的性能结论。性能验收由仓库拥有的确定性 synthetic corpus 承接，避免把私有 workload 变成实现或验收前置条件。

整次 Check 不能缓存：source selection、containment、target state、anchor validation、limits、Finding、Record、message 和 settlement 都是当前 invocation 的事实。可安全复用的最小计算边界是 exact authorized Markdown bytes 的 Link-private occurrences、headings 和 decoded ranges；同一 invocation 中，重复的 Markdown target 还可共享首次成功的 read/decode/parse snapshot。

## Outcome

- `markdownLinkValidation` 的 `cache` 是 closed discriminated union。省略或 `{ enabled: false }` 完全关闭且不访问 cache filesystem；只有 `{ enabled: true, directory: <absolute path> }` 启用 persistent cache。
- enabled cache 使用 exact bytes digest、parser-contract version 和 payload version 识别 strict private parse facts。cache miss、过期/无效 payload 与 I/O failure 都 fresh-parse，不能改变 Check outcome 或输出。
- invocation-local memo 只共享成功 canonical Markdown target 的 parsed headings。每个 logical endpoint occurrence 仍在 memo lookup 前消耗 `maxTargetReads` 并计入 `targetReadCount`；path authorization、endpoint probe 和 anchor resolution 仍逐 occurrence 执行。
- cache directory 是 caller-owned、可信且可删除的本地性能状态。它可能保存 raw destination、heading slug 和 range；不提供 confidentiality、secret protection、tamper resistance、quota、TTL/LRU、automatic cleanup、remote sharing 或 default global directory。

### Performance evidence

正式验收使用固定 seed `0x5eedc0de` 的 1,000-source corpus，并对 disabled/enabled 的实际 `executeMarkdownLinkValidation` envelope 做五组交错 paired samples。结果是本 Change 的当前性能结论：

| Workload | Disabled median | Enabled median | Result |
| --- | ---: | ---: | --- |
| Cold（empty application cache） | 3380.79 ms | 2645.96 ms | **21.74% faster，节省 734.83 ms** |
| Warm（prewarmed cache） | 3124.95 ms | 1199.77 ms | **61.61% faster，节省 1925.18 ms** |
| Single-file incremental | 3192.93 ms | 1220.20 ms | **61.78% faster，节省 1972.73 ms** |

这超过准入线：cold 不得回退超过 5%，warm 和 incremental 各至少改善 20% 且节省 100 ms。formal runtime 不公开 physical read/parse counters；memo 的 physical reuse 和不变 logical accounting 由直接 resolver test 证明，而不是由 timing 推断。原始样本、MAD、CPU、maxRSS、cache footprint、fixture 和边界见 [evidence README](evidence/README.md) 与 [formal verification review](evidence/verification-review.md)。历史 prototype 仅说明当初为何选择 persistent + memo，不替代上述正式验收。

## Scope

### Intended Change

- 每次 invocation 重新执行 source selection、source/target authorization、current endpoint validation、options application、Finding/Record formation 和 settlement；从不缓存或重放 whole Check。
- payload 不含 path、filesystem probe、target state、options、Finding、Record、message、duration 或 terminal outcome。content/parser/payload 变化不会命中旧 facts。
- 取消、parser failure、source/target failure 继续按现有 Check 语义结算；cache/memo failure 不增加 message、Record、final-data 或 machine field。
- API、guide、example、candidate 和 installed-consumer acceptance 均以同一 explicit opt-in/lifecycle contract 为准；`docs/checks/markdown-link-validation.md` 是 consumer 行为 owner。

### Resulting Impacts

- Markdown Link owner 直接拥有 option resolution、strict payload projection、persistent lookup/publication 与 invocation memo；不改变通用 `cacheJsonByKey(...)` 的 mechanics contract。
- Public guide、README、canonical example、package declarations、candidate 和 installed consumer 共同投影同一显式启用与 caller lifecycle 边界。
- Tests 以现有 options、parser、target 和 outcome Cases 证明新行为；benchmark 只证明性能，不新增 semantic Case。

## Success Criteria

行为、public contract、semantic tests、Test Evidence、docs、package candidate/installed consumer 和 full workspace Gate 均已完成验证。2026-09-02 的 `bun run verify:vibe-check-workspace:full` 通过 `36/36` checks；完整命令与边界见 [formal verification review](evidence/verification-review.md#remaining-verification-state)。

本 Change 仍在 `plan`，因为 Tasks 2.6 的最终语义审阅、stable-owner 同步与 Decision alignment 核对尚未完成；本文件不将该未完成治理步骤表述为实现或性能阻塞，也不授权归档。

## Affected Owners

- `src/package-checks/markdown-link-validation/**`：runtime、options、parse facts、resolver 与直接行为 tests。
- `docs/checks/markdown-link-validation.md`：公开 consumer contract；README 与 canonical example 是其投影。
- `changes/cache-markdown-link-safe-facts/evidence/`：可复现 performance evidence 和历史 prototype 边界。
- `docs/decisions/enable-explicit-markdown-link-parse-cache.md`：长期方向；保持 `active + unaligned`，直到独立的 alignment 核对完成。
