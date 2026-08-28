# Proposal

本 Change 把 `functionMetrics` 从暴露 Lizard 协议的完整 Check value 收敛为按 area policy 构造、完整记录 findings 且区分阻断结果的 defaulted constructor。

## Why

当前 `functionMetrics` 把 product finding limits、共享 code-area 分类和 Lizard CLI arguments 混在完整 public options 中；校验接受空 area、非正整数与小数，五档 `warningPolicy` 只有排除与不排除两种实际行为，未匹配 area 的 measurement 还会被静默丢弃。任何 finding 又都会直接使 Check failed，调用方无法声明默认或局部 area 的 non-blocking evidence policy。

## Outcome

消费者通过 `functionMetrics(options?)` 以带默认值的全局 finding policy 和 area-owned files/limits 构造普通 Check；每个 finding 都成为完整 Record，effective blocking policy 只决定 Check outcome 而不短路单次 Lizard measurement 或后续 finding 处理，Lizard adapter 独占 version/CSV CLI protocol，public scanner policy 只选择 executable。

## Scope

### Intended Change

将 `functionMetrics` 硬切为 specialized constructor；建立 closed partial input 与完整 frozen resolved options，使每个 area 拥有 files、metric limits 和可选 finding-policy override，顶层拥有默认 finding policy；一次扫描 area exact-input union，恢复全部匹配 areas 并形成 deterministic effective policy；移除 public scan/version args，由 adapter 固定 Lizard protocol；同步 Record/final data、dogfood、公共声明、文档和测试证据。

### Resulting Impacts

公共使用从 `[functionMetrics]` 变为 `[functionMetrics()]`，旧顶层 files/codeAreas/threshold/scanner-args shape 不再接受；Record 需要表达全部匹配 areas 与 effective blocking，final data 需要区分 total/blocking finding count。repository Definition、package docs/API inventory、scanner/scan-scope/quality owners、直接测试、Case 账本、candidate 与 external consumer evidence 都需同步；未来 Lizard backend port 在新 constructor contract 上重新基线。

## Success Criteria

- `functionMetrics()` 产生通过 preflight 的完整冻结默认 Check，constructor 同步拒绝未知字段、空 area、空 area id、非法 files、非正安全整数和无效 allowance 关系。
- 顶层 finding policy 提供 `blocking` / `non-blocking` 默认值，每个 area 可覆盖；所有 findings 都被记录，只有至少一个 effective blocking finding 才使 Check failed。
- 每个 area 自己拥有 files 与 metric limits；scanner 一次接收 area exact paths 的去重并集，重叠 path 不依赖 object order，使用全部匹配 area 中最严格的 limits 和 blocking policy。
- public scanner input 只允许 executable 选择；version arguments、scan prefix、`--csv`、timeout 与其它 CLI protocol 不成为产品配置。
- threshold 字段使用 maximum/below 等与比较方向一致的名称；默认数值在新的阻断语义下有明确 dogfood 证据，不靠无效 warning labels 隐藏 findings。
- function-metrics 目标测试、Test Evidence、typecheck、lint、docs、decision/change 检查与 required/full workspace verification 通过；package candidate 与 repository quality 证明新 public API 可用。

## Affected Owners

- `docs/checks/function-metrics.md`
- `docs/configuration.md`
- `docs/scanner-dependencies.md`
- `docs/scan-scope.md`
- `docs/quality-metrics.md`
- `src/package-checks/function-metrics/**`
- `scripts/project/quality/definition.ts`
- `src/index.ts` 与 package documentation/API inventory
- `docs/testing/cases/**`
- `changes/port-lizard-function-metrics-to-typescript/**`
