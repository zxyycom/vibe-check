# Tasks

任务先建立offline与safe-egress证据，再接入授权、Markdown handoff、static TaskPlan、transport state machine、records和owner同步。

## Readiness

- [x] 0.1 已核对proposal、design与tasks均以“validated explicit online authorization下安全验证Markdown external candidates”为目标，未保留旧config-v2、capability/finding或partial-discard模型。
- [x] 0.2 已读取Architecture、Configuration、Scan Scope、Quality/Output owner，完整恢复network authorization、sensitive material、runtime Check/Record、TaskPlan、Project Definition trust与location-independent identity活动决策，并核对五个依赖Change。
- [x] 0.3 已确定 Link-owned complete snapshot/request-material handoff、Check-level `requiresChecks`、同源 static source tasks、Network eligible-source-only pre-work applicability、source 内串行/global `maxParallel <= 16` online safety validation、policy bounds、SSRF/pinning、request state、closed `passed | failed` 映射、safe records、query cache 与 reference 语义；没有阻塞实施的开放问题。

## Implementation

- [ ] 1.1 在依赖seam落地后先运行`bun run test-evidence:check`并恢复Markdown/config/scope/Check/Record/output Cases；建立injectable resolver、pinned connector、manual-redirect transport、fake clock、isolated cache与leak-canary harness，required suite硬性禁止public DNS/internet。
- [ ] 1.2 注册 Product neutral offline Network Link Check 和 closed Project Definition policy，固定 online 显式授权、timeout/redirect/retry/cache numeric bounds/defaults 与 file-policy monotonic narrowing；不增加 feature/file-policy concurrency leaf，但 cross-owner validation 要求 resolved `SchedulerPolicy.maxParallel <= 16`。证明 over-limit、missing/disabled/invalid/override-only enable 在 DNS/socket/proxy/credential/cache refresh 前 zero I/O。
- [ ] 1.3 仅通过 `requiresChecks: ["markdown-link-validation"]` 消费 Markdown owner 完整完成后发布的 invocation-private candidate snapshot/request material；Link 与 Network 从同一 frozen source inventory 各自预建 per-source Tasks，Network 不引用 Link Task ID。Network 无 eligible source 时在 pre-work 自身完成为 `not-applicable` 且不取 snapshot；自身 applicable 时才要求 completed Link run 的完整 snapshot，缺失时按依赖/协议 execution failure 处理而不自行分类；有 eligible source 但 snapshot 无 external candidate 时正常完成为 `passed`。每个 Network source Task 内串行请求，跨 source 并发只服从已验证的 global `maxParallel`，不重新 parse/classify Markdown、不动态扩张 TaskPlan、不建立 capacity resource 或 private pool。
- [ ] 1.4 实现canonical URL、HTTP(S)/userinfo检查、all-address safe-egress、metadata deny、mixed/rebinding处理与checked-address connector，逐redirect/retry保留Host/SNI并禁用ambient proxy/cookie/auth；runtime不能pin时request前fail closed。
- [ ] 1.5 实现single-total-deadline HEAD/manual-redirect/bounded-GET/retry state machine，以及reachable/protected/confirmed-broken/redirect-invalid/unsafe-target/domain-indeterminate/execution-failed union；只让GET确认404/410成为broken。
- [ ] 1.6 实现exact URL + complete policy invocation dedup和queryless bounded TTL cache；证明不同policy隔离、任一hop含query时persistent cache zero I/O，并禁止raw URL/digest、headers/body/DNS/private response/transient data持久化。
- [ ] 1.7 注册四种 safe record contracts、line/query-value-independent identity、current location 与 closed typed evidence；接入逐项 record 提交，将 `domain-indeterminate` 仅保留为 private classification + `external-link-indeterminate` record/safe summary，并明确映射完整运行：任一 confirmed-broken/redirect-invalid/unsafe-target 缺陷使 CheckResult `failed`，否则 `passed`；execution/protocol failure 使 CheckRun failed/result null。接入 DecisionPolicy/generic output 并保留 failure 前已提交 records。
- [ ] 1.8 同步Architecture、Configuration、Scan Scope、Quality/Output、安全说明、authoring declarations与语义Cases；明确授权只约束Product-owned Check、required tests离线且真实network smoke另需授权。

## Verification

- [ ] 2.1 运行最窄 authorization/zero-I/O、global `maxParallel` online bound、candidate snapshot + Check-level dependency、no-eligible-source/not-applicable、eligible-source + empty-snapshot/passed、无跨 Check Task ID、per-source TaskPlan/global scheduling、URL/resolver/pinning、redirect/retry/deadline、closed verdict/outcome、record identity/evidence、dedup/cache、reference 和 failure-retention tests，并在测试正文或 Case 变化后运行 `bun run test-evidence:check`。
- [ ] 2.2 运行产品import boundary、`bun run typecheck:product`、`bun run lint:product`与`bun run test:product`；对success、unsafe、indeterminate和execution failure的全部可见/持久surface执行userinfo/query/token/body/header/DNS-private-response leak canary。
- [ ] 2.3 运行`bun run validate`和`bun run verify:vibe-check-workspace:required`，确认required suite zero public internet，最终diff没有implicit authorization、ordinary-fetch fallback、second Markdown parser、feature-local scheduler、sensitive cache/output或location/query-value identity。
