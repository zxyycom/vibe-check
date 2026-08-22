# Active Change Portfolio

本导航帮助 AI 或维护者选择、恢复和审阅当前 active Change 与直接相关的长期 Decision。它覆盖 `changes/` 根目录下的全部 active Change；`changes/archive/` 与 `docs/decisions/archive/` 是历史材料，除非任务明确要求历史审计，否则不作为当前方案输入。

## 权威性与状态边界

本文件只拥有跨 Change 的阅读路径、分组和关系摘要，不拥有任何 Change 的动态 stage、任务完成、实现事实或长期方向。

| 需要恢复的信息 | 唯一 owner / 操作 | 不应从本文件推断的内容 |
| --- | --- | --- |
| Change 是否 active、处于 Draft 还是 Plan、任务进度和基线距离 | `bun run change-plan -- list changes`，随后读取该 Change 的 artifacts | 可以开始实施、链接 handoff 的事实仍有效、或已完成验收。 |
| 单个 Change 的范围、设计、风险、开放问题和验收 | 对应 `changes/<change>/proposal.md`、`design.md`、`tasks.md` | 它已经成为稳定 Product contract。 |
| 跨 Change 持续有效的取舍与理由 | 链接的 `docs/decisions/*.md` | `active + unaligned` Decision 已是当前实现，或构成实施/外部写入授权。 |
| 当前实现与稳定行为 | 对应 `docs/` owner、代码、测试和 release artifact | 历史 Change、Draft 或本导航的摘要本身证明了实现。 |

Decision status 的正确读法是：`active + aligned` 是已核对的当前方向；`active + unaligned` 是已经确认、但尚未成为当前事实的未来方向。Change `design.md` 里的“Decisions”只约束该 Change 的暂定/实施设计，不能替代 `docs/decisions/` 的长期 Decision。

## 阅读步骤

1. 先运行 `bun run change-plan -- list changes`，确认目标仍 active，并阅读它报告的 Plan 基线提示。
2. 在下面按产品路径或能力路径找到目标 Change，恢复其**唯一交付**与直接相关 Decision。
3. 读取目标 Change 的 proposal 和 design；只有 stage 为 Plan 时才把 tasks 当作实施清单。
4. 将“开放问题”和“需要重新核对”保留为问题：不要仅因导航存在就选择 grammar、优先级、外部事实或发布动作。
5. 实施后才由对应稳定 owner 更新当前事实；Change 的 stage、完成和 Decision alignment 都不会自动变化。

## 产品路径总览

当前 portfolio 分为四个阅读分组；同一个基础能力可以同时出现在自身 owner 分组和下游交付路径中，依赖关系以链接的 Change 与详细交付导航为准：

1. **Project Gate 与 package 交付：** 三个上游能力 Change、首轮 Gate build、repository hard cutover 与最小 Check/Record hard cut 均已归档；[repository hard cutover Change](archive/replace-workspace-verifier-with-project-gate/) 交付了 [gate-handoff.md](archive/replace-workspace-verifier-with-project-gate/gate-handoff.md)。[Configuration](../docs/configuration.md) 与 [Output](../docs/output.md) 已记录终态 messages 与显式 visibility 两项当前 Product 能力。已归档的 [add-check-terminal-messages-and-visibility](archive/add-check-terminal-messages-and-visibility/)（archived）交付 terminal messages 与显式 visibility。`add-typed-check-dependency-outputs` 是仍未完成的并列输入，**不是**该已归档 Change 的前置；两者共同作为 `ship-public-package-api-documentation` 和 `align-project-gate-with-native-check-authoring` 的输入。完整依赖与 handoff 由 [Vibe Check package 与 Project Gate 交付导航](vibe-check-package-and-gate-delivery.md) 唯一承接。
2. **公共 Check authoring、typed dependency outputs 与日志证据边界：** 当前四态 Check、final data、Check-local Records、terminal messages 和 human visibility 已成为基础事实；后两项由已归档的 [add-check-terminal-messages-and-visibility](archive/add-check-terminal-messages-and-visibility/)（archived）交付。declared direct dependency 读取上游 settled output 的能力仍由 typed dependency Change 负责。现有 presentation 与 log evidence Draft 都不把 presentation 或日志变成 Core fact；后者只保存 durable receipt/event 的 owner 边界。
3. **格式、政策与安全 Check：** 文件政策与多个独立 Product-provided Check；每项领域语义归 producing Check，不形成“非代码扫描器”的共同实现。
4. **Function metrics runtime 迁移：** 在 Check foundations 后，以 fresh baseline 将私有 Python/Lizard backend 替换为 TypeScript implementation。

