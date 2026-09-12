# Proposal

本 Plan 通过统一目录和两向依赖门禁隔离 Non-core tools，使 Core 可独立成立，同时保留 Core tools 的实际机制 owner。

## Why

Core tools 是 Core 自身依赖或直接开放的紧密能力；Non-core tools 是调用方可选、Core 无需依赖的附加能力。当前工具分散在多个源码 owner 中，这一区别需要逐项解释，后续新增和调整也容易重新引入耦合。

统一 `src/package-tools/<domain-owner>/` 父层可以让 Non-core 身份对应可检查的目录边界：Core 不依赖该层，该层只消费公开 Product 契约、自身实现及审核的宿主依赖。子目录继续拥有各自的算法和行为。

## Outcome

维护者可以从目录、依赖检查和领域说明判断工具归属；新增 Non-core 模块自动受检。package root、公开签名和用户行为保持兼容。

## Scope

### Intended Change

- 按 [Design 的分类规则与实施范围](design.md#intended-change)确定目录成员；Core tools、Core API 和 package Checks 保留实际 owner。
- 迁入 Finding presentation 与 `defineAdmissionPolicy`，同时建立两向门禁。cache、waiver、learned、collection 与相关基础实现保留当前位置，属于本 Plan 范围外。
- 保持现有算法、生命周期、I/O、失败和输出语义；复用单一实现，维持当前 package-root exports 与唯一集成入口。

### Resulting Impacts

源码归属变化需要同步 architecture、layout validation、相关文档与测试路径，并验证类型声明、包材料及外部 consumer。具体责任和验证顺序由 [Design](design.md#resulting-impacts)承接；长期边界由[两向依赖 Decision](../../docs/decisions/keep-core-independent-of-package-tools.md)承接。

## Success Criteria

1. 全部 public runtime values 均有可追溯分类；两个迁移工具与范围外能力的边界明确。
2. Core 不直接或间接依赖 Non-core 实现；Non-core 不使用 Core-private 符号，目录内生产模块及支撑实现自动受检。
3. package-root exports、声明语义和外部用法保持兼容；不增加 deep-import surface、兼容 wrapper 或重复算法。
4. 目标测试、两向边界证据、类型与包验收通过，用户说明和内部 owner 与实际变更一致。

## Affected Owners

- [Architecture](../../docs/development/architecture.md#source-module-boundaries)、[编码规范](../../docs/development/coding-style.md#81-目录表达模块关系)与 [Workspace tooling](../../docs/tooling/workspace.md#source-owners-and-dependency-direction)：源码归属、目录与依赖门禁。
- 选定工具的领域说明、[Documentation](../../docs/tooling/documentation.md)、[Package artifact](../../docs/tooling/package-artifact.md)与 [Package lifecycle](../../docs/tooling/package-lifecycle.md)：公开材料和产物兼容。
- [测试策略](../../docs/testing/strategy.md)与[知识治理](../../docs/governance/knowledge-maintenance.md)：Case、Decision 与独立文档影响审查。
- 范围外 collection 的后续调整由 [Project files](../../docs/development/project-files.md)与 [file-input Change](../batch-declared-project-file-inputs/design.md)承接，另行收敛 Core/Check 责任。
