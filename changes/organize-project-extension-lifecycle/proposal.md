# Proposal

本 Draft 重新评估 Product 与 Project Gate 的正式扩展生命周期，并按使用者结果、控制权和失败语义选择职责清楚的最小扩展模型。

## Why

当前可配置函数覆盖 Check 准备/执行、准入策略、Scheduler 终态度量、进度展示和 Gate 结果策略。它们的调用时点、权限、组合方式与失败映射各不相同，单凭回调形状或 `Hook` 后缀无法形成可靠的统一抽象。

内部 `CheckExecutionLifecycle` 还同时承载调用级选择屏障与逐 Check 状态转换。后续由 Change 产生的事实、调用绑定的 Project 文件和有效任务图准入优化需要明确的选择前后阶段，因此应先恢复每项能力的真实归属，再决定共享边界。

既有实现与 Decision 用于解释现状及兼容成本；目标由本 Change 基于当前使用者重新选择。详细的现状→目标工作账目见 [`lifecycle-inventory.md`](./lifecycle-inventory.md)。

## Outcome

1. 软件包用户与维护者可从同一份稳定文档恢复完整生命周期函数模型，并区分公开可配置、内部已存在与仅保留逻辑位置的函数。
2. Definition 与 Project Gate 作者使用按职责命名的策略、执行、观察作用、格式化、收尾或结果决策函数；具有不同义务的能力保持显式边界。
3. Invocation 准备、有效选择、逐 Check 工作、Scheduler 终态、Run 完成与 Gate 结果决策形成可引用的阶段模型。
4. 每个生命周期位置都有职责、声明或接线路径、可用状态和采用条件；已启用扩展点另有使用者依据、精确契约和兼容结论。同一领域结构用于形成期清单和最终稳定指南。

## Scope

### Intended Change

- 从源码、测试、稳定归属文档与活动 Decision 恢复现状时间线和完整函数清单。
- 建立生命周期职责模型，并将调用级屏障与逐 Check 状态转换分配给各自归属。
- 对现有扩展点和候选 Check 观察函数比较保留、重命名/重定位、拆分与保持局部等方案。
- 为每个位置固定 Definition、Check、返回对象、Controls、Project Gate 或内部接口中的声明/接线路径；为最终采用的扩展点继续固定输入数据、调用方式、失败/输出、fingerprint 和兼容契约。
- 以当前清单的领域结构重整随包的 [`docs/guides/callbacks.md`](../../docs/guides/callbacks.md)：保留完整生命周期位置并标明可用状态；仅对已启用项提供配置入口与精确契约链接。同时同步公开时间线、相邻内部归属文档、声明、JSDoc、示例、changelog 与已安装调用方证据。

### Resulting Impacts

- Project Definition、公开导出、Run 输出与 Gate 配置可能保留、移动、替换或增加类型明确的槽位；精确目标和兼容方式在进入 Plan 前固定。
- Invocation/check-execution 的选择屏障与逐 Check 状态转换将分配给独立内部归属；公开观察作用只从已确认事实派生。
- 相邻 Change 继续拥有 change flags、Project 文件取得、准入算法与配置组合的领域实现；Project Gate 结果策略继续留在项目层。
- `docs/guides/callbacks.md` 将从公开回调选择页扩展为完整生命周期模型与当前接入指南。它已在 `docs/package-documents.json` 注册并由 README 直链，本 Change 复用该路径并同步导航、软件包材料与安装后文档验收。

## Success Criteria

- Proposal、Design 与函数清单分别拥有结果/范围、目标决策、工作账目，并明确区分现状事实、目标候选、已确认选择和未决项。
- 函数清单覆盖软件包根入口可达的调用方函数、回调能力、公开辅助回调、已绑定 Gate 函数及必要内部接口，并记录每项分类依据。
- 最终生命周期矩阵覆盖公开、内部与逻辑保留位置，并为每项说明归属、职责、完整键路径或内部接线路径、可用状态和采用条件；已启用项还说明输入、控制权、组合、调用条件和失败映射，目标 API 草图与代表性用法可据此派生。
- 测试覆盖调用次数与顺序、并发/取消、结算、作用函数故障隔离、主结果优先级、fingerprint 及进度/度量/Gate 回归。
- 用户说明和内部归属文档按实际差异同步；目标测试与项目规定的 typecheck、lint、依赖/入口、Decision、文档和跨边界检查通过。

## Affected Owners

- 稳定生命周期模型：[`docs/guides/callbacks.md`](../../docs/guides/callbacks.md) 承接按领域和位置组织的完整函数集合、可用状态与当前接入入口；[`docs/api-mechanics.md`](../../docs/api-mechanics.md) 及相关专题继续拥有现行时间线与已启用函数的精确契约。
- 运行时：Definition、Invocation、Check 执行、Scheduler、Run 输出与人读输出的开发文档及相邻测试。
- Project 边界：[`docs/tooling/project-gate.md`](../../docs/tooling/project-gate.md)、已绑定 Gate 定义、Gate 运行时与测试。
- 下游引用：`add-project-change-flags`、`batch-declared-project-file-inputs`、`optimize-learned-admission-strategy` 与 `add-composable-feature-config-packages`。
