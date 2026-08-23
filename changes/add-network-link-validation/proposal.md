# Proposal

本 proposal 是实现显式授权、SSRF-safe 且有界的 Product-owned Network Link Check 的可改写实施计划。

## Why

Markdown 的确定性解析可以识别本地链接和外部 HTTP(S) occurrence，却不能判断远端当前状态。若外链发现、gate、环境变量或普通 `fetch` 隐式触发网络，检查会引入 SSRF、ambient proxy/credential传播、DNS rebinding、无界并发、敏感 URL 扩散和临时故障误报，因此联网必须成为一个独立、可审阅且默认关闭的 Check。

## Outcome

Network Link Check 只消费 Markdown owner 在完整 Link Check 后发布的 invocation-private external candidate snapshot，并且只有已验证 Project Definition 的 closed declarative policy 明确设置 online authorization 后才执行 DNS/socket/request work。每个 request 经逐跳目标校验、address pinning、有界 deadline/redirect/retry 和安全 redaction；producing Check 以 QualityRecord 保留 confirmed problem 与 normal domain-indeterminate 证据，只返回 foundation 已定义的 `passed | failed` CheckResult，execution failure 仍由 failed CheckRun 表达，不把临时网络失败伪装成 broken link。

## Scope

### Intended Change

- Markdown Link owner 独占 `ExternalLinkCandidate` 的完整字段、顺序、snapshot 与 bounded lookup contract；Network Check 只通过 stable occurrence identity 消费 owner 已验证的 sanitized candidate、current location 和 invocation-memory request material，不重新声明 candidate shape，也不把 userinfo、query values、fragment、location或 raw URL 带入 identity、cache 或 artifact。
- Product neutral definition与缺失network policy保持offline。只有validated Project Definition base policy显式`mode: online`才授权Product-owned网络Check；CLI profile、gate、environment、Check注册或file override都不能提升权限。该政策不声称sandbox受信任custom runner。
- Closed policy 使用有上限的 request/total timeout、redirect、retry 与 queryless cache TTL；file policy 可以 disable 或收窄已授权 online base，不能从 absent/disabled base 构造授权或扩大任何安全/资源预算。Online authorization 的 cross-owner validation 还要求 resolved `SchedulerPolicy.maxParallel <= 16`；超出时在任何 DNS/socket 前拒绝配置，不建立 feature-specific concurrency leaf。
- 每个initial URL、redirect和retry都验证HTTP(S)、userinfo、canonical host、DNS全部addresses与safe-egress policy，并通过checked address pinning连接且保留Host/TLS SNI；阻断loopback、private、link-local、metadata、reserved等目标，禁止ambient proxy、cookies、authorization和credentials。
- Network schedule declaration 只使用 Check-level `requiresChecks: ["markdown-link-validation"]`。Link 与 Network 可从同一 frozen source inventory 各自预建 per-source Tasks，Network 不引用 Link Task ID；无 eligible source 时 Network 在 pre-work 自身完成为 `not-applicable` 且不取 snapshot，有 eligible source 但 completed Link snapshot 为空时仍正常完成为 `passed`。每个 Network source Task 内按 deterministic occurrence order 串行请求，跨 source 并发只服从已验证不大于 16 的 invocation-global `SchedulerPolicy.maxParallel`，不建立 named-resource capacity 或私有 pool。
- Private terminal outcomes 区分 `reachable`、`protected`、`confirmed-broken`、`redirect-invalid`、`unsafe-target`、`domain-indeterminate` 与 `execution-failed`。只有 GET 确认的 404/410 是 broken；401/403 是 protected；正常收到 429/5xx 等不稳定远端响应可形成 `domain-indeterminate` record/safe summary。正常完成时，存在 `confirmed-broken | redirect-invalid | unsafe-target` 任一领域缺陷则 CheckResult `failed`，否则 `passed`；`domain-indeterminate` 不增加第三种 verdict。DNS/TLS/connection/timeout 或 transport/protocol failure 进入 failed CheckRun 且 `result = null`。
- 发布`external-link-broken`、`external-link-redirect-invalid`、`external-link-unsafe-target`和`external-link-indeterminate`安全records；identity使用record type、Markdown semantic occurrence与sanitized URL shape，不使用line、raw URL、query value、status、message、policy或backend。
- Query-bearing request或任一query-bearing redirect hop只允许invocation-memory dedup，persistent cache zero reads/writes；只有全链路queryless terminal结果可以按exact URL与complete effective policy projection进行bounded TTL cache。
- 不实现crawler、browser rendering、login/authenticated links、custom headers/proxy、任意协议、第二个Markdown parser或历史互联网状态重建；required tests不访问public network，真实网络smoke不属于验收且必须另获明确授权。

### Resulting Impacts

上述 online Check 方案要求授权、SSRF 边界、TaskPlan、safe records、cache 与 failure semantics 一起受限，且不改变 Markdown Link owner 的 candidate contract。

## Success Criteria

- Neutral、missing、disabled、invalid或file-policy-only enable场景在任何DNS、socket、proxy、credential和network-cache refresh前停止，并有zero-I/O自动化证据。
- Initial/redirect/retry每一hop都执行scheme/host/DNS/all-address/pinning检查；private、mixed-answer、metadata与DNS-rebinding cases不能发出被阻断request，runtime无法pin时fail closed而不回退普通fetch。
- 2xx、401/403、GET-confirmed 404/410、redirect loop/limit、unsafe target、429/5xx 和 transport failure 分别进入已定义 domain/CheckRun 语义；temporary/ambiguous 结果不产生 confirmed-broken record，且 reachable/protected/domain-indeterminate-only 的完整运行返回 `passed`，任一 confirmed-broken/redirect-invalid/unsafe-target 领域缺陷使完整运行返回 `failed`。
- Public records、diagnostics、cache、console、report、machine artifacts和logs不包含userinfo、query value、fragment、body、authorization、headers、DNS/private response或其可关联digest；line/query-value rotation保持semantic occurrence identity。
- Static per-source TaskPlan 让跨 source 并发只受 invocation-global `SchedulerPolicy.maxParallel` 约束，每个 source 内请求串行；不同 effective request policy 不共享 outcome，query-bearing work 不持久化，normal failure 后已提交 valid records 仍保留且 CheckRun/result 准确。
- Architecture、Configuration、Scan Scope、Quality/Output、安全与测试证据owner已同步；deterministic resolver/transport harness、目标产品检查和required workspace verification通过且不访问public internet。

## Affected Owners

- `docs/architecture.md`：Markdown handoff、Network Link Check、safe transport、TaskPlan、CheckManager/RecordManager与Core职责。
- `docs/configuration.md`：Project Definition中的显式network authorization、closed bounded policy与file-policy narrowing。
- `docs/scan-scope.md`：eligible Markdown sources、candidate handoff和global scope不能被network work扩大。
- `docs/quality-metrics.md`：domain result、execution completeness、DecisionPolicy和stable record语义。
- `docs/output.md`：sanitized URL shape、current location、record/diagnostic和machine/human projection。
- `src/product/**`：policy、candidate consumer、TaskPlan、resolver/connector/transport、cache、Check/Record/result和测试。
- `docs/testing/cases/**`：authorization、zero-I/O、SSRF、request state、redaction、identity、cache、failure和output证据。
