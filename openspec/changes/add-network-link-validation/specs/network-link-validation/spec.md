本临时且未审计的 delta spec 目标是定义显式联网、line-independent identity、SSRF-safe且不持久化query credential的外链验证契约。

## Purpose

在不隐式访问网络、不把临时网络故障冒充 broken link 的前提下，安全验证 Markdown 中 HTTP(S) 外部目标的当前可达性。

## ADDED Requirements

### Requirement: Network validation is explicit and consumes only classified external links

Product registry SHALL 注册稳定 capability ID `network-link-validation` 和 check IDs `external-link-broken`、`external-link-redirect-invalid` 与 `external-link-unsafe-target`。这些 IDs、exact content finding codes/security rule与各check的closed typed evidence catalogs MUST只注册进foundation descriptor catalogs；注册 MUST改变基于 sorted public capability/check/metric/evidence catalogs canonical SHA-256 的 `semanticRegistryFingerprint` expected value并同步canonical examples/validator fixtures，但feature MUST NOT改变immutable machine v2 schema bytes、DTO shape、serializer或validator结构。

Selected file-backed v2省略`checks.networkLinks`时 MUST保持section absent、不得从neutral contribution补值，并将capability置为`skipped`。Section存在但base mode `disabled`或全部source policy `enabled = false`时同样 MUST为`skipped`，且DNS/socket/proxy/credential/cache-refresh均zero calls。只有base mode `online`且至少一个source enabled时，quick/full才请求capability；requested capability没有external HTTP(S) candidate时 MUST为`no-input`，不得表示为skipped或reachable success。Gate selection MUST NOT隐式启用联网。

Online capability MUST只消费`markdown-link-validation`交付且`classification = external-url`的sanitized internal candidate。其semantic fields MUST精确包含normalized `sourcePath`、`linkKind`、canonical `safeUrlShape`（scheme、host、optional port、path与ordered query-key shape）、positive `semanticOccurrenceOrdinal`及由这些字段组成的line-independent `semanticOccurrenceIdentity`；`safeUrlShape`、ordinal与identity MUST NOT包含query value、userinfo、fragment、line/column/byte offset或它们的digest。Markdown owner MAY通过identity关联一个仅用于当前finding定位的ephemeral location，但location不得进入candidate identity、fingerprint、request-work/cache key或comparison。

保留query value且去除fragment的complete request URL MUST与sanitized candidate分离，只能由Markdown owner放在bounded invocation-memory request-material lookup中，并由network boundary按identity取得以进行URL validation与实际request。它不得serialize、log、hash为persistent key或进入finding/evidence；userinfo存在时network boundary MUST在request前拒绝并释放request material。Protocol-relative destination只在该boundary确定性补HTTPS。Capability MUST NOT重新解析Markdown、处理local/anchor/mailto/other-scheme candidates或改写deterministic findings；per-file patch可禁用source，但不能把global disabled mode提升为online。

#### Scenario: Neutral and missing section remain offline

- **WHEN** invocation 使用 neutral/default config v2、缺少 network section，或 section mode 为 disabled
- **THEN** capability 为 skipped，deterministic Markdown validation 仍可完成
- **AND** DNS、socket、proxy、credential store 与 network cache refresh 的 injected probes 都保持 zero calls

#### Scenario: Enabled online request without external candidate is no-input

- **WHEN** complete network section mode为online且至少一个source enabled，但Markdown handoff没有external HTTP(S) candidate
- **THEN** capability为`no-input`
- **AND** resolver/transport执行zero calls，结果不被表示为`skipped`或reachable success

#### Scenario: Feature catalogs preserve machine v2 ownership

- **WHEN** Product注册network capability、三个check semantic codes与closed evidence catalogs
- **THEN** foundation generic v2 finding/capability structures承载结果
- **AND** expected semanticRegistryFingerprint/examples随catalog更新，feature不增加network-specific transport field、schema identity或第二条serializer

#### Scenario: Online handoff is narrow

- **WHEN** Markdown classification 同时产生 local path、anchor、mailto、other scheme 与 HTTP(S) external candidates
- **THEN** network capability只接收不含query value/userinfo/fragment/line的sanitized external candidates，并为同一safe shape的每个source occurrence保留独立semantic identity
- **AND** complete request URL只在bounded invocation memory按identity关联，network不重新分类或删除deterministic Markdown findings

