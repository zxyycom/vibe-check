# Vibe Check package 与 Project Gate 交付导航

## 用途与权威性

当 AI 或维护者需要选择、恢复或审阅当前 npm / Project Gate 交付路径时，先阅读本导航，再进入目标 Change 的 proposal、design 和 tasks。本文件是 [Active Change Portfolio](active-change-portfolio.md) 中“Project Gate 与 package 交付”路径的详细导航；需要查看全部 active Change 或其直接相关 Decision 时，回到该 portfolio。

本文件只拥有本产品路径的阶段顺序与 public-readiness 输入关系。Repository hard cutover、最小 Check/Record、terminal messages/visibility、typed dependency outputs、package API documentation、native Check authoring、layout/naming与 shared file-policy退出均已归档并交付 handoff。公开发布前当前还需完成四项确定性离线格式 Checks与 maintenance reminders，并在它们改变 public inventory、dependencies和 docs后重新产生 exact local candidate与 Gate evidence；随后才进入需要单独授权的 publish Change。Log evidence boundaries 是不阻塞本路径的相邻 Draft。

本导航不拥有 active Change 的动态 stage、具体范围、实现设计、任务完成事实或稳定 Product contract：

- 动态 stage、任务进度和 Git 基线以每个 Change 的 <code>.change-plan.json</code> 与 <code>bun run change-plan -- list changes</code> 为准；`active` 只表示未归档，不能单独表示任务未完成。
- 每个 Change 自己拥有其 proposal、design、tasks、验证和 handoff 内容。
- 长期“先完成完整项目门禁，再公开发布”的方向由 [在公开 package 发布前完成项目门禁](../docs/decisions/complete-project-gate-before-public-package-release.md) 决定。
- 首版“先完成严格 JSON、离线 JSON Schema、Markdown heading structure、离线 local links与 maintenance reminders”的方向由 [在首次公开发布前完成选定的首版 Checks](../docs/decisions/complete-first-release-check-set-before-publication.md) 决定。
- Product-owned progress 的 presentation、stream ownership 与 failure isolation 由 [Product-owned Check progress](../docs/decisions/provide-product-owned-check-progress.md) 决定。
- 当前 Product runtime 的已实现边界由 [架构](../docs/architecture.md) 决定；本导航中的任何 Change 都不证明运行时已经改变。

## 读取步骤

1. 运行 <code>bun run change-plan -- list changes</code>，确认目标 Change 仍 active、其 stage 与基线警告。
2. 在下面的依赖图定位该 Change 的上游输入和下游 handoff。
3. 阅读目标 Change 的 proposal 与 design；只有 stage 为 plan 时才以 tasks 作为实施清单。若 tasks 已全勾选，先确认它是完成待归档而非继续实施。
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
                                                           [archived] add-typed-check-dependency-outputs   [archived] add-check-terminal-messages-and-visibility
                                                                                           │                    │
                                                                                           └─────────┬──────────┘
                                                                                                     v
                                                            [archived] ship-public-package-api-documentation
                                                                                                     │
                                                                                                     v
                                                         [archived] align-project-gate-with-native-check-authoring
                                                                                                     │
                                                                                                     v
                                         [archived] align-repository-layout-and-naming-with-module-owners
                                                                                                     │
                                                                                                     v
                                                               [archived] add-file-policy-overrides
                                                                                                     │
                                                                                                     v
                        ┌──────── add-json-validation ────────> add-json-schema-validation ─────────┐
                        ├──── add-markdown-structure-validation ─> add-markdown-link-validation ────┤
                        └────────────── add-maintenance-reminders ───────────────────────────────────┘
                                                                                                     │
                                                                                                     v
                                                    [refresh public docs + exact candidate + Gate]
                                                                                                     │
                                                                                                     v
                                                                    publish-public-api-only-npm-package
~~~

前三个上游 Change 与首轮 Gate build 已提供 cutover 所需的能力输入。Cutover handoff 拥有正式 bindings、legacy retirement 与刷新条件；package documentation handoff 拥有 README/JSDoc/declaration contract、形成时 artifact identity 与失效条件。两者都只作为 native Check authoring 明确消费的输入，不自动证明实现后的 artifact 仍匹配。