## 路径一：Project Gate 与 package 交付

长期顺序由 [在公开 package 发布前完成项目门禁](../docs/decisions/complete-project-gate-before-public-package-release.md)（`active + aligned`）决定：本地 candidate → 完整 Gate consumer → repository cutover → 经单独授权的公开发布。它不决定项目 CLI grammar、renderer 格式、静态 scheduler 容量或 npm 的实时外部事实。

下表只列出仍 active 的下游 Change；已归档 cutover 的 binding/legacy-retirement 输入见上方 handoff。

| Change | 此 Change 唯一负责的结果 | 直接 Decision 输入 | 下游与仍未决定的事项 |
| --- | --- | --- | --- |
| [add-typed-check-dependency-outputs](add-typed-check-dependency-outputs/) | 让 declared direct dependency 读取 settled outcome/Records，并通过 Check-owned parser 获得 typed data 或 failure。 | [Typed settled dependency outputs](../docs/decisions/let-dependent-checks-read-settled-upstream-outputs.md)（future）；[Core Check/Record facts](../docs/decisions/use-core-check-and-record-facts-from-run-resolution.md)（aligned）。 | Minimal Record 已成为当前事实；该 Change 仍需按自身 Draft 收敛 typed grammar，并以 changed-files producer 和两个 consumers 证明类型链与 runtime boundary，不顺带清理其它 execution inputs。 |
| [ship-public-package-api-documentation](ship-public-package-api-documentation/) | 为 public symbols/declarations 补完整 JSDoc，并把版本匹配的 README/API guide 作为 exact candidate material 交付。 | [版本化 package unit](../docs/decisions/release-one-versioned-npm-product-unit.md)、[Bun host](../docs/decisions/support-bun-as-the-package-host.md)、[API-only entry](../docs/decisions/use-programmatic-api-as-product-entry.md)、[`0.0.x`](../docs/decisions/keep-prestable-package-releases-on-0-0-x.md)（均 future）。 | 消费已经成为当前事实的最小 Record、terminal messages 与 visibility contract；仍等待 typed dependency outputs，再向 Gate optimization 与 publish 交付 documentation handoff。 |
| [align-project-gate-with-native-check-authoring](align-project-gate-with-native-check-authoring/) | 在 cutover 后从独立质量事实重建权威 Gate：直接组合 ordinary Checks/typed capabilities，CLI lifecycle 独立审计，只为真实外部边界保留 process，并删除迁移重复项与数量锁。 | [caller-runtime Check execution](../docs/decisions/execute-check-functions-in-caller-runtime.md)、[普通 `Check` surface](../docs/decisions/expose-recursive-check-authoring-and-run-surface.md)、[完整 Gate 顺序](../docs/decisions/complete-project-gate-before-public-package-release.md)（均 aligned）。 | 先闭合 required/full 与 foundation package evidence 两项 inventory；保持正式 bindings，Record、terminal messages 与 visibility 已是当前输入，仍等待 typed dependency outputs 和 documentation，再对 exact artifact 交付 `gate-optimization-handoff.md`。 |
| [publish-public-api-only-npm-package](publish-public-api-only-npm-package/) | 消费 cutover binding、Gate optimization 与 documentation handoffs，在单独授权下完成 public registry release 与 registry-install proof。 | [完整 Gate 后发布](../docs/decisions/complete-project-gate-before-public-package-release.md)（aligned）；[版本化 package unit](../docs/decisions/release-one-versioned-npm-product-unit.md)、[unscoped `vibe-check`](../docs/decisions/publish-unscoped-vibe-check-publicly.md)、[MIT](../docs/decisions/license-package-under-mit.md)、[Bun host](../docs/decisions/support-bun-as-the-package-host.md)、[API-only entry](../docs/decisions/use-programmatic-api-as-product-entry.md)、[`0.0.x`](../docs/decisions/keep-prestable-package-releases-on-0-0-x.md)（均 future）。 | registry authority、authenticated publisher、精确 version、copyright holder/year、publish mechanism 与每次外部读写授权均是届时外部事实，尚未决定也不能预先查询。 |

