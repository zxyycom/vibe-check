---
title: 使用独立函数调整普通内置 Check 数据
status: active
alignment: unaligned
createdAt: 2026-08-15T06:16:05Z
purpose: 让项目从普通内置 Check 默认值出发，以字段感知函数覆写或追加所需配置。
background: 对象方法把 Product 提供默认值误塑成特殊 carrier，且扩大了复制、校验和公开 API 责任。
decision: 内置 Check 使用普通数据契约，顶层 replace 与 append 返回非突变的新值并保持各字段的 owner 语义。
relations:
  - type: 修订
    target: configuration/use-field-aware-built-in-check-adjustments.md
---

## 目的

- 让项目直接使用 Product 预先提供的内置 Check 默认值，并只声明相对默认值发生的局部调整。
- 让内置 Check 与自定义 Check 共用同一个 Check tree 数据入口，同时由内置 owner 保持精确的 options 与排程字段语义。

## 背景

- Product 与项目作者使用同一套 Check definition mechanism；内置 Check 的差异是 Product 已提供稳定 identity、metadata、完整默认 options、字段策略和私有执行绑定，而不是对象具有特殊签发身份。
- scalar、固定嵌套对象、开放 map 与可追加 collection 的调整语义不同。通用 deep merge 无法可靠表达未知字段、整字段替换、追加和清空边界。
- 把 `replace` / `append` 放在每个值自身会要求特殊 carrier，并让 method copying、receiver 和 frozen state 进入配置契约；这些义务不产生额外的项目配置能力。

## 决策

- 采用: `duplicateDetection`、`fileMetrics` 与 `functionMetrics` 是可直接进入 Check tree 的普通 readonly 内置 Check 数据。其合法性由公开闭合结构和对应 `checkId` 的字段契约决定，不依赖 object identity、private brand、methods 或 frozen state。
- 采用: 顶层 `replace(check, replacement)` 只接受该内置 Check owner 声明的字段。已提供的 scalar 或 fixed nested leaf 替换当前值，未提供 branch 保持；开放 map 作为整个字段替换；叶子自有 `dependsOn`、`maxParallel` 与 `mutex` 可以显式替换。
- 采用: 顶层 `append(check, additions)` 只接受 owner 声明为可追加的 collection；当前仅为叶子自有 `dependsOn` 与 `mutex`，并按首次出现顺序去重。它不为 options 建立通用 collection merge。
- 采用: 两个 functions 都根据传入值的 `checkId` 提供精确类型，返回同一内置 Check variant 的新普通数据，并且不修改输入、nested defaults 或 module-shared defaults。runtime freeze 可以作为实现防御，但不是公开行为或合法性条件。
- 采用: helper 可以拒绝不符合当前 operation contract 的输入，但成功调用不认证完整 Project Definition。Check tree normalization / Package Run pre-work 仍在任何 project work 前校验完整 tree 和跨节点约束；`defineConfig` 仍只构造值。
- 采用: helper scope 只包含 Product-owned built-in Checks。自定义 Check author 继续拥有其完整数据、functions、binding 与 options policy；统一 Check tree mechanism 不建立 arbitrary custom editor。
- 不采用: value-owned adjustment methods、generic deep merge、mutable registry、Proxy/class carrier、`Record<string, unknown>` patch 或依赖来源身份恢复普通数据副本。
