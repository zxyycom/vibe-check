---
title: 让 package machine 文档只承接消费契约
status: archived
alignment: aligned
createdAt: 2026-08-29T02:17:38Z
purpose: 让安装包只交付读取 machine publication 所需的契约、schema 与代表性 bytes。
background: Output guide 的仓库维护章节和四份重复示例 README 增加了安装包阅读负担，却不改变 consumer 的读取动作。
decision: 将 machine consumer 契约与仓库维护说明分开，package 示例只交付每组完整 publication bytes。
tags:
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: ship-current-machine-contract-materials-in-the-package.md
---

## 目的

- 让 package consumer 从 `docs/output.md` 直接恢复 current machine publication 的读取顺序、字段、完整集合验证、并发读取边界和版本范围。
- 继续随 runtime 交付 current schemas 与四种 terminal outcome 的完整 two-file examples，同时移除只服务仓库维护的重复说明。
- 让 publisher、progress renderer、schema/example 生成和 repository validation 的实现说明留在不会随 package 发布的明确 owner。

## 背景

- `docs/output.md` 的标题和开头承诺 consumer machine contract，但后半篇主要说明 source modules、candidate writes、TTY renderer 和 repository validators，篇幅重心偏离 package consumer 的读取任务。
- 四个 example directories 各自包含一份结构相同的 README；scenario 差异只有 outcome、Record 数和固定 invocation，适合在 output guide 中集中说明。
- Package README 已是唯一总入口，既有分级决策也明确不把仓库维护和打包流程混入 consumer package 文档。
- `run.json` 与 `records.ndjson` bytes、current schemas 和 complete-set fingerprint 已完整承接 machine example 的可验证事实；每目录 README 不是 publication set 的组成部分。

## 决策

- 采用: `docs/output.md` 只承接 package consumer 的 current machine publication 契约；repository implementation、progress renderer 和 material generation/validation 说明移入 repository-only `docs/output-maintenance.md`，两者不复制同一规则。
- 采用: Package 继续交付 `docs/output.md`、两份 current v4 schemas，以及四个 scenario 目录中的 `run.json` / `records.ndjson` 完整 publication sets。
- 采用: 四个 scenario 的目的、outcome 与 Record 差异在 `docs/output.md` 的一个集中表格中说明；不再生成或随 package 交付每目录 README。
- 采用: Candidate fingerprint、staging、tarball、installation 与 ancestry-external acceptance 继续逐字节验收上述 closed material registry；零字节 NDJSON 的处理不变。
- 采用: README 仍是唯一 package 总入口；本次收敛不新增 package index、artifact reader、machine DTO、compatibility fallback 或第二份 consumer contract。
