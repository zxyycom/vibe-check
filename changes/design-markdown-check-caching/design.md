# Design

本设计以逐文件 Markdown lint 结果为唯一新增缓存候选；现有 Link cache 只作为失效边界，不进入统一结果缓存。

## Context

[`add-markdown-lint-check`](../add-markdown-lint-check/) 先交付不含 persistent cache 的随包 lint Check。本 Change 依赖其 rule catalog、adapter policy、Finding schema 和资源边界，但不阻塞初版 Check。

[`cache-results.md`](../../docs/guides/cache-results.md) 已提供 `cacheJsonByKey(...)` 的 canonical envelope、读取校验和 atomic publication。调用方仍拥有 semantic key、payload parser 与 computation；活动决策 [`provide-caller-keyed-json-cache-without-run-caching.md`](../../docs/decisions/provide-caller-keyed-json-cache-without-run-caching.md) 明确排除 Run settlement cache。

[`enable-explicit-markdown-link-parse-cache.md`](../../docs/decisions/enable-explicit-markdown-link-parse-cache.md) 已将 Link persistent cache 限定为 exact-content parse facts。Target containment、读取、anchor resolution、Finding 和 settlement 每次重新计算；本 Change 保持该设计。

2026-09-11 的初始基线使用 `markdownlint@0.41.1` direct API、507 个已预读 tracked Markdown 和候选高信号规则：batch 约 1.86–2.61 秒，逐文件约 1.66–2.16 秒，均产生 62 条 Finding。基线尚未覆盖文件读取、峰值内存、cache I/O、磁盘占用或大型 consumer corpus，因此 Plan 前仍需建立验收门槛。

## Goals / Non-Goals

### Goals

- 为逐文件 lint facts 定义完整 key、闭合 payload、失效和故障回退语义。
- 用 no-cache、cold、warm 与 single-file incremental workload 建立实施门槛。
- 复用现有 canonical storage mechanics，同时保留 Check-owned cache policy。
- 保证 cache hit 与 fresh lint 形成相同的有序诊断和 Check 结果。

### Non-Goals

- 初版 lint Check 保持无 cache；本 Change 在其契约稳定后推进。
- Link target 结果、whole Check、Run、Records、messages 和 terminal outcome 始终按当前 invocation 计算。
- Markdown lint 与 Markdown Link 保持独立 owner，不共享 AST、parser model 或 hidden state。
- Cache 是调用方拥有的本地性能状态，不提供默认全局目录、remote sharing、保密、TTL/LRU、quota 或自动清理。

## Decisions

### Intended Change

以下是当前推荐设计；性能门槛与 storage layout 仍需在形成 Plan 前闭合。

1. **按计算依赖限定缓存层。** 每一层只有在 key 覆盖全部结果依赖时才能命中：

   | 场景 | 结果依赖 | 持久复用判断 |
   | --- | --- | --- |
   | Markdown lint 单文件诊断 | path/bytes、规则参数、方言、inline-config policy、backend/adapter contract | 新增候选：Product-normalized lint facts |
   | Markdown Link source parse facts | source bytes、Link parser/payload contract | 保持现有 parse-facts cache |
   | Markdown Link target/anchor resolution | parse facts、当前 target、目录、containment、options 与 I/O | 每次 invocation 重算 |
   | Record 与 terminal settlement | 本次 inputs、limits、policy、rejections 与 current computation | 每次 invocation 重算 |

2. **只共享存储机制。** Product-wide Markdown result cache 会隐藏 Link 的跨文件依赖，lint/Link union payload 也会混合合法状态。当前方案只复用 `cacheJsonByKey` 一类 canonical storage mechanics；lint owner 独立定义 namespace、key、payload 和 failure policy，Link cache 保持现状。
3. **完整 lint key。** Key 至少包含 Product cache schema、lint adapter contract、`markdownlint` 精确版本、规范化 rule/preset/参数、固定方言、inline-config policy、project-relative path 和 exact source bytes digest。File selection、Finding policy、消息与 settlement 在 cache 外按本次配置应用。
4. **最小 lint payload。** Payload 只保存有界的公共 rule name、range 和形成 lint Finding 所需的 closed facts。Source bytes、第三方 message/context、修复文本、AST、Record envelope 和 pass/fail 不落盘；损坏、旧版、超限或 parser 拒绝的 entry 重新 lint。
5. **显式 best-effort policy。** 公共配置候选为 `{ enabled: false } | { enabled: true, directory }`，省略时关闭。Enabled directory 必须 absolute、由调用方信任、可删除且自行管理容量；disabled 不访问目录。Read/parse/write failure 回退当前计算，并保持 Check 输出不变。
6. **证据门槛。** Plan 前固定 corpus、runtime、API path、rules 和 cache state，交错测量 no-cache、cold-enabled、warm-enabled、single-file incremental 与 corrupt-entry fallback；记录 wall time、可取得的 CPU/peak RSS、cache bytes/entry count 和输出等价。只有预先声明的 warm/incremental 收益成立，且 cold overhead、内存、磁盘与复杂度在门槛内，才进入实现。
7. **跨 Check 正确性。** 同时运行 lint 与 Link 时，lint cache hit 不影响 Link 执行。保持 source 不变并修改 target 或目录成员后，Link 必须依据当前 filesystem facts 产生结果。

### Resulting Impacts

- **Change 依赖。** `add-markdown-lint-check` 先冻结 rule、adapter、range 和 result contract；本 Change 可并行完成 workload、key matrix 和 storage spike。
- **Product 与材料。** 实施会修改 `src/package-checks/markdown-lint/**`、options、guide、JSDoc、type acceptance、candidate consumer evidence 和 changelog。共享 storage mechanics 仍由现有 cache owner 承接。
- **Link owner。** 现有 parse cache、target memo、options 和公共结果保持不变；新的 Link persistence 需要独立证据和决策。
- **安全与运维。** 指南说明 cache 可含 source-derived ranges/diagnostics；调用方负责目录信任、容量和删除。Key 不包含 secret、credential 或低熵敏感原文。
- **决策与测试。** Cache layer、identity、默认关闭 policy 与 settlement 边界形成长期 Decision；测试覆盖命中、失效、hostile entry、I/O failure、输出等价和跨 Check target change，并维护 Case ledger。

## Risks / Trade-offs

- Per-file entry 简化失效，但小文件 corpus 的 I/O 可能超过 lint 计算；聚合格式则增加局部更新和损坏恢复复杂度。
- Key 遗漏 path、rule 参数、方言或 backend version 会错误命中；纳入 settlement policy 又会降低复用并混淆 owner。
- Rule mapping 或 range contract 变化必须使 Product-normalized payload 失效。
- 当前基线规模有限且没有 memory 数据，只能支持继续测量，不能确定收益门槛。

## Open Questions

- 本 Change 在门槛通过后直接实现 lint cache，还是只交付设计与 Decision；形成 Plan 前需固定完成出口。
- Representative corpus、runtime 以及 cold/warm/incremental 的接受阈值是什么，是否保留可复现 benchmark harness。
- 使用 `cacheJsonByKey` 的 per-entry 布局，还是建立 owner-local 聚合格式；两者的 cold overhead、并发和 corrupt-entry 行为如何比较。
- Machine output 是否需要 cache telemetry；默认方案保持输出等价且不扩展 schema。