已归档的 Native Check authoring Change 从 assurance obligations 重建 ordinary Check catalog，只为真实 external executable、toolchain、isolation 与 installed-candidate boundaries 保留 process，并以 current exact artifact 写出 [`gate-optimization-handoff.md`](archive/align-project-gate-with-native-check-authoring/gate-optimization-handoff.md)。该优化没有撤销 cutover 或恢复旧 verifier。其它 execution-input migration 只有出现真实消费者时才另立范围。

## Change 与 handoff

| Change | 唯一交付 | 下游可使用的完成证据 | 不负责 |
| --- | --- | --- | --- |
| [add-project-run-invocation-controls](archive/add-project-run-invocation-controls/)（archived） | Product Run 的 immutable project invocation input。 | 当前 owner 已实现并验证的 string flags；Gate build 可据此实现 Check-local eligibility。 | CLI grammar、tag vocabulary、scheduler selection、renderer。 |
| [add-project-run-lifecycle-feedback](archive/add-project-run-lifecycle-feedback/)（archived） | Product Run 的 TTY/plain progress effect 与 final per-Check duration summary。 | 当前 owner 已实现并验证的 Product-owned progress、duration summary 与 effect failure isolation；Gate build 可直接启用。 | Project process logs、exit mapping、canonical performance policy 或公共 observer/renderer API。 |
| [establish-npm-package-candidate-and-quality-dogfood](archive/establish-npm-package-candidate-and-quality-dogfood/)（archived） | API-only candidate、quality dogfood 与 exact-tarball proof。 | [<code>candidate-handoff.md</code>](archive/establish-npm-package-candidate-and-quality-dogfood/candidate-handoff.md) 记录证据形态、形成时 identity 与重新验证条件；后续 Change 必须据此产生匹配当前 inputs 的 identity。 | 完整 Gate、正式入口切换、registry publish。 |
| [build-candidate-backed-project-gate](archive/build-candidate-backed-project-gate/)（archived） | 可并行运行的完整 repository Gate consumer。 | [<code>gate-readiness-handoff.md</code>](archive/build-candidate-backed-project-gate/gate-readiness-handoff.md) 是形成时 readiness 输入；其中的 revalidation conditions 决定后续何时必须刷新。 | 正式入口权威切换、旧 verifier 删除、registry publish。 |
| [replace-workspace-verifier-with-project-gate](archive/replace-workspace-verifier-with-project-gate/)（archived） | 在当前 revision 重新验证归档 readiness，完成唯一正式门禁接线并退役旧 verifier。 | [<code>gate-handoff.md</code>](archive/replace-workspace-verifier-with-project-gate/gate-handoff.md) 记录实际 binding、无 disabled-tag required/full、legacy reference audit 和重新验证条件；归档状态与历史任务以该目录及 <code>bun run change-plan -- list changes --archived</code> 为准。 | 后续 Gate authoring/API/package 优化与 registry publish。 |
| [establish-minimal-check-record-contract](archive/establish-minimal-check-record-contract/)（archived） | 用 `records.report({ id }, data)` 建立任意 custom/default Check 共用的最小 Record contract，并硬切 Core `{ checkId, id, data }`、旧 Record 直接消费者与 machine v4。 | 已归档 implementation、declaration、runtime/Core、machine v4 与 isolated consumer evidence；typed dependency 和 terminal messages/visibility 据此使用同一事实结构。 | Cross-Check dependency reader/inference、public presentation grammar、非 comparison execution-input migration、registry publish。 |
| [add-typed-check-dependency-outputs](archive/add-typed-check-dependency-outputs/)（archived） | 已保留 string direct edge，以 `dependencies.get(checkId)` 读取 canonical final data，再由 producer `parseData` 恢复 typed data。 | 20/20 tasks、aligned Decision、runtime direct authorization、changed-files 多 consumer、四态 settlement、declaration emit、machine/external readback 及 required/full Gate 均已闭合。 | Compile-time dependency-ID relation、supplemental Record getter、parser registry、search/query、第三 Core entity、其它 execution-input cleanup、presentation visibility。 |
| [add-check-terminal-messages-and-visibility](archive/add-check-terminal-messages-and-visibility/)（archived） | 已交付 `CheckResult.messages`、`RunResult.checkMessages` 与 `always | attention` visibility 两个主要能力。 | Closed terminal validation、Core acceptance handoff、canonical RunResult ordering、Definition fingerprint、TTY/plain matrix、Project Gate `command-failed` message、isolated-consumer evidence 与 required/full Gate 验收均已通过。 | Live/intermediate output、Core/Record/machine messages、typed dependency reader 或 durable log protocol。 |
| [ship-public-package-api-documentation](archive/ship-public-package-api-documentation/)（archived） | 已补齐 public JSDoc/LSP，并把 README/API guide 加入 exact candidate artifact。 | [<code>package-api-documentation-handoff.md</code>](archive/ship-public-package-api-documentation/package-api-documentation-handoff.md) 绑定 documentation contract、形成时 digest 与失效条件；Gate optimization 必须按这些条件产生 current evidence。 | registry/legal/release notes、Gate implementation 或 publish。 |
| [align-project-gate-with-native-check-authoring](archive/align-project-gate-with-native-check-authoring/)（archived） | 已从 current assurance obligations 重建权威 Gate：组合 ordinary Checks/typed operations，分离 CLI lifecycle，合并 repository quality identity，删除历史 Foundation package gates，只为真实 external/toolchain/candidate boundary 保留 process，并把无参默认从 full 改为 required。 | [`gate-optimization-handoff.md`](archive/align-project-gate-with-native-check-authoring/gate-optimization-handoff.md) 记录 required/full 当前同集的 14 个 identities、default/required/full selection、Foundation coverage/caller audit、documentation-complete candidate、正式 bindings 与 required/full evidence。 | 下游 publish Change 必须按 handoff 的重验证条件重新核对 candidate 与外部事实，并取得单独授权；本 archived Change 不再有待处理的归档授权。 |
| [align-repository-layout-and-naming-with-module-owners](archive/align-repository-layout-and-naming-with-module-owners/)（archived） | 已将 Product source、public entry、repository Project Runs 与 package artifact/candidate 调整到唯一 module owner，并重新闭合 candidate、Gate、Case 与 current docs。 | 该 Change 的 baseline/ledger、迁移后 exact candidate receipt、required/full Gate 和 Test Evidence closure。 | MIT material、正式版本、registry/credential 和 publish。 |
| [add-file-policy-overrides](archive/add-file-policy-overrides/)（archived） | 已退出 Product-wide file-policy resolver计划，并把局部 file差异保持在 owning Check options。 | 6/6 tasks、current code/docs audit与 Change验证；五项首版 Checks无需等待 shared resolver。 | 新增 Product-wide resolver、证明任一首版 Check已经实现或授权发布。 |
| [add-json-validation](add-json-validation/) | 首版 `jsonValidation` ordinary default与 strict JSON private document boundary。 | Strict bytes/grammar/duplicate-key、public API/docs、Cases、installed candidate与 Gate证据。 | JSON Schema、JSONC、formatter或 shared policy。 |
| [add-json-schema-validation](add-json-schema-validation/) | 首版 `jsonSchemaValidation` explicit registry/binding与零网络 2020-12验证。 | JSON helper handoff、engine/license、safe Records、public API/docs、installed candidate与 Gate证据。 | Remote schema discovery/fetch、generic validator registry或 public Ajv API。 |
| [add-markdown-structure-validation](add-markdown-structure-validation/) | 首版 `markdownStructureValidation` heading rules与 private parser-neutral Markdown facts。 | GFM/parser/license、heading rules、public API/docs、Cases、installed candidate与 Gate证据。 | Prose measurements、formatter、links或 shared policy。 |
| [add-markdown-link-validation](add-markdown-link-validation/) | 首版 `markdownLinkValidation` local file与 anchor离线验证。 | Shared Markdown facts、resolver/security、zero-network、public API/docs、Cases、installed candidate与 Gate证据。 | Network reachability、external snapshot、generic prose paths。 |
| [add-maintenance-reminders](add-maintenance-reminders/) | 首版 `maintenanceReminders` fixed-ID ordinary default，以 immutable base commit后的 first-parent activity产生 advisory/enforcing提醒。 | Git history fixtures、closed options、messages/status、public API/docs、Cases、installed candidate与 Gate证据。 | Constructor、自动推进 baseline、wall-clock scheduling、path filters或 supplemental Records。 |
| [publish-public-api-only-npm-package](publish-public-api-only-npm-package/) | 消费 cutover、五项首版 Check、fresh Gate/candidate 与 package documentation handoffs，经过单独授权完成 npm 发布与 registry-install proof。 | 精确已发布版本及其独立安装/文档/runtime/type 验证。 | 重建 package、补齐 Checks/Gate/API 文档或替代本地 evidence。 |
| [define-project-run-log-evidence-boundaries](define-project-run-log-evidence-boundaries/) | 保存 Product lifecycle、Gate transcript 与 future durable receipt/event sink 的 owner 边界。 | 当前行为已足够；本 Draft 没有交付物，也不是 cutover/package documentation/publish 的前置。 | 当前 Gate log 改造、terminal messages/visibility 或通用 logger。 |

