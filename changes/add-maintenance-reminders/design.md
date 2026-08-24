# Design

本 Draft 将已经确认的单 Check 产品方向与尚待决定的 Git、错误处理和公共契约细节分开，供后续 Decision 审阅和 Plan 收敛使用；它不是当前实现规格。

## Context

当前 Product 已支持 ordinary Check、Check-owned options / execution dependencies、四态 terminal result、passed / failed final data、settlement-only messages、`attention` visibility 与显式 Run aggregation。以下已对齐 Decision 提供可复用边界：

- [`allow-check-terminal-messages-and-explicit-visibility.md`](../../docs/decisions/allow-check-terminal-messages-and-explicit-visibility.md)：producing Check 可以附带结构化终态消息，`attention` 隐藏没有消息的 passed 行。
- [`keep-comparison-semantics-inside-producing-checks.md`](../../docs/decisions/keep-comparison-semantics-inside-producing-checks.md)：baseline acquisition、comparison 和 classification 由 producing Check 拥有。
- [`let-check-options-own-execution-dependencies.md`](../../docs/decisions/let-check-options-own-execution-dependencies.md)：Git 等执行依赖属于 Check-owned options，而不是共享 Run Controls。
- [`use-four-state-check-results-with-final-data.md`](../../docs/decisions/use-four-state-check-results-with-final-data.md)：Check 用单一终态和 Check-owned final data 表达主结果。
- [`use-explicit-run-controls-check-aggregation.md`](../../docs/decisions/use-explicit-run-controls-check-aggregation.md)：Check 的 failed / unavailable 状态不会自行决定项目流程是否阻断。

当前 [`expose-ordinary-check-values-with-define-check.md`](../../docs/decisions/expose-ordinary-check-values-with-define-check.md)、[`use-native-object-composition-for-check-customization.md`](../../docs/decisions/use-native-object-composition-for-check-customization.md) 与 [`expose-minimal-check-and-run-public-surface.md`](../../docs/decisions/expose-minimal-check-and-run-public-surface.md) 采用完整 ordinary default Check values，并明确不增加 factory / derivation surface。`maintenanceReminders([...])` 是新的专用 constructor，因此不能只通过代码和文档绕过这些长期判断；进入 Plan 前必须由 Decision owner 建立兼容解释或明确的演进关系。

本 Draft 使用以下稳定术语：

| 术语 | 在本 Change 中的含义 |
| --- | --- |
| Maintenance reminders Check | Constructor 产生的唯一 executable Check，也是 Core、output、progress 和 aggregation 看到的唯一 Check entity。 |
| Reminder entry | Constructor 数组中的 Check-local 配置和评估单元；它不是 Check、Record 或 dependency target。 |
| Assessment | Check 对一个 reminder entry 形成的领域结果；精确合法值仍待决定。 |
| Advisory / enforcing | 当前用于区分“只提醒”和“允许产生失败结论”的工作术语；精确 public field 和 literal 尚未确定。 |

## Goals / Non-Goals

**Goals**

- 提供低样板的 public `maintenanceReminders([...])` authoring surface。
- 让多个 reminder entries 共享一个 Check 责任和一次 terminal result，同时保留各自的局部身份、base commit、变化限制、提醒内容和 assessment。
- 让默认提醒通过 progress 和 `RunResult.checkMessages` 被看见，但不产生 failed 结论。
- 让显式选择失败语义的 reminder 可以影响 owning Check 的 terminal status，再由 caller aggregation 决定是否阻断。
- 让 Git acquisition、comparison、failure classification 和 final data 继续由 producing Check 拥有。

**Non-Goals**

- 不把 reminder entry 注册为 Check、Record 或 dependency target。
- 不创建通用 baseline / reference channel，也不改变 Core 或 Run aggregation grammar。
- 不自动推进 base commit，也不把消息本身解释为审核已经完成。
- 不增加时间调度、确认工作流、外部通知或通用任务管理能力。

## Decisions

### Intended Change

**已确认的产品方向**

- 新增 public `maintenanceReminders(readonly configs[])` constructor；一次调用产生一个 ordinary executable Check，而不是 Check collection、container 或新的 Check family。
- Constructor 数组中的每项 config 保持为 owning Check 的 local reminder entry，不进入全局 Check catalog、Record collection 或 dependency namespace。
- 每项 config 固定自己的 base commit，至少使用提交数或变化行数中的一种限制，并提供自定义提醒内容。
- 默认行为只附加提醒消息并保持 passed；使用者可以显式选择允许 producing Check 返回 failed 的配置。真正流程阻断仍由 caller 的 aggregation / Gate mapping 决定。

