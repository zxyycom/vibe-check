# Proposal

本 Plan 将五个已确认可选工具纳入统一目录，并以外部用户可独立使用的公开数据契约完成解耦，保持 Core 独立和两向门禁。

## Why

Core tools 是 Core 自身依赖或直接开放的紧密能力；Non-core tools 是调用方可选、Core 无需依赖的附加能力。当前工具分散在多个源码 owner 中，这一区别需要逐项解释，后续新增和调整也容易重新引入耦合。

统一 `src/package-tools/<domain-owner>/` 父层可以让 Non-core 身份对应可检查的目录边界：Core 不依赖该层，该层只消费公开 Product 契约、自身实现及审核的宿主依赖。子目录继续拥有各自的算法和行为。

## Outcome

Finding presentation、admission authoring、cache、waiver 与 learned scheduling 均由统一工具边界约束。外部用户也能从 package root 独立使用最小数据 API；既有签名和行为保持兼容。

## Scope

### Intended Change

- 按 [Design 的分类规则与实施范围](design.md#intended-change)确定目录成员；Core tools、Core API 和 package Checks 保留实际 owner。
- 迁入 Finding presentation、`defineAdmissionPolicy`、cache、waiver、learned 及仅被 learned 使用的 ranking 实现，全部纳入两向门禁。
- 公开最小 canonical JSON 与闭合快照数据契约，提供支持类型、中文说明、独立示例和 installed consumer 验收；由既有 Core owner 保持单份实现。
- Collection/default selection 的未来 Invocation 接线仍由 file-input Change 收敛，不在本次新增范围内；Core 基础与真正 Core tools 不迁入工具目录。
- 保持现有算法、生命周期、I/O、失败和输出语义；复用单一实现，保持既有 package-root exports 兼容，并仅添加已确定的数据 API。

### Resulting Impacts

源码归属变化需要同步 architecture、layout validation、相关文档与测试路径，并验证类型声明、包材料及外部 consumer。具体责任和验证顺序由 [Design](design.md#resulting-impacts)承接；长期边界由[两向依赖 Decision](../../docs/decisions/keep-core-independent-of-package-tools.md)承接，新增公开数据面与完整迁移由[公开数据契约 Decision](../../docs/decisions/provide-public-data-boundaries-for-tool-isolation.md)承接。

## Success Criteria

1. 五个已确认可选工具及独立支撑实现全部迁入受检目录，不以旧有私有依赖为排除理由；新增数据 API 属于 Core 公开基础。
2. Core 不直接或间接依赖 Non-core 实现；Non-core 不使用 Core-private 符号，目录内生产模块及支撑实现自动受检。
3. 既有 package-root exports、声明语义和外部用法保持兼容；新增数据 API 可由外部用户独立使用，不增加 deep-import surface、兼容 wrapper 或重复算法。
4. 扩展范围的目标测试、两向边界、类型、公开示例及包验收通过；首批两个工具的旧证据不替代本次完整验收。

## Affected Owners

- [Architecture](../../docs/development/architecture.md#source-module-boundaries)、[编码规范](../../docs/development/coding-style.md#81-目录表达模块关系)与 [Workspace tooling](../../docs/tooling/workspace.md#source-owners-and-dependency-direction)：源码归属、目录与依赖门禁。
- 选定工具的领域说明、[Documentation](../../docs/tooling/documentation.md)、[Package artifact](../../docs/tooling/package-artifact.md)与 [Package lifecycle](../../docs/tooling/package-lifecycle.md)：公开材料和产物兼容。
- [测试策略](../../docs/testing/strategy.md)与[知识治理](../../docs/governance/knowledge-maintenance.md)：Case、Decision 与独立文档影响审查。
- 范围外 collection 的后续调整由 [Project files](../../docs/development/project-files.md)与 [file-input Change](../batch-declared-project-file-inputs/design.md)承接，另行收敛 Core/Check 责任。
