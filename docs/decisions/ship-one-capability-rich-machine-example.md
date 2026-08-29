---
title: 让唯一 machine 示例覆盖代表性公共 Check 能力
status: active
alignment: aligned
createdAt: 2026-08-29T04:17:23Z
purpose: 让 package consumer 从一组可执行材料同时理解内置 Check、自定义工作流与 machine publication 的对应效果。
background: 只有四个直接返回终态的自定义 Check 虽能覆盖 wire grammar，却不能展示真实 Definition 如何组合公共能力或使用随包 Check。
decision: 保留唯一 mixed-outcomes 示例，以一个真实内置 Check 和一条自定义依赖工作流形成代表性结果，并由完整 public Run 生成输出。
tags:
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: ship-one-definition-backed-machine-example.md
---

## 目的

- 让 package consumer 从一份 TypeScript Project Definition 同时看到内置 Check 的普通构造方式和自定义 Check 的主要组合能力。
- 让 `run.json` 与 `records.ndjson` 的具体 facts 能回溯到 options preparation、dependency data、parser、Record 和四态结果，而不是只展示静态枚举。
- 在提高示例解释力的同时，继续只维护一组 current-version machine materials。

## 背景

- 既有 `mixed-outcomes` Definition 用四个同步自定义 Check 直接返回 `passed`、`failed`、`not-applicable` 和
  `unavailable`；它证明了 machine grammar，却没有展示随包 Check、preflight、typed provider 或 dependency readback。
- Consumer 的常见 Definition 会混合 package-provided Check 与项目自定义 Check，并让 downstream policy 读取 upstream final data；
  继续使用受限同步 harness 会使示例代码与实际 Run 能力脱节。
- 示例仍以理解一组 machine publication 为目标，不需要恢复按 outcome 分目录的重复 fixtures，也不需要把每个 scheduler 或
  Run Controls 字段都塞入同一文件。

## 决策

- 采用：继续只交付 `docs/examples/artifacts/mixed-outcomes/` 下的 `definition.ts`、`run.json` 与
  `records.ndjson`，不恢复 example README 或多目录 fixtures。
- 采用：Definition 使用 `jsonValidation` 实际检查 project-root `package.json`，并以递归自定义 workflow 展示 typed
  provider/parser、preflight continue fallback、preflight block、inherited direct dependencies、dependency final-data
  readback、terminal messages、supplemental Records、visibility 与并行预算。
- 采用：同一次 Run 形成 package-provided passed、custom passed、failed、not-applicable 与 unavailable facts；failed
  policy 读取内置和自定义 provider data，并发布多条 Records，使代码与 two-file output 可以逐项对应。
- 采用：Repository generator 通过完整 public `run` 执行同一份 Definition，并在隔离的有效 project manifest 上形成
  Check/Record facts；只为 checked-in publication 替换固定 invocation metadata，不另建手工 snapshot。
- 采用：Package typecheck、installed execution 与文档验收继续直接使用随包 Definition，并额外核对代表性 built-in、
  dependency-derived result、messages 与 Records；output guide 说明哪些效果进入 machine files，哪些只属于 `RunResult`。
