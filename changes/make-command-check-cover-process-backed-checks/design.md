# Design

`commandCheck` 继续拥有单次进程生命周期，并以两个闭合扩展点承接调用方环境解析和命令完成后的领域结算。

## Context

- [command Check 指南](../../docs/guides/command-check.md)与 `src/package-checks/command-check/**` 当前拥有 no-shell spawn、closed environment、取消、超时、有界输出、transcript 和 `{ exitCode }` 终态。
- [ordinary Check lifecycle](../../docs/guides/extending-check-lifecycle.md)拥有 execution context、direct dependency readback、Records、messages、typed-provider parser 和 callback settlement。
- Gate process adapter 同时承载通用进程机械逻辑与调用方领域逻辑。`prepared-external-package-consumer` 需要 dependency-derived environment 和 typed stdout；`lint-product` 需要 owner-approved oxlint failure projection。
- [公共 command Check Decision](../../docs/decisions/provide-public-command-check.md)要求 Product 只解释通用进程生命周期，不自动发布 raw output 或猜测工具语义。新增的 [调用方完成阶段 Decision](../../docs/decisions/extend-command-check-with-caller-owned-completion.md)记录本 Change 的未来公共方向。

## Goals / Non-Goals

目标是让 Check-owned 的单次命令共享 Product 进程生命周期，同时由调用方形成领域结果和闭合环境。范围保持在一次 spawn 与一次完成回调；多步骤工具协议、通用 parser、自动脱敏、批量 Record 事务、handoff、Gate 聚合和整个 Gate adapter 迁移各自留在现有 owner。

## Decisions

### Intended Change

1. **环境解析。** `resolveEnvironment(context)` 与静态 `environment` 构成互斥输入。context 只包含 prepared command options、project、direct dependencies 和 signal；resolver 返回现有 `CommandCheckEnvironment`。两者都省略时保持 exact-empty。
2. **完成阶段。** `afterCommand` 是包含 `execute` 与可选 `parseData` 的对象。对象层级把同一完成阶段的 callback 与 typed-provider parser 绑定，并避免把 caller callback 与返回 Check 上 Product-owned 的 `execute` 混为一谈。配置 `parseData` 时，返回 Check 在顶层暴露该 parser；本 Change 不提供 handoff 变体。
3. **完成输入。** Product 在 transcript final write 成功后，只将无 cancellation、timeout、max-buffer、signal 或 startup failure 且具有 numeric exit 的结果交给 `afterCommand.execute`。numeric nonzero exit 同样属于完整结果，由调用方决定 `passed`、`failed` 或其它普通 Check 终态。
4. **默认兼容。** 省略 `afterCommand` 时继续使用现有 terminal classification 顺序和 `{ exitCode }` data。完整性判断是自定义完成阶段的独立准入，不改变默认模式对复合 process flags 的既有优先级。
5. **失败边界。** resolver 返回值在 spawn 前按现有 closed environment validator 完整 snapshot；非法返回或非取消异常结算为 `command-environment-resolution-failed`。Core 继续把任一阶段观察到的取消结算为 `execution-cancelled`。`afterCommand.execute` 的 throw、非法结果、messages 与 Records 使用 ordinary callback settlement。
6. **首轮消费者。** `prepared-external-package-consumer` 验证 resolver、typed stdout 和 provenance；`lint-product` 验证 numeric nonzero、完整投影后发布安全 Records，以及投影失败时的既有 generic failure。其它 Gate process Checks 保持原 adapter。

### Resulting Impacts

- `CommandCheckInput` 需要 default、ordinary-after-command 和 typed-after-command 三种可推断输入；返回类型分别保留固定 `{ exitCode }`、ordinary data 和 typed provider parser。实现时以 package-root fixture 作为公共声明验收。
- constructor snapshot 允许函数扩展点，但 declarative `ResolvedCommandCheckOptions`、fingerprint 和 machine facts 仍只保存闭合命令数据；函数 identity、解析出的环境值和 raw child material 不进入这些边界。
- `executeCommandCheck` 分离默认 terminal mapping、after-command eligibility、transcript finalization 和 caller settlement，确保 transcript failure 先于 caller callback。
- `output: discard` 仍不持久化 child material；配置 `afterCommand` 时，有界 stdout/stderr 只进入 trusted invocation-local callback。
- Gate consumer 迁移同步其 factory wiring 和行为测试，不移动 Gate transcript schema、oxlint projection validator 或 external-consumer provenance validator。
- 用户指南与 API projection 同步默认模式、自定义完成模式、resolver 互斥关系、安全边界和稳定 reason code。

## Risks / Trade-offs

- `afterCommand` 扩大 trusted callback 可见的 child material；通过显式 opt-in、既有 byte limit、无自动发布和调用方安全投影维持边界。
- resolver 是 invocation-time trusted code；统一的失败 reason 有意不暴露异常或环境值，具体业务诊断应由调用方在不含敏感值的 owner 语义中表达。
- 首轮只迁移两个互补 consumer，能验证公共抽象而不把 Gate 专属协议带入 Product；其余迁移需按各 consumer 的独立收益另行决定。

## Open Questions

无。实现可以调整私有 helper 和内部类型名称，但不得改变上述公共输入形状、失败边界、首轮 consumer 或成功标准。
