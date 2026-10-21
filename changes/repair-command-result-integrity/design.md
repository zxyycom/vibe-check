# Design

升级 Execa 并使 commandCheck 只把完整进程结果交给调用方完成阶段。

## Context

docs/investigations/verify-command-output-limit-lifecycle.md 与 assess-execa-upgrade.md；活动 command completion Decision。
当前 main 基线为 a36600da4aa2e4d3f4dcebb87722e56d1200ee9d；开始时已有十九份未提交升级报告和调查索引，作为既有工作保留。

## Goals / Non-Goals

目标：Execa 10.2.0 下运行中超限触发回收，任何不完整结果都跳过 afterCommand，正常完整非零退出仍可由调用方结算。
范围以本组已批准依赖和必要适配为限；不升级其余根库、不改变 mise/Node 支持范围、不修改既有调查的历史认识。

## Decisions

### Intended Change

升级 Execa 至 10.2.0，并在 Product 私有进程结果中独立保留完整性事实；默认原因优先级和现有 exclusive flags 保持，沿用底层文本捕获限额。

### Resulting Impacts

根依赖、lockfile 与发布 manifest 由统一依赖 owner 写入；process/result、command completion、真实回收及 installed consumer 证据同步。outputByteLimit 名称兼容保留，公开说明如实表达近似文本限额；不引入精确 UTF-8 捕获、watcher、kill wrapper 或新增公开 API。
所有 package.json、pnpm-lock.yaml、node_modules 和 release-manifest 由 compiler_dependency_integration 单一 owner 串行写入；其余模块按明确所有权并行。主代理维护四组计划和最终验收，完整 Gate 在实现稳定后统一运行，失败时定向修复并重验，四组共享同轮证据。

## Risks / Trade-offs

信号/超限/超时竞争、非零退出优先级与完整性不是同一事实；只返回得快不能证明物理子进程已回收。跨平台与后代进程支持按实际证据交付。

## Open Questions

当前方案已由用户确认。安装、行为差异与平台边界按实际验证更新，实质扩大范围时再确认。

## Implementation Observations

旧版调查保留 Execa 9.6.1 的形成时事实；本轮在 Execa 10.2.0 与私有完整性 guard 下重新验证，
按知识治理另建后继 Investigation，区分升级后的证据与旧结论。限额计量沿用现有文本捕获，
不再把严格 UTF-8 字节预算作为修复目标；公开参数名保持兼容。
