# Design

本设计以显式online授权、逐跳safe-egress和shared static TaskPlan实现外链验证，并让远端领域不确定性与执行失败保持不同owner。

## Context

当前产品没有运行时Network Check；现行scanner与output owner也不授权网络。活动决策`product-contract/require-explicit-network-check-authorization.md`要求neutral与缺失授权offline，只有validated Project Definition policy可以授权Product-owned network Check；`product-contract/keep-sensitive-quality-record-material-ephemeral.md`要求credential URL和query material只存在于bounded invocation memory。运行时Check/Record、TaskPlan、location-independent identity与trusted Project Definition边界分别由相关活动决策确定。

实施依赖`establish-check-record-core`、`establish-check-task-orchestration`、`adopt-typescript-project-definition`、`add-file-policy-overrides`与`add-markdown-link-validation`的实际seam。Markdown owner独占parse/classification并交付safe candidate与separate request material；本Change只拥有authorization、network execution和network domain records，不复制parser、scheduler、manager、policy evaluator或file resolver。

## Goals / Non-Goals

**Goals:**

- 对offline/unauthorized状态提供可证明的zero network I/O。
- 对initial、redirect和retry使用同一SSRF-safe resolution与pinned connection boundary。
- 以bounded policy、shared scheduler、query-safe dedup/cache控制资源与敏感材料。
- 清楚区分confirmed domain problem、normal domain indeterminate和execution failure。
- 让record identity与public evidence不依赖line、query value、raw URL或远端private material。

**Non-Goals:**

- 不登录、发送cookie/custom auth/header、使用ambient/custom proxy或运行browser JavaScript。
- 不验证mailto、FTP、file、本地文件或anchor；不重新解析Markdown。
- 不声称Project Definition/custom runner受到network sandbox。
- 不通过baseline重建commit产生时的互联网状态，不要求真实public-network smoke。

## Decisions

### Decision 1: 只消费 Markdown owner 发布的 candidate snapshot

Markdown Link owner 独占 invocation-private `ExternalLinkCandidate` 的精确字段集、canonical order、complete snapshot 和 identity-keyed bounded location/request-material lookups。Network Check 不复制该 DTO 的完整字段 owner，只按 owner 发布的 stable occurrence identity 读取已验证 sanitized projection、current location 和当次 request 所需的 fragment-free material。

Snapshot 与 lookups 仅在 Link Check 完整完成后可用，Network 在消费后释放引用。Protocol-relative URL 仅在 execution material 中按 Product policy 补 HTTPS。Network Check 不从 raw Markdown 或 sanitized display 重构 request URL，也不重新分类 local/anchor/unsupported links；userinfo、query values、fragment、raw URL 和 location 不进入 candidate identity 或 persistent surface。

### Decision 2: Base online mode 是唯一Product network授权

Product neutral definition固定offline；Project Definition未注册该Check、policy缺失、`enabled = false`或`mode = disabled`时均不得解析DNS或读取network cache。只有成功evaluation、normalization、validation和freeze的Project Definition base policy显式`mode = online`才授权。Gate、profile、CLI environment和Check discovery不参与提升；受信任custom runner自己的网络权限仍按trusted-code边界处理。

Closed base policy使用以下Product-owned defaults与bounds：

- `requestTimeoutMs`: default `5000`, range `100..30000`；
- `totalTimeoutMs`: default `15000`, range `100..120000`，且不小于request timeout；
- `maximumRedirects`: default `5`, range `0..10`；
- `maximumRetries`: default `1`, range `0..3`；
- `cacheTtlSeconds`: default `3600`, range `0..86400`，`0`关闭persistent cache。

File policy 只能 disable source 或收窄 online base 的 timeout/redirect/retry/TTL budgets，不能改变 disabled/absent base 为 online、增加 protocol/proxy/auth/header 或放宽 safe-egress。Check-owned semantic validation 在任何 DNS/socket/cache refresh 前验证单调 narrowing 与 cross-field 关系。并发只由 invocation-global `SchedulerPolicy.maxParallel` 拥有，Network policy 和 file policy 都不定义 feature-specific concurrency leaf。

