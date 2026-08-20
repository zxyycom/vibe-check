# Vibe Check package 与 Project Gate 交付导航

## 用途与权威性

当 AI 或维护者需要选择、恢复或审阅当前 npm / Project Gate 交付路径时，先阅读本导航，再进入目标 Change 的 proposal、design 和 tasks。本文件是 [Active Change Portfolio](active-change-portfolio.md) 中“Project Gate 与 package 交付”路径的详细导航；需要查看全部 active Change 或其直接相关 Decision 时，回到该 portfolio。

本文件只拥有本产品路径六个阶段节点的导航关系：三个上游 Change 与 Gate build 已归档，cutover 与 publish 仍是 active Change。它不拥有 active Change 的动态 stage、具体范围、实现设计、任务完成事实或稳定 Product contract：

- 动态 stage、任务进度和 Git 基线以每个 Change 的 <code>.change-plan.json</code> 与 <code>bun run change-plan -- list changes</code> 为准。
- 每个 Change 自己拥有其 proposal、design、tasks、验证和 handoff 内容。
- 长期“先完成完整项目门禁，再公开发布”的方向由 [在公开 package 发布前完成项目门禁](../docs/decisions/complete-project-gate-before-public-package-release.md) 决定。
- Product-owned progress 的 presentation、stream ownership 与 failure isolation 由 [Product-owned Check progress](../docs/decisions/provide-product-owned-check-progress.md) 决定。
- 当前 Product runtime 的已实现边界由 [架构](../docs/architecture.md) 决定；本导航中的任何 Change 都不证明运行时已经改变。

## 读取步骤

1. 运行 <code>bun run change-plan -- list changes</code>，确认目标 Change 仍 active、其 stage 与基线警告。
2. 在下面的依赖图定位该 Change 的上游输入和下游 handoff。
3. 阅读目标 Change 的 proposal 与 design；只有 stage 为 plan 时才以 tasks 作为实施清单。
4. 只有上游 handoff 已产生且其重新验证条件仍成立时，才把它当作下游输入；不存在的 handoff 文件不是已完成证据。

## 依赖图

~~~text
[archived] add-project-run-invocation-controls ─────────────┐
[archived] add-project-run-lifecycle-feedback ──────────────┼─> [archived] build-candidate-backed-project-gate
[archived] establish-npm-package-candidate-and-quality-dogfood ┘                  │
                                                                                  v
                                                   replace-workspace-verifier-with-project-gate
                                                                                  │
                                                                                  v
                                                   publish-public-api-only-npm-package
~~~

前三个上游 Change 的完成只证明各自交付，不证明历史 candidate identity 仍与当前 public package closure 一致。Gate build 已按 archived candidate handoff 的重新验证条件运行 preparation、audit 并记录与当前 package inputs 匹配的 artifact，才形成 readiness evidence；matching receipt 可以复用。

## Change 与 handoff

| Change | 唯一交付 | 下游可使用的完成证据 | 不负责 |
| --- | --- | --- | --- |
| [add-project-run-invocation-controls](archive/add-project-run-invocation-controls/)（archived） | Product Run 的 immutable project invocation input。 | 当前 owner 已实现并验证的 string flags；Gate build 可据此实现 Check-local eligibility。 | CLI grammar、tag vocabulary、scheduler selection、renderer。 |
| [add-project-run-lifecycle-feedback](archive/add-project-run-lifecycle-feedback/)（archived） | Product Run 的 TTY/plain progress effect 与 final per-Check duration summary。 | 当前 owner 已实现并验证的 Product-owned progress、duration summary 与 effect failure isolation；Gate build 可直接启用。 | Project process logs、exit mapping、canonical performance policy 或公共 observer/renderer API。 |
| [establish-npm-package-candidate-and-quality-dogfood](archive/establish-npm-package-candidate-and-quality-dogfood/)（archived） | API-only candidate、quality dogfood 与 exact-tarball proof。 | [<code>candidate-handoff.md</code>](archive/establish-npm-package-candidate-and-quality-dogfood/candidate-handoff.md) 记录证据形态、旧 identity 与重新验证条件；Gate build 必须产生 current identity。 | 完整 Gate、正式入口切换、registry publish。 |
| [build-candidate-backed-project-gate](archive/build-candidate-backed-project-gate/)（archived） | 可并行运行的完整 repository Gate consumer。 | [<code>gate-readiness-handoff.md</code>](archive/build-candidate-backed-project-gate/gate-readiness-handoff.md) 是当前 readiness 输入；其中的 revalidation conditions 决定下游何时可使用它。 | 正式入口权威切换、旧 verifier 删除、registry publish。 |
| [replace-workspace-verifier-with-project-gate](replace-workspace-verifier-with-project-gate/) | 将已验证 Gate 切换为唯一正式门禁，并退役旧 verifier。 | <code>gate-handoff.md</code>，记录实际 repository/CI bindings、无 disabled-tag required/full 证据、legacy reference audit 结果和重新验证条件。 | 新增 Gate 功能、公共 Run contract、package build、registry publish。 |
| [publish-public-api-only-npm-package](publish-public-api-only-npm-package/) | 经过单独授权的公开 npm 发布与 registry-install proof。 | 精确已发布版本及其独立安装验证。 | 重建 package、补齐 Gate 功能或替代本地 cutover evidence。 |

Archived candidate handoff 不替代当前 readiness。当前 [readiness handoff](archive/build-candidate-backed-project-gate/gate-readiness-handoff.md) 只在其 revalidation conditions 仍成立时可供 cutover 消费；`gate-handoff.md` 尚未产生。

## Timing / telemetry 边界

当前约束是不为呈现进度而改写既有 <code>CheckOutcome</code> 或 <code>QualityRecord</code> grammar。已归档的 [lifecycle-feedback Change](archive/add-project-run-lifecycle-feedback/) 落地 Product-measured <code>durationMs</code>：它由 Product 私有 settled feedback 驱动 progress，并作为 final RunResult 的 per-Check execution signal 返回，不进入 Core、machine artifact 或 Record；当前事实仍以 Product owner、源码与测试为准。

首轮不返回 <code>startedAt</code> / <code>endedAt</code>，也不让 duration 自动影响 policy。若出现实际性能预算消费者，必须先演进长期 Decision，再建立独立 Change，明确 threshold、baseline、retention 和失败语义。

## 完成判读

- candidate 完成不等于 Gate 已完成，也不等于 package 已公开发布。
- Gate build 完成不等于仓库已完成 cutover；旧 verifier 仍可能是正式入口。
- cutover 完成不等于 registry 已验证或有发布授权。
- 只有 Change 自己记录的验证与 handoff，且下游重新验证条件成立，才可推进到下一阶段。
