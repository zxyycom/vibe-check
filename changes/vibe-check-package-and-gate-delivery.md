# Vibe Check package 与 Project Gate 交付导航

## 用途与权威性

当 AI 或维护者需要选择、恢复或审阅当前 npm / Project Gate 交付路径时，先阅读本导航，再进入目标 Change 的 proposal、design 和 tasks。本文件是 [Active Change Portfolio](active-change-portfolio.md) 中“Project Gate 与 package 交付”路径的详细导航；需要查看全部 active Change 或其直接相关 Decision 时，回到该 portfolio。

本文件只拥有本产品路径的阶段顺序与 public-readiness 输入关系：三个上游 Change、首轮 Gate build、repository hard cutover 与最小 Check/Record hard cut 已归档；[repository hard cutover Change](archive/replace-workspace-verifier-with-project-gate/) 已交付 [gate-handoff.md](archive/replace-workspace-verifier-with-project-gate/gate-handoff.md)。[Configuration](../docs/configuration.md)、[Architecture](../docs/architecture.md) 与 [Output](../docs/output.md) 已确认 terminal messages 与显式 visibility 均已交付；它们是 package documentation 和 native Check authoring 的同一组既有输入。`add-typed-check-dependency-outputs` 是这两项下游工作仍需的另一项同级输入，不是 `add-check-terminal-messages-and-visibility` 的前置。typed capability 完成后再冻结 package API documentation 与 native Check authoring，刷新 Gate optimization evidence，最后才进入 publish。log evidence boundaries 是不阻塞本路径的相邻 Draft。

本导航不拥有 active Change 的动态 stage、具体范围、实现设计、任务完成事实或稳定 Product contract：

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
[archived] add-project-run-lifecycle-feedback ──────────────┼─> [archived] build-candidate-backed-project-gate ─┐
[archived] establish-npm-package-candidate-and-quality-dogfood ┘                                                    │
                                                                                                                     v
                                                                                     [archived] replace-workspace-verifier-with-project-gate
                                                                                                                     │
                                                                                                                     v
                                                                                         [repository uses one formal Gate]
                                                                                                     │
                                                                                                     v
                                                                        [archived] establish-minimal-check-record-contract
                                                                                           │                    │
                                                                                           v                    v
                                                                         add-typed-check-dependency-outputs   add-check-terminal-messages-and-visibility
                                                                                           │                    │
                                                                                           └─────────┬──────────┘
                                                                                                     v
                                                                       ship-public-package-api-documentation
                                                                                                     │
                                                                                                     v
                                                                    align-project-gate-with-native-check-authoring
                                                                                                     │
                                                                                                     v
                                                                    publish-public-api-only-npm-package
~~~

前三个上游 Change 与首轮 Gate build 已提供 cutover 所需的能力输入。cutover 已在当前 revision 重新确认 matching candidate、完成正式 bindings 与 legacy retirement；实际 identity、audit 和刷新条件见已归档的 [gate-handoff.md](archive/replace-workspace-verifier-with-project-gate/gate-handoff.md)。最小 Record reporter/Core/machine v4 与 terminal messages/explicit visibility 已成为当前事实；typed direct-dependency dataflow、package documentation 和 native Check authoring 仍会改变 artifact/public/Gate inputs。这些后续变化只使发布证据需要刷新，不撤销 cutover，也不恢复旧 verifier。非 comparison execution-input migration 不属于 Record hard cut，只有 typed capability 已实施且存在真实迁移消费者时才另立范围。native Check authoring 最终以 documentation-complete exact artifact 写出 <code>gate-optimization-handoff.md</code>。

## Change 与 handoff

