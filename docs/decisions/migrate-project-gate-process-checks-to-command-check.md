---
title: 让 Project Gate 单命令复用 commandCheck
id: 260922-migrate-project-gate-process-checks-to-command-check
status: active
alignment: aligned
createdAt: 2026-09-22T05:50:58Z
purpose: 统一 Gate 单命令的 Product 进程生命周期与证据边界。
background: Gate 私有 adapter 与 Product commandCheck 重复维护单命令执行。
decision: 单命令使用 Product commandCheck，Gate 保留领域结算；多步骤 workflow 保留专有实现。
tags:
  - configuration
  - repository-automation
  - workflow-policy
relations: []
---

## 目的
- 让 Project Gate 的每个单一、无 shell 外部命令复用 Product `commandCheck` 的进程、取消、超时、输出限制和 `process.log` 生命周期。
- 让 Gate 只维护选择、依赖、环境派生和工具领域结算，避免两个 process adapter 继续产生不同的安全与诊断边界。
- 保留多步骤工具协议的专有 workflow，不把 `commandCheck` 扩展为 pipeline 或 workflow API。

## 背景
- Gate 的 typecheck、lint、format、test lane 与 git whitespace Checks 都是单一命令，但旧的 private process adapter 重复维护 spawn、transcript、终态映射和失败降级。
- Product `commandCheck` 已拥有 no-shell process 生命周期、协作取消、bounded output、transcript 与调用方完成阶段；Gate 已用它承接 lint-product 与 prepared-external-package-consumer。
- Gate 的 `test-evidence-rule-tests` 在一个 Check 内运行 ast-grep version 与 rule-tests 两个步骤，并产生版本不匹配领域 Record；它不满足单一命令边界。

## 决策
- 采用：所有单一、无 shell 外部命令使用 Product `commandCheck`；Gate 的 helper 只把 `ProcessInvocation` 和 ordinary Check 元数据映射为构造器输入，不再复制执行、transcript 或终态生命周期。无消费者的通用 private process adapter 退役；多步骤 ast-grep workflow 保留其局部实现。
- 采用：Gate 继续拥有 selection、required/preset/mutex/resource metadata、`dependsOn` 闭合、依赖数据到 environment 的派生，以及 lint/format 等工具协议的 safe failure projector。完整 numeric exit 后由 `afterCommand` 完成领域结算；Product 写完最终 transcript 后才调用该阶段。
- 采用：迁移的 Gate command 明确使用继承环境并叠加 Product plain-text/no-color variables；旧单命令的默认输出上限保持 `64 MiB`。原本未设 timeout 的 Gate 单命令采用 `120_000 ms` 默认上限；已有 package acceptance 与 `lint-product` 的 `30_000 ms` 保持不变。这是新增 bounded policy，不宣称完全兼容旧的无界执行时间。
- 采用：命令启动、取消、超时、输出上限、signal、transcript 和环境解析统一使用 Product `commandCheck` reason codes；Gate 只为领域结算和 safe Records 发布自己的失败事实，不再维护同义 process reason code。
- 采用：`test-evidence-rule-tests` 继续使用自己的双步骤 transcript、版本检查和领域失败 Record；不得为迁移它而引入 shell、pipeline、workflow 或第二个 Product process abstraction。
- 采用：迁移后的 Check transcript 采用 Product `checks/<encoded-check-id>/process.log` 格式；Gate `gate.log`、`progress.log`、machine publication 与最终 exit 仍由各自 owner 维护，任何层都不解析另一层日志重建结果。
