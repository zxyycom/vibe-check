---
title: 使用字段感知的内置 Check 调整方法
status: archived
alignment: aligned
createdAt: 2026-08-14T15:25:27Z
purpose: 让项目从内置 Check 默认值声明式地覆写或追加所需字段，而不展开完整嵌套对象。
background: 手写多层 object spread 暴露 descriptor 表示细节，通用 deep merge 又无法可靠区分字段覆写与 collection 追加。
decision: 内置 descriptor 提供字段感知的 replace 与 append 方法，返回保持稳定身份的新 frozen descriptor。
relations:
  - type: 修订
    target: configuration/keep-built-in-options-owned-and-tool-neutral.md
---

## 目的

- 让项目先选择一个 Product-owned built-in descriptor，再只声明相对该默认值发生的局部调整。
- 保持调整操作可类型检查、可验证且不改变 built-in identity、metadata、private binding 或 tool-neutral boundary。

## 背景

- 普通 TypeScript object spread 能保留默认值，但每次修改深层 option 都要求项目重复展开所有祖先对象；这种机械样板让使用者承担了 descriptor 内部表示成本。
- scalar、固定嵌套对象、开放 map 与 scheduling collection 的合法调整语义不同。把它们交给一个任意对象 generic deep merge 会模糊未知字段、数组拼接、map 覆写和清空语义。
- `duplicateDetection`、`fileMetrics` 与 `functionMetrics` 已经是可直接放入 Check tree 的 frozen authoring values；新增顶层 builder 或 helper export 会扩大 package operation surface，并把同一入口拆成两种使用方式。
- 这些 methods 目前由 current definition-facing source 提供；repository root 仍是 private workspace。下游 package 只投影同一 values/methods，当前 source availability 不表示 `vibe-check` 已可安装。

## 决策

- 采用: 每个 built-in descriptor value 直接提供 `.replace(...)` 与 `.append(...)` authoring methods。descriptor 本身仍是 frozen、non-callable value，也仍可不经调整直接作为 Check leaf。
- 采用: `.replace(...)` 只接受该 descriptor 明确拥有的 public authoring fields。built-in options 使用 descriptor-specific typed partial shape，已提供的 scalar leaf 替换当前值，未提供的 branch 保留；开放 map 作为一个字段整体替换，不隐式逐项拼接。`maxParallel` 与 leaf 自有的 `dependsOn`、`mutex` 也可以被显式替换。
- 采用: `.append(...)` 只接受 owner 已声明为追加型 collection 的字段；当前范围仅包含 leaf 自有的 `dependsOn` 与 `mutex`，并按现有顺序去重。它不改变 group-to-leaf 继承规则，也不为 options 发明通用 collection merge。
- 采用: 两个方法都返回同一 built-in identity 的新 frozen descriptor，允许继续链式调整且不修改基础值。authoring methods 不进入 normalized declarative snapshot、fingerprint、Core catalog、output 或 private execution binding。
- 采用: 目标 Package 顶层 callable operations 仍只有 `defineConfig` 与 `run`；不新增 package-level builder、registry 或 generic merge helper export。
- 不采用: 要求使用者手写多层 object spread、使 descriptor 自身可调用、通过 Proxy/class 改变 plain authoring boundary，或接受 `Record<string, unknown>` patch。