| Change | 唯一交付 | 下游可使用的完成证据 | 不负责 |
| --- | --- | --- | --- |
| [add-project-run-invocation-controls](archive/add-project-run-invocation-controls/)（archived） | Product Run 的 immutable project invocation input。 | 当前 owner 已实现并验证的 string flags；Gate build 可据此实现 Check-local eligibility。 | CLI grammar、tag vocabulary、scheduler selection、renderer。 |
| [add-project-run-lifecycle-feedback](archive/add-project-run-lifecycle-feedback/)（archived） | Product Run 的 TTY/plain progress effect 与 final per-Check duration summary。 | 当前 owner 已实现并验证的 Product-owned progress、duration summary 与 effect failure isolation；Gate build 可直接启用。 | Project process logs、exit mapping、canonical performance policy 或公共 observer/renderer API。 |
| [establish-npm-package-candidate-and-quality-dogfood](archive/establish-npm-package-candidate-and-quality-dogfood/)（archived） | API-only candidate、quality dogfood 与 exact-tarball proof。 | [<code>candidate-handoff.md</code>](archive/establish-npm-package-candidate-and-quality-dogfood/candidate-handoff.md) 记录证据形态、形成时 identity 与重新验证条件；后续 Change 必须据此产生匹配当前 inputs 的 identity。 | 完整 Gate、正式入口切换、registry publish。 |
| [build-candidate-backed-project-gate](archive/build-candidate-backed-project-gate/)（archived） | 可并行运行的完整 repository Gate consumer。 | [<code>gate-readiness-handoff.md</code>](archive/build-candidate-backed-project-gate/gate-readiness-handoff.md) 是形成时 readiness 输入；其中的 revalidation conditions 决定后续何时必须刷新。 | 正式入口权威切换、旧 verifier 删除、registry publish。 |
| [replace-workspace-verifier-with-project-gate](archive/replace-workspace-verifier-with-project-gate/)（archived） | 在当前 revision 重新验证归档 readiness，完成唯一正式门禁接线并退役旧 verifier。 | [<code>gate-handoff.md</code>](archive/replace-workspace-verifier-with-project-gate/gate-handoff.md) 记录实际 binding、无 disabled-tag required/full、legacy reference audit 和重新验证条件；归档状态与历史任务以该目录及 <code>bun run change-plan -- list changes --archived</code> 为准。 | 后续 Gate authoring/API/package 优化与 registry publish。 |
| [establish-minimal-check-record-contract](archive/establish-minimal-check-record-contract/)（archived） | 用 `records.report({ id }, data)` 建立任意 custom/default Check 共用的最小 Record contract，并硬切 Core `{ checkId, id, data }`、旧 Record 直接消费者与 machine v4。 | 已归档 implementation、declaration、runtime/Core、machine v4 与 isolated consumer evidence；typed dependency 和 terminal messages/visibility 据此使用同一事实结构。 | Cross-Check dependency reader/inference、public presentation grammar、非 comparison execution-input migration、registry publish。 |
| [add-typed-check-dependency-outputs](add-typed-check-dependency-outputs/) | 让 direct dependency getter 返回 typed data 或 failure。 | Minimal Record 完成后的 TypeScript/runtime prototype、changed-files 多消费者与 machine/external readback evidence。 | Search/query、第三 Core entity、通用 provider framework、其它 execution-input cleanup、presentation visibility。 |
| [add-check-terminal-messages-and-visibility](add-check-terminal-messages-and-visibility/) | 已交付 `CheckResult.messages`、`RunResult.checkMessages` 与 `always | attention` visibility 两个主要能力。 | Closed terminal validation、Core acceptance handoff、canonical RunResult ordering、Definition fingerprint、TTY/plain matrix、Project Gate `command-failed` message、isolated-consumer evidence 与 required/full Gate 验收均已通过。 | Live/intermediate output、Core/Record/machine messages、typed dependency reader 或 durable log protocol。 |
| [ship-public-package-api-documentation](ship-public-package-api-documentation/) | 补齐 public JSDoc/LSP，并将 README/API guide 加入 exact candidate artifact。 | <code>package-api-documentation-handoff.md</code>，绑定 guide/declarations 与 tarball digest；Gate optimization 必须以该 artifact 刷新发布证据。 | registry/legal/release notes 与 publish。 |
| [align-project-gate-with-native-check-authoring](align-project-gate-with-native-check-authoring/) | 在 cutover 后从独立质量事实重建权威 Gate：直接组合 ordinary Checks/typed capabilities，分离 CLI lifecycle，合并 profile-derived identity，并只为真实外部边界保留 process。 | <code>gate-optimization-handoff.md</code>，记录 current assurance inventory、保留/删除理由、CLI/capability caller audit、documentation-complete candidate、正式 bindings 与 required/full evidence。 | 重新切换 bindings、恢复 legacy verifier、替代 focused CLI consumer 或 registry publish。 |
| [publish-public-api-only-npm-package](publish-public-api-only-npm-package/) | 消费 cutover、Gate optimization 与 package documentation handoffs，经过单独授权完成 npm 发布与 registry-install proof。 | 精确已发布版本及其独立安装/文档/runtime/type 验证。 | 重建 package、补齐 Gate/API 文档或替代本地 evidence。 |
| [define-project-run-log-evidence-boundaries](define-project-run-log-evidence-boundaries/) | 保存 Product lifecycle、Gate transcript 与 future durable receipt/event sink 的 owner 边界。 | 当前行为已足够；本 Draft 没有交付物，也不是 cutover/package documentation/publish 的前置。 | 当前 Gate log 改造、terminal messages/visibility 或通用 logger。 |

