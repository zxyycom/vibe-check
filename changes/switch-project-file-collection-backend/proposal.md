# Proposal

本 Plan 交付纯磁盘项目文件收集：统一 patterns、默认排除与进入前剪枝，交付同步可信结果。

## Why

现有文件选择在候选获取之后才完成过滤，范围外目录仍可能触发读取失败或无意义的子仓库访问。
调用方需要一套能在访问前控制范围的收集机制，同时避免宽规则误扫依赖、构建和缓存路径。

采用方向归[文件范围决策](../../docs/decisions/unify-file-selection-with-default-excludes.md)；
后端接入、契约迁移与证据准备归 [Design](design.md)。

## Outcome

- 以单份原生 glob `patterns` 选择普通文件，固定默认排除默认启用，仅显式 `useDefaultExcludes: false` 关闭。
- 在全部 selections 均无需求时剪枝，保留混合开关下仍有需求的目录和 Check 内必要的候选共享。
- 同步返回冻结、排序去重的相对路径；合法空结果与必要读取失败可区分。
- 完成类型、配置、共同 matcher、公开材料及安装后消费者迁移；Run 的 Git 变更职责和 Check 的内容安全、exact inputs 保持原义。

## Scope

### Intended Change

- 实现同步单份公共收集与 Check 内候选共享，普通文件纯磁盘枚举、no-follow、全部选择无需求才剪枝。
- selection 一次迁移为 patterns 与 useDefaultExcludes；固定默认数组默认启用，用户规则不能绕过，关闭不影响用户负规则。
- 完整迁移 collection、Run regions 与规则消费者的 matcher 和参数，移除旧 matcher 兼容；仅移除收集专用 Git 接线。
- 首先完成 Design 指定的后端接入 Readiness 调查，依据真实证据核定 fast-glob/micromatch 或其它满足同一契约的后端。

### Resulting Impacts

- 同步 types、closed validators、默认值、constructors、Check/Gate 配置、依赖、lockfile、许可及包材料。
- 逐项迁移旧 source/include/exclude 配置并明确拒绝旧字段；同步指南、示例、changelog、Case 与安装后消费者。
- 保持 Run Git delta/baseline/rename/delete/unavailable、Check 内容安全、accepted/rejected 与 exact inputs；扫描默认排除不缩减显式输入。

## Success Criteria

- 访问前剪枝、必要读取失败、root 校验、task base、静态 pattern 与 symlink 边界均有接入证据。
- omitted/true/false、混合开关、用户正负规则与固定默认排除正确；公共与 Check-private 结果冻结、稳定排序去重。
- 收集零 Git/ignore 策略调用，Git 环境差异不改变同一磁盘与 selection 的结果；全部消费者使用同一完整列表匹配语义和参数。
- 旧字段拒绝和全部迁移 owner、支持宿主安装后消费通过；成本比较使用同一 filesystem workload，候选域变化单独验收。

## Affected Owners

- [收集指南](../../docs/guides/collecting-project-files.md)、[Project files](../../docs/development/project-files.md)、[Project Definition](../../docs/development/project-definition.md)与[Project Run](../../docs/development/project-run.md)。
- 各[Check 指南](../../docs/navigation.md#随包-check-指南)、[Project Gate](../../docs/tooling/project-gate.md)、[包产物](../../docs/tooling/package-artifact.md)、[文档材料](../../docs/tooling/documentation.md)与[测试策略](../../docs/testing/strategy.md)。
- [文件范围 Decision](../../docs/decisions/unify-file-selection-with-default-excludes.md)仍为未对齐方向，接入探索不等于完整对齐。
