# Design

本 Design 将 caller-defined invocation context 作为 Package Run 的最小控制交互层，并把 tags、profiles、CLI、scheduler selection 与 presentation 留给项目 consumer。

## Context

当前 Product 在 callback 前验证 closed <code>RunControls</code>，并提供 <code>{ options, project, records, signal }</code>。其中 <code>options</code> 是 Definition-owned static Check configuration；<code>project</code> 当前没有 caller-defined invocation input。Repository Gate 需要按本次调用选择哪些本地 Check 应提前返回 <code>not-applicable</code>，但 Product 不应认识本仓 profile/tag grammar 或重规划 Task graph。

这条 input path 是完整 Project Gate 的前置能力，也可被任意其他 project-owned adapter 使用。它与 execution lifecycle feedback 有不同的行为、失败和演进风险，后者由独立 [add-project-run-lifecycle-feedback](../add-project-run-lifecycle-feedback/) Draft 处理。

## Goals / Non-Goals

### Goals

- 在 <code>RunControls</code> 与 callback project context 之间增加一次调用、immutable、project-defined input path，且不覆盖 Check <code>options</code>、dependencies、scanner configuration 或 scheduler policy。
- 让项目 Check 以自身 static eligibility 和 invocation context 决定 <code>not-applicable</code>，而不引入 selected-task API 或 dynamic Task graph。
- 明确 snapshot、validation、type declaration 与 cancellation/control ownership，并以最小真实 adapter 证明 input 传递和 local eligibility。

### Non-Goals

- 不定义 Product CLI 参数、profile 名称、tag vocabulary、disabled-tag propagation、repository command、exit mapping 或 CI policy。
- 不增加 caller-controlled global concurrency、per-Check runtime option override、task discovery、scheduler-level skip 或依赖自动传播。
- 不定义 observer、progress bar、logs、Check duration、wall-clock timestamp、Record reporting timing 或 canonical telemetry。
- 不替代 workspace verifier、完成 exact-tarball Project Gate acceptance，或公开发布 npm package。

## Decisions

### 1. Invocation 是 opaque shared context，不是 Check options

暂定在 closed <code>RunControls</code> 中新增明确命名的 <code>invocation</code> field，并把 immutable snapshot 暴露为 <code>context.project.invocation</code>。Product 只验证安全的 outer shape/ownership，不解释内部项目 keys；每个 project adapter 在进入 Run 前解析和限制自己的 data。Check <code>options</code> 继续是 Definition-owned static execution configuration，不能被 invocation 修改。

因此 repository Gate 可由 project Check closure 将自己的 static tags 与 <code>project.invocation</code> 比较，并在启动 process 前返回 <code>not-applicable</code>。标签的定义、是否可在 CI 使用、以及 skip 对 gate policy 的含义均不属于 Product。

### 2. 调用意图不改变调度事实

所有 executable Checks 仍在同一 static graph 中 admission。local <code>not-applicable</code> 采用现有结果语义；它不等于 scheduler 已把节点移除。既有 dependency 对 <code>not-applicable</code> 的解释不因这条 input path 改变，dependent Check 必须有自己的 eligibility rule，不能假定 skip 自动沿图传播。

### 3. Product 只拥有传递和冻结，项目拥有解释

Product 负责 validation、snapshot 和 callback exposure；adapter 负责 argv parsing、input schema/type guard、profile/tag interpretation、display、logs 与 exit decision。这使 future project 可以使用同一 Run contract 而不继承本仓门禁的策略。

## Risks / Trade-offs

- **opaque input 失控：** input 必须有明确 snapshot 边界，不能成为第二份隐式 Definition 或让函数、host handles 穿过 declarative/control contract。
- **错误通过：** <code>not-applicable</code> 是如实的 Check 事实，不自动保证 project gate 可以通过；Gate 必须展示并约束跳过。
- **过度抽象：** 若为 profile/tag 预先加入通用 selectors，会重新实现 scheduler selection；首轮只提供 context 传递。

## Open Questions

- 首个 public <code>invocation</code> value grammar 是受限 scalar/tree snapshot，还是允许更广的 structured project-code value；这影响 validation 与 declaration design。
- frozen snapshot 应在 validation 后怎样处理 <code>undefined</code>、cycles、prototype 与 binary-like values；需以当前 Product input conventions 收敛。
- 最小真实 adapter 的 acceptance 应只证明 tag disable，还是同时证明一个非-tag project intent；Plan 时按可复用性决定。
