# Design

让 Product 独占单命令生命周期，Gate 只组合命令 policy 与领域完成结果。

## Context

commandCheck 已支持 resolveEnvironment 与 afterCommand。Gate 的 lint-product 和 external-consumer provider 已采用；其余 22 个单命令 consumer 仍通过私有 adapter。ast-grep rule-test 是 version probe 加 rule-tests 的两步 workflow，不能视为单一 command。

## Goals / Non-Goals

- 目标：用真实 Gate 复用公共能力，删除被替代执行路径，保持领域验收与安全投影。
- 非目标：新增 pipeline/workflow API、替换 native Checks、修改 Run aggregation、发布包或调整调度策略。

## Decisions

### Intended Change

- Gate helper 仅将 invocation、selection 和 caller callback 组合为 commandCheck，不包裹 execute 或复制 spawn/transcript。
- dependency-backed lanes 声明 dependsOn，resolver 恢复 typed dependency、验证物理材料与环境键冲突；解析失败交给 Product 闭合结算。
- 完整 numeric exit 的领域结果在 afterCommand 中结算。lint/format 使用原 owner projector，解析拒绝时采用安全 generic failure。
- 移除无 consumer 的 process adapter；多步骤 transcript 和 native operation 仍由对应 Gate owner 维护。

### Resulting Impacts

- commandCheck 默认为 exact-empty，Gate 显式 inherit 与 plain-text overrides，避免丢失工具链环境。
- 原单命令 adapter 的 64 MiB 输出 budget 保留；新增 120 秒默认 timeout 是明确的 bounded policy 改变，不声称完全兼容原无界等待。
- 原有 package acceptance 与 lint-product 的 30 秒 policy 保持，external provider 的现有 budget 保持。
- Product 拥有单命令 process.log 和终态原因；Gate 不把 transcript 解析为结果。callback 只在 final write 成功后运行。
- 公开 API 不预先扩张。确有无法接入的问题时，先以最窄复现判断 Product 缺口还是 Gate policy。

## Risks / Trade-offs

- 超过 120 秒的原无界命令现在超时；完整 Gate 验证本仓库日常负载，不保证所有主机性能。
- 旧依赖失败码和 transcript 文本被 Product 契约替换；文档和测试必须证明新的边界而非保留无消费者兼容层。
- 大量测试改写可能丢失领域证据，使用 Case 语义审核及真实 child 测试覆盖。

## Open Questions

无阻塞性问题。接入发现的实际限制按证据处理，新增取舍同步本文。
