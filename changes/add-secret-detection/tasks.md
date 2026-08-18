# Tasks

任务先建立合成安全证据，再接入policy、classifier、detector、TaskPlan和Check/Record，最后执行全surface泄露审计。

## Readiness

- [x] 0.1 已核对proposal、design与tasks均以“批准内容中检测likely secrets且raw material只存在于invocation memory”为目标，未保留旧config-v2、capability/finding或partial-discard假设。
- [x] 0.2 已读取Architecture、Configuration、Scan Scope、Quality/Output owner，完整恢复敏感QualityRecord、runtime Check/Record、TaskPlan、location-independent identity和format-aware Check活动决策，并确认四个基础Change依赖。
- [x] 0.3 已完成 policy bounds、candidate dispositions、8192-byte prefix、rule catalog、raw-memory handoff、safe identity、coverage record、`clean -> passed`、`findings | coverage-gaps -> failed` closed verdict、failure/record retention 与 synthetic test 边界审阅；没有阻塞实施的开放问题。

## Implementation

- [ ] 1.1 在依赖seam落地后先运行`bun run test-evidence -- check --root .`并恢复config/scope/Check/Record/output Cases；建立isolated synthetic fixtures和leak-canary harness，使policy endpoints、classification、identity、failure与全surface不泄露要求先失败。
- [ ] 1.2 注册Product neutral Secret Detection Check与closed Project Definition policy，固定`maximumFileBytes` inclusive `1..67108864`、neutral `1048576`、closed Product rule selection和file-policy leaves；拒绝absent-base construction、scope recovery、regex/value/message/command/backend fields。
- [ ] 1.3 实现ordinary-file candidate selector与static per-file TaskPlan；接入bounded size/full-read/8192-byte prefix classification和scanned/non-text/size-unscanned dispositions，证明oversized unknown input对full reader和detector zero calls且产生coverage record。
- [ ] 1.4 实现private Product-owned high-confidence detector与secret-safe error boundary；只允许markerized structural handoff，禁止raw writer、native output、persistent cache、unknown error interpolation和raw/value-derived fields进入manager ports。
- [ ] 1.5 注册 `likely-secret` 与 `secret-scan-coverage-gap` record contracts，实现不消费 secret/line 的 identity、safe current location/fields、deterministic ordering 和逐项 record 提交；将 private summary 显式映射为 `clean -> CheckResult passed`、`findings | coverage-gaps -> CheckResult failed`，执行/协议失败时 CheckRun failed/result null 且 earlier records 保留。
- [ ] 1.6 将safe CheckRun、CheckResult与QualityRecord snapshots接入closed DecisionPolicy和generic output；同步Architecture、Configuration、Scan Scope、Quality/Output、安全说明、authoring declarations与语义Cases，不增加secret-specific serializer、cache或suppression engine。

## Verification

- [ ] 2.1 运行最窄 policy、size/text classifier、TaskPlan、detector rule、markerization、identity、coverage、clean/findings/coverage-gaps closed verdict、record validation、execution/protocol failure retention 和 output tests；测试正文或 Case 变化后运行 `bun run test-evidence -- check --root .`。
- [ ] 2.2 运行产品import boundary、`bun run typecheck -- product`、`bun run lint -- product`与`bun run test -- product`，在success/accepted/gate/read/detector/protocol failure下搜索所有可见和持久surface，确认不存在synthetic canary、prefix/suffix或value-derived digest。
- [ ] 2.3 运行`bun run validate`和`bun run verify:vibe-check-workspace:required`，复核最终diff没有真实secret、host credential input、scope expansion、feature-local scheduler、raw cache/output、location/value identity或未记录public contract drift。