## 路径二：公共 Check authoring 与日志证据边界

这一组 active Change 都建立在普通 Check、直接 execution 与 `checks` / `records` Core facts 之上。已归档的 [add-check-terminal-messages-and-visibility](archive/add-check-terminal-messages-and-visibility/)（archived）已将终态消息与人读可见性变为当前 Product 能力；稳定 contract 由 [Configuration](../docs/configuration.md)、[Architecture](../docs/architecture.md) 与 [Output](../docs/output.md) 拥有。下表只列仍 active 的 Change：它们不自动授权公共 API 变化，不把 Record presence 解释为 Check verdict，也不把人读 progress 或项目 transcript 误作结构化事件协议。

| Change | 此 Change 的核心目的 | 直接 Decision 输入 | 依赖、恢复或未决边界 |
| --- | --- | --- | --- |
| [add-typed-check-dependency-outputs](add-typed-check-dependency-outputs/) | 让 dependency getter、parser descriptor 与 typed result 形成可推导的 TypeScript 关系。 | [Typed settled dependency outputs](../docs/decisions/let-dependent-checks-read-settled-upstream-outputs.md)（future）；[普通 `defineCheck`](../docs/decisions/expose-ordinary-check-values-with-define-check.md)与[Core Check/Record facts](../docs/decisions/use-core-check-and-record-facts-from-run-resolution.md)（aligned）。 | Minimal Record implementation 前置已满足；领先方向是 Check-value `dependsOn`，getter 负责选择和 failure，parser 只转换已选 data。 |
| [define-project-run-log-evidence-boundaries](define-project-run-log-evidence-boundaries/) | 区分 foundation process primitives、Product lifecycle 与 Gate-owned diagnostic evidence，保存 future receipt/event sink 的准入边界。 | [Product-owned progress](../docs/decisions/provide-product-owned-check-progress.md) 与当前 Architecture/Output/Script Tooling owner（aligned current behavior）。 | 当前无命名 consumer，不实施 `summary.json`、event protocol、generic logger、retention 或 cleanup，也不阻塞 Gate cutover。 |

## 路径三：格式、政策与安全 Check

这些 Change 共享的当前基础方向是 [Run resolution 的 Core facts](../docs/decisions/use-core-check-and-record-facts-from-run-resolution.md)（`active + aligned`）。未来 Record/Check contract 由 [Check-local Record data](../docs/decisions/report-check-owned-record-data-with-local-identities.md)、[Check-owned comparison](../docs/decisions/keep-comparison-semantics-inside-producing-checks.md)、[直接 execution 与最小 reporting](../docs/decisions/use-direct-check-execution-with-minimal-record-reporting.md)和[typed settled dependency outputs](../docs/decisions/let-dependent-checks-read-settled-upstream-outputs.md)（均为`active + unaligned`）承接；当前 Task graph仍以源码和已归档 predecessor记录的 implemented direction为事实。

