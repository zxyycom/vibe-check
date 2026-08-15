# 架构

本文是 Vibe Check Product runtime 的组件职责与调用边界 owner。支持的调用方向是：

```text
其他调用方 → 项目 Run → Package Run
                         ├→ Definition validation + normalization
                         ├→ 一次 Run resolution → static Task graph
                         └→ Core snapshot → policy / effects / result
```

本文中的 **Package Run** 是架构角色：当前由 `src/product/run/index.ts` 的
`run(Project Definition, Run Controls)` Product operation 实现。它不表示仓库目前已经提供可安装的
npm package；root manifest 仍是 private workspace，installable projection 由下游
`establish-api-only-npm-product-boundary` Change 交付。

项目 Run 已绑定一个项目拥有的 TypeScript Project Definition；其他调用方只提供该项目允许的
Run Controls。Product source 拥有 definition/run operations 和 runtime behavior；下游 package 只能
投影这些 operations，不能重新定义它们。Product 不拥有项目 module 路径，也不发现或重新加载配置文件。

## 核心定位

Package Run 在任何 project function、dependency preparation、cache、scanner、reporter 或 output work
之前验证完整 Project Definition 与 closed Run Controls。验证成功后，Definition normalization 确定性地产生
声明式 `NormalizedCheck[]`，并把 custom applicability、direct runner 与 TaskPlan factory 等 trusted function
slots 留在私有 handoff 中。函数、runtime binding、Task identity、Core capability 与 scheduler state 不进入该
声明式投影、其 fingerprint 或 machine output。

Package Run pre-work 只进行一次从 Normalized Check 到 Resolved Check 的 join：它准备 selected built-in 的
private execution binding 与 operational input，调用 custom applicability，并为 applicable TaskPlan 准备静态
plan。此后 planning、Core registration 与 policy surface 都只消费该 invocation-scoped collection；不会再按
`checkId` 重组平行 definition、selection、cap 或 binding source。

一个通用静态 Task engine 是唯一的 graph validation、dependency、mutex、root admission、cancellation 与 Task
settlement owner。Product Check adapter 和 repository scripts adapter 分别把本地 authoring 投影到它的 graph-only
contract；engine 不解释 Check verdict、Record payload、scanner 或 script command field。

## 调用链

1. 项目配置 module 调用 `defineConfig` 并 default-export plain Project Definition value。
2. 项目 Run 普通 import 该 value，调用 Package Run，并决定向其他调用方暴露哪些 controls。
3. Package Run 验证 definition/controls，并将 Check tree flatten 为排序的 `NormalizedCheck[]` 与私有 trusted
   function slots。absent leaf 不形成本次事实；tree group 只提供 authoring inheritance。
4. Package Run pre-work 一次性形成 canonical Resolved Checks。not-applicable Check 不建立 executable scope；
   applicable direct Check 或静态 TaskPlan 进入同一 graph。
5. Product adapter 为每个 applicable Check 投影一个 graph scope，并由 Task engine 执行、settle 全部 Task。
6. Core session 关闭每个 Check 并冻结 `{ checks, records }`；policy、publication/effects 与 structured Run Result
   只消费该闭合事实及相应 reference/decision evidence。

## 组件职责

### Package Run

- 要求每次 invocation 恰好一个 Project Definition；缺失或无效输入返回 typed configuration result，且不执行
  project function。
- Run Controls 只拥有 project root、changed files、一个 explicit comparison、cooperative cancellation、effect
  override 和 operational dependency override；不能注册 Check、选择另一份 definition、改写 policy 或替换 engine。
- 承接两阶段 resolution 的边界：normalization 不构造 runtime binding，pre-work 不留下第二个可重组的 Check
  collection。
- 只允许 Project Definition 中已经验证的 `selectedPolicy`；neutral observation 使用 `null`。预工作取消在尚未
  形成 Resolved Check 时返回，不伪造空 Core facts。

### Check/Task system

- Project Definition 直接组合普通 `BuiltInCheck` 数据和 custom leaves。leaf presence 表示选择；tree array order
  不表达执行顺序。group/leaf 的 `dependsOn` 与 `mutex` 向下追加、去重；前者表达 Check prerequisite，后者表达
  named resource。
- 三个 Product-provided built-in values 与 `replace` / `append` 返回值使用同一组闭合公开字段和 `checkId`
  对应的 canonical metadata/options。declarative normalization 只验证并保留这些公开数据；Package Run pre-work
  再按已选 `checkId` 构造 private binding。该 binding 不进入 fingerprints、Core、Task graph 或 output。
