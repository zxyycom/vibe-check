---
title: 允许空 information Check 并给出提示
status: archived
alignment: aligned
createdAt: 2026-08-17T15:37:57Z
purpose: 让递归 Check authoring 接受暂时没有 execution 或 children 的节点，同时明确提示它当前不产生任何作用。
background: 空节点可能来自渐进配置或对象组合；把它当成无效输入会增加修改成本，静默接受又容易掩盖无意义声明。
decision: 空 information Check 合法且不产生 runtime fact；Definition 对它给出非阻断的无意义 Check warning。
tags:
  - configuration
relations: []
---

## 目的

- 允许项目在渐进配置、对象组合或临时占位中保留尚未承载 execution 或 children 的 Check。
- 让调用者知道该节点当前不会执行、展开 children 或产生 Check/Record facts，而不因此阻断完整运行。

## 背景

- 同一种递归 Check shape 允许省略 `execution`，information-only node 的作用通常来自组织 children 或提供继承上下文。
- `execution` 缺失且 `checks` 缺失或为空的节点没有 descendants，因而当前不会投影任何 executable Check。
- 将这种节点判为 invalid 会让普通对象编辑和渐进 authoring 变得脆弱；完全静默又可能让拼写、遗漏 children 或未完成配置长期不被发现。

## 决策

- 采用: `execution` 缺失且 `checks` 缺失或为 `[]` 的 Check 是合法 Definition input；`checks: []` 在 traversal 上表示没有 children。
- 采用: 该节点不创建 Task、outcome、Record 或 aggregate，也不因为自身 scheduling fields 创建 runtime scope。
- 采用: Definition validation/normalization 为该节点产生非阻断的 meaningless-Check warning，并定位对应 Check；warning 的存在不改变其合法性，也不伪造成质量 Record 或 Check outcome。
- 采用: 每个 `RunResult` 通过 `definitionWarnings` 暴露 warning collection；Definition blocking validation 失败时该 collection 为 `[]`，valid Definition 的后续结果携带完整 normalized warnings。logs effect 可以渲染同一内容，但 `defineConfig` / `defineCheck` 不打印、不附加 metadata，也不改变输入对象。
- 采用: 空节点仍服从普通 Check 的 closed shape、字段类型和非空 `checkId` 规则，但它不形成需要全树唯一的 runtime identity；只有 execution-bearing nodes 投影到 Task graph 后才按 Task id 检查重复。dependency strings 只解析已投影 Task ids，空节点本身不贡献 reference target。
- 不采用: 因节点为空而拒绝整个 Definition，或静默把空节点当成已完成的 executable Check。
