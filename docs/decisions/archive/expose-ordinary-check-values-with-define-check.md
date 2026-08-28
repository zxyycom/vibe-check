---
title: 公开普通 Check 值与 defineCheck authoring helper
status: archived
alignment: aligned
createdAt: 2026-08-17T15:00:43Z
purpose: 让 package 同时提供普通默认 Check、独立声明的类型辅助和唯一产品运行入口，而不恢复对象调整 API。
background: 独立 option-aware Check 需要 contextual typing 才能关联 options、execution context 与结构化 result；运行时仍只接受普通对象。
decision: Package 公开可选的 defineCheck authoring helper；它只改善独立 Check 的 TypeScript authoring，不改变对象语义或替代最终校验。
tags:
  - product-contract
relations:
  - type: 替代
    target: expose-single-check-authoring-surface.md
---

## 目的

- 让 consumer 可以方便地独立声明、导出和复用具有完整 TypeScript contextual typing 的 Check。
- 保持 Product 默认 Check 与项目 Check 都是普通对象，并继续只用语言原生对象组合完成默认值自定义。
- 保持 Product Run 为唯一执行入口，不让 authoring convenience 扩张成另一套运行或 adjustment contract。

## 背景

- 缺少 contextual typing 的独立 object literal 可能把 result 的 terminal `status` literal 推断为普通 `string`，也无法从 sibling `options` 为 execution callback 参数建立精确类型。
- `defineConfig` 接受普通 inline objects，但一个异构递归 literal 不能从单一 root identity generic 循环推断每个 option-aware child 的 sibling options；该 child 需要自己的 `defineCheck` 或 `satisfies Check<Options>` boundary。已经 typed 的 children 与 information-only inline objects 不需要重复 helper。
- 运行时不依赖 TypeScript authoring helper：最终 Project Definition 中的 Check 都必须作为普通对象接受同一 closed validation。
- `replace`、`append`、generic derivation helper 与 partial parser 仍会形成第二套对象语义；`defineCheck` 不承担这些责任。

## 决策

- 采用: package 公开 Product 默认 Check values、必要 public types、`defineConfig`、可选 `defineCheck` authoring helper 与唯一 `run` operation。
- 采用: `defineCheck` 使用 option-present 与 no-options 两个 overload，为当前 object literal 提供 execution/options inference、result literal preservation、closed root-field diagnostics 和具体返回类型；options generic 不使用 `const`，以便默认对象经 native spread 后替换 string/number values。
- 采用: `defineCheck` 的输出仍是普通 Check object。它不附加 hidden metadata、brand、binding 或来源语义，不冻结或调整输入，也不替代 Project Definition 在 work 前执行的统一 runtime validation。
- 采用: `defineCheck` 是可选 convenience；plain object、`satisfies Check` 和直接内联 `defineConfig({ checks: [...] })` 仍是合法 runtime/authoring 方式。只有需要 sibling-options contextual inference 的当前 literal 才需要自己的 helper/type boundary。
- 采用: 默认 Check customization 继续使用 object spread、rest/destructuring、nested spread 与普通数组操作；`defineConfig` 不接收 partial override，也不补全被覆盖对象中缺失的 defaults。
- 不采用: `replace`、`append`、`deriveCheck`、adjustment/derivation patch types、partial materialization、method-bearing special object、第二 execution entry，或把 `defineCheck` 作为运行时认证边界。
