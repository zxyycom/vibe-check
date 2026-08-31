---
title: 由中央 Definition 配置 Project Gate afterGate
status: active
alignment: aligned
createdAt: 2026-08-31T16:03:14Z
purpose: 让维护者从 Gate 的中央 Definition 直接发现并维护唯一项目自有的结果后处理配置，同时保持 exact candidate 边界。
background: 既有中央 Definition 拥有 Check 配置，但 afterGate 仍隐藏在 run.ts 默认 steps，配置入口与 candidate-bound 执行顺序分离。
decision: 唯一 afterGate 由 definition.ts 配置并经动态 bound module 投影；run.ts 验证 entry 后执行并保持 fail-closed 结果与 exit。
tags:
  - configuration
  - workflow-policy
relations:
  - type: 修订
    target: centralize-project-gate-definition-and-separate-adapters.md
---

## 目的

- 让维护者只读 `scripts/project/gate/definition.ts` 就能找到 Gate 的普通 Check 配置和唯一 project-owned `afterGate`，并能以一个同步或异步函数决定唯一最终 Gate result。
- 保持 root adapter 先准备 exact candidate、再动态加载 bound module、验证 installed entry、执行 Product Run、最后执行 Hook 的执行顺序。
- 让 Hook 的项目代码权限、fail-closed 边界以及它与 Check `preflight` 的区别有唯一可发现的长期判断。

## 背景

- `centralize-project-gate-definition-and-separate-adapters.md` 已将 Gate Check、调度和目录职责集中到 Definition，但其中仍将 `afterGate` 归给 `run.ts`。
- Definition 的 package runtime import 必须在 candidate 准备后解析；root 若静态加载 Definition，会绕过已安装 candidate 的 identity 边界。
- 已对齐的 performance advisory Decision 要求默认 Hook 保持 elapsed observation 为 advisory，不能改变 Check facts、aggregate 或 exit。

## 决策

- 采用: `scripts/project/gate/definition.ts` 显式导出唯一 `afterGate` 与其同步/异步函数类型。该函数是受信任的项目 JavaScript/Bun 代码，可在项目授权范围内工作；它不是 Product public API、plugin、registry、sandbox 或 `beforeGate` 机制。
- 采用: 默认 Definition Hook 显式调用现有 Gate-owned performance observer。baseline、workload matching 和不改变初步 status 的约束继续由 `monitor-project-gate-performance-advisory.md` 拥有。
- 采用: candidate 准备后的 `runtime/bound-run.ts` 从同一动态模块提供 `resolvedEntryPath`、Product `run` 和 Definition Hook。`run.ts` 仅在 resolved entry 与 prepared candidate 相同后调用 Run 与 Hook，并继续冻结输入、验证闭合 `{ status, messages }` 返回；Hook throw 或非法返回仍映射为 `unavailable`。
- 采用: `run.ts` 的 loader、clock 和 transcript injection 只保留为 adapter 测试 seam，不形成正式配置或可替换的第二 Hook 来源。Check `preflight` 继续是 Product Run 内的 execution 前 options 边界，与 Gate 的 result post-processing 分离。
- 不采用: 在 root 静态 import Definition、Hook array/registry、优先级或插件发现、Product lifecycle API、以及 invocation-level `beforeGate`。
