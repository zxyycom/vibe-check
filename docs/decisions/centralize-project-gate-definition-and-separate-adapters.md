---
title: 集中 Project Gate 定义并分离 adapter 与 runtime
status: active
alignment: aligned
createdAt: 2026-08-31T07:49:37Z
purpose: 让维护者从一个定义文件恢复完整 Gate 配置，同时让运行入口、Check adapter 与 bound runtime 的目录职责清晰可见。
background: Gate 的 test 与 repository-quality 配置分散在构造模块中，root 同时平铺配置、adapter 和 runtime mechanics，难以从定义入口恢复完整结构。
decision: 由根级 definition.ts 集中拥有全部 Gate Check 配置，保留 run.ts 作为唯一进程入口，并将实现分别归入 checks 与 runtime 子目录。
tags:
  - configuration
  - workflow-policy
relations: []
---

## 目的

- 让维护者只读 `scripts/project/gate/definition.ts` 就能定位 Gate 的 ordinary process entries、test Check 映射、repository-quality file/area/threshold/waiver/finding policy，以及 profile、tag、mutex、timeout 与 scheduler 绑定。
- 让目录结构表达变化原因：Check-specific adapter 与 process mapping 一起演进，selection、aggregation、transcript 和 bound Run mechanics 一起演进。
- 保留 exact candidate 先于 package import 的执行边界，而不把内部 bound Run 误解为第二个 process entry。

## 背景

- 原 root `definition.ts` 通过 test-entry 与 repository-quality 构造函数的 spread 获得多项 Check；完整 test identity/mapping 和四项 quality 的 nested policy 只能跳转到其它模块恢复。
- Gate root 同时平铺 controls、catalog、result、transcript、process adapter、领域 Check 和 tests；模块虽然各自可用，但目录没有区分配置、Check adapter 与 invocation runtime。
- `scripts/project/gate/run.ts` 必须先准备或重验 exact candidate，再动态导入使用已解析 package public entry 的 bound Run。把这两个阶段合为静态入口会破坏 candidate identity 验证。

## 决策

- 采用: `scripts/project/gate/definition.ts` 是单一 Gate 配置 owner。test execution 的 lane-to-Check identity、tags、candidate input、mutex 与 timeout 在此使用闭合表声明；repository-quality 的 file selections、code areas、thresholds、waivers 与 finding policies 也在此声明。adapter 不保留第二份默认 Gate policy。
- 采用: `scripts/project/gate/run.ts` 继续是唯一 process entry，拥有 argv、candidate preparation、dynamic bound-Run import、outer transcript、afterGate 与 exit mapping。
- 采用: `scripts/project/gate/checks/**` 保存领域 Check adapter、process mapping、test lane mechanics 与相邻 tests；`scripts/project/gate/runtime/**` 保存 selection/catalog、entry projection、aggregation、bound Run、result、performance observation 与 outer transcript mechanics。root 只保留 `definition.ts`、`run.ts` 及其 root-contract tests。
- 采用: `checks/test-execution/lanes.ts` 只拥有 Test Evidence 文件 partition；它不能隐藏 Gate Check identity 或调度 policy。`checks/repository-quality.ts` 只把 definition-owned options 和 mise-resolved scanner commands 绑定到 package Check constructors。
- 采用: `runtime/bound-run.ts` 是 `run.ts` 动态加载的内部模块，不是 CLI/process root；它在 exact candidate entry 已验证后，把 definition、selection、aggregation、output overrides 与 lease cleanup 绑定到一次 Product Run。
- 不采用: 第二个 Gate command、按 Check ID 分散独立配置文件、从 tests 或文档反推当前 Gate catalog、重新引入 parent/nested quality Run，或为追求单文件而把 adapter/runtime 实现内联进 definition。
