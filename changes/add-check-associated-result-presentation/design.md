# Design

本 Design 将 Check 的终态、已提交 Records 与可能的运行中反馈拆成不同场景，为首次公开 package 交付最小且完整的 structured result / 人读输出投影。

## Context

当前 owner 与长期约束如下：

- [`docs/quality-metrics.md`](../../docs/quality-metrics.md#check-and-record-facts) 规定 Core snapshot 的 entity collections 只有 `checks` 与 `records`；Record 绑定 owning `checkId`，但不决定 Check verdict。
- [`docs/output.md`](../../docs/output.md#readable-output-and-annotation) 规定 report/console 从 validated v3 model 投影 Record previews，Product progress 当前只输出 Check settled feedback 与 final summary。
- [`use-core-check-and-record-facts-from-run-resolution`](../../docs/decisions/use-core-check-and-record-facts-from-run-resolution.md) 排除第三类 Core entity 与平行 lifecycle view。
- [`provide-product-owned-check-progress`](../../docs/decisions/provide-product-owned-check-progress.md) 规定 progress stream 由 Product 独占，当前只消费 private prepared/started/settled/final feedback，不提供 Check-owned writer、公共 observer 或 custom renderer。
- [`publish-fingerprint-bound-check-record-machine-v3`](../../docs/decisions/publish-fingerprint-bound-check-record-machine-v3.md) 规定 machine v3 已将 canonical Checks 与 Records 作为独立事实投影，并排除外部 live/partial event protocol。
- [`define-project-run-log-evidence-boundaries`](../define-project-run-log-evidence-boundaries/) 已区分 Product lifecycle、project-owned process transcript 与未来 event sink；本 Change 不把任意 child stdout 当作结构化结果。
- [`ship-public-package-api-documentation`](../ship-public-package-api-documentation/) 只有在本 Change 的首版 public result/presentation contract 已实施并验证后，才能冻结对应 JSDoc、examples 与 package guide。

当前 `RunResult` 的 final snapshot 已提供 sibling `checks` 与 `records`。缺口主要在 result experience：progress settled feedback 不携带 Records，且启用 progress、关闭 publication logs/output 的 consumer 不会在共享 stream 看到非阻断 findings。

## Goals / Non-Goals

### Goals

- 区分 terminal structured auxiliary content 与 live/intermediate feedback 的消费者、时序和失败语义。
- 为首次公开 package 交付从现有 Check-owned Records 形成的有界、关联 owning Check 的输出层投影，而不是新增 Core fact。
- 确定是否需要一个简单的 Product-owned presentation option，以及它在 Definition/Run controls 中的 owner。
- 明确首版是否存在真实 live feedback 需求；若存在，必须同时定义 callback capability、排序、TTY/non-TTY、取消、stream ownership 和失败隔离。
- 保证 structured `RunResult`、machine artifacts、progress 与 publication 不产生互相矛盾的辅助内容事实源。
- 更新公共 surface/declaration evidence、稳定 Configuration/Output owner、isolated package consumer 与语义测试证据，使 package documentation Change 可以消费已实现事实并补齐对应 JSDoc/guide。

### Non-Goals

- 不把 Record 提升为可调度 Check，也不创建第三类 Core entity。
- 不从 Record presence 推断 Check verdict、availability 或 Gate status。
- 不把任意 stdout/stderr、logger call 或 child process line 自动转换为可信 Record/auxiliary result。
- 不在没有 named consumer 时公开 lifecycle observer、custom renderer 或无限制 callback writer。
- 不在本 Change 解决 Record authoring 的 compile-time typing；该问题由 [`complete-typed-record-authoring`](../complete-typed-record-authoring/) 承接。

## Decisions

以下是 Draft 的场景分层与首版最低交付，不是已批准的 API；Open Questions 未关闭前不得派生 Plan tasks。

### 1. Check outcome、terminal Records 与 live feedback 不是一个 union

Check outcome 是唯一 terminal work conclusion；Record 是 durable structured finding；live feedback 是执行过程中可能发生、可能重复且不能代表 terminal fact 的 presentation signal。三者生命周期不同，不能通过给 `CheckResult` 增加一个含混的 `output` 字段合并。

### 2. 首版 terminal auxiliary content 复用 Records

首次公开 package 必须覆盖“成功 Check 产生了需要用户看到的非阻断内容”。现有 QualityRecord 已具有稳定 message、level、identity、owner 和 fields，且已进入 final `RunResult.snapshot.records`。首版使用 Product-owned output/progress projection，按 `checkId` 将有界 Record preview 与 settled Check 关联，而不是复制一份 auxiliary result collection。

这种关联只改变 presentation：Core、policy 和 machine Record 仍使用原 facts。renderer 可以在 settled row 后或 final summary 区域呈现 Record count/preview，但具体位置、顺序与限制必须由同一 output contract 固定。

### 3. Presentation option 应表达模式而不只是开关

简单 boolean 不能说明是只显示数量、显示有界 preview，还是显示哪些 levels。领先候选是在 progress effect 的配置中加入一个 closed presentation mode，例如 `none`、`summary` 或 `preview`，并为 preview 使用稳定上限；确切字段名和是否允许 Run Controls override 仍待 consumer probe。

默认值必须保持当前 concise progress，避免启用一个 Check 后意外向 TTY/CI 输出大量或敏感 Records。presentation failure 继续只影响 effect status，不改写 Check/Record facts。

### 4. Intermediate output 只有首版确有需要时才增加独立 capability

Terminal Record presentation 是首版硬范围。如果首版消费者还必须在 Check 完成前看到辅助内容，Record final projection或扩展 `CheckResult` 都无法满足真实时序；本 Change 必须再演进 `CheckExecutionContext`，提供 Product-owned、Check-associated feedback capability，并同步修订 [`provide-product-owned-check-progress`](../../docs/decisions/provide-product-owned-check-progress.md) 对 stream ownership 和 public callback 的现有判断。

该 capability 至少需要定义 payload、Check association、per-Check ordering、并行交错、TTY重绘、non-TTY append-only 行为、取消后的关闭、writer failure isolation、是否进入 final `RunResult` 以及是否持久化。没有这些契约时，不采用 callback writer 或 stdout tee。

### 5. Process output 先经过所属 Check 的显式协议

Project Gate child command 的 stdout/stderr 继续只属于 transcript。若某个 process Check 需要生成 auxiliary Records或 live feedback，所属 Check 必须通过明确 parser/schema 将 child result 转换成 Product Record/feedback candidate；Gate 或 renderer 不按文本行猜测结构。

## Risks / Trade-offs

- **重复呈现：** 同一 Record 可能同时出现在 progress、publication console 和 report；必须区分即时 preview 与最终详细投影，避免无上限重复。
- **敏感内容：** Record message 虽属于 public fact，仍可能不适合默认在共享 CI stream 展示；默认关闭、level filter 与 preview 上限需要安全审阅。
- **并行顺序：** Record acceptance 发生在 Check callback 内，而 settled progress 按完成顺序输出；关联投影必须说明按 Record canonical order还是 submission/settlement order。
- **policy 时序：** Check settle 时最终 policy acceptance 尚未完成；即时 preview 不能提前声称 Record 已 accepted/unaccepted。
- **API 扩张：** live feedback 会增加公共 context capability，并与当前 progress Decision 发生真实演进；不能作为一个简单输出选项顺带加入。
- **结果漂移：** 如果 auxiliary content 同时作为独立 result array 和 Record 保存，会形成第二事实源；本 Draft 默认不采用。

## Open Questions

1. 首次公开 package 除了必须交付的 terminal Record presentation，是否还必须交付 Check 运行期间的 live/intermediate content？只有命名 consumer 与可观察的完成前需求才能扩大首版范围。
2. Terminal Record projection 应属于 progress effect、publication logs effect，还是两者共享的一个内部 readable projection？选择必须避免重复渲染和不同状态解释。
3. Public presentation grammar 应使用 `none | summary | preview` 这类 mode，还是一个包含 level filter 与 preview limit 的 closed object；默认值、controls override 和安全上限需要真实 Gate/consumer output probe。
