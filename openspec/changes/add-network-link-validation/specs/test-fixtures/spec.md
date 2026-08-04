本临时且未审计的 delta spec 目标是用受控网络证明line-independent identity、query-safe cache、SSRF与保守失败语义。

## ADDED Requirements

### Requirement: Network fixtures use controlled resolver and transport evidence

Repository SHALL通过injectable resolver、manual-redirect transport、fake clock与isolated cache证明offline zero-I/O、sanitized HTTP(S) handoff/bounded request material、IP/DNS/rebinding、redirect/HEAD-GET/timeout/retry/cache、auth/status/outcomes/channels/gate。Matrix MUST覆盖line-independent semantic occurrence、line/query value rotation fingerprint、new occurrence、exact URL + complete policy dedup、same URL/different per-file policy isolation、任一hop query zero persistent cache、queryless reuse、explicit-baseline-only comparison，以及三个exact finding semantic codes与closed evidence catalogs。Tests MUST验证catalog registration改变expected semanticRegistryFingerprint/examples/fixtures但不改变machine v2 schema bytes。Required tests不得访问公共网络，且必须断言raw request URL/query token及其derived digest、userinfo、headers/body、DNS/private response不进入console、stderr、artifacts、finding/evidence、persistent cache或logs。

#### Scenario: Offline matrix performs zero network work

- **WHEN**neutral、missing-section、disabled与global-disabled/per-file-enabled scenarios运行
- **THEN**resolver、transport、proxy、credential store与network-cache-refresh doubles均为zero calls
- **AND**deterministic Markdown findings仍按其owner契约产生

#### Scenario: SSRF and transient matrix stays semantically separate

- **WHEN**controlled cases覆盖private/metadata redirect、DNS rebinding、confirmed 404、401/403、429、timeout与5xx
- **THEN**unsafe、stable-broken、protected与indeterminate outcomes分别满足finding/completeness/gate contract
- **AND**没有temporary outcome被断言为broken link

#### Scenario: Query token stays memory-only and out of identity

- **WHEN**same semantic occurrence只rotation query value并得到terminal result
- **THEN**request保留各自query，finding fingerprint相同，persistent cache zero reads/writes
- **AND**line/start position、raw URL/value及其digest不进入candidate identity、fingerprint、evidence、cache、artifact或log；两侧因exact URL不同而不共享request work

#### Scenario: Policy-specific work cannot cross-contaminate outcomes

- **WHEN**same exact request URL从两个source以不同timeout/redirect/retry/TTL policy运行
- **THEN**transport harness观察两个独立work identities/outcomes，scheduler concurrency仍取active policies最小值
- **AND**每个result只投影到own source occurrences，persistent cache也不能跨policy复用

#### Scenario: Exact evidence catalogs remain safe and machine-readable

- **WHEN**controlled 410、redirect loop与unsafe metadata-host fixtures产生三个network findings
- **THEN**finding使用exact content code/security rule，并以catalog order输出safe `urlShape`和相应status/redirect/safety typed evidence
- **AND**unknown/missing/wrong-kind/out-of-order evidence被owner validator拒绝，consumer无需解析message，raw query/userinfo/body/DNS/private response不可见

#### Scenario: Baseline is explicit and identity is line/query-value stable

- **WHEN**无baseline运行一次，再以explicit baseline运行line movement与query-value rotation cases
- **THEN**无baseline的regressions为空；explicit baseline下same safe occurrence fingerprint稳定且不产生regression
- **AND**query-rotated两侧各自请求完整URL但不共享work或持久cache