#### Scenario: Per-file patch cannot opt in globally

- **WHEN** global mode disabled，但某 Markdown path 的 file patch 请求 network check enabled
- **THEN** Product 保持 network capability skipped且不产生网络 activity
- **AND** config resolution 说明 global online authorization 是不可由 leaf patch扩大的前置条件

### Requirement: Every request target is protected against SSRF

Network capability MUST 只请求 canonical HTTP 或 HTTPS URL，并在 network work 前拒绝 userinfo、invalid host/port 与其它 scheme。对 initial target、每个 redirect target 和每次 retry，Product MUST canonicalize host、显式阻断已知 cloud metadata hostname，并解析 DNS；IP literal 与 DNS 返回的每个地址都 MUST 是 globally routable unicast。任何 loopback、private/unique-local、link-local、unspecified、multicast、carrier-grade NAT、reserved/documentation/benchmark 或 metadata address MUST 使该 target blocked，且不得从 mixed answer 中选择一个 public address继续。

Connection MUST 只使用本次已审查 DNS answer 中的 approved address，同时为 HTTP Host 与 TLS SNI 保留 canonical hostname；transport 无法 pin approved address 或发现 resolution/connection address 不一致时 MUST 在发出 request 前返回安全失败。Redirect MUST 使用 manual handling，重新应用完整 scheme/host/DNS/address policy；ambient proxy、authentication header、cookie、netrc/keychain 与 URL userinfo MUST NOT 绕过这条 boundary。

#### Scenario: Initial private target is blocked without request

- **WHEN** candidate 使用 loopback/private/link-local/metadata literal，或 hostname 的任一 DNS answer 属于非 global-unicast 范围
- **THEN** capability 不建立连接，并产生 `external-link-unsafe-target` stable security-policy finding
- **AND** finding/diagnostic 不暴露 userinfo、query value、resolved private endpoint 的额外响应信息

#### Scenario: Redirect is revalidated

- **WHEN** approved public target 返回 redirect 到 private、link-local 或 metadata target
- **THEN** Product 在 follow 前阻断 redirect 并产生 unsafe-target finding
- **AND** private target 收到 zero requests

#### Scenario: DNS rebinding cannot change the connected endpoint

- **WHEN** resolver 审查的 public address 与 transport 将要连接的地址不一致，或 transport 不能 pin 已审查 address
- **THEN** attempt 在 request bytes 发出前以 operational security failure 结束
- **AND** Product 不通过二次隐式 DNS 或 proxy 继续连接

### Requirement: Request, redirect, retry and cache work stay bounded

Online validation SHALL 使用 resolved positive `requestTimeoutMs`、positive `totalTimeoutMs`、positive `maximumConcurrentRequests`、non-negative `maximumRedirects`、non-negative `maximumRetries` 与 non-negative `cacheTtlSeconds`；total timeout MUST 覆盖同一 request-work identity 的 DNS、redirect、retry 与 HEAD/GET work。每个active source MUST形成complete readonly effective request-policy projection，精确包含`requestTimeoutMs`、`totalTimeoutMs`、`maximumRedirects`、`maximumRetries`、`cacheTtlSeconds`及Product-owned SSRF/method/status/retry/cache policy version；`enabled`/`mode`只决定eligibility/authorization。`maximumConcurrentRequests`是scheduler-only field，不进入outcome identity；Invocation scheduler MUST使用全部active source policies中的最小值同时约束current/baseline work。

同一invocation的request-work/dedup identity MUST是exact fragment-free complete request URL加上述complete effective request-policy projection；它只能作为bounded memory key。只有两者都相同的occurrences/revisions才可共享一个state-machine outcome，然后 MUST为每个policy-specific source semantic occurrence分别投影result。即使request URL相同，只要任一timeout/redirect/retry/TTL或Product policy-version semantic不同，就 MUST运行独立work且不得共享outcome；不同per-file policy绝不能因URL相同而合并。Scheduler的global minimum concurrency不改变各work的policy projection或terminal semantics。

