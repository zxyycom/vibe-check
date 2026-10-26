---
title: 在 Check owner 边界绑定 Gate 锁定工具
id: 261019-bind-gate-pinned-tools-at-check-owned-boundaries
status: active
alignment: aligned
createdAt: 2026-10-19T03:58:47Z
purpose: 让正式 Gate 自行进入锁定环境，同时由普通 Check 结算实际外部工具不可用。
background: 外置 Lizard 已退场；Gate 仅需 SCC binding，旧全局缺 binding failure 不再符合 ordinary Check 边界。
decision: Gate 自行进入 mise 且只注入绝对 SCC command；缺失时由 fileMetrics unavailable，函数指标使用内置 analyzer。
tags:
  - dependency-policy
  - file-metrics
  - project-gate
  - workflow-policy
relations:
  - type: 修订
    target: 260812-make-bun-entries-use-pinned-tools
    summary: 保留自绑定，改由实际 Check 结算 SCC 不可用
---

## 目的

- 让开发者直接运行正式 `bun run check` 入口即可获得 repository-pinned 工具环境，不依赖预先激活 shell 或全局同名程序。
- 将 repository 工具绑定与 Product 的 Check-owned availability 分开，缺失单个工具只影响 owning Check 的正常结算，不建立 Product-wide scanner barrier。

## 背景

- 前序曾为外置 Lizard 和 SCC 要求 mise 注入 private bindings，并在缺失时于 work 前形成全局 operational failure。它保留了避免 ambient PATH 漂移和劫持的理由，但外置 Lizard 已被产品内置 TypeScript analyzer 替代。
- [工作区入口](../tooling/workspace.md)与[Project Gate](../tooling/project-gate.md)已由 `mise exec -- bun scripts/project/gate/run.ts` 接线正式 `check`，mise 提供绝对 `VIBE_CHECK_SCC_CMD`。`repository-quality.ts` 只为 fileMetrics 注入该 command；functionMetrics 直接使用普通 constructor。
- [Scanner owner](../development/scanner-dependencies.md#gate-bound-repository-observations)已把 missing/relative SCC binding 转成不可用的绝对 command，由 file-metrics availability/process boundary 结算；缺工具不是 Product 启动前的独立失败协议。本次只修复长期记录与既有 owner 的失配，不采用新的工具或产品行为。

## 决策

- 采用: 消费 repository-pinned 外部工具的正式 Bun 入口自行进入锁定的 mise 环境；调用方不必预先激活 shell 或拼接工具路径。工具安装、固定版本和入口接线由 workspace tooling 拥有，不能仅靠文档要求调用方记住 `mise exec`。
- 采用: Gate 的 repository observations 只为 fileMetrics 注入 mise 提供的绝对 SCC executable。缺失或相对 `VIBE_CHECK_SCC_CMD` 不回退 ambient `scc` 或 PATH 顺序，而提供不可用的绝对 command，让 owning Check 在正常 availability/process boundary 形成 `unavailable`；有效选择与严格聚合继续处理该终态。
- 采用: functionMetrics 使用产品内置 TypeScript analyzer，不接收 Lizard virtualenv、Python、scanner command 或环境 binding。其来源、资源、取消和分析失败仍由 function-metrics owner 结算，不因本方向新增 upstream advisory 或网络输入。
- 采用: Product 的外部工具适配各归具体 Check，公开 scanner options 与 package dependency resolution 按各自指南提供，不把 repository mise/private binding 变成所有 Product consumers 的必需环境或通用 scanner resolution API。显式 caller 选择由其 owning Check contract 验证，不由嵌套 mise 另立覆盖政策。
- 采用: 不新增面向 Product consumers 的 repository binding/environment 公共协议。Gate 通过既有公开 `fileMetrics({ scanner: { executable } })` 注入绝对 SCC 路径；该路径保留在 resolved options 与 declarative snapshot 中，并按[Definition owner](../development/project-definition.md)参与既有 identity/fingerprint，不因来自 mise 而成为 identity 之外的隐式配置。私有 version probe、raw command data 与 operational payload 不进入 Core facts 或 machine publication；结果与安全投影分别遵循[scanner owner](../development/scanner-dependencies.md)和[输出 owner](../output.md)，不新增命令边界字段。
- 不采用: 全局 Python/site-packages、用户级 shim 或 ambient PATH 的偶然可用；恢复外置 Lizard；缺 binding 时在 Product work 前建立全局 operational failure；用成功空结果或 advisory warning 掩盖 scanner 不可用。
