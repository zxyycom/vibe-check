---
title: 只随包交付一组由 Definition 支撑的 machine 示例
status: archived
alignment: aligned
createdAt: 2026-08-29T03:49:57Z
purpose: 让 package consumer 用一份可执行配置和对应输出理解完整 machine publication，同时避免按 outcome 重复整组材料。
background: 四组示例只替换 terminal outcome，却重复同一 two-file 结构；只交付输出又无法说明哪些 Project Definition 会形成这些事实。
decision: 只交付一组 mixed-outcomes Definition 与对应输出，并从该 Definition 生成 Check/Record facts。
tags:
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: keep-package-machine-docs-consumer-focused.md
---

## 目的

- 让 package consumer 在一个常见目录同时看到可执行 TypeScript Project Definition、`run.json` 和
  `records.ndjson`，无需从四套重复 fixtures 反推输入。
- 用一组 publication 覆盖四种 terminal outcome、final data、reason、Record ownership、NDJSON framing 与
  complete-set fingerprint。
- 让 Definition、生成输出、package exact-byte acceptance 和 installed typecheck 保持同一 current-version 边界。

## 背景

- 既有四组 package examples 每组只有一个 Check；除 failed scenario 带一条 Record 外，差异主要是
  `passed`、`failed`、`not-applicable` 与 `unavailable` 枚举分支。
- Schema 和 output guide 已拥有四态 grammar。按 outcome 拆成四个完整目录增加 inventory、生成、验收和阅读成本，
  不能提供四种不同的 wire format。
- 单独发布 output bytes 可以帮助 consumer 校验 reader，但没有展示负责形成这些 Check/Record facts 的公共
  `defineCheck` / `defineConfig` authoring 入口。
- 零 Record 集合仍有明确的零字节 framing 契约和 runtime/docs validator 证据，不需要再为它发布一套独立 package fixture。

## 决策

- 采用：Package machine example 精确收敛为 `docs/examples/artifacts/mixed-outcomes/`，其中只包含
  `definition.ts`、`run.json` 与 `records.ndjson`。
- 采用：`definition.ts` 使用 package-root `vibe-check` imports，定义四个无 dependency/preflight 的同步自定义 Check；
  它们在同一次 snapshot 中分别形成四种 terminal outcome，failed Check 另外发布一条 supplemental Record。
- 采用：Repository generator 加载并执行同一份 Definition，通过 current Core settlement 得到 Check/Record facts；只为
  checked-in bytes 注入固定 invocation ID 与 timestamp。不得另写一套手工 snapshot 作为输出事实源。
- 采用：Package material registry、candidate fingerprint、staging、tarball、installation 与 external documentation
  acceptance 逐字节验收这三份 example materials；installed consumer typecheck 直接包含随包 Definition。
- 采用：`docs/output.md` 说明三份材料的关系和固定 metadata 边界。README 仍是唯一 package 总入口，不新增 example
  README、目录 index、通用 artifact reader 或零 Record 专用 package fixture。