- 一个 applicable direct Check 映射为一个 executable root/terminal Task；一个 applicable TaskPlan Check 映射为
  child Tasks 和一个 trusted completion Task。普通 child Task 永远不是 public Check entity。
- Product adapter 将 layout 的 `scopeId`、effective cap、activation candidates 和 terminal relation 投影到 graph。
  通用 engine 只使用这些无产品语义的 scope 属性来执行 root budget、minimum active cap、deterministic
  reservation/drain、non-preemption 与 constrained continuation priority；它不需要也不接收 `kind: "check"` 字段。
- `not-applicable`、`completed(passed)` 与 `completed(failed)` 可满足 Check prerequisite；`unavailable` 会阻断
  dependent user work，而 unrelated scope 仍可运行。Task settlement 是唯一 execution accounting；临时 progress 如需
  存在，只能从 Task events 派生。

### Core Check and Record facts

- 每个 canonical Resolved Check 在 Core session 中注册一次，且在成功冻结的 snapshot 中恰有一个 Core Check。
  Core Check 结合 stable definition projection 与一个终态：`not-applicable`、`completed(passed|failed)` 或
  `unavailable(diagnostic)`。
- not-applicable 由 trusted non-execution path 直接关闭。applicable scope 获得绑定所属 `checkId` 和 allowed
  record types 的 `RecordSink`；project code 只能交付 candidate，不能提供 Check ownership 或 settlement capability。
- 只有 Product adapter 的 trusted terminal path 能单次关闭 applicable Check。scope-external、duplicate、invalid
  或 late mutation fail closed；已接受的独立 QualityRecord 在后续 ordinary failure、blocking 或 cancellation 后仍
  保留。
- Core snapshot 的实体集合恰好是 `checks` 与 `records`。Task、scope、capability、function slot、scheduler
  bookkeeping 和 derived lifecycle view 都不进入该事实边界。

### Terminal and cancellation contract

- direct return 与 TaskPlan completion 只可形成 completed verdict；throw、invalid result、dependency、record 或
  protocol problem映射为 owning Check 的 safe unavailable diagnostic。受信 Task/Core invariant escape 是 Package
  Run execution failure，而不是伪造为普通 Check outcome。
- `AbortSignal` 在 Task admission 边界生效：已观察 abort 后不再 admit 新 Task，已 admitted work 获得同一 signal
  并协作式 drain。engine 不抢占或强杀同一 Bun runtime 的 non-cooperative project code。
- 在 execution-phase cancellation 中，已闭合 Check 与已接受 Record 保持；drain 后仍未关闭的 applicable Check
  由 trusted finalizer 关闭为 `unavailable(cancelled)`，随后才返回带冻结 snapshot 的 cancelled result。

### Scanner adapters

Adapter 只消费 Product 批准的 exact inputs 和自己的 dependency slice。它隔离 availability、subprocess、parser、
private payload、cache/backend identity 和 raw material；越界 source batch 在 record conversion 前整体拒绝。单个
adapter 可以使用 subprocess 或内部并行，但不能改变 Product Task graph、shared engine，或 Check-scoped cap 所管理的
Product Task slots。

### Output, effects, and downstream handoff

Output 从 validated Core snapshot、reference facts 与 decision 构造一个 publication model。machine v3 的 canonical
two-file set 只投影 Checks、Record rows 与解释 invocation/reference/acceptance/decision 所需的 metadata；report、console
和 annotation 不重新计算 Core 或 policy facts。精确 DTO、artifact lifecycle 与 byte grammar 由 [Output](output.md)
拥有。

当前 public-contract inventory 只列出 definition/run authoring 与 result-facing names；它不导出 Task engine、Core
capability、function slot 或 private binding。`establish-api-only-npm-product-boundary` 只能在本 Change 完成后读取这份
最终 contract，重新审阅自身对 result 与 Core projection 的假设并 re-plan；本 Change 不修改其 artifacts。

## Runtime 边界

- Project functions、imports 和 closures 在调用 Package Run 的同一 Bun runtime 中执行；Product 不通过 source
  serialization、module reload、IPC 或 whole-invocation worker 重建它们。
- Project functions 是 trusted project code。Product 不承诺隔离 `process.exit`、同步无限循环、global mutation 或
  non-cooperative work；cancellation 只在 Product 拥有的 admission 边界被观察。
- Product runtime 不 import `scripts/**`、docs、fixtures 或 toolkit gitlink。Repository dogfood 由
  `scripts/quality/project-run.ts` 单向调用 Product；workspace scripts 通过自己的 adapter 复用 Task engine，
  不获得 Product Check/Core semantics。
- Project module paths 只是各项目 convention，不属于 current public contract 或 discovery protocol。
