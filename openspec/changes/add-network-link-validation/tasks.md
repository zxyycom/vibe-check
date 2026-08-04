本临时且未审计的 tasks 清单目标是安排line-independent、query-safe、SSRF-safe的外链联网验证；唯一1.1未完成前禁止全部实现。

## 1. 阻塞级 artifact 与依赖审计

- [ ] 1.1 阻塞审计全部artifacts是否围绕“显式联网、line-independent identity、query不持久化、temporary不伪装broken”；核对capability/check/exact findingCode-security-rule/evidence catalogs与semanticRegistryFingerprint、三个evidence catalog的kind/required/order/identity/redaction、machine semantics不解析message、optional section absent/skipped且不补neutral、present complete、override不能构造absent base、enabled=false/skipped、online无candidate/no-input、quick/full；逐字段对照Markdown sanitized handoff（safe scheme/host/port/path/query-key shape + ordinal/identity不含query value/userinfo/fragment/line，complete request URL仅bounded memory）、exact URL + complete effective timeouts/redirects/retries/TTL/Product-policy dedup、different per-file policy isolation与global-min scheduler、任一hop query zero persistent cache、raw URL/digest不入fingerprint、explicit-baseline-only且line/query-value rotation稳定，以及DNS/pin/redirect/retry/auth/outcome/channels/gate；确认feature只注册catalog、更新expected fingerprint/examples/fixtures且machine v2 schema bytes不变，执行SSRF/rebinding/query-oracle/evidence-redaction review；确认首句临时未审计、无越界或开放问题。此唯一项未勾选前不得执行第2节及以后任务。

## 2. 测试证据与受控网络基线

- [ ] 2.1 以1.1完成为前置，运行pre-change `bun run test-evidence:check`，恢复config、Markdown links、scanner/dependency、finding/gate/output与fixture owner Cases；规划semantic Case更新而不建立第二套inventory。
- [ ] 2.2 建立injectable resolver、address-pinning connector、manual-redirect transport、fake clock与isolated cache harness；required suite硬性禁止public DNS/internet并可断言resolver/socket/proxy/credential/cache-refresh zero calls。
- [ ] 2.3 先加入IP/DNS/rebinding/redirect/HEAD-GET/timeout/retry/auth/status矩阵，以及sanitized handoff/bounded request material、line/query rotation fingerprint、same URL different-policy isolation、query-in-any-hop zero persistent cache、queryless cache、typed evidence/order、registry-fingerprint drift与token/body leak canary。

## 3. Config v2 online policy

- [ ] 3.1 注册complete optional `checks.networkLinks` section、neutral contribution与single-active v2 migration；证明file-backed absent保持skipped且不补neutral、present complete、disabled/all-source-disabled skipped、online enabled无candidate no-input。
- [ ] 3.2 接入enabled/numeric overrideable leaves与base-only mode，证明override只能patch selected base已声明section、不能构造absent section或扩大global disabled；为每个active source构造complete timeout/redirect/retry/TTL/Product-version projection，不同projection不得共享outcome。
- [ ] 3.3 在config/usage validation与authorization之后、任何DNS/socket/cache refresh之前构造readonly effective network policy；scheduler对active policies使用最小concurrency且不把它混入terminal identity，并对disabled paths提供zero-I/O proof。

## 4. Markdown handoff、URL identity 与脱敏

- [ ] 4.1 消费Markdown sanitized external candidate：sourcePath/linkKind/safe scheme-host-port-path-query-key shape/ordinal/identity不含query value/userinfo/fragment/line；current location按identity单独关联，complete fragment-free request URL只从bounded invocation-memory lookup取得。
- [ ] 4.2 实现protocol-relative HTTPS、userinfo拒绝、safe display与exact code+semantic occurrence+catalog-valid safe shape fingerprint；证明fingerprint从不读取raw URL或其digest，query value/line rotation稳定且request仍保留query。
- [ ] 4.3 验证local/anchor/mailto/other-scheme candidates与deterministic link findings完全不进入network transport，network结果不覆盖其owner结论。

## 5. SSRF-safe resolver 与 connector

- [ ] 5.1 实现canonical host/IP parsing与globally-routable-unicast allow policy，覆盖loopback/private/ULA/link-local/unspecified/multicast/CGNAT/reserved/documentation/benchmark、metadata hostname和mixed DNS answers。
- [ ] 5.2 实现checked-answer pinning、Host/TLS SNI preservation、manual redirect逐跳revalidation与retry re-resolution；transport不能pin或address mismatch时request前fail closed，不fallback普通fetch/proxy。
- [ ] 5.3 将initial/redirect unsafe target映射为stable `external-link-unsafe-target` finding，将connector/security execution failure映射为indeterminate capability failure，并证明blocked endpoint zero requests。

## 6. Bounded request state machine 与 cache

- [ ] 6.1 实现single-total-deadline/concurrency-slot state machine、manual redirect loop/limit/location handling、HEAD first和405/501/404/410 bounded Range GET fallback；取得status evidence后abort且不保存body。
- [ ] 6.2 实现temporary DNS/connection/TLS/timeout、429/Retry-After与502/503/504 bounded retries，每次attempt重做SSRF检查；exhausted result保持indeterminate。
- [ ] 6.3 实现exact request URL + complete effective request-policy projection的bounded memory dedup；不同per-file projection独立work/result，任一hop含query时persistent cache zero read/write，只有全链路queryless terminal可使用同projection-bound cache；禁止line、query value/digest、body/header/credential/DNS/transient persistence。
- [ ] 6.4 实现reachable、protected、stable-broken、redirect-invalid、unsafe-target、indeterminate union与exact findingCode/security-rule mapping；仅GET-confirmed 404/410为broken，401/403非finding，temporary/ambiguous result不伪装broken。

## 7. Capability、comparison、gate 与输出集成

- [ ] 7.1 注册network descriptor与final result：disabled skipped、online no candidates no-input、all terminal succeeded、any indeterminate failed并丢弃partial findings。
- [ ] 7.2 接入all/changed/explicit-baseline-only regressions与gate；保持`regressions`为`changed`的order-preserving subsequence，按line-independent safe fingerprint投影，证明changed-scope内new occurrence可regression、省略baseline为空、line/query value rotation不regression且不声称历史remote state；query-rotated两侧不共享request work。
- [ ] 7.3 只向foundation catalogs注册capability、三个check IDs/exact semantic codes及closed typed evidence keys；固定kind/required/order/identity/redaction，更新expected semanticRegistryFingerprint、canonical examples与validator fixtures；machine v2 schema bytes保持不变。
- [ ] 7.4 接入foundation completeness/human/generic machine output并同步owner docs/Cases；machine consumer无需解析message即可取得safe URL/status/redirect/safety semantics，failed work只进diagnostic，partial findings不发布，不建立第二link parser/DTO。

## 8. 验证与交付审计

- [ ] 8.1 运行最窄config/policy-projection/sanitized-handoff/request-material/URL/resolver/connector/state-machine/dedup/cache/exact-evidence/baseline/channel/gate/output tests，再运行product import、typecheck、lint、完整product tests和`bun run test-evidence:check`。
- [ ] 8.2 运行`bun run validate`与`bun run verify:vibe-check-workspace:required`，证明required tests zero public internet、disabled zero-I/O、schemas/examples无drift且formal producer/consumer通过。
- [ ] 8.3 对最终diff执行SSRF adversarial matrix、raw URL/digest/query/auth/body/DNS-private-response leak canary、typed evidence catalog、dependency/license与授权范围检查，并再次严格验证本OpenSpec change；真实公共网络smoke如需执行必须另获明确授权且不得替代deterministic evidence。
