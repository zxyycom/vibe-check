---
title: 提供公共 commandCheck 构造器
id: 260909-provide-public-command-check
status: active
alignment: unaligned
createdAt: 2026-09-09T08:32:44Z
purpose: 让项目用普通 Check 执行外部命令而不重复实现进程生命周期
background: 现有自定义 Check 需自行处理 spawn、取消、超时、输出上限与四态映射
decision: 公开普通 commandCheck 并由 Product 统一命令执行机械语义
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让 TypeScript 项目把既有 Bun、Node 或其它可执行程序作为 ordinary Check 组合进 Project Definition，而不重复实现 child-process 机械逻辑。
- 使命令的取消、超时、输出上限和四态结算继续受 Product 普通 Check lifecycle 管理，但不把 Vibe Check 扩展成 CLI 或 shell workflow 引擎。
- 保留工具专属协议、结构化 Record、脱敏和 Gate policy 在相应 owner，不让通用构造器猜测命令语义。

## 背景

- 公开 `defineCheck` 允许 trusted callback 自行启动子进程，但 Product 没有可直接构造 process-backed Check 的公共能力；每个 consumer 因而要自行处理 spawn、`AbortSignal`、timeout、bounded output 和 exit/signal 分支。
- Product 内部已经为 Git、jscpd 和 SCC 等 Check 使用默认 process runtime，Project Gate 也有另一套通用 process base；这证明子进程生命周期是现实共性，而工具输出解释仍是稳定差异。
- 现有程序化 API 方向要求 Product 提供可直接使用的 runtime capability，同时把 argv、help、process exit 和项目 Gate 适配留给 caller。

## 决策

- 采用: package root 公开 `commandCheck(...)`，从受 runtime validation 的 command、arguments、working directory、environment、timeout 和 output limit 构造 ordinary Check；它不获得 scheduler、settlement 或 output 特权。
- 采用: Product 统一 no-shell child execution、cooperative cancellation、timeout、bounded capture 及 exit/signal/startup failure 的封闭分支，并以既有 `passed | failed | unavailable` 语义结算；不要求 consumer 直接依赖 execa 或内部 process adapter。
- 采用: raw stdout/stderr、absolute executable、arguments 和 environment 不自动进入 final data、Records、messages 或 machine publication。Change 在实施前必须固定可诊断的 bounded output/transcript 策略，且不降低现有敏感输出边界。
- 采用: 通用构造器只解释 process lifecycle，不根据 command、arguments 或人读 output 猜测 Bun、Node、Git、oxlint 等工具语义。结构化 failure projection、safe Records、工具专属 parser 和 Gate transcript/policy 仍由各自 owner 承接。
- 采用: `commandCheck` 保持为程序化 package API，不发布 `bin`、产品 CLI、shell-string grammar、argv parser 或 process-exit mapping。
- 不采用: 放宽 canonical Check data 以保存 raw process output，导出 execa 类型/异常，自动传播 ambient credentials，或把仓库 Project Gate process adapter 整体迁入 Product。