[扩展格式感知 Product-provided Checks](../docs/decisions/expand-format-aware-built-in-checks.md) 是 `active + unaligned` 的产品方向：它确认这些能力可分别演进，但**没有**选择它们的实现优先级，也没有把各 Change 的字段、算法或 record catalog 提前升级为稳定事实。

| Change | 此 Change 的核心目的 | 直接 Decision 输入 | 依赖、恢复或未决边界 |
| --- | --- | --- | --- |
| [add-file-policy-overrides](add-file-policy-overrides/) | 让 Project Definition 以有序、closed typed patch 为项目内不同路径解析可解释政策，且永远不能扩大 global inventory。 | [显式文件政策覆盖](../docs/decisions/use-file-policy-overrides.md)（`active + unaligned`）。 | 它是其他 feature 的共同 policy seam；不决定每个 feature 的专属 leaves。其旧 foundation 描述需要在恢复 Plan 前对照当前 Configuration/Scan Scope owner。 |
| [add-json-validation](add-json-validation/) | 给普通 JSON exact inputs 提供严格 bytes/grammar/duplicate-key validation 与独立领域 Records。 | [格式感知 Checks](../docs/decisions/expand-format-aware-built-in-checks.md)（future）；共享 aligned foundations。 | 不包含 JSON Schema。其具体 parser/record 方案仍是 Change-local 计划，开始前需重审当前 owner 与 file-policy integration。 |
| [add-json-schema-validation](add-json-schema-validation/) | 用离线、显式 registry/binding 验证 JSON Schema 2020-12 documents 与 bound instances。 | [格式感知 Checks](../docs/decisions/expand-format-aware-built-in-checks.md)（future）；共享 aligned foundations。 | 依赖 JSON document service 与 file-policy seam；不授权 remote fetch。Ajv/engine 仍是 private dependency choice，须在实施时审计。 |
| [add-markdown-structure-validation](add-markdown-structure-validation/) | 为 Markdown exact inputs 建立 GFM document/prose measurements 与独立结构 policy violations。 | [格式感知 Checks](../docs/decisions/expand-format-aware-built-in-checks.md)（future）；共享 aligned foundations。 | 共享 Markdown document boundary，但不拥有 link 或 network 语义。具体 parser package 是私有实现选择；开始前需重审旧 Plan 的 foundation 假设。 |
| [add-markdown-link-validation](add-markdown-link-validation/) | 离线验证 Markdown 本地 file/anchor links，并向独立 network Check 提供 sanitized ephemeral external candidate snapshot。 | [格式感知 Checks](../docs/decisions/expand-format-aware-built-in-checks.md)（future）；[显式网络授权](../docs/decisions/require-explicit-network-check-authorization.md)仅约束其后续 network handoff。 | 不执行 DNS/HTTP。Network Change 依赖它；路径引用不得重复拥有 Markdown destination/autolink。 |
| [add-network-link-validation](add-network-link-validation/) | 在明确 policy authorization 下，对 Link snapshot 做 SSRF-safe、有界网络检查。 | [格式感知 Checks](../docs/decisions/expand-format-aware-built-in-checks.md)、[显式网络授权](../docs/decisions/require-explicit-network-check-authorization.md)、[敏感材料临时化](../docs/decisions/keep-sensitive-quality-record-material-ephemeral.md)（均 future）。 | 依赖 Markdown Link snapshot；不以 gate、环境变量或 file override 提升网络授权。不会在没有实际触发时决定 public-network smoke 或更宽 network feature。 |
| [add-path-reference-validation](add-path-reference-validation/) | 在批准的文本 segments 中识别高置信 project-local path token，并仅对 inventory-derived index 检查目标。 | [格式感知 Checks](../docs/decisions/expand-format-aware-built-in-checks.md)、[Check-local Record data](../docs/decisions/report-check-owned-record-data-with-local-identities.md)（均 future）。 | 需要 Markdown/text segment owner；其旧 Record catalog/policy 设计必须在恢复 Plan 时迁移到 owning Check 的 local data、ID 与 verdict，不接管 Markdown destination、module/import 或 URL 语义。 |
| [add-secret-detection](add-secret-detection/) | 在 invocation memory 中检测高置信 secret，并只发布不泄露原值的安全 Records/coverage evidence。 | [格式感知 Checks](../docs/decisions/expand-format-aware-built-in-checks.md) 与 [敏感材料临时化](../docs/decisions/keep-sensitive-quality-record-material-ephemeral.md)（future）。 | 不扫 Git history、environment 或 remote secret manager；不开放自定义 regex/entropy engine。检测规则和实现仍须在恢复 Plan 时以安全边界为准。 |

