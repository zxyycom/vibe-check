# quality-runtime

## Case AUX-QUALITY-CACHE-001: Quality measurement cache identity 稳定
Owner: `docs/quality-metrics.md#baseline-and-profiles`
Entities:
- `bun|src/product/quality-core/src/measurement/cache.test.ts|quality measurement cache > keys duplicate-code cache by scan identity and strips changed-scope annotations`
- `bun|src/product/quality-core/src/measurement/cache.test.ts|quality measurement cache > reuses baseline snapshots only when identity and snapshot hash match`
Proves:
- duplicate-code cache key changes for tested code area、input fingerprint、tool name/version 和 normalized args differences。
- cache hit 返回不带 changed-scope annotation 的 metric，保持复用扫描与当前 diff 语义分离。
- baseline snapshot cache key changes for tested tool version differences，命中时通过 snapshot hash 防止错读缓存内容。

## Case BB-RUNTIME-COMPLETENESS-001: Product scan completeness 跨 surface 可观察
Owner: `docs/quality-metrics.md#scan-completeness`
Entities:
- `bun|src/product/configured-project.test.ts|formal CLI explicit configuration > fails closed when an eligible current measurement component is unavailable`
- `bun|src/product/configured-project.test.ts|formal CLI explicit configuration > projects Lizard execution and invalid-result failures consistently`
- `bun|src/product/configured-project.test.ts|formal CLI explicit configuration > returns a warning without a quality verdict when no capability has eligible input`
- `bun|src/product/configured-project.test.ts|formal CLI explicit configuration > treats a successful zero-finding quick scan as complete without resolving jscpd`
Proves:
- Formal product entry 将 capability result 与 overall 一致投影到 `metrics.json`、 `report.md` 和 console，并将 `complete` / `empty` 映射为 exit `0`、`failed` 映射为 exit `2`。
- Eligible file / function measurement 成功且 duplicate detection 无输入时为 `complete`； quick profile 的 zero-function result 仍为 `succeeded`，duplicate detection 为 `skipped` 且不解析 jscpd dependency，overall 仍为 `complete`。
- 没有 capability 具备 eligible input 时，三项结果均为 `no-input`、overall 为 `empty`； warning conclusion 明确质量未评价，不生成质量 warning 或绿色通过结论。
- Lizard execution / invalid result 与 scc dependency unavailable 分别投影为 `execution`、`invalid-result` 与 `unavailable` diagnostic；其它 capability 保持各自 final status，overall 为 `failed`；metrics diagnostic 的 message / action 同步进入 report 与 stdout，stderr 保留 incomplete conclusion，且不显示绿色 completion。

## Case WB-RUNTIME-BASELINE-001: Baseline capability eligibility 独立于 current input
Owner: `docs/quality-metrics.md#baseline-and-profiles`
Entities:
- `bun|src/product/quality-core/src/measurement/baseline-revision.test.ts|baseline revision capability eligibility > resolves an eligible baseline tool when the current revision has no input for it`
Proves:
- Baseline revision 可以为 comparison 解析自身 eligible tool，即使 current revision 对该 capability 没有输入。

