---
title: 使用可选 execution 的递归 Check 普通对象
status: active
alignment: unaligned
createdAt: 2026-08-17T15:28:16Z
purpose: 让同一种递归 Check 对象同时表达独立执行节点和只负责组织与继承的信息节点。
background: 每个递归节点都执行会把 composition 误写成运行事实，也容易引入父子 completion 和聚合语义。
decision: Check 使用普通递归对象；有 execution 的节点独立执行，children 继续展开，无 execution 的节点只传递组织与继承上下文。
relations:
  - type: 修订
    target: configuration/use-one-check-shape-with-recursive-composition.md
---

## 目的

- 用一种普通递归 Check shape 表达 execution-bearing node、execution-with-children node 与 information-only node。
- 让 Product 默认 Check 与项目 Check 使用同一 authoring、validation 和 inheritance model。
- 保持 recursive composition 只负责展开与配置上下文，不创建运行聚合协议。

## 背景

- 一个节点是否执行和它是否包含 children 是两个独立维度；把所有递归节点都当作 executable Check 会让纯组织节点产生无意义 outcome。
- 项目需要在 parent 上集中声明显示信息和可继承 scheduling configuration，同时让后代 Checks 各自执行。
- 一个 Check 内的 TaskPlan、leaf Tasks 与 completion 是另一种多阶段执行能力，不是 recursive `checks` 的含义。

## 决策

- 采用: Project Definition 的 `checks` 使用一种递归普通对象 shape；Product 默认 values 与项目声明 values 都直接使用该 shape。
- 采用: node 有 `execution` 时展开为一个独立 executable Check；node 有 `checks` 时以本节点的 effective configuration 继续递归展开 children。这两个动作彼此独立。
- 采用: node 没有 `execution` 时是 information-only composition node，只承接显示、组织和继承上下文，不形成自己的 runtime outcome、Records 或 child aggregate。
- 采用: information-only node 可以声明递归 children 与可继承 scheduling fields；当前节点专属的 `options` / `recordTypes` 必须与 `execution` 同时存在，否则 Definition fail closed，不能把它们误解为 child inheritance 或虚拟 Record owner。
- 采用: 一个 node 同时拥有 `execution` 与 `checks` 时，parent 与 execution-bearing descendants 各自形成独立 Checks；containment 不产生隐式依赖、顺序、等待或汇总。
- 采用: 当前每项 `execution` 只表示该 Check 自己的一次 execution callback；不公开 per-Check TaskPlan factory、leaf Task 或 completion contract。
- 不采用: group/custom/built-in tree variants、every-node execution、child-first parent completion、containment aggregate，或让普通对象来源决定运行语义。
