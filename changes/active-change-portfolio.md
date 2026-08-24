# Active Change Portfolio

本导航覆盖 `changes/` 下全部 active Change，并按首次公开发布顺序提供恢复入口。动态 stage、任务进度与 Git 距离只以 `bun run change-plan -- list changes` 和目标 Change artifacts 为准；本文件不证明实现、验收、授权或归档完成。

## 权威性与读取顺序

1. 先运行 `bun run change-plan -- list changes`，确认目标仍 active，并读取 Plan 的基线提示。
2. 按下方分组读取目标 proposal/design；只有 stage 为 Plan 时才把 tasks 当作进度清单。
3. 长期方向看链接的 Decision；current behavior看 `docs/` owner、源码、tests与 package artifacts。
4. 暂停写在目标 Design 的 `Implementation Observations` / `Resume Conditions`，不会形成额外 metadata stage。
5. `active`、checkbox 或 Decision alignment都不自动产生实施、归档、registry或 publish授权。

## 首次公开发布顺序

[`complete-first-release-check-set-before-publication.md`](../docs/decisions/complete-first-release-check-set-before-publication.md)（`active + unaligned`）确认以下顺序：

```text
[archived] retire shared file-policy plan
          │
          ├──> json-validation ───────> json-schema-validation ─────┐
          ├──> markdown-structure-validation ─> markdown-link-validation
          └──> maintenance-reminders ───────────────────────────────┤
                                                                    v
                                  refresh public docs + exact candidate + required/full Gate
                                                                    │
                                                                    v
                                        publish-public-api-only-npm-package
```

五项 Check 都必须使用当前 ordinary Check、Check-owned options 与 four-state result；四项格式 Check 使用 global file scope并仅在 owning Check 内报告所需 Records，maintenance reminders 自己拥有 Git activity measurement且不报告 supplemental Records。它们都不恢复旧 shared policy、TaskPlan/Manager、named reference、通用 comparison/cache或 Record catalog。五项完成后，新 Decision才进入 alignment核对，发布 Draft仍需 fresh registry事实与单独外部读写授权。

## 分组一：首版前完成的五项 Checks

已完成并归档的 [add-file-policy-overrides](archive/add-file-policy-overrides/) 只证明 Product-wide file-policy计划已退出，局部差异继续由 owning Check options负责；它是本组的已闭合前置，不再属于 active portfolio。直接 Decision：[Check-owned file overrides](../docs/decisions/use-check-owned-file-overrides.md)。

| Change | 唯一结果 | 依赖与当前边界 |
| --- | --- | --- |
| [add-json-validation](add-json-validation/) | 公开 `jsonValidation`，严格验证 `.json` 的 UTF-8、grammar、完整消费与 duplicate keys。 | 首版 JSON基础；建立可供 Schema复用的 private strict document boundary，不建立 public parser。 |
| [add-json-schema-validation](add-json-schema-validation/) | 公开 `jsonSchemaValidation`，以 explicit registry/bindings做 2020-12零网络验证。 | 依赖 JSON private document boundary；engine与 runtime dependency/license需 Readiness审计。 |
| [add-markdown-structure-validation](add-markdown-structure-validation/) | 公开 `markdownStructureValidation`，只验证四项确定性 heading rules。 | 建立 Structure/Link共享的 private parser-neutral Markdown facts；不发布 prose measurements。 |
| [add-markdown-link-validation](add-markdown-link-validation/) | 公开 `markdownLinkValidation`，离线验证 local files与 same/cross-document anchors。 | 依赖 private Markdown facts；external schemes零网络、零 snapshot/handoff。 |
| [add-maintenance-reminders](add-maintenance-reminders/) | 公开 fixed-ID ordinary value `maintenanceReminders`，按 immutable base commit后的 first-parent activity产生提醒。 | 独立于 JSON/Markdown链；先用 focused Git fixture spike闭合 history命令边界。Advisory只产生 warning message，enforcing due才使 Check failed；不新增 constructor。 |

