本临时且未审计的 design 目标是说明如何用显式授权、line-independent identity、query-safe cache与可pin连接实现外链联网验证。

## Context

`add-markdown-link-validation`计划拥有Markdown解析和确定性分类，并把external HTTP(S) occurrence作为internal record交给下游；它绝不联网。`introduce-content-quality-foundation`拥有capability registry、finding variants、channels/completeness/gate和machine v2。`add-file-policy-overrides`拥有config v2 composition与patch precedence。本change必须在这三者之上增加网络policy与transport，而不能重建parser、finding DTO或config merge。

普通high-level fetch会在redirect、DNS与代理层隐藏实际连接地址，无法单靠URL字符串防SSRF。外链状态又天然随时间变化，因此“请求失败”不能直接等于“broken”。这两个约束决定实现需要显式state machine与窄terminal result模型。

## Goals / Non-Goals

**Goals:**

- Disabled/missing/neutral policy做到可证明的zero network I/O。
- 对每次initial/redirect/retry建立相同的scheme、DNS、address和connection-pin安全检查。
- 用bounded HEAD/GET、retry、timeout、concurrency、queryless persistent cache与query-bearing memory-only dedup减少成本，且不同effective request policy绝不共享outcome。
- 让finding/comparison identity不依赖line/start position或raw query value，请求仍保留完整query语义。
- 用closed typed evidence让machine consumer取得safe URL shape、status/redirect/safety reason而无需解析message。
- 只把稳定terminal evidence变成finding；temporary/indeterminate outcome进入completeness failure。

**Non-Goals:**

- 不登录站点、不发送cookies/custom auth，不验证需要浏览器JavaScript执行的页面内容。
- 不检查mailto、FTP、file、absolute filesystem或local/anchor links；这些由deterministic owner处理。
- 不承诺重建baseline提交当时的互联网状态。
- 不提供ambient/custom proxy或任意request header配置；未来需要时必须单独做SSRF/credential设计。

## Decisions

### Decision 1: 依赖按handoff单向组合

Network descriptor只消费Markdown owner交付的`classification = external-url` sanitized records：normalized source path、link kind、不含query value/userinfo/fragment/location的safe scheme/host/port/path/query-key shape、semantic occurrence ordinal与line-independent identity。Current location可由identity单独关联且只用于定位。保留query的complete fragment-free request URL与candidate分离，只在bounded invocation request-material lookup中按identity取得，用于validation/request后释放；不得进入fingerprint、evidence、log或cache。Foundation仍拥有finding/completeness/output与immutable machine v2；feature只注册capability/check/evidence catalogs，并更新expected `semanticRegistryFingerprint`、canonical examples与validator fixtures，不改变schema bytes。Overlay仍是config patch owner。

备选是network scanner自行遍历并解析Markdown。它会让classification、reference resolution和location identity出现第二owner，故不采用。

### Decision 2: Global mode是唯一联网授权

Registered optional `checks.networkLinks` section在file-backed base缺失时保持absent/skipped且不补neutral；存在必须complete。Override只能patch base已声明section，不能构造absent section。Neutral/default显式materialize`enabled: false`与`mode: disabled`。只有base-only mode online授权DNS/socket；overrideable enabled选择source，numeric leaves保持typed。Section/base disabled或全部source disabled为skipped；online+enabled但无external candidate为no-input。Gate不改变授权。

备选是“只有gate才联网”或发现external URL就自动联网。前者让gate产生隐式副作用，后者破坏neutral observation/offline CI，均不采用。

### Decision 3: Resolver与connector组成一个不可分割的SSRF boundary

每个attempt先canonicalize URL，拒绝userinfo/non-http(s)，再解析hostname并要求所有answers都是global-unicast；metadata hostname另有explicit deny。Connector只允许连接本次checked address，同时使用原hostname提供Host/SNI。Redirect使用manual mode逐跳重走该流程；retry也重新解析。若runtime transport不能pin address或会暗中使用proxy/DNS，直接返回security execution failure，不发送request。

备选是先DNS检查再调用普通fetch。DNS rebinding、mixed answers和implicit redirect会在check/use之间绕过策略，故不采用。只从mixed answer挑public IP也不采用，因为攻击者仍可控制选择/重绑定。