## Case WB-RUNTIME-CAPABILITY-RESULT-001: Product current capability result 投影稳定
Owner: `docs/scanner-dependencies.md#failure-and-observability`
Entities:
- `bun|src/product/quality-core/src/measurement/current-revision/current-revision.test.ts|current revision scanner failure projection > keeps eligible Lizard zero-function output succeeded`
- `bun|src/product/quality-core/src/measurement/current-revision/current-revision.test.ts|current revision scanner failure projection > keeps jscpd non-zero exits as execution failures when stderr mentions reports`
- `bun|src/product/quality-core/src/measurement/current-revision/current-revision.test.ts|current revision scanner failure projection > keeps scc non-zero exits as execution failures when stderr looks like a parser error`
- `bun|src/product/quality-core/src/measurement/current-revision/current-revision.test.ts|current revision scanner failure projection > maps post-preflight scanner spawn failures to execution failures`
- `bun|src/product/quality-core/src/measurement/current-revision/current-revision.test.ts|current revision scanner failure projection > returns Lizard execution failures through CapabilityResult only`
- `bun|src/product/quality-core/src/measurement/current-revision/current-revision.test.ts|current revision scanner failure projection > returns jscpd report failures through CapabilityResult only`
- `bun|src/product/quality-core/src/measurement/current-revision/current-revision.test.ts|current revision scanner failure projection > returns malformed Lizard output through CapabilityResult only`
- `bun|src/product/quality-core/src/measurement/current-revision/current-revision.test.ts|current revision scanner failure projection > returns scc parse failures through CapabilityResult only`
- `bun|src/product/quality-core/src/measurement/current-revision/current-revision.test.ts|current revision scanner failure projection > returns unavailable capability failures through CapabilityResult only`
- `bun|src/product/quality-core/src/measurement/current-revision/current-revision.test.ts|current revision scanner failure projection > skips baseline only for current execution and invalid-result failures`
Proves:
- Eligible current measurement 的有效 zero result 返回 `succeeded`，不误判为 `no-input` 或 failure。
- Current wrappers 将代表性的 dependency unavailable、invocation / spawn failure 和 malformed / missing result 分别投影为 `unavailable`、`execution` 与 `invalid-result` diagnostic。
- Current wrapper failure 通过返回的 `CapabilityResult` 表达；malformed Lizard result 不向 runtime context 添加并行的 `fatalIssues` failure channel。
- Current result 为 `execution` 或 `invalid-result` 时跳过 baseline scan；`unavailable` 保留 baseline materialization 流程。
- Failure classification 使用 dependency、process 和 parser result，不根据 stderr 中的诊断词推断 failure kind。

## Case WB-RUNTIME-COMPLETENESS-001: Product scan completeness 归约稳定
Owner: `docs/quality-metrics.md#scan-completeness`
Entities:
- `bun|src/product/quality-core/src/model/scan-completeness.test.ts|scan completeness model > defines the stable current measurement capability IDs`
- `bun|src/product/quality-core/src/model/scan-completeness.test.ts|scan completeness model > reduces final capability results without capability-specific rules`
Proves:
- Current measurement capability IDs 固定为 `file-metrics`、`function-metrics` 与 `duplicate-detection`。
- 全部 succeeded，以及 succeeded 与 no-input / skipped 混合时归约为 `complete`。
- 只有 skipped / no-input 时归约为 `empty`；任一 failed result 优先归约为 `failed`。
- Shared reducer 只消费 final result status，不需要 capability-specific 规则。

## Case WB-RUNTIME-QUALITY-CORE-001: Quality core model、状态与 caller 配置保持一致
Owner: `docs/quality-metrics.md#quality-metrics`
Entities:
- `bun|src/product/quality-core/test/quality-core.test.ts|script quality core > accepted warnings pass verification while the quality check remains a warning`
- `bun|src/product/quality-core/test/quality-core.test.ts|script quality core > accepts capability results in any order with additional diagnostic metadata`
- `bun|src/product/quality-core/test/quality-core.test.ts|script quality core > classifies files using caller-provided code areas`
- `bun|src/product/quality-core/test/quality-core.test.ts|script quality core > generates warning channels from caller-provided thresholds`
- `bun|src/product/quality-core/test/quality-core.test.ts|script quality core > maps completeness and warning combinations to quality check status`
- `bun|src/product/quality-core/test/quality-core.test.ts|script quality core > maps completeness and warning combinations to verification status`
- `bun|src/product/quality-core/test/quality-core.test.ts|script quality core > rejects a metrics envelope without metadata`
- `bun|src/product/quality-core/test/quality-core.test.ts|script quality core > rejects an overall completeness inconsistent with capability results`
- `bun|src/product/quality-core/test/quality-core.test.ts|script quality core > rejects failed capability results without actionable diagnostics`
- `bun|src/product/quality-core/test/quality-core.test.ts|script quality core > rejects missing and malformed scan completeness`
- `bun|src/product/quality-core/test/quality-core.test.ts|script quality core > rejects unknown, duplicate, and missing capability IDs`
Proves:
- File classification 与 warning generation 只使用 caller 提供的 code area 和 threshold 配置。
- Metrics validation 拒绝缺失 metadata、非法 capability 集合或 result、不可行动 failure diagnostic 与不一致 completeness。
- Quality check 和 verification status 只由 completeness、warning records 与 accepted reason 语义派生。