**进入 Plan 前需要收敛的暂定设计**

- Constructor 预计补齐 `execution`、`visibility: "attention"`、Git command defaults、message code、final data shape 和其它不表达项目政策的默认值。
- Owning Check 预计按输入顺序形成 reminder assessments、terminal messages 和 final data，再把所有 entries 折叠为一个 terminal status。
- Baseline acquisition、历史遍历、行数统计、shallow history、非祖先 base、取消和 Git failure 预计全部留在 producing Check，不进入共享 Run Controls、Core baseline vocabulary 或 machine relation model。
- Assessment vocabulary、measurement failure、enforcing priority 和 unavailable terminal status 的精确关系仍由 Open Questions 承接，当前 Draft 不把候选答案声明为契约。

### Resulting Impacts

| Owner / boundary | 必须闭合的影响 |
| --- | --- |
| Decision Records | 在进入 Plan 前，建立专用 constructor 与当前 value-only public authoring direction 的兼容解释或演进关系。 |
| Public API | 同步 runtime inventory、declarations、package examples 和 isolated consumer evidence；constructor 仍只返回现有 ordinary Check。 |
| Configuration | 定义 constructor input 的 closed grammar、默认值、空数组、duplicate local identity、至少一个 limit、base revision 和 policy validation；materialized options 必须进入 Definition fingerprint。 |
| Quality Metrics | 定义 per-entry assessment、single-Check status folding、message level / code、final data 和 measurement failure 语义。 |
| Git measurement | 定义 committed history、ancestor model、commit count、changed-line calculation、merge、revert、binary、rename、worktree、shallow clone、取消和 process failure。 |
| Architecture / Output | 保持 reminders 不进入 Check catalog、Records、dependency surface 或 machine message publication；只由 passed / failed final data、progress 和 `RunResult.checkMessages` 承载适用信息。 |
| Verification | 覆盖 constructor authoring、Definition validation、Git measurement、terminal messages / status、public contract、package consumer 和语义 Case closure。 |

## Risks / Trade-offs

- 单一 Check 避免 catalog 污染，但 caller 不能按 Check ID 单独 aggregate、schedule 或依赖某个 reminder；若未来出现这些真实需求，对应事项应重新评估是否已经成为独立 Check。
- 混合 advisory 与 enforcing entries 需要稳定的 status priority 和完整 final data，否则一个 measurement failure 可能遮蔽其它提醒。
- 公共 constructor 是现有 value-only authoring surface 的真实扩展；如果不先维护长期判断，局部实现会形成 generic factory / derivation API 的错误先例。
- Git 变化量如果没有精确定义，会因 merge topology、revert、rename、binary 或 shallow checkout 在不同环境产生不同结论。

## Open Questions

1. **Git history model：** 变化行数采用 first-parent 逐提交累计，还是只比较 base 与 HEAD 的 endpoint tree；commit limit 是否使用同一个 history model。该选择决定 merge、revert 和分支行为。
2. **Measurement failure folding：** Advisory / enforcing entry 无法完成 assessment 时，分别产生 passed、failed 还是 unavailable；选择必须同时保护默认非阻断目标和完整 final data。
3. **Empty input：** 空配置数组在 construction、Definition validation 还是 execution 阶段被拒绝，或者作为合法静默 Check 接受。
4. **Base identity：** Base 只接受完整 commit object ID，还是接受可解析 revision；base 必须是普通 ancestor 还是所选 history model 的 ancestor。
5. **Execution dependency：** Git executable override、timeout 和其它 process options 是否属于首版 public constructor input，还是只提供 Product default。
6. **Public grammar：** Local reminder identity、policy、limits、message code、assessment、final-data version 和 constructor input type 的精确命名及合法值。
7. **Check identity：** Constructor 产生固定 Check ID，还是允许 caller 提供 owning Check identity；该选择影响同一 Project Definition 中能否出现多个 reminder groups。

## Plan Readiness

本 Change 只有同时满足以下条件才应从 Draft 收敛为 Plan：

1. Decision owner 已处理专用 constructor 与当前 value-only public authoring direction 的关系。
2. Open Questions 已形成能够直接驱动 Configuration、Quality Metrics、Git measurement 和 public contract 的明确答案。
3. Proposal 已补全 Intended Change、Resulting Impacts、Success Criteria 和 Affected Owners，`tasks.md` 已从确认后的设计派生，并覆盖实现与验证。
