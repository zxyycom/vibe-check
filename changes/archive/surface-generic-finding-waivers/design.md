# Design

本设计以共享 waiver envelope 加 Check-owned identity/settlement 的分层，让三个指标型 Check（`fileMetrics`、`functionMetrics` 与 `duplicateDetection`，下称 metric trio）复用通用审计而不抹平稳定领域差异。

## Context

- aligned Decision `provide-generic-finding-waiver-reconciliation.md` 明确 helper 同时面向 custom 与 Product-provided Checks，并只拥有 identity matching、disposition 和 audit。
- `src/index.ts` 已公开 `reconcileFindingWaivers`；`docs/api-mechanics.md` 已拥有 canonical identity 和 `unused | applied | overmatched` 完整语义。
- `fileMetrics` 已证明一种内置接入：constructor 接受 closed `findingWaivers`，完整 metric candidates 形成后对账，applied Finding Record 保留 reason，unused/overmatched 形成 audit evidence。
- `functionMetrics` 与 `duplicateDetection` 都先形成完整、排序、Check-owned metric Record candidates，再统一执行 Finding settlement；它们与 `fileMetrics` 共享接入生命周期，但 identity 字段不同。
- `markdownLinkValidation` 同时拥有 occurrence target identity、input rejection 和可能在 traversal failure 前形成的边界；本 Change 没有足够共同义务把它并入 metric trio。

## Goals / Non-Goals

**Goals**

- 让 metric trio 使用相同的 waiver reconciliation 与审计生命周期。
- 让每项 Check 的 authoring 类型直接表达可 canonicalize、可精确匹配的 identity。
- 保留所有 Finding 和 stale/overbroad waiver evidence，不让 waiver 改变 scanner input 或失败边界。
- 让主要 package 文档清楚区分通用 helper 与原生 Check option 覆盖。

**Non-Goals**

- 不为 Markdown、JSON、maintenance 或 rejected-input Finding 增加原生 waiver option。
- 不建立全局 waiver registry、Core finding owner、glob suppression 或扫描前排除机制。
- 不把三种 identity 合成 optional-field union，也不改变 metric thresholds、Record ID 或 scanner/cache protocol。
- 不把 Change lifecycle 归档视为产品实现；归档只在实施与验证完成且获得显式授权后执行。

## Decisions

### Intended Change

1. 在 `code-quality-findings` owner 下增加 package-private waiver authoring 与 evidence publication 边界。共享职责包括 exact `{ identity, reason }` envelope、非空 reason、canonical identity uniqueness、detached frozen list，以及三项 metric Check 相同的 applied Finding Record materialization 与 audit publication loop；调用方注入 identity parser 与 audit builder，避免共享层认识 metric、path、function 或 location。
2. `functionMetrics` identity 固定为 `{ metric, path, functionName, startLine }`。metric 是三种公开 metric literal；path 必须是 normalized project-relative path；functionName 非空；startLine 是正安全整数。line shift 会使旧 waiver 成为 unused，而不是隐式匹配另一个 function。
3. `duplicateDetection` identity 固定为 `{ metric: "duplicate-tokens", locations }`。locations 至少两个，使用 normalized project-relative path、正安全整数 line range，并要求与 Record 一致的严格排序；这样 location change 使 waiver stale，且不会把同一 file pair 中多个 fragment 压成过宽 identity。
4. 两项 Check 都只 reconcile normal metric candidates。Applied candidate 的原 Record data 增加 `{ waiver: { reason }, blocking: false }`；unused/overmatched 形成独立 audit Record，applied/unused/overmatched 形成独立 info/warning message。normal finding presentation 只接收未 waived candidates。
5. no eligible input 仍按既有 Check outcome 结算，但配置的 waiver 全部作为 unused 审计；measurement/source/cache/unavailable 发生在完整 candidates 形成前时不伪造 reconciliation。
6. README 承接主要发现入口与简明能力矩阵；Configuration 和各 Check guide 承接完整 native option/identity，API mechanics 继续承接 generic helper grammar。

### Resulting Impacts

- Public type inventory 增加两项 Check 的 identity/waiver 类型；resolved option validators 必须接受且只接受完整 `findingWaivers` field。
- Function Record union 增加 waiver audit variant；Duplicate Record data 变为 normal finding 与 audit 的 closed union。consumer 通过 `kind: "finding-waiver-audit"` 区分 audit，其它 branch 保持现有 metric fields。
- Applied Finding 仍计入 `findingCount`，但 `blockingFindingCount` 和 actionable presentation 基于 reconciliation disposition；overmatched candidate 保持 actionable。
- Audit Record ID 使用 Check-owned reserved prefix 与 canonical identity digest，避免与 normal Finding ID domain 冲突；identity 与 reason 保存在 Record data，digest 不替代公开审计事实。
- Existing `fileMetrics` authoring parser 保持现有 hostile/duplicate fail-closed 行为；其已验证的 applied/audit evidence publication 改由 metric trio 的共享边界承接，Record identity 与 messages 不变。
- 测试正文和新增实体必须同步当前 Case 账本；package declarations、docs projection 和 installed consumer acceptance 必须看到新增类型和 options。

## Risks / Trade-offs

- Function `startLine` 与 duplicate ranges 对源码移动敏感；选择 stale/unused 审计优先于可能误豁免另一个 Finding。
- 新的 Record union 会要求 exhaustive consumer 处理 audit branch；这是暴露真实 runtime evidence 的必要 public impact，文档与类型必须同步。
- 共享 authoring/evidence boundary 若吸收 identity、audit data 或 presentation 规则会形成错误公约数，因此只共享 envelope、canonical uniqueness 和三项 metric Check 已一致的 publication lifecycle。
- 三项 Check 的 messages/Record builders 存在少量同构代码；它们仍由不同 identity 和 presentation 变化原因驱动，本 Change 不建立通用 renderer。

## Open Questions

无。Markdown 等其它 producer 是否原生接入，应在其完整 identity、partial-result 与 rejected-input policy 明确后单独推进。
