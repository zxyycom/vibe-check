# Proposal

本 Plan 让内置 Check 对已经由自身 files policy 选中、随后却不满足 Check-owned eligibility 的路径发布可见拒绝 Finding，而不再静默丢弃。

## Why

形成 Change 时，`functionMetrics`、`jsonValidation` 与 `markdownLinkValidation` 都会先按 `source/include/exclude` 收集 selected paths，再按自己支持的文件类型过滤。被第二层过滤拒绝的路径没有 Record、message 或 final count，调用方无法知道自己声明的输入没有进入实际处理。

## Outcome

每个 selected path 都能在 owning Check 内恢复为 accepted exact input 或一条稳定的 non-blocking `input-rejected` Finding；Check 默认选择尽量只选自己支持的文件类型，显式宽泛选择仍完整报告所有拒绝路径。

## Scope

### Intended Change

- 为 `functionMetrics`、`jsonValidation` 与 `markdownLinkValidation` 保留完整 selected set，并在 Check-owned eligibility 边界将其确定性分为 accepted 与 rejected。
- 每个 rejected path 发布一条 `reason: "unsupported-file-type"` 的 Check-local Record，使用独立 ID 域、稳定排序和单条汇总 warning；拒绝 Finding 永远 non-blocking。
- 让三项 Check 的无参或省略 include 默认值只选择各自支持的文件类型，同时继续复用公开 `defaultProjectFileSelection` 的 source 与 exclude 基线；调用方显式传入宽泛 include 时不得抑制拒绝 Finding。
- 按各 Check 既有领域模型更新 final counts、parser、公共 Record types 与 mixed/all-rejected settlement，不建立 Product-wide Record union 或 backend response 推断。

### Resulting Impacts

- `functionMetrics` 的 finding count 纳入 rejected inputs；area 重叠时每个 path 只发布一次并保留全部 area IDs，只有 accepted paths 进入 Lizard。
- `jsonValidation` final data 增加 rejected input count，issue count 同时覆盖 invalid documents 与 rejected inputs；只有 invalid document 使 Check failed。
- `markdownLinkValidation` final data 增加 rejected input count，finding count 同时覆盖 link findings 与 rejected inputs；只有 link finding 按既有 finding policy 决定 blocking。
- public exports、README/Check guides、Configuration、Scan Scope、Quality Metrics、Decision 与语义 Case 必须同步；repository Markdown quality selection 改为只选择 Markdown source。
- 外部 SCC、jscpd 或 Lizard 已接收 exact input 后是否静默省略 output 不在本 Change 内推断或处理。

## Success Criteria

- 三项 Check 对 selected set 满足 `selected = accepted ∪ rejected` 且两集合不相交，任何 rejected path 都产生一条可公开读取的 non-blocking Finding。
- 默认调用不会因通用 `**/*` 基线自动制造大量 unsupported finding；显式宽泛 include 的每个实际拒绝路径仍完整可见。
- mixed、all-rejected、empty-selection、area overlap、blocking policy 与 unavailable 边界均有直接测试，backend 只接收 accepted exact paths。
- 受影响的文档、Decision、public inventory、Case 与 workspace Gate 全部通过。

## Affected Owners

- `src/package-checks/project-files/**` 与 `docs/scan-scope.md`
- `src/package-checks/function-metrics/**`、`json-validation/**`、`markdown-link-validation/**` 与对应 Check guides
- `src/package-checks/code-quality-findings/**`、`docs/quality-metrics.md` 与 public package inventory
- `scripts/project/gate/**`、`docs/configuration.md`、Decision Records 与 Test Evidence Cases