四项格式 Check的共同长期方向是 [扩展格式感知 Product-provided Checks](../docs/decisions/expand-format-aware-built-in-checks.md)（`active + unaligned`）。该 Decision不建立“非代码 scanner”公约数；它们只分别共享严格 JSON helper或 private Markdown parse facts。Maintenance reminders遵循 producing Check内部拥有 comparison的既有边界，不与格式 Check建立 shared abstraction。

## 分组二：首版后保留的 Check / backend方向

这些 Change仍是结构完整的 active Plan或 Draft，但其 artifacts明确记录暂停原因与 Resume Conditions；它们不阻塞首次公开发布。

| Change | 保留方向 | 后置原因 / 恢复门禁 |
| --- | --- | --- |
| [add-path-reference-validation](add-path-reference-validation/) | 高置信 project-local prose/inline-code path validation。 | 需要真实 corpus证明 grammar precision并闭合 segment owner；避免与 Markdown destinations重复。 |
| [add-network-link-validation](add-network-link-validation/) | 显式 opt-in、SSRF-safe、bounded network reachability。 | 当前无安全 private cross-Check raw-URL handoff；需要命名 consumer、输入 acquisition和 hermetic transport evidence。Decision：[Check-owned network authorization](../docs/decisions/require-check-owned-network-authorization.md)。 |
| [add-secret-detection](add-secret-detection/) | invocation-memory high-confidence secret detection与 safe coverage。 | 需要 detector provenance/license、precision/recall corpus与全 surface leak-canary。Decision：[敏感材料临时化](../docs/decisions/keep-sensitive-quality-record-material-ephemeral.md)。 |
| [port-lizard-function-metrics-to-typescript](port-lizard-function-metrics-to-typescript/) | 保持 `functionMetrics` public contract，hard-cut private Lizard backend。 | 不是新 Check，收益偏内部；需先解决 public scanner options、fresh parity corpus和 provenance。Decision：[Lizard后置](../docs/decisions/defer-lizard-until-after-check-foundations.md)。 |

## 分组三：相邻 Draft 与公开发布

| Change | 唯一结果 | 与首版 Checks 的关系 |
| --- | --- | --- |
| [define-project-run-log-evidence-boundaries](define-project-run-log-evidence-boundaries/) | 保存 future durable receipt/event sink的 owner边界。 | 当前 per-Check transcript与 Product progress已足够；不阻塞 Checks或发布。 |
| [publish-public-api-only-npm-package](publish-public-api-only-npm-package/) | 在单独授权下完成 public registry release与 registry-install proof。 | 必须等待五项首版 Checks、public docs/declarations/dependencies、fresh exact candidate和 required/full Gate evidence；旧 candidate receipt会因 public inventory变化失效。 |

发布路径仍同时受 [在公开 package 前完成 Project Gate](../docs/decisions/complete-project-gate-before-public-package-release.md) 约束。完整 candidate/Gate/registry顺序见 [Vibe Check package 与 Project Gate 交付导航](vibe-check-package-and-gate-delivery.md)。

## 恢复与完成判读

- **首版 Check Plan：** 先完成 Readiness dependency/fixture审计，再按 JSON链与 Markdown链实施；maintenance reminders在 focused Git spike后可独立推进。每个 Change独立同步 public inventory、owner docs、Cases和 package evidence。
- **后置 Plan：** Resume Conditions未满足时不要进入 Implementation，也不要因 stage=plan误判为当前优先级。
- **Shared file-policy退出：** 该 Plan已按当前任务的明确授权归档；它不代表任何额外 resolver已经实现。
- **Publish Draft：** 五项 Check完成也不授权 registry query、credential access或 `npm publish`；每次外部操作仍需 fresh scoped authorization。
- **Decision alignment：** 五项 Check、稳定 owners、exact candidate和 required/full Gate全部成为 current facts后，才核对 `complete-first-release-check-set-before-publication.md` 的完整 alignment。