### 这些 Plan 的恢复边界

`add-file-policy-overrides`、六个格式/JSON/网络/路径 Change、`add-secret-detection` 以及下方 Lizard Change 都在较早 foundation 命名和 Plan 基线下形成。它们的已勾选 Readiness 不能替代一次新的语义复核。

在开始任何新的未勾选 implementation task 前，执行者应：

1. 用 `bun run change-plan -- list changes` 读取该 Plan 的当前距离提示；
2. 对照当前 `docs/architecture.md`、Configuration/Scan Scope/Output owner 和上表的 active Decisions，识别已经实现、已替代或仍缺失的 seam；
3. 将结论写回该 Change 的 proposal/design/tasks：保留、拆分、替换或停止哪个范围必须有当前依据；
4. 只有完成语义复核后，才按 `change-plan` 流程刷新 Plan baseline。

这是恢复步骤，不表示这些 Change 已被废弃、降级、归档或获得新的实施优先级。

## 路径四：Function metrics runtime 迁移

| Change | 此 Change 的核心目的 | 直接 Decision 输入 | 依赖、恢复或未决边界 |
| --- | --- | --- | --- |
| [port-lizard-function-metrics-to-typescript](port-lizard-function-metrics-to-typescript/) | 在届时 approved exact inputs 上，以 fresh compatibility baseline 将 `function-metrics` 的私有 Python/Lizard backend hard-cut 为 Product-owned TypeScript implementation。 | [Lizard 在 Check foundations 后再审](../docs/decisions/defer-lizard-until-after-check-foundations.md)（`active + unaligned`）。 | 该 Decision 默认后置，而不是删除迁移；只有直接交付阻塞、平台、可靠性、安全或许可证证据才应提前重评。开始前必须重新确认 current foundations、采集 fresh baseline，并完成 provenance/license 审计；不自动扩大语言范围或保留 production fallback。 |

## 明确保留的未决事项

以下项目仍需要相应 Change 的 Plan 审阅、真实 consumer evidence、长期 Decision 或用户授权，不能由导航猜测。Gate 的 profile/tag vocabulary、local partial behavior、正式 repository/CI 无 disabled-tag contract、cutover 验收与 legacy cleanup 已由上表链接的 Change artifacts 收敛，不属于本清单。

1. **性能策略：** Product progress、可见序号、stream ownership、effect failure isolation、terminal messages/visibility 当前均不提供 live/intermediate output；是否把 duration 变成 performance policy 仍需真实消费者和独立 Decision。
2. **格式能力的优先级与复核：** 哪个独立 feature 先做、旧 Plan 的详细契约是否仍匹配当前 foundation；`expand-format-aware-built-in-checks` 没有预先决定这些问题。
3. **Lizard 的开始时机：** 除非出现记录中的提前重评证据，否则保持后置；fresh baseline 后的具体 implementation 也不能从旧 CSV/protocol 推断。
4. **公开发布：** registry ownership、publisher、version、legal identity、publish mechanism 和任一 registry/credential/publish 操作的即时授权。

这些未决事项不阻止阅读或维护现有 Change；它们只阻止把计划文本错误地当作已确认的产品事实、外部状态或授权。
