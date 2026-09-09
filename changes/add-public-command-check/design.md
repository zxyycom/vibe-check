# Design

本设计将通用 process lifecycle 放入 Product-owned ordinary Check constructor，并把尚未确定的公共语义集中在 Open Questions。

## Context

长期方向由 [`provide-public-command-check.md`](../../docs/decisions/provide-public-command-check.md) 承接。普通 Check 的 canonical data、execution、cancellation、artifact 与 settlement 边界由 [`api-mechanics.md`](../../docs/api-mechanics.md) 和 [`extending-check-lifecycle.md`](../../docs/guides/extending-check-lifecycle.md) 承接；[`human-output.md`](../../docs/development/human-output.md) 只允许 child output 进入 Check-owned artifact 或受控投影。

Product 内置 Check 已通过 `src/package-checks/host-environment/process/**` 复用 execa-backed mechanics；Project Gate 的 `scripts/project/gate/checks/process/**` 继续拥有 Gate transcript、safe failure 和结果投影。公共构造器复用前者的生命周期能力，不合并两者的持久化或工具语义。

## Goals / Non-Goals

### Goals

- 从 package root 提供类型精确且经过 runtime validation 的 `commandCheck(...)`。
- 统一 command execution、cancellation、timeout、bounded output 和 terminal mapping。
- 以普通 Check 四态与 canonical facts 运行，并用 installed consumer 证明公共 API。

### Boundaries

- Caller 拥有工具协议、结构化 output parser、Records 与 Gate policy。
- Product 保持程序化 API；CLI、`bin`、shell-string grammar 与 process-exit adapter 属于 caller surface。
- Raw process material 只有经过本 Draft 选定的安全策略后才能离开 execution owner。

## Decisions

### Intended Change

1. 从 `src/index.ts` 导出 `commandCheck` 及 consumer 需要命名的 public types。Constructor 接受 caller-owned `checkId`、`displayName`、独立 executable 和 dense arguments，并通过 ordinary Check preflight 实施 runtime validation。
2. 抽取 Product 现有 process mechanics 作为内置 Check 与公共构造器的共同 owner，同时保持 execa 和内部 runner 为 package-private implementation。
3. 为 exit `0`、nonzero exit、startup failure、signal、timeout、output overflow 和 caller cancellation 建立封闭分支。Open Questions 中的 result projection、output policy、environment 与 defaults 在进入 Plan 前固定。
4. 增加随包说明和可执行示例，并同步 package API mapping、README/navigation、JSDoc、changelog 与 installed-consumer acceptance。

### Resulting Impacts

- Package-root inventory、declarations、JSDoc projection、package material audit 和 external-consumer evidence 需要同步。
- 共同 process owner 必须保持既有 Git、jscpd 与 SCC Check 的 availability 和 failure classification。
- 验证需覆盖 hostile options、全部 process terminal branches、cancellation race、output limit 和敏感信息边界；transcript 方案还需覆盖 artifact capability 与写入失败。

## Risks / Trade-offs

- 固定为 exit-code mapping 容易使用，但可能不足以支持需要结构化 output 的 consumer；通用 projection callback 又可能形成第二套 Check authoring API。
- 诊断价值与敏感 output 隔离存在直接取舍，必须先确定一致策略再冻结 final-data 与 reason-code contract。

## Open Questions

| Topic | 进入 Plan 前需固定的选择 |
| --- | --- |
| Result projection | 仅提供固定 exit-to-Check mapping，或允许受信任的 bounded projection callback |
| Output policy | 丢弃 stdout/stderr、写入可选 Check transcript，或提供显式 closed policy；同时确定 transcript 失败的结算语义 |
| Environment | 使用 invocation-start ambient snapshot 加 caller overrides，或要求 exact explicit environment；同时固定 plain-text/color defaults |
| Public defaults | 固定 `cwd` resolution、timeout、output-byte limit、absolute-path policy，以及 final-data/parser/reason-code 词汇 |