归档 readiness 只保存形成时能力；cutover 已完成当前 revision revalidation 与 binding，并以已归档的 [<code>gate-handoff.md</code>](archive/replace-workspace-verifier-with-project-gate/gate-handoff.md) 记录 binding/legacy-retirement 事实。cutover 后的优化不会撤销该事实，但 publish 还必须取得 current <code>gate-optimization-handoff.md</code> 与 package documentation handoff；后两者尚未产生。

## Timing / telemetry 边界

当前约束是不为呈现进度而改写既有 <code>CheckOutcome</code> 或 <code>QualityRecord</code> grammar。已归档的 [lifecycle-feedback Change](archive/add-project-run-lifecycle-feedback/) 落地 Product-measured <code>durationMs</code>：它由 Product 私有 settled feedback 驱动 progress，并作为 final RunResult 的 per-Check execution signal 返回，不进入 Core、machine artifact 或 Record；当前事实仍以 Product owner、源码与测试为准。

[`add-check-terminal-messages-and-visibility`](add-check-terminal-messages-and-visibility/) 已为首次公开 package readiness 提供两项同等主要的输入：需要补充提示的 Check 通过 `CheckResult.messages` 按需附带 level/code/message，settlement 时呈现并由 `RunResult.checkMessages` 返回；`always | attention` visibility 控制终态人读行。它不等待 typed dependency outputs，也不提供 live/intermediate output，且不把 messages 写入 Core/Record/machine；Project Gate process Check 是当前安全摘要实例，不是 consumer 迁移。

Check 的 structured facts 与 lifecycle events 当前始终产生。Typed dependency output Change 拥有依赖读取；terminal messages/visibility 的稳定 owner 拥有 human visibility、messages 与 owning Check 的组合归属、display matrix 和 fingerprint 边界。

首轮不返回 <code>startedAt</code> / <code>endedAt</code>，也不让 duration 自动影响 policy。若出现实际性能预算消费者，必须先演进长期 Decision，再建立独立 Change，明确 threshold、baseline、retention 和失败语义。

## 完成判读

- candidate 完成不等于 Gate 已完成，也不等于 package 已公开发布。
- 首轮 Gate build 完成不等于仓库已完成 cutover；本路径已由 `gate-handoff.md` 证明切换和 retirement，后续 Change 仍必须从该 handoff 恢复实际 bindings 与刷新条件。
- cutover 完成不等于 native Check authoring、typed dependency outputs 或 package documentation 已完成；最小 Record contract 以及 terminal messages/explicit visibility 已是当前事实，但其下游 package/Gate evidence 仍会在后续 Change 刷新。
- Package API guide Draft 或仓库文档存在不等于 README/JSDoc 已进入 exact tarball；只有 documentation handoff 能证明随包交付。
- cutover 完成不等于 registry 已验证或有发布授权。
- 只有 Change 自己记录的验证与 handoff，且下游重新验证条件成立，才可推进到下一阶段。
