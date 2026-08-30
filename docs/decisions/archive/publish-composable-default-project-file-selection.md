---
title: 公开可组合的默认项目文件选择
status: archived
alignment: aligned
createdAt: 2026-08-30T11:39:49Z
purpose: 让 file-selecting Checks 共用并公开一个常见、不可变且可由 consumer 显式微调的 files 基线。
background: 形成决策时，constructor 共用 package-private files defaults；consumer 无法从 package root 复用，只能复制排除数组。
decision: Package root 公开深冻结的 defaultProjectFileSelection；显式数组仍完整替换，consumer 通过普通 TypeScript composition 扩展。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 给普通 consumer 一个可发现、可导入并可组合的常见文件收集与剔除基线。
- 让全部 package-provided file-selecting Checks 从同一个稳定 owner 物化默认 files branch。
- 保持文件来源、glob、显式替换与 Check-owned scope 语义直接可见，不建立 hidden global config。

## 背景

- 形成决策时，六项 file-selecting constructor 都使用 `src/package-checks/project-files/configuration.ts` 的 package-private default，但 package root 只公开 selection types。
- `filesystem` 默认不解释 `.gitignore`；缺少 `.log`、coverage 和 temporary 排除会让 Product diagnostics 或常见生成状态进入候选。
- consumer 若要增加一条项目排除，只能复制整份默认数组，后续默认项修订无法被其配置自然吸收。

## 决策

- 采用：package root 公开 `defaultProjectFileSelection: ProjectFileSelection`；对象、`include` 与 `exclude` 数组深冻结，constructor 仍为自己的 resolved options 建立不可变快照。
- 采用：默认 source 为 `filesystem`、include 为 `**/*`；exclude 明确覆盖常见 VCS/Product state、dependency、build、generated、cache、coverage、log、temporary、Python environment/cache 与 Rust target paths。
- 采用：显式 `files.include` 或 `files.exclude` 继续完整替换相应默认数组；需要保留基线时，consumer 使用 object spread 和数组 spread 显式组合。
- 采用：默认对象是普通 public value，不是 mutable global policy、deep-merge helper、preset registry 或 Project Definition field。
- 不采用：自动读取 `.gitignore`、隐式追加 consumer arrays、纳入 repository-specific `archive`/`fixtures` exclusions，或为每个 Check 发布重复默认对象。
