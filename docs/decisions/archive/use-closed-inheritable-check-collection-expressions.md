---
title: 使用闭合的可继承 Check 集合表达式
status: archived
alignment: unaligned
createdAt: 2026-08-15T15:31:54Z
purpose: 让递归 Check composition 中真正可集合化的公共字段具有明确、可验证且不依赖 deep merge 的继承与编辑语义。
background: 简单追加继承无法表达清空、精确替换或从 parent 基础删除；通用对象 merge 又会把不同 Check 的 options 和 composition 错误混合。
decision: 可继承的 set-like 公共字段使用 closed expression 区分继承、精确替换和 parent-based add/remove；其它字段保留各自 owner，不参与泛化继承。
tags:
  - configuration
relations: []
---

## 目的

- 让 nested Check 的公共 set-like scheduling fields 可以可靠地继承、清空、替换或基于 parent 增删，而不把数组写法误解为追加或依赖通用 JavaScript merge。
- 把这一字段语义从 Check shape、cap、options 和 child composition 中分离，使它能够独立演进和验证。

## 背景

- `dependsOn` 与 `mutex` 都以稳定 identity 表达可组合的公共集合；单纯 root-to-node append 无法表达 child 有意移除 inherited item 或将集合清空。
- ordinary array 对人和机器都应表示完整值，而不是“有 parent 时追加、没有 parent 时替换”的上下文敏感含义。
- options、Check identity/source、`checks` 和 scalar cap 没有共同的 set-like 语义；把它们纳入同一 expression 会产生错误的跨 Check inheritance。

## 决策

- 采用: 首版只把真正 set-like、且在所有 Check 间具有稳定 identity 的公共 scheduling fields 纳入此契约：`dependsOn` 与 `mutex`。每个 field 使用自己的 identity namespace；normalization 的 effective collection 中每个 identity 最多一次。
- 采用: 字段缺失表示继承 parent 的 effective collection；普通 readonly array 表示精确替换，`[]` 明确清空。authoring grammar 还接受 closed 的 parent-based edit expression，可单独 add、单独 remove 或同时 add/remove；它以 parent effective collection（root 为 empty collection）为基准形成新集合。
- 采用: add/remove 都按字段的稳定 identity 解释；remove 不在 parent collection 中的 identity 是 no-op，同一 expression 同时 add 与 remove 同一 identity fail closed。合法结果在 work 前 canonicalize、去重并完成 field-specific reference validation。
- 采用: expression 的可接受 object shape 是 closed 的，不能携带未知 key、任意 nested object 或隐式 deep merge 语义。公开 spelling 可以在 publication 前与 authoring API 一并确认，但任何最终 spelling 必须完整表达本决策的三种语义，不能再引入第二种同义输入形式。
- 采用: options 不跨不同 Check 继承或 merge；`checks` 只属于声明它的 base Check，不向 children 继承；`maxParallel` 继续使用 nearest explicit scalar 规则。其它没有稳定 set-like 语义的字段维持其已有 owner，不能因本契约自动获得 parent edit 支持。
- 不采用: generic deep merge、隐式 array append、把 `[]` 当作缺失、按位置识别 collection item，或让本契约之外的 field 获得跨 Check inheritance。