### Decision 4: Raw request、semantic occurrence与safe identity分离

Internal request URL保留query但去除fragment；protocol-relative candidate只为execution加HTTPS。Sanitized candidate identity使用Markdown owner的source path、link kind、safe URL shape和semantic occurrence ordinal；line/location仅用于当前展示。Finding fingerprint从versioned domain、exact findingCode/security rule、semantic occurrence identity/ordinal与catalog-valid sanitized URL shape派生，绝不读取raw URL或其digest，也不使用query values、userinfo、fragment、line、response、policy或backend。Same occurrence的query value rotation/line movement稳定，new occurrence或query-key shape变化才改变identity。Display/evidence sanitizer完全删除userinfo、fragment与query values，只保留ordered query keys。

同一invocation只能在bounded memory按exact full request URL加complete effective request-policy projection去重current/baseline与重复occurrences，每个policy-specific semantic occurrence仍单独投影。Projection固定包含timeouts、redirect/retry/TTL与Product network policy version；任一per-file policy不同都建立独立outcome。Concurrency是scheduler-only：全部active policies取最小值，不进入terminal identity。Raw memory key不serialize/log/cache。完全删除query后请求会改变语义，故request继续保留它。

备选是hash raw query后作为fingerprint/cache key；unsalted digest仍可成为token猜测oracle，故不采用。把line/start position当identity也会让纯定位移动制造regression，故不采用。

### Decision 5: 每个request URL与complete policy组合使用一个bounded显式state machine

每个exact request URL + complete effective request-policy work共享一个total deadline与scheduler slot：resolve/pin → HEAD → manual redirect →必要时bounded GET → optional retry。HEAD 405/501或HEAD 404/410触发GET；GET发送Range 0-0并在status/redirect evidence足够后abort body。Retry仅用于temporary DNS/connection/timeout、429和502/503/504，并受该work的retry count与remaining deadline限制；Retry-After超出deadline不等待。

备选是GET-only。它会让大body与side effects成本更高。HEAD-only会产生广泛false broken，故需要bounded GET确认。每个redirect/retry重置timeout会让总工作无界，故只使用一个total deadline。

### Decision 6: Outcome lattice先于finding mapping

Internal terminal union为`reachable`、`protected`、`stable-broken`、`redirect-invalid`、`unsafe-target`、`indeterminate`。2xx与成功redirect链为reachable；401/403为protected；GET-confirmed 404/410为stable-broken；loop/limit/missing-invalid location为redirect-invalid；SSRF拒绝为unsafe-target；其它DNS/TLS/transport/timeout/429/5xx/ambiguous status为indeterminate。

前三个stable problem variants映射到各自Product check ID与exact semantic code：两个content findingCode分别等于`external-link-broken`/`external-link-redirect-invalid`，security rule等于`external-link-unsafe-target`。每个check注册closed typed evidence：broken为safe `urlShape`/404-or-410 `statusCode`；redirect-invalid为safe `urlShape`/redirect `statusCode`/allowlisted `redirectReason`/non-negative `redirectCount`；unsafe-target为sanitized rejected `urlShape`/allowlisted `targetStage`/`safetyReason`。Catalog逐项固定kind、required、order、identity participation与redaction；status/reason不参与fingerprint，message不承载必需机器语义。Reachable/protected无finding。任何indeterminate使whole capability failed并丢弃partial findings，避免evaluated gate声称coverage complete。

备选是把所有4xx/5xx/DNS failure标broken。它会把认证、限流和临时基础设施故障伪装成确定性内容缺陷，故不采用。

### Decision 7: Persistent cache仅适用于全链路queryless URL

若initial或任一redirect/retry hop含non-empty query，该policy-specific terminal result禁止persistent cache read/write，只可使用invocation-memory exact URL + complete policy dedup。全链路queryless时，cache key包含normalized queryless URL与同一complete policy projection digest；value只含terminal classification、status、bounded redirect summary和expiry。Location/line/semantic occurrence不参与。只缓存reachable/protected/stable terminal，不缓存indeterminate、headers、body、DNS answer或Retry-After。TTL 0关闭，malformed/expired安全miss。

