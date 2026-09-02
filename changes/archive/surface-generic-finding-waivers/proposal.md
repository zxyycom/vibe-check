# Proposal

本 Change 让 package consumer 从主要入口发现通用 Finding waiver，并让三个代码质量指标型 Check（`fileMetrics`、`functionMetrics` 与 `duplicateDetection`，下称 metric trio）以各自稳定 identity 原生接入同一对账能力。

## Why

Package root 已公开 `reconcileFindingWaivers(...)`，长期 Decision 也明确它同时服务 custom 与 Product-provided Checks。当前详细契约位于深入 API 文档，README 只把 waiver 对账列为未命名的进阶能力；内置 Check 中只有 `fileMetrics` 直接提供 `findingWaivers` option。用户因此既难发现通用 helper，也无法在 `functionMetrics` 与 `duplicateDetection` 中用同一安全模型保留、审计并豁免已知 metric finding。

Waiver 不是静默忽略任意 warning。它在完整 Finding 集合形成后按 Check-owned semantic identity 对账，保留原 Finding，并把零次、一次和多次匹配分别审计为 `unused`、`applied` 与 `overmatched`。内置接入必须保持这个边界，且不能把 file path、function identity 与 duplicate locations 错压成一个虚假的公共 identity。

## Outcome

README 与随包 Check 文档直接说明 `reconcileFindingWaivers(...)` 的公共用途、审计语义和最小调用路径；`fileMetrics`、`functionMetrics` 与 `duplicateDetection` 都接受 Check-owned `findingWaivers`，在完整 metric finding 集合形成后保留 evidence、审计 stale/overbroad authoring，并只从 actionable/blocking settlement 中移除精确 applied finding。其它内置 Finding producers 不会被描述为自动具备同名配置。

## Scope

### Intended Change

- 为 `functionMetrics` 增加以 `{ metric, path, functionName, startLine }` 为精确 identity 的 `findingWaivers` authoring、resolved options、Records、messages 与 settlement。
- 为 `duplicateDetection` 增加以 `{ metric, locations }` 为精确 identity 的 `findingWaivers` authoring、resolved options、Records、messages 与 settlement；locations 使用 Check 已发布的排序后 project-relative ranges。
- 提取只承接 closed waiver envelope、非空 reason、canonical duplicate identity、冻结结果与 applied/audit evidence publication 的 package-check 共享边界；identity schema、audit Record builder、展示和结算继续留在各 Check。
- 更新 package root exports/inventory、README、Configuration 与三项 metric Check guides，并以当前测试账本和 package documentation acceptance 验证公开入口。

### Resulting Impacts

- 两项新接入 Check 的 public options、resolved options 与 Record unions 增加 waiver 形状；constructor validation、replacement resolved-options validation 和 package declarations 必须同步。
- applied finding 仍发布原 Record，并增加 waiver reason、令其 `blocking: false` 且不参与 actionable settlement；final `findingCount` 仍包含该 Finding，`blockingFindingCount` 不包含 applied waiver。
- unused/overmatched waiver 即使没有可扫描 input 也形成 Check-owned audit Record/message；overmatched 不豁免任何 Finding。
- normal bounded Finding presentation 排除已 applied finding，waiver audit 使用独立 message；scanner input、cache identity、metric thresholds 与 rejected-input policy 不变。
- README 的能力矩阵明确 `fileMetrics`、`functionMetrics`、`duplicateDetection` 已原生接入，Markdown link 等其它 producer 仍只能由调用方在自定义组合中直接使用 helper。

## Success Criteria

- `functionMetrics` 与 `duplicateDetection` 对合法、重复、malformed 和 hostile waiver authoring fail closed，并物化冻结的 resolved options。
- 两项 Check 对 applied、unused 与 overmatched 结果保留完整 Finding/audit evidence，settlement、final counts 和 messages 与通用 helper 决策一致。
- no-input、scanner failure、rejected input 与 cache 边界没有被 waiver 配置改写；只有完整 metric candidate 集合参与 reconciliation。
- package root 类型、public inventory、README、Configuration 和三个 Check guides 对当前能力矩阵与各自 identity 的说明一致。
- 最窄行为测试、测试证据闭合、文档验证与 required workspace verification 通过。

## Affected Owners

- `docs/quality-metrics.md` 的 Finding settlement 通用契约与 `docs/configuration.md` 的 public Check authoring。
- `docs/checks/file-metrics.md`、`docs/checks/function-metrics.md`、`docs/checks/duplicate-detection.md` 的 Check-owned identity、Record、message 与边界。
- `docs/api-mechanics.md` 与 `README.md` 的通用 helper/主要发现入口。
- `src/finding-waivers/**` 的通用 reconciliation，以及 `src/package-checks/code-quality-findings/**` 的共享 authoring envelope。
- `src/package-checks/{file-metrics,function-metrics,duplicate-detection}/**`、`src/index.ts` 与 package public inventory。
- `docs/testing/cases/**`、相邻 Bun tests 与 package documentation acceptance。