Product SHALL 先发 HEAD。HEAD 405/501 或会产生 stable broken 结论的 404/410 MUST 使用同一 remaining budget 执行 bounded GET；GET MUST 请求 `Range: bytes=0-0`、在取得足够 status/redirect evidence 后停止读取并不得保存 body。Connection/DNS temporary error、timeout、429 与 502/503/504 MAY 在 retry budget 内重试；429 的 valid `Retry-After` 只有不超过 remaining total budget 时才可等待。每次 retry MUST 重新执行 SSRF policy。

Full request URL（保留query、去除fragment）及其memory key MUST在work完成后释放，且不得serialize、log、进入finding/evidence或写入cache。Initial URL或任一followed redirect/retry target含non-empty query时，整个policy-specific terminal result MUST执行persistent cache zero reads/writes，不得以opaque/unsalted digest隐藏后持久化；它只可在同一invocation中按exact request URL加complete effective request-policy projection复用。只有全链路queryless work才可使用normalized queryless URL与同一complete policy projection的opaque digest作为persistent cache key。Cache value MUST只保存sanitized terminal classification、applicable status、bounded redirect summary与expiry，且不得保存userinfo、headers、body、cookies、credentials、DNS answers、line/location、semantic occurrence或transient outcome。Expired/malformed cache安全miss；`cacheTtlSeconds = 0`关闭所有persistent reuse。

#### Scenario: HEAD false broken result is confirmed by GET

- **WHEN** HEAD 返回 404/410，但 bounded GET 返回 reachable status
- **THEN** target 分类为 reachable且不产生 broken finding
- **AND** response body 不进入 memory accumulation、cache 或 artifact

#### Scenario: Retry remains inside one total budget

- **WHEN** target 依次返回 temporary error 或 429 Retry-After
- **THEN** Product 至多使用 configured retries、concurrency slot 与 remaining total timeout，并在每次 attempt 前重新验证 target
- **AND** 超出 retry 或 time budget 后只产生 indeterminate diagnostic，不产生 broken finding

#### Scenario: Query in any hop disables persistent cache

- **WHEN** initial、redirect或retry target任一hop含query token并得到terminal result
- **THEN** 该policy-specific work的persistent cache执行zero reads/writes；同一invocation只可按exact in-memory request URL加complete policy projection复用
- **AND** cache/log/artifact/fingerprint byte与derived-key search找不到raw query value、其digest、headers或body

#### Scenario: Queryless URL may reuse sanitized cache

- **WHEN** queryless URL得到cacheable terminal result且TTL非零
- **THEN** cache只写绑定complete effective request-policy projection的opaque key与sanitized classification/status/expiry，后续exact同policy可复用
- **AND** cache key/value不包含source line/location、headers、body、credentials或DNS answers

#### Scenario: Same URL under different source policies is not deduplicated

- **WHEN** 两个source occurrence具有相同exact request URL，但resolved timeout、redirect、retry、TTL或Product policy version任一不同
- **THEN** invocation创建两个独立request-work identities与terminal outcomes，不在memory或persistent cache间共享
- **AND** scheduler仍使用全部active policies的最小`maximumConcurrentRequests`，每个outcome只映射回其own policy-specific occurrences

### Requirement: Stable link findings are narrower than operational failure

Final reachable HTTP(S) status、401/403 protected status和经 valid redirect chain 得到的 reachable target SHALL 完成该 candidate而不产生 broken finding。只有 bounded GET 确认的 final 404/410 MUST产生check ID `external-link-broken`、`kind = content`、exact `findingCode = "external-link-broken"`的finding；redirect loop、超过redirect limit、missing/invalid redirect location MUST产生check ID `external-link-redirect-invalid`、`kind = content`、exact `findingCode = "external-link-redirect-invalid"`的finding；SSRF policy拒绝的initial/redirect/retry target MUST产生check ID `external-link-unsafe-target`、`kind = security`、exact Product `rule = "external-link-unsafe-target"`的finding且不向rejected target发请求。Security variant按foundation contract不得携带content `findingCode`；上述rule是该第三个check的exact stable semantic code。