Archived handoff 只保存形成时能力和重验条件。Cutover、package documentation、current Gate optimization、layout/naming与 file-policy退出 handoffs 已存在；其形成时 candidate会被五项首版 Check的 public/runtime/dependency变化主动失效。五项 Change完成后必须通过 `scripts/package/candidate/prepare.ts` 重新生成并验证同一 exact artifact，再把 fresh receipt交给 Publish。Publish 仍须重新核对外部事实和获得明确授权；不能把 pre-Check digest当作未来 artifact证据。

## Timing / telemetry 边界

当前约束是不为呈现进度而改写既有 <code>CheckOutcome</code> 或 <code>QualityRecord</code> grammar。已归档的 [lifecycle-feedback Change](archive/add-project-run-lifecycle-feedback/) 落地 Product-measured <code>durationMs</code>：它由 Product 私有 settled feedback 驱动 progress，并作为 final RunResult 的 per-Check execution signal 返回，不进入 Core、machine artifact 或 Record；当前事实仍以 Product owner、源码与测试为准。

已归档的 [`add-check-terminal-messages-and-visibility`](archive/add-check-terminal-messages-and-visibility/)（archived）已为首次公开 package readiness 提供两项同等主要的输入：需要补充提示的 Check 通过 `CheckResult.messages` 按需附带 level/code/message，settlement 时呈现并由 `RunResult.checkMessages` 返回；`always | attention` visibility 控制终态人读行。它不等待 typed dependency outputs，也不提供 live/intermediate output，且不把 messages 写入 Core/Record/machine；Project Gate process Check 是当前安全摘要实例，不是 consumer 迁移。