Online authorization 还执行一项 cross-owner pre-work validation：resolved `SchedulerPolicy.maxParallel` 必须是 scheduler owner 已验证的正整数且不大于 `16`。超出上界时在任何 DNS、socket 或 network-cache refresh 前拒绝 online 配置；Network 只校验安全上界，不重新拥有 global scheduler policy 或把该值复制成 feature/file-policy capacity。

### Decision 3: Check-level 依赖与同源 static plans

Network schedule declaration 固定 `requiresChecks: ["markdown-link-validation"]`。Link 与 Network 各自从同一 frozen global inventory 与 resolved file policy 确定 eligible Markdown sources，并在任何 managed function 开始前各自建立 per-source static Tasks。Network plan 只闭包 source identity，不持有 snapshot 内容，也不引用 Link Task ID 或使用跨 Check Task `needs`。

Network applicability 使用与 Link 相同的 frozen eligible-source 条件；无 eligible source 时，Network 在 pre-work 自身完成为 `not-applicable`，不尝试取得 snapshot。只有 Network 自身 applicable 时，才在 Link Check 以合法 `passed | failed` CheckResult 完整结束并原子发布 candidate snapshot 后取得该 snapshot；Link execution/protocol failure 或 applicable Network 缺少完整 snapshot 都是依赖/协议 execution failure，Network 不消费 partial candidates 或自行重跑 classification。存在 eligible source 但完整 snapshot 中没有 external candidates 时，Network 仍为 applicable，正常完成 empty outcome 并返回 `passed`。

每个 Network source Task 内按 deterministic occurrence order 串行处理 URL，跨 source 并发仅由 invocation-global `SchedulerPolicy.maxParallel` 约束。首版不定义 named-resource capacity、per-Check concurrency budget、嵌套 `Promise.all` 或 feature-local pool。

### Decision 4: Resolver与connector共同构成不可降级的SSRF boundary

每次initial、redirect与retry attempt先canonicalize HTTP(S) URL并拒绝userinfo，再解析hostname。Policy只允许全部resolved addresses都属于recognized globally-routable unicast；loopback、private、link-local、unspecified、multicast、CGNAT、reserved/documentation/benchmark、IPv4-mapped IPv6与Product-ownedmetadata host denylist均有明确处理，mixed public/private answers整体拒绝。

Connector只连接本次checked address，同时保留original host用于Host header与TLS SNI；redirect使用manual mode逐跳重新验证，retry重新resolve。Ambient proxy、cookie jar、authorization、credential store与environment transport配置均不使用。Runtime若不能pin checked address、发现address mismatch或会隐式follow redirect/proxy，必须在request前以security execution failure停止，不能fallback普通`fetch`。

### Decision 5: 每个policy-specific URL使用single-deadline state machine

Work identity 是 bounded-memory 中的 exact fragment-free request URL 加完整 effective request-policy projection 与 Product transport policy version。不同 source policy projection 不共享 outcome。Source Task 在自己唯一的 scheduler-managed function 内串行处理每个 work；每个 work 使用 single total deadline：resolve/pin → HEAD → manual redirects → 需要时 bounded GET → optional retry。HEAD 为 405/501 或报告 404/410 时使用 `Range: bytes=0-0` GET 确认；一旦取得足够 status evidence 即停止读取 body，body 不保存。

Retry只用于bounded temporary conditions，受remaining deadline和retry count限制；每次retry重做safe-egress。`Retry-After`超出remaining deadline不等待。Request timeout不重置total deadline，redirect/retry不能使work无界。

### Decision 6: Outcome union 先于Record与CheckRun映射

Private terminal union为：

- `reachable`: 2xx或成功settled redirect chain，无record；
- `protected`: 401/403，无broken record；
- `confirmed-broken`: bounded GET确认404/410，提交`external-link-broken`；
- `redirect-invalid`: loop、limit、missing/invalid/unsupported location，提交对应record；
- `unsafe-target`: safe-egress正常拒绝candidate或redirect，zero contact并提交security record；
- `domain-indeterminate`: request 正常 settle 但只得到 429、5xx 或其它 Product catalog 声明为不稳定/ambiguous 的 remote response，提交明确非 broken 的 `external-link-indeterminate` record，并保留 safe summary；该 private classification 不是第三种 CheckResult verdict；
- `execution-failed`: DNS/TLS/connection/timeout、resolver/connector不可用、Task throw或protocol/result invalid，由CheckRun failed与`result = null`表达，不伪造indeterminate QualityRecord。

