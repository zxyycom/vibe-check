---
title: 使用 inherit 编辑可继承 Check 集合
status: active
alignment: unaligned
createdAt: 2026-08-17T14:42:02Z
purpose: 让 Check 的集合型调度字段通过固定的 inherit 表达式继承并编辑 parent effective collection。
background: 集合继承语义已经确定，但未固定 public spelling 会让实现与示例继续在 helper、raw object 和隐式数组追加之间漂移。
decision: dependsOn 与 mutex 使用字段缺失、精确数组或 inherit({ add?, remove? }) 三种输入，不提供同义的 parent-relative 编辑写法。
tags:
  - configuration
relations:
  - type: 修订
    target: use-closed-inheritable-check-collection-expressions.md
---

## 目的

- 为 `dependsOn` 与 `mutex` 提供一种明确、简短且可验证的继承与 parent-relative 编辑语法。
- 让实现、类型、文档和示例直接使用同一 public spelling，不再把 helper 名称留给实施者猜测。

## 背景

- 字段缺失、精确替换、清空和基于 parent 的增删是不同操作，不能由普通数组或隐式 append 同时表达。
- 既有方向已经把 parent-relative edit 限定为 closed expression，但把 spelling 留到 publication 前确认；这会让实现仍可能产生 raw `{ add, remove }`、其它 helper 或多套同义输入。
- `inherit(...)` 只表达 Check tree 中集合型调度字段的 parent-relative 语义，不是 Product 默认 Check 对象的 adjustment、derivation 或 deep-merge API。

## 决策

- 采用: `dependsOn` 与 `mutex` 的字段缺失表示完整继承 parent effective collection；root 的 inherited base 是 empty collection。
- 采用: 普通 readonly array 表示精确值，`[]` 明确清空；array 不追加 parent collection。
- 采用: parent-relative edit 的唯一 public spelling 是 `inherit({ add?, remove? })`。它以 parent effective collection 为 base，允许单独 add、单独 remove 或在一次声明中同时 add/remove；input 必须至少出现其中一个字段，字段数组可以为空。
- 采用: normalization 先从 parent 移除 `remove` identities，再加入 `add` identities；同一 identity 同时出现时 add wins，重复值 coalesce，effective collection canonicalize。`inherit(...)` input 只允许 `add` / `remove`，不公开 raw object 或其它同义 helper。
- 采用: 只有 `dependsOn` 与 `mutex` 使用这套集合表达式；`maxParallel` 保持 nearest-explicit scalar rule，options 与 `checks` 不参与该继承协议。
- 不采用: 隐式 array append、generic deep merge、把 `[]` 当作缺失，或把 `inherit(...)` 扩张成默认 Check 对象修改 API。
