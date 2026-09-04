---
title: 将 flag control 终态作为 Scheduler 准入前结果
status: archived
alignment: aligned
createdAt: 2026-09-02T03:33:46Z
purpose: 保留统一 flag 判定的同时，让未启用 Check 遵守 passed prerequisite 与 terminal observation 语义。
background: 多 flag 决策形成时所有已结算上游都会放行 dependent；dependsOn 后来收敛为必须 passed，旧的放行结论已与当前图契约冲突。
decision: flag 条件未匹配继续在 author work 前结算，并作为同一张 Scheduler 图的准入前非通过结果阻断 dependsOn、放行 observes。
tags:
  - configuration
  - dependency-policy
  - product-contract
relations:
  - type: 修订
    target: support-multi-flag-check-enablement-strategies.md
---

## 目的

- 保留 invocation 开始即可统一判断的多 flag 控制，不让 disabled Check 执行 preflight、callback、scanner 或其它 author work。
- 让 `enabledByFlags` 产生的终态与所有其它 Check outcome 遵守同一套 `dependsOn` / `observes` 图语义。
- 继续在 execution 前集中呈现 disabled Check，同时避免建立 Product 自己的第二套依赖传播算法。

## 背景

- `support-multi-flag-check-enablement-strategies.md` 形成时，`dependsOn` 只等待上游结算，因此记录了 disabled Check 仍允许 downstream admission。
- 当前 `dependsOn` 已表示 all-passed prerequisite，`observes` 才表示等待任意 terminal outcome；继续沿用旧放行结论会让相同的 `not-applicable` outcome 因形成路径不同而产生不同图语义。
- flag predicate 在 invocation 开始即可确定，仍应早于 task-local preflight；把它重新塞入 callback 会恢复重复控制代码，也无法支持执行前的 progress 分组。

## 决策

- 采用: Run 先验证包含全部 executable Check 的完整静态图。invocation signal 已取消时不再形成 flag outcome，由 Scheduler 关闭 pending Tasks；否则按 Definition 顺序处理 normalized `enabledByFlags`。predicate 不匹配仍结算为 `not-applicable / flag-condition-not-matched`，不产生 started fact、author message 或 duration。
- 采用: 这些 Product 已形成的 control outcomes 作为同一张 Scheduler 图的 pre-admission Task results；这里的 pre-admission 表示 Scheduler 开始准入时结果已经存在，不是跨 Run replay。Scheduler 使用既有 prerequisite predicate 将其标为 non-passed；direct `dependsOn` consumer 因而在 preflight 前结算为 `unavailable / dependency-not-passed`，direct `observes` consumer 仍等待并读取原始 `not-applicable` outcome。
- 采用: pre-admission-result handoff 是 Product-private engine seam，只承接 Product 在 admission 前已经真实形成的终态；不公开任意预结算 authoring、状态路由 DSL、跨 Run replay 或 Check outcome 注入。
- 采用: progress 在 flag control barrier 结束时继续按 Definition 顺序集中列出未命中 Check；RunResult、machine output、aggregation、dependency readback、measurement graph 和最终计数保留完整事实。task-local preflight 只属于未被 control barrier 结算、且通过 Scheduler admission 的 Check。
- 不采用: 从图中删除 disabled Task 后默认放行 dependent、由 Product 递归复制 blocked propagation，或让 custom admission policy 自行解释 flag outcome。