每个stable network finding fingerprint MUST只使用versioned Product domain、上述exact findingCode/security rule、Markdown提供的line-independent `semanticOccurrenceIdentity`/ordinal，以及catalog-valid sanitized `urlShape`。`urlShape`只包含canonical scheme/host/port/path与ordered query-key shape。Fingerprint MUST NOT读取full/raw request URL，也 MUST NOT从其digest、query values、userinfo、fragment、line/column/source start、response/status/reason、effective request policy或backend identity派生。Same semantic occurrence的query value rotation或line-only movement MUST保持fingerprint稳定；new semantic occurrence或query-key shape变化得到new identity。

DNS resolution failure、connection/TLS error、timeout、429、5xx、HEAD/GET budget exhaustion及其它不能稳定证明 broken 的 HTTP result MUST 归为 operational indeterminate，MUST NOT 产生 broken/redirect finding，也 MUST NOT persistent-cache。任一 online eligible candidate 在 retries 后仍 indeterminate时，整个 capability MUST failed execution diagnostic并丢弃 partial findings；只有所有 candidates 都得到 reachable/protected或stable-finding terminal result 时才 succeeded。Online 但无 external candidate MUST no-input。

所有 human/machine/cache/diagnostic URL projection MUST只使用catalog-valid sanitized shape：删除userinfo与fragment、完全省略query values，只保留ordered query keys；source path与单独关联的current location MAY保留。Full request URL只存在于bounded invocation request-material/work memory，且不得进入network logs、evidence、fingerprint或cache。Human message不得成为consumer获得URL shape、status、redirect reason或safety reason的必需机器语义源。

#### Scenario: Authentication is not a broken link

- **WHEN** final response 是 401 或 403
- **THEN** candidate terminal state 为 protected、capability coverage完整且不产生 broken finding
- **AND** Product 不读取 ambient credentials、发送认证重试或缓存 auth headers

#### Scenario: Rate limit remains indeterminate

- **WHEN** 429 在 bounded retry/Retry-After policy 后仍存在
- **THEN** capability failed with sanitized operational diagnostic，requested gate not-evaluated
- **AND** Product 不把 rate limit 发布为 `external-link-broken`

#### Scenario: Confirmed 404 is stable broken evidence

- **WHEN** SSRF-safe HEAD 与 bounded GET 都确认 final 404 或 410
- **THEN** capability产生exact code `external-link-broken` finding及catalog-ordered safe URL/status evidence；仅queryless request可persistent-cache sanitized terminal result
- **AND** finding 不包含 response body、raw query values或 backend/client identity，consumer无需解析message取得status

### Requirement: Network finding evidence catalogs are exact, closed and sanitized

Network descriptor SHALL注册以下三个exact closed catalogs。每个finding的evidence MUST按declared order排列；unknown、missing required、wrong-kind、out-of-order或不满足enum/range语义的entry MUST使capability成为`invalid-result`并丢弃partial findings。

`external-link-broken` evidence：

| Order | Key | Kind | Required | Identity participation | Redaction |
| --- | --- | --- | --- | --- | --- |
| 1 | `urlShape` | `string` | yes | yes | `sanitized-url-shape-v1`; query values/userinfo/fragment forbidden |
| 2 | `statusCode` | `number` | yes | no | `none`; exact integer `404` or `410` only |

`external-link-redirect-invalid` evidence：

| Order | Key | Kind | Required | Identity participation | Redaction |
| --- | --- | --- | --- | --- | --- |
| 1 | `urlShape` | `string` | yes | yes | `sanitized-url-shape-v1`; query values/userinfo/fragment forbidden |
| 2 | `statusCode` | `number` | yes | no | `none`; integer redirect status only |
| 3 | `redirectReason` | `string` | yes | no | `allowlist-enum`; values `loop`, `limit-exceeded`, `missing-location`, `invalid-location` only |
| 4 | `redirectCount` | `number` | yes | no | `none`; non-negative safe integer only |

`external-link-unsafe-target` evidence：

| Order | Key | Kind | Required | Identity participation | Redaction |
| --- | --- | --- | --- | --- | --- |
| 1 | `urlShape` | `string` | yes | yes | `sanitized-url-shape-v1`; rejected-target shape with query values/userinfo/fragment forbidden |
| 2 | `targetStage` | `string` | yes | no | `allowlist-enum`; values `initial`, `redirect`, `retry` only |
| 3 | `safetyReason` | `string` | yes | no | `allowlist-enum`; values `userinfo`, `invalid-host-port`, `disallowed-scheme`, `metadata-host`, `non-global-ip-literal`, `non-global-dns-answer`, `mixed-dns-answer` only |

