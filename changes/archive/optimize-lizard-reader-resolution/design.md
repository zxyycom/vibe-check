# Design

本设计把 host-specific reader lookup 优化限制在手写 façade seam，以原 registry fallback 和 differential evidence保护完整 filename 语义。

## Context

- 根因、计时边界、Python cache、Bun profile 与候选收益由 `docs/investigations/diagnose-lizard-typescript-port-performance-gap.md` 拥有。
- `use-a-verified-fast-path-for-lizard-reader-resolution.md` 已作为 `active + unaligned` Decision 建立；本 Change 获得当前请求的实施授权，但完成前不得把它标为 aligned。
- 已对齐 private-port Decision 规定，`analyzer/port-facade.ts` 是唯一目录外 production entry；Product adapter 不得访问 registry/core/readers，translated body 优先保持 source fidelity。
- 当前 registry 有 27 readers、56 declared extension entries 和 55 case-insensitive canonical suffixes；`R/r` 是唯一 canonical 合并。未知 suffix 在 private façade 返回 `undefined`，不采用 upstream `FileAnalyzer` 的 C-like fallback。
- 起点 Test Evidence 全树闭合为 454 个 Bun entities、112 Cases、15 topics。

## Goals / Non-Goals

**Goals**

- 用一个局部、可读、无额外框架的 resolver 消除常规 filename 的 ordered regex scan。
- 让 fast branch 与 fallback branch 均可直接对原 `get_reader_for` 做 identity differential 验证。
- 保持 Product 输出、reader precedence、Lizard oracle、source-alignment 与 package surface。
- 用同一 workload 和 ABBA 顺序量化实际收益。

**Non-Goals**

- 不修改、重排或优化 translated registry、reader matcher、tokenizer、state machine、processor、core 或 extension protocol。
- 不采用 global/exact-filename cache、batch reader API、generic resolver/plugin framework或向 Product 泄露 reader internals。
- 不切换 Bun/Node，不优化 Fortran/ST/Ruby tokenizer，也不建立跨主机 performance budget。
- 不改变 supported suffix、unknown input、Product admission、resource、cancellation、Record、Finding 或 waiver语义。

## Decisions

### Intended Change

1. façade 模块初始化时遍历一次 `languages()`，以 ASCII lower-case suffix 为 key 建立 private Map；仅在 key 尚不存在时写入，从而保留 source-order first-wins。
2. 唯一 private resolver 先判断完整 filename 是否属于已证明安全的 fast-path grammar。首个候选 grammar 为：非空、全部 ASCII、无 JavaScript line terminator、最后一个 `.` 后为非空 ASCII alphanumeric suffix；满足时查询 Map，否则调用 `get_reader_for(filename)`。
3. fast-path Map miss 对已证明 grammar 直接返回 `undefined`；任何无法证明与当前 `/.*\.(extensions)$/iu` 等价的输入都回退 registry。测试通过直接 reader identity 比较锁定两条 branch，而不是复制预期 reader 算法。
4. `isLizardSourceSupported` 和 `analyzeLizardSource` 只调用该 resolver；resolver 和 reader type保持 module-private。
5. 不抽出新模块、不新增 class/interface、缓存生命周期或 Product选项。注释只说明 source-order、fallback 与 deviation理由。

### Resulting Impacts

- Module initialization 增加最多 55 个 canonical entries 的固定只读 lookup state；它从同一 registry派生，不成为第二份 extension owner。
- filename 判断本身增加一个 O(path length) ASCII/terminator检查，但替代常规输入的最多27次regex构造和匹配；正式 benchmark决定净收益是否成立。
- 测试需要覆盖 fast hit、fast miss、fallback hit、fallback miss和两个 façade callers。若 property/differential evidence发现grammar并不安全，优先收窄grammar；不能闭合时撤销优化而不是修改registry。
- deviation文档增加一个 façade-only host seam；root provenance translated records和source identity manifest不变化，source-identity test继续证明该闭包。
- current docs只说明可观察的私有解析边界与source-aligned body不变，不公开实现算法或性能承诺。

## Risks / Trade-offs

- JavaScript `/iu` 与 Python `re.I` 对非ASCII case-fold并不完全同构；所有非ASCII输入默认回退TS原registry，避免扩大既有差异。
- 手工ASCII classifier若漏掉line terminator或特殊suffix形状会造成capability/analysis漂移；同resolver与direct differential corpus是主要防线。
- Map由constructor identity承载；不得把reader name或extension清单复制到production，否则上游新增reader可能静默漂移。
- timing observation可能受JIT、host load或样本顺序影响；正式证据使用相同operation、预热、15个ABBA blocks和output digest，不把单次数字作为Gate。

## Open Questions

无。若实现证据否定首个fast-path grammar或稳定收益，按Decision停止并保留原registry，不扩大范围。