Check 的 structured facts 与 lifecycle events 当前始终产生。typed dependency output 的 current contract 已移交给稳定 owner；terminal messages/visibility 的稳定 owner 拥有 human visibility、messages 与 owning Check 的组合归属、display matrix 和 fingerprint 边界。

首轮不返回 <code>startedAt</code> / <code>endedAt</code>，也不让 duration 自动影响 policy。若出现实际性能预算消费者，必须先演进长期 Decision，再建立独立 Change，明确 threshold、baseline、retention 和失败语义。

## 完成判读

- candidate 完成不等于 Gate 已完成，也不等于 package 已公开发布。
- 首轮 Gate build 完成不等于仓库已完成 cutover；本路径已由 `gate-handoff.md` 证明切换和 retirement，后续 Change 仍必须从该 handoff 恢复实际 bindings 与刷新条件。
- cutover 完成不等于 native Check authoring 已完成；package documentation handoff 已存在，但 implementation changes 后仍需按其失效条件重新绑定 current artifact。
- Package API guide 或仓库文档存在不等于任意后续 tarball 都含匹配 bytes；只有 current candidate verification 能把 documentation handoff 应用到新 artifact。
- cutover 完成不等于 registry 已验证或有发布授权。
- 只有 Change 自己记录的验证与 handoff，且下游重新验证条件成立，才可推进到下一阶段。