Unsafe target可deterministically重算，不需要缓存；redirect chain每次cache miss仍逐跳SSRF校验。Query-bearing endpoint每次invocation重新验证是有意安全成本；queryless cache降低重复请求但承认TTL内staleness。

备选是尊重任意origin Cache-Control或永久缓存404。前者把product verification cadence交给远端，后者会长期误报恢复的链接，故不采用。

### Decision 8: Baseline只提供source occurrence membership，不声称历史remote state

只有显式baseline参与network regressions；省略/无效/fallback baseline绝不推断。Current与baseline candidate只有exact request URL与complete effective policy都相同时才可共享live outcome，然后仍分别按line-independent semantic occurrence投影。Regression只表示current stable finding的check/safe occurrence identity在baseline source occurrences中不存在；同一occurrence的line movement或query value rotation不制造regression。Query value rotation因exact URL不同而运行独立work，但comparison identity仍相同。两侧同occurrence不会因为今天的remote state或policy差异声称代码引入回归；all gate仍可阻断。

备选是分别请求current/baseline并把响应差当历史变化。两次请求只相隔毫秒，无法表示commit创建时的网络状态，还会增加flakiness，故不采用。

### Decision 9: Tests注入完整网络边界而非mock最终finding

Resolver double返回IPv4/IPv6/mixed/rebinding sequences，connector验证pinned address/Host/SNI，transport提供manual redirects/status/body counters，fake clock控制timeout/Retry-After/cache。Tests覆盖sanitized handoff与bounded request material、line/query rotation identity、same URL/different policy isolation、query-bearing-any-hop zero persistent I/O、queryless cache、exact typed evidence/order/redaction与registry fingerprint drift；从handoff到foundation validator/outcome且不访问public internet。

备选是仅mock一个`checkUrl()`最终boolean。它无法证明redirect、DNS rebinding、zero-I/O与body/cache泄露边界，故不采用。

## Risks / Trade-offs

- [一个transient URL使whole capability incomplete] → 保持gate诚实并给出sanitized retry action；调用者可disabled或缩小file scope，不能把failure改成broken。
- [401/403可能隐藏真正不存在的受保护path] → 把它视为protected而非broken，避免未经认证的false positive；不承诺内容存在。
- [Query-bearing URL无法跨invocation复用cache] → 接受额外请求成本以消除query-token hash oracle；仍保留bounded invocation-memory dedup。
- [相同URL因per-file policy不同而增加request次数] → outcome只能在complete policy等价时复用；scheduler仍用global minimum concurrency控制总egress。
- [Queryless TTL cache产生短期staleness] → bounded TTL、policy-bound key、TTL 0 opt-out；indeterminate不缓存。
- [IP range/parser遗漏形成SSRF] → 只允许recognized globally-routable unicast、覆盖mapped IPv6/alternate literals、逐跳pin，并在blocking audit做adversarial review。
- [Runtime无法安全pin DNS result] → fail closed为security execution failure，不降级到普通fetch。
- [Query token在internal URL中存在] → 仅bounded request/memory dedup使用，绝不进入fingerprint/persistent cache/log/artifact；用canary证明并拒绝userinfo/ambient credentials。
- [并行dependency contract漂移] → tasks 1.1核对final capability IDs、handoff fields、config patch与machine variant后才实施。

## Migration Plan

1. 完成tasks 1.1，对foundation、Markdown handoff与file-policy overlay做阻塞审计并收敛字段/precedence。
2. 注册complete optional network section，证明file-backed absent不补neutral、override不构造absent section、disabled/skipped与online no-input语义。
3. 先建立sanitized-handoff/request-material、zero-I/O、SSRF、line/query identity、same-URL policy isolation、query-bearing no-persistent-cache与queryless cache canary，再实现resolver/connector/state machine。
4. 注册network check semantic codes与closed typed evidence catalogs并更新expected semanticRegistryFingerprint/examples/validator fixtures，不改变machine v2 schema；接入finding/completeness/channels/gate并验证partial discard。
5. 运行target tests、test-evidence、docs/schema validation和workspace required verification。回滚整体移除descriptor/section/cache entries；不得保留mode online却使用不受保护的fetch fallback。

## Open Questions

无未回答开放问题；依赖artifacts的一致性仍必须由tasks 1.1阻塞审计确认，审计完成前不得实现。
