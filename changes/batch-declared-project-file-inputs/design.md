# Design

本设计说明调用级声明式项目文件批处理为何停留在 Draft，以及当前按需收集边界和重新立项条件。

## Context

- [`retain-on-demand-project-file-collection`](../../docs/decisions/retain-on-demand-project-file-collection.md) 是当前长期方向 owner；此前要求调用级批处理的 Decision 已归档。
- 当前行为由 [`project-files.md`](../../docs/development/project-files.md)、[`project-definition.md`](../../docs/development/project-definition.md) 和 [`project-run.md`](../../docs/development/project-run.md) 拥有。本 Change 不修改这些 owner。
- 公开 `collectProjectFiles(...)` 提供同步单次收集，文件型随包 Check 已在各自边界内按 source 批量处理多个 selections。设计期 filesystem observation 的中位 collection 时间约从 261.9ms 降到 248.0ms，但它不是可复现 baseline 或性能 budget；Git 方向性收益也没有对应的真实多 Check 瓶颈。

## Goals / Non-Goals

**Goals**

- 保存停止推进的核心依据，让后续工作优先恢复当前按需边界和证据门槛。
- 明确重新立项必须由真实性能瓶颈或共享路径时间切面需求触发。

**Non-Goals**

- 不保留可直接执行的 public API、Run barrier、owner 迁移或 constructor migration 方案。
- 不把本 Draft 作为缓存、刷新、跨 Run generation 或内容快照的实施依据。

## Decisions

### Intended Change

- 当前采用同步单次 `collectProjectFiles(...)` 和 owning Check 内批量收集，不增加调用级声明或准备阶段。
- 本 Change 保持 `draft` 且不进入 Plan。若触发重新评估，应创建新的 Change，并从当时的消费者、基线和最小方案重新设计。

### Resulting Impacts

- 当前没有产品实现、公开契约、稳定文档、测试或 owner 迁移影响。
- 此次只建立按需收集的长期决策、归档被替代方向，并把本 Draft 收敛为非执行评估记录。

## Risks / Trade-offs

- 不建立跨 Check 共享机制意味着剩余的重复 source acquisition 继续存在；在没有显著瓶颈证据时，这是维持简单契约和稳定 Run 时序的接受成本。
- 保留 Draft 可供恢复形成时依据，但不能证明旧方案仍适用；未来工作必须以当前长期决策和当时事实重新判断。

## Open Questions

无。真实性能证据或独立共享快照消费者是未来重新立项的前置条件，不是本 Draft 内待闭合的设计问题。
