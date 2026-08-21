# Design

本Design将Check terminal final data、supplemental Records与可能的运行中feedback拆成不同场景，为首次公开package交付最小且完整的人读projection。Presentation是主要设计；minimal contract带来的source变化是上游影响，不改变presentation owner。

## Context

当前 owner 与长期约束如下：

- [`docs/quality-metrics.md`](../../docs/quality-metrics.md#check-and-record-facts) 规定 Core snapshot 的 entity collections 只有 `checks` 与 `records`；Record 绑定 owning `checkId`，但不决定 Check verdict。
- [`docs/output.md`](../../docs/output.md#readable-output-and-annotation) 规定 report/console 从 validated v3 model 投影 Record previews，Product progress 当前只输出 Check settled feedback 与 final summary。
- [`use-core-check-and-record-facts-from-run-resolution`](../../docs/decisions/use-core-check-and-record-facts-from-run-resolution.md) 排除第三类 Core entity 与平行 lifecycle view。
- [`provide-product-owned-check-progress`](../../docs/decisions/provide-product-owned-check-progress.md) 规定 progress stream 由 Product 独占，当前只消费 private prepared/started/settled/final feedback，不提供 Check-owned writer、公共 observer 或 custom renderer。
- [`publish-fingerprint-bound-check-record-machine-v3`](../../docs/decisions/publish-fingerprint-bound-check-record-machine-v3.md) 规定 machine v3 已将 canonical Checks 与 Records 作为独立事实投影，并排除外部 live/partial event protocol。
- [`define-project-run-log-evidence-boundaries`](../define-project-run-log-evidence-boundaries/) 已区分 Product lifecycle、project-owned process transcript 与未来 event sink；本 Change 不把任意 child stdout 当作结构化结果。
- [`establish-minimal-check-record-contract`](../establish-minimal-check-record-contract/)将future CheckResult收敛为四态terminal result，passed/failed携带single final data，并将Core Record收敛为`{ checkId, id, data }`supplemental fact。两类data的domain shape、location、severity、message与presentation semantics都不属于Product-wide base contract。
- [`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/) 是显式 visibility 的一个未来 consumer，不是本 Change 的前置。本 Change 只拥有 Check visibility metadata 与 human direct-display policy；无论 typed dependency 是否实施，facts/events 始终产生。
- [`ship-public-package-api-documentation`](../ship-public-package-api-documentation/) 只有在本 Change 的首版 public result/presentation contract 已实施并验证后，才能冻结对应 JSDoc、examples 与 package guide。

目标`RunResult`的final snapshot提供Checks及其terminal final data与sibling Records。缺口主要在result experience：progress settled feedback没有显式domain projection，且启用progress、关闭publication logs/output的consumer不会在共享stream看到producing Check希望展示的结构化内容。Final data和Record data都不能证明自身是finding或可由generic renderer安全解释。

## Goals / Non-Goals

### Goals

- 区分 terminal structured auxiliary content 与 live/intermediate feedback 的消费者、时序和失败语义。
- 为首次公开package交付有界、关联owning Check的显式projection，而不是从arbitrary final/Record data猜测message/location或新增Core fact。
- 固定显式 Check presentation metadata、默认直接显示行为与 problem-only 可见性；字段只影响 human presentation。
- 确定是否需要一个简单的 Product-owned presentation option，以及它在 Definition/Run controls 中的 owner。
- 明确首版是否存在真实 live feedback 需求；若存在，必须同时定义 callback capability、排序、TTY/non-TTY、取消、stream ownership 和失败隔离。
- 保证 structured `RunResult`、machine artifacts、progress 与 publication 不产生互相矛盾的辅助内容事实源。
- 更新公共 surface/declaration evidence、稳定 Configuration/Output owner、isolated package consumer 与语义测试证据，使 package documentation Change 可以消费已实现事实并补齐对应 JSDoc/guide。

### Non-Goals

- 不把 Record 提升为可调度 Check，也不创建第三类 Core entity。
- 不从 Record presence 推断 Check verdict、availability 或 Gate status。
- 不隐藏、删除或省略 supporting Check 的 structured RunResult、Core 或 machine facts。
- 不把任意 stdout/stderr、logger call 或 child process line 自动转换为可信 Record/auxiliary result。
- 不在没有 named consumer 时公开 lifecycle observer、custom renderer 或无限制 callback writer。
- 不在本Change定义CheckResult、Record reporter、canonical JSON boundary、Check-local identity或machine schema；这些由[`establish-minimal-check-record-contract`](../establish-minimal-check-record-contract/)统一承接。
- 不把 `level`、`message`、`location`、`kind` 或其它 presentation 字段恢复为所有 custom Records 必须提供的 Core 字段。

## Decisions

以下是 Draft 的场景分层与首版最低交付，不是已批准的 API；Open Questions 未关闭前不得派生 Plan tasks。

### 1. Terminal final data、supplemental Records与live feedback不是一个union

Check terminal result是唯一work conclusion；passed/failed final data是single primary structured result；Record是零到多个durable supplemental facts；live feedback是在执行中可能重复且不能代表terminal fact的presentation signal。三者义务与时序不同，不能通过再增加一个含混`output`或presentation payload合并。

### 2. 首版terminal content必须有显式projection

首次公开package必须覆盖“成功Check产生了需要用户看到的结构化内容”，但arbitrary final/Record data不能自动充当presentation contract。Producing Check必须显式声明一个受限projection；projection可以读取自己的final data，并在真实场景需要时读取自己的supplemental Records。Check-owned parser可以帮助projection恢复domain type，但parser本身不决定展示内容，也不注册到Product。Presentation保持derived content，不是第三类Core fact，也不要求所有data具有finding字段。

没有显式projection时，renderer不能遍历custom data、猜测message/location或泄露敏感值。是否只显示owning Check/status以及是否显示Record count/IDs，由本Draft在consumer probe后固定；这类generic metadata不能假装成domain result。选定projection可以在settled row后或final summary区域产生有界preview，但payload grammar、顺序与限制必须由本Change的output contract固定。

### 3. Presentation option 应表达模式而不只是开关

简单 boolean 不能说明是只显示数量还是显示显式 projection 的有界 preview。领先候选是在 progress effect 的配置中加入一个 closed presentation mode，例如 `none`、`summary` 或 `preview`，并为 preview 使用稳定上限；确切字段名和是否允许 Run Controls override 仍待 consumer probe。`level` filter 只有被选中的 presentation payload 自己定义相同语义时才可进入，不能从 Record data 假定。

默认值必须保持当前 concise progress，避免启用一个 Check 后意外向 TTY/CI 输出大量或敏感 Records。presentation failure 继续只影响 effect status，不改写 Check/Record facts。

### 4. Intermediate output 只有首版确有需要时才增加独立 capability

Terminal final-data/Record presentation是首版硬范围。如果首版consumer还必须在Check完成前看到辅助内容，terminal projection无法满足真实时序；本Change必须再演进`CheckExecutionContext`，提供Product-owned、Check-associated feedback capability，并同步修订[`provide-product-owned-check-progress`](../../docs/decisions/provide-product-owned-check-progress.md)对stream ownership和public callback的现有判断。

该 capability 至少需要定义 payload、Check association、per-Check ordering、并行交错、TTY重绘、non-TTY append-only 行为、取消后的关闭、writer failure isolation、是否进入 final `RunResult` 以及是否持久化。没有这些契约时，不采用 callback writer 或 stdout tee。

### 5. Process output 先经过所属 Check 的显式协议

Project Gate child command 的 stdout/stderr 继续只属于 transcript。若某个 process Check 需要生成 custom Records、terminal presentation 或 live feedback，所属 Check 必须通过明确 parser/contract 将 child result 转换成对应 candidate；Gate 或 renderer 不按文本行猜测结构，也不把 Record data 自动当作 presentation。

### 6. Check 显式声明人读可见策略

Supporting Check 是普通 Check：它拥有 identity、outcome、duration、Records 与 dependency edges。Renderer 读取 Check 显式声明的 presentation metadata。领先候选是：

```ts
presentation: {
  visibility: "always" | "problems-only"
}
```

默认 `always` 保持普通 Check 直接可见。`problems-only` 只让 human renderer 在 passed 时不直接显示；failed、unavailable 或显式展开仍显示。字段随 normalized Check metadata 提供给 renderer；若 renderer 只消费 Core Check projection，则该 metadata 可以进入对应 Check row。它不是事件开关：prepared/started/settled、structured `RunResult`、Core、machine 与 Records 仍正常产生。

Exact field name 和 normalized/Core 投影位置由 prototype 固定。

## Risks / Trade-offs

- **重复呈现：** 同一 Record 可能同时出现在 progress、publication console 和 report；必须区分即时 preview 与最终详细投影，避免无上限重复。
- **敏感内容：** Custom Record data 可能合法持久化但不适合在共享 CI stream 展示；必须默认不遍历 data，并对显式 presentation payload、默认模式与 preview 上限做安全审阅。
- **并行顺序：** Record acceptance 发生在 Check callback 内，而 settled progress 按完成顺序输出；关联投影必须说明按 Record canonical order还是 submission/settlement order。
- **结论时序：** Terminal presentation 不能早于 owning Check settlement，也不能把 preview presence 解释为 passed/failed 或其它 domain conclusion。
- **API 扩张：** live feedback 会增加公共 context capability，并与当前 progress Decision 发生真实演进；不能作为一个简单输出选项顺带加入。
- **结果漂移：** 如果 auxiliary content 同时作为独立 result array 和 Record 保存，会形成第二事实源；本 Draft 默认不采用。
- **过度隐藏：** `problems-only` 只影响 human direct display；所有事件与结构化事实照常产生，problem 状态强制可见。

## Open Questions

1. Terminal projection的authoring surface如何同时允许Check读取自己的final data，并在需要时读取supplemental Records，而不形成第二facts source或强制所有Records具有presentation字段？
2. Terminal presentation 应属于 progress effect、publication logs effect，还是两者共享的一个内部 readable projection？选择必须避免重复渲染和不同状态解释。
3. 首次公开 package 除了必须交付的 terminal presentation，是否还必须交付 Check 运行期间的 live/intermediate content？只有命名 consumer 与可观察的完成前需求才能扩大首版范围。
4. Public presentation grammar 应使用 `none | summary | preview` 这类 mode，还是一个包含 preview limit 的 closed object；默认值、controls override 和安全上限需要真实 Gate/consumer output probe。
5. `presentation.visibility` 的最终字段名与 normalized/Core metadata 位置是什么，才能让 TTY/plain renderer 都消费同一显式策略而不抑制 lifecycle events？