Normal tasks 可以逐项提交 safe records。全部 required source work 正常完成时，producing Check 按 private terminal outcomes 产生 closed verdict：存在任一 `confirmed-broken`、`redirect-invalid` 或 `unsafe-target` 领域缺陷则 `failed`，否则 `passed`。`reachable`、`protected` 和 `domain-indeterminate` 可以伴随各自记录/摘要而不单独使 verdict 失败；尤其不能以总 record count 推断 verdict。

后续 execution failure 不撤销已提交 records，但 failed CheckRun 与 `result = null` 明确说明 coverage 未完整。Core 不从 records 重新推断 CheckResult，DecisionPolicy 分别消费 CheckRun、nullable CheckResult 和 QualityRecord。

### Decision 7: Records只携带sanitized typed evidence

四种record type使用Markdown semantic occurrence、record type与sanitized URL shape形成identity；query keys可以保留，query values、userinfo、fragment、line、status、redirect count、policy和backend不参与。Producing Check单独提供current location。

Safe evidence按record type使用closed fields：broken含safe URL shape与404/410 status；redirect-invalid含safe shape、allowlisted reason与bounded count；unsafe-target含safe shape、target stage与allowlisted safety reason；indeterminate含safe shape、allowlisted remote category和可选safe status。Message只供人读，consumer不解析message恢复领域数据。Response body/header、DNS answers、private address、request URL和native error不进入evidence或diagnostic。

### Decision 8: Persistent cache 只接受全链路queryless stable terminal

Invocation memory可以按exact URL与complete policy projection去重，但raw key不serialize、log或形成digest输出。Initial或任一redirect/retry hop含non-empty query时，persistent cache必须zero read/write；query value rotation因此运行独立request work，但semantic record identity仍稳定。

只有全链路queryless的`reachable`、`protected`、`confirmed-broken`或`redirect-invalid`可按normalized exact URL、complete policy projection、Product transport version与bounded TTL缓存。Cache value只含safe terminal classification/status/redirect summary/expiry；不缓存unsafe-target、domain-indeterminate、execution failure、headers、body、DNS、Retry-After或credentials。Malformed/expired entry安全miss，TTL 0关闭。

### Decision 9: Reference只比较source occurrence，不重建历史remote state

只有调用者显式提供reference时才比较source occurrence。Current/reference exact request URL与complete policy相同可以复用本invocation live outcome，但仍按各自semantic occurrence投影；同一occurrence的line或query-value rotation保持identity，query rotation因exact URL不同不共享work。两侧存在同一occurrence时，不因今天的remote outcome或policy差异声称commit历史产生network regression；省略reference不推断任何network regression。

## Risks / Trade-offs

- **Safe connector在Bun runtime不可兑现address pinning。** Fail closed并保持CheckRun failure；不以普通fetch换取表面功能。
- **一个transport failure使CheckRun不完整。** 保留已提交safe records，同时让null CheckResult阻止完整性假象；项目可缩小或disable网络scope，不能把failure改写成broken。
- **Query-bearing URL不使用persistent cache。** 接受额外请求以避免token hash oracle；仍有invocation-memory dedup和shared budget。
- **同一 URL 因 file policy 不同而重复请求。** 只有 complete effective policy 相同才共享 outcome，避免跨 policy 污染；per-source 串行与 invocation-global `maxParallel` 约束总 egress concurrency。
- **Queryless TTL产生短期staleness。** TTL有上限且可设0，indeterminate与failure不缓存。
- **Per-source task使单个超大Markdown文件串行。** 首版换取static graph与简单资源证明；有profile证据后可独立调整private task granularity，不改变public contract。

## Open Questions

无。Markdown owner 发布的 complete invocation-private snapshot 是唯一跨 Check 数据 seam，`requiresChecks` 是唯一跨 Check 调度 seam；同源 per-source static plans、source 内串行与 invocation-global `maxParallel` 已闭合 bounded egress，不需要 Task ID 依赖或 capacity resource。
