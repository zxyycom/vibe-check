# Proposal

本 Change 扩展 `commandCheck`，让单次命令 Check 在复用 Product 进程生命周期的同时完成调用方拥有的领域结算。

## Why

当前 `commandCheck` 只按 numeric exit 生成 `{ exitCode }`。需要 typed final data、安全 Records 或依赖派生环境的调用方必须重新包装 spawn、取消、超时和有界输出；Project Gate 的 typed stdout provider 与结构化失败投影因此保留了重复的 process adapter。

这些调用方共享单次 no-shell 进程生命周期，但工具协议、环境值来源和持久化安全仍由各自 owner 决定。公共能力应复用前者，不吸收后者。

## Outcome

调用方可以在 spawn 前从当前 Check context 解析闭合 environment policy，并在命令完整结束后通过 `afterCommand.execute` 返回普通 `CheckResult`。`afterCommand.parseData` 可将该 Check 声明为 typed provider；省略两个扩展点时，`commandCheck` 保持现有输入、默认值和 `{ exitCode }` 终态。

## Scope

### Intended Change

- 为 `commandCheck` 增加与静态 `environment` 互斥的 `resolveEnvironment(context)`。
- 增加 `afterCommand: { execute, parseData? }`；Product 提供有界的 `{ exitCode, stdout, stderr }`，调用方返回领域 `CheckResult`。
- 仅在进程正常结束、输出完整且存在 numeric exit 时调用 `afterCommand.execute`；其它进程终态仍由 Product 结算。
- 迁移两个代表性 Gate consumer：dependency-backed typed stdout provider `prepared-external-package-consumer`，以及 owner-approved failure projection `lint-product`。

### Resulting Impacts

- command Check 的输入校验、公开类型、执行顺序、unavailable reason、测试和 package-root acceptance fixture 需要同步。
- typed `afterCommand.parseData` 必须投影为返回 Check 的普通 provider parser；本 Change 不增加 handoff 模式。
- Gate 保留自己的 transcript 与工具投影 owner，只让两个命名 consumer 改用公共进程生命周期。
- command Check 指南、package API 投影和相关 Decision 必须说明新能力及安全边界。

## Success Criteria

1. 现有未配置扩展点的 consumer 保持相同类型、默认环境、输出策略和终态分类。
2. `resolveEnvironment` 只能读取本次 options、project、direct dependencies 和 signal；非法返回或非取消异常稳定结算为 `command-environment-resolution-failed`，不启动进程、不回退 ambient environment、不发布环境值。
3. `afterCommand.execute` 仅收到完整 numeric-exit 结果；它可返回 typed final data、messages 和安全 Records，throw、非法结果与取消沿用 ordinary Check 结算。
4. package-root fixture 证明默认 `{ exitCode }`、ordinary `afterCommand`、typed `afterCommand.parseData`，并拒绝静态与动态 environment 同时配置。
5. 两个命名 Gate consumer 完成迁移，现有 Gate transcript、结构化 Records 和 provider provenance 行为保持通过。
6. 目标测试、类型检查、文档检查、Decision 检查和完整 Project Gate 通过。

## Affected Owners

- `src/package-checks/command-check/**` 与 `src/index.ts`
- `docs/guides/command-check.md` 与 package API projection
- `scripts/package/candidate/external-consumer/**`
- `scripts/project/gate/checks/**`、`scripts/project/gate/definition.ts` 与相邻测试
- `docs/decisions/extend-command-check-with-caller-owned-completion.md`
