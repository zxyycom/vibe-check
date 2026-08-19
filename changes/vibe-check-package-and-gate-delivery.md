# Vibe Check package 与 Project Gate 交付导航

## 用途与权威性

当 AI 或维护者需要选择、恢复或审阅当前 npm / Project Gate 交付路径时，先阅读本导航，再进入目标 Change 的 proposal、design 和 tasks。本文件是 [Active Change Portfolio](active-change-portfolio.md) 中“Project Gate 与 package 交付”路径的详细导航；需要查看全部 active Change 或其直接相关 Decision 时，回到该 portfolio。

本文件只拥有本产品路径六个 active Change 的导航关系，不拥有其动态 stage、具体范围、实现设计、任务完成事实或稳定 Product contract：

- 动态 stage、任务进度和 Git 基线以每个 Change 的 <code>.change-plan.json</code> 与 <code>bun run change-plan -- list changes</code> 为准。
- 每个 Change 自己拥有其 proposal、design、tasks、验证和 handoff 内容。
- 长期“先完成完整项目门禁，再公开发布”的方向由 [在公开 package 发布前完成项目门禁](../docs/decisions/complete-project-gate-before-public-package-release.md) 决定。
- 当前 Product runtime 的已实现边界由 [架构](../docs/architecture.md) 决定；本导航中的任何 Change 都不证明运行时已经改变。

## 读取步骤

1. 运行 <code>bun run change-plan -- list changes</code>，确认目标 Change 仍 active、其 stage 与基线警告。
2. 在下面的依赖图定位该 Change 的上游输入和下游 handoff。
3. 阅读目标 Change 的 proposal 与 design；只有 stage 为 plan 时才以 tasks 作为实施清单。
4. 只有上游 handoff 已产生且其重新验证条件仍成立时，才把它当作下游输入；不存在的 handoff 文件不是已完成证据。

## 依赖图

~~~text
add-project-run-invocation-controls ─┐
                                      ├─> build-candidate-backed-project-gate
add-project-run-lifecycle-feedback ──┤               │
                                      │               v
establish-npm-package-candidate-and-quality-dogfood ─────┘  replace-workspace-verifier-with-project-gate
                                                      │
                                                      v
                                     publish-public-api-only-npm-package
~~~

前三个 Change 可以独立推进。package candidate 在 controls 或 lifecycle feedback 改变 public package closure 后，必须重新 pack 并刷新 candidate evidence，才可成为 Gate build 的兼容输入。

## Change 与 handoff

| Change | 唯一交付 | 下游可使用的完成证据 | 不负责 |
| --- | --- | --- | --- |
| [add-project-run-invocation-controls](add-project-run-invocation-controls/) | Product Run 的 immutable project invocation input。 | 已验证的 public control contract；Gate build 可据此实现 Check-local eligibility。 | CLI grammar、tag vocabulary、scheduler selection、renderer。 |
| [add-project-run-lifecycle-feedback](add-project-run-lifecycle-feedback/) | Product Run 的 lifecycle observer 与 final per-Check duration summary。 | 已验证的 lifecycle events、duration summary 与 observer failure semantics；Gate build 可据此渲染进度与完成摘要。 | Project UI、exit mapping、canonical performance policy。 |
| [establish-npm-package-candidate-and-quality-dogfood](establish-npm-package-candidate-and-quality-dogfood/) | API-only candidate、quality dogfood 与 exact-tarball proof。 | <code>candidate-handoff.md</code>，记录与当前 public contract 匹配的 artifact identity 与安装证据。 | 完整 Gate、正式入口切换、registry publish。 |
| [build-candidate-backed-project-gate](build-candidate-backed-project-gate/) | 可并行运行的完整 repository Gate consumer。 | <code>gate-readiness-handoff.md</code>，记录类别映射、candidate、controls/feedback 集成和对照证据。 | 正式入口权威切换、旧 verifier 删除、registry publish。 |
| [replace-workspace-verifier-with-project-gate](replace-workspace-verifier-with-project-gate/) | 将已验证 Gate 切换为唯一正式门禁，并退役旧 verifier。 | <code>gate-handoff.md</code>，记录实际入口、删除范围和重新验证条件。 | 新增 Gate 功能、公共 Run contract、package build、registry publish。 |
| [publish-public-api-only-npm-package](publish-public-api-only-npm-package/) | 经过单独授权的公开 npm 发布与 registry-install proof。 | 精确已发布版本及其独立安装验证。 | 重建 package、补齐 Gate 功能或替代本地 cutover evidence。 |

表中的 handoff 是完成 Change 后才应产生的计划输出，不是当前仓库已经拥有的文件。

## Timing / telemetry 边界

当前约束是不为呈现进度而改写既有 <code>CheckOutcome</code> 或 <code>QualityRecord</code> grammar。[lifecycle-feedback Change](add-project-run-lifecycle-feedback/) 负责 Product-measured <code>durationMs</code>：它作为 final RunResult 的 per-Check execution signal 与 live settlement feedback 返回，不进入 Core、machine artifact 或 Record。

首轮不返回 <code>startedAt</code> / <code>endedAt</code>，也不让 duration 自动影响 policy。若出现实际性能预算消费者，必须先演进长期 Decision，再建立独立 Change，明确 threshold、baseline、retention 和失败语义。

## 完成判读

- candidate 完成不等于 Gate 已完成，也不等于 package 已公开发布。
- Gate build 完成不等于仓库已完成 cutover；旧 verifier 仍可能是正式入口。
- cutover 完成不等于 registry 已验证或有发布授权。
- 只有 Change 自己记录的验证与 handoff，且下游重新验证条件成立，才可推进到下一阶段。
