---
title: 从带默认值的区域政策构造重复检测 Check
status: archived
alignment: aligned
createdAt: 2026-08-28T05:31:57Z
purpose: 让 duplicateDetection 以专用构造函数补齐默认政策，并让 jscpd adapter 独占协议参数。
background: 多层对象展开把默认值维护推给 consumer，public custom args 又暴露了绝大多数不可覆盖的 adapter 责任。
decision: 使用 defaulted duplicateDetection constructor 和最小 package/custom executable 选择，返回完整普通 Check。
tags:
  - configuration
  - product-contract
relations:
  - type: 归并
    target: expose-ordinary-check-values-with-define-check.md
  - type: 归并
    target: let-each-duplicate-code-area-own-files-and-thresholds.md
---

## 目的

- 让 consumer 只声明项目真正需要改变的 duplicate-code 区域政策，而不复制 package-owned defaults 或编写多层 object spread。
- 让 public custom command 只选择一个经项目授权的直接 jscpd executable，不再泄漏 adapter 的 scan/availability protocol。
- 保持 constructor 产物仍是 ordinary Check，不建立 generic derivation、patch 或第二执行模型。

## 背景

- 已确认每个 duplicate code area 共同拥有自己的 files、line threshold 与 token threshold，resolved Check options 必须保持这一单一事实源。
- 当前 public value 要求 consumer 通过 nested spread 修改完整 options；省略 nested branch 字段会在 preflight 才失败，默认值的组合责任由每个调用方重复承担。
- custom command 的 `args` 绝大多数取值因与 adapter-owned flags 冲突而非法，`availabilityArgs` 也只是 jscpd `--version` protocol；它们不是当前 consumer 的稳定领域选择。
- Product 仍需要普通 Check values、`defineCheck` 和 native object semantics；一个 Check 的真实 default-materialization 需求不应扩张成 generic partial/derive API。

## 决策

- 采用: package root 的 `duplicateDetection(options?)` 是专用构造函数。它补齐 Check identity、preflight、execution 与完整 resolved options，返回值仍是可由 `defineConfig` 直接消费的普通 Check object。
- 采用: 无参调用建立默认 `project` area、默认 file selection、line `3`、token `75`、enabled Check-local cache、package jscpd command 与 `workers: "auto"`。constructor input 只允许可省略的 `cache`、`codeAreas` 和 `scanner` branches；未知或非法输入同步抛出可定位的 `TypeError`。
- 采用: 省略整个 `codeAreas` 使用默认 `project` area；显式 area map 必须非空，每个非空 area id 必须提供 `files` branch。files 的 `include`、`excludeDirs`、`generatedFiles` 以及 area 的 line/token 阈值可以省略并由 package defaults 补齐。
- 采用: public scanner command 恰为 `{ kind: "package" } | { kind: "custom", executable }`。custom executable 必须是可直接接受 jscpd CLI 参数的非空 command；adapter 固定 availability `--version`、config/output/reporters/absolute/workers 与 threshold arguments，public input 不再包含 `args` 或 `availabilityArgs`。
- 采用: resolved Check options 继续恰为 `{ cache, codeAreas, scanner }`，每个 resolved area 恰为 `{ files, minimumLines, minimumTokens }`。preflight 和 execution 继续验证完整 resolved shape，以安全拒绝 constructor 返回后经普通对象组合形成的非法 Check。
- 采用: 其它 package-provided default Check values、`maintenanceReminders(entries)`、`defineCheck` 与 plain object authoring 保持各自现有职责；本 constructor 不建立 generic deep merge、`deriveCheck`、adjustment grammar、hidden brand 或第二 execution entry。
- 采用: 本次处于 prestable package contract，`duplicateDetection` 从 default value 硬切为同名 constructor，旧 object-spread/default-value 调用和 public custom args 不提供 compatibility overload。