`urlShape` MUST由sanitized candidate/target fields直接canonical serialize，不能通过hash raw URL后重建；它不得包含raw query value或其digest。Catalog MUST NOT允许response body/header、userinfo、credential、DNS answer、resolved private address、backend/client identity或arbitrary remote error text。Status/redirect/safety values只承载typed machine semantics且不参与fingerprint；message仅作人读。三个catalog semantics进入producing registry canonical projection并更新expected `semanticRegistryFingerprint`/examples/validator fixtures，但immutable machine v2 schema bytes保持不变。

#### Scenario: Typed network evidence needs no message parsing

- **WHEN** controlled fixtures分别产生confirmed 410、redirect loop与metadata-host rejection
- **THEN** 三个findings使用各自exact code/rule并按catalog顺序投影safe `urlShape`及status/redirect/safety evidence
- **AND** 删除human message后machine consumer仍可解释结果，且byte search找不到query value/userinfo/body/DNS/private response或其digest

### Requirement: Network findings have conservative comparison and gate semantics

`all` SHALL包含全部current stable network findings；`changed`只包含source path位于changed scope的current findings并保持`all`中的相对顺序。只有调用者提供有效显式baseline时才可计算`regressions`；省略、无效或fallback baseline MUST产生zero network regressions而不得推断历史。显式baseline存在时，Product MAY只对exact request URL加complete effective request-policy projection均相同的work在invocation memory共享outcome，但 MUST为每个revision/line-independent semantic occurrence分别投影result。已经属于`changed`的current stable finding只有在baseline不含同一check semantic code与safe semantic occurrence identity时才进入`regressions`，因此`regressions` MUST是`changed`的order-preserving subsequence。Same occurrence的line-only movement或query value rotation MUST保持identity且不制造regression；query value不同意味着request-work不得dedup，仍不改变comparison identity。同一occurrence两侧都存在时，remote endpoint当前状态或effective policy差异不得伪装为历史可重建code regression。

Gate SHALL 只评价 foundation selected channel 中未接受的 stable network findings。Disabled/no-input遵循 shared completeness；任何 indeterminate或security execution failure MUST 使 overall completeness failed、requested gate not-evaluated，并丢弃 partial findings。Network acceptance沿用 foundation/tool-neutral safe finding identity，不得按 response body、raw URL query、client/backend或temporary error text匹配。

#### Scenario: New broken external occurrence is a regression

- **WHEN** explicit baseline不含某 current source occurrence、其source path命中changed scope，且其 SSRF-safe live result是 confirmed 404/410
- **THEN** stable finding进入 all、changed，并按原顺序进入 regressions
- **AND** selected regressions gate只在finding未接受时阻断

#### Scenario: Existing URL does not invent historical remote state

- **WHEN**同一safe source occurrence在 current/baseline均存在，且两侧exact request URL和complete effective policy相同、本次shared live outcome为broken
- **THEN** current finding保留在 all，但不声称 baseline revision当时的远端状态不同
- **AND** request-work可复用同一invocation outcome，但仍按revision投影且不伪造regression

#### Scenario: Query rotation and line movement preserve comparison identity

- **WHEN** current与baseline的same semantic occurrence仅改变query value或source line/start position，sanitized query-key shape不变
- **THEN** finding fingerprint保持相同且不进入`regressions`
- **AND** request使用各自完整query语义并因exact URL不同而不共享work；raw values不进入candidate identity、fingerprint、evidence或persistent cache

#### Scenario: Baseline omission never infers a network regression

- **WHEN** invocation没有调用者提供的有效显式baseline，即使current得到stable broken/redirect/unsafe finding
- **THEN** finding可进入`all`与适用`changed`，但`regressions`为空
- **AND** Product不从Git fallback、cache age、remote status或line/location推断baseline occurrence

#### Scenario: Temporary failure prevents evaluated gate

- **WHEN**至少一个 online candidate在 bounded attempts 后为 timeout、DNS/transport error、429或5xx indeterminate
- **THEN** network capability与overall completeness failed，requested gate not-evaluated
- **AND** partial reachable/broken results不进入published finding channels
