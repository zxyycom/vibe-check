## Change 状态

本 proposal 定义已经确认的目标 contract：project config 只表达稳定的 Vibe Check 质量意图，
scanner backend 的选择与执行完全收回 Product-owned dependency boundary。它尚未完成其余
readiness audit，也尚未实现。

## Why

当前完整 `QualityConfig` 同时承担用户质量策略与 scanner process 配置：project config 直接出现 `lizard`、`scc`、`jscpd`、`command` 和 `args`。这会把内部 dependency replacement 变成 public config migration，并允许项目文件决定产品启动哪个 executable；在 external config workflow 生成第一份可发现配置前，应先固定与 backend 无关的 public contract。

## What Changes

- **BREAKING**：以单一 semantic v1 document contract 取代现有 tool-shaped complete config。Public runtime schema、derived document type、generated schema、starter/example 和 user-facing docs 只暴露 scope、code areas、quality checks、accepted-warning policy、report 与 artifact/cache settings。
- 把 threshold responsibilities 重组为 `checks.files`、`checks.functions` 与 `checks.duplication`。这些 sections 表达 Vibe Check-owned metrics、floors、changed deltas 和 allowances，不表达 scanner product name。
- 从 public document 移除 `tools`、`lizard`、`scc`、`jscpd`、`command`、`args`、dependency concurrency 和 backend format hints。Dependency defaults、platform resolution、availability、process protocol 与 operational overrides 由 Product-owned scanner dependency boundary 在 invocation 开始时解析。
- Accepted-warning config 使用稳定的 semantic `checkId`，移除 public `ruleId` / `sourceTool` matching；Product mapping 继续可以投影既有 internal warning identity，本 change 不修改 machine-output rule/source fields。
- Public `version` 固定为 exact `"1"` document-contract discriminator，而不是调用者自选 cache-bust label；current、baseline 与 Git-failure fallback 复用一次解析得到的 resolved semantic config，cache identity 另使用 deterministic resolved-config fingerprint 与 internal dependency identity。
- 对当前显式 tool-shaped config 执行 fail-fast hard cut：loader 不双读、不静默忽略 executable settings，也不把旧 project-level command/args 带入 internal boundary；legacy shape 返回 exit `3` 的迁移诊断，owner docs 提供逐字段迁移表和 operational-override 落点。
- 新增 `scanner-dependencies` capability，统一拥有每项 capability 的 internal executable/args、platform default、operational override、availability 与 adapter exact-input handoff；不承诺可插拔 provider framework。
- 将本 change 设为 `add-external-project-config-workflow` 的实现前置。后者仍拥有 `.vibe-check/config.json` 的 discovery、comment-capable JSON parsing、`init` 与 sibling schema workflow，但必须直接消费本 change 的 semantic runtime schema，不再定义 tool-named field tree 或 applied tool-override provenance。
- 保持 deferred Lizard TypeScript port 的产品优先级不变。该 port 恢复时只处理 internal dependency/backend implementation；semantic project config 不再随 Lizard process 的移除而迁移。

## Capabilities

### New Capabilities

- `scanner-dependencies`: 定义 Product-owned scanner dependency resolution、invocation snapshot、adapter handoff 与 normalized failure boundary，而不把 backend execution settings 暴露给 project config。

### Modified Capabilities

- `scan-configuration`: 用 versioned semantic document、runtime schema/derived type、hard-cut migration 和 resolved-config mapping 取代 tool-shaped complete `QualityConfig` input。
- `scan-scope`: 让 current、baseline 与 Git-failure fallback 只消费同一份 resolved semantic scope，而不是重新读取或混入 dependency settings。
- `structural-scanning`: 让 function-metrics adapter 从 internal dependency boundary 接收 backend execution details，不再从 project config 解析 Python/Lizard command。
- `quality-metrics`: 用 backend-neutral check sections 和 stable accepted-warning `checkId` 驱动现有 threshold/warning semantics。
- `test-fixtures`: 把 canonical external project fixture 与 repository dogfood semantic defaults 从 controlled tool config 迁移为 semantic inputs，并通过 product-owned dependency test seam 或 operational overrides 控制 backend；本 change 不创建 dogfood config file。

## Impact

- **Product Config**：新增唯一 public runtime schema source、schema-derived `SemanticProjectConfigV1`、semantic post-validation、legacy-shape diagnostic、document-to-domain mapping 与 deterministic config fingerprint；旧 `parseQualityConfig` 的 public/tool-shaped 责任被替换。
- **Product Core**：消费 normalized semantic config；scanner dependency snapshot 作为独立 typed input 只到达 orchestration、cache identity 和 adapters，warning/scope/report consumers 不再看到 command/args。
- **Scanner adapters**：继续拥有现有 backend protocol 和 normalized capability failure，但 executable、args、availability 与 backend-specific hints 从统一 internal resolver 注入。
- **Contracts and materials**：同步 Configuration、Architecture、Scanner Dependencies、Scan Scope、Quality Metrics、CLI/Testing/navigation owner docs，runtime/generated schemas、canonical examples、external fixture、dogfood semantic-default evidence、help/error text、tests 与 semantic Cases。Dogfood config file 仍由 dependent external workflow 创建。
- **Compatibility**：现有 tool-shaped explicit configs 按 hard cut 迁移；CLI flag/path/error channel 保持，legacy input 在 scanner、baseline 和 artifact creation 前以 exit `3` 失败。Machine metrics/warning schema、rule/source identity、gate 和 process-outcome contract 不在本 change 中重命名。
- **Change ordering**：本 change 的 readiness audit 与实现必须先完成；随后 `add-external-project-config-workflow` 才能生成/发现最终 `.vibe-check/config.json`。`port-lizard-function-metrics-to-typescript` 保持延期，并在未来开始前按新的 internal boundary rebase。
