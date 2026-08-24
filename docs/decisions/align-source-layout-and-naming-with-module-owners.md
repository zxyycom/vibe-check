---
title: 让源码布局与命名共同表达模块 owner
status: active
alignment: aligned
createdAt: 2026-08-24T02:13:05Z
purpose: 让 Product 与仓库脚本的目录、文件、入口和导出名称共同表达实际模块 owner，避免路径整理后仍保留模糊命名。
background: Product 与 scripts 存在历史包装层、职责错位和大量 index 入口；只移动目录会保留查找成本，并可能把已取消的 CLI 固化为一级模块。
decision: 以 owner 层级和领域职责同时约束目录与命名，仅保留显式批准的 index 入口，移除临时 Product CLI diagnostic。
tags:
  - configuration
  - workflow-policy
relations: []
---

## 目的

- 让维护者和 agent 从目录、文件名、入口名与导出名直接恢复 Product runtime、repository automation、public entry、private consumer 和 package delivery 的唯一 owner。
- 让同级模块位于同一父目录，并让 owner 内文件以具体领域职责命名；目录迁移不能只改变层级而保留 `index`、`tools` 或其它上下文不足的名字。
- 在首次公开发布前移除已取消 Product CLI 的临时 migration diagnostic，不把短期兼容残留固化为目标模块。

## 背景

- `src/` 当前只有 `product/` 一个 source category，因此 `src/product/**` 没有区分价值，却让 Product 的一级模块整体下沉一层。
- public package entry 当前由 `scripts/package-candidate/entry.ts` 承接；Product 内部与 scripts 中还存在多个 `index.ts`，其中部分只是目录默认入口，文件名本身无法表达执行、验证、编排或投影职责。
- `quality-core/` 同时容纳 Core facts、built-in Check execution、input、measurement、output 与已退役 scan-command 命名；repository quality、Project Gate、package candidate 和共享脚本能力也跨多个不对称目录分布。
- Product CLI 的 scan/init 能力已经取消，当前 `src/product/cli/index.ts` 和 `product:cli` 只返回 migration diagnostic。继续规划 `legacy-cli/` 一级目录会把临时残留误写为长期 owner。
- 目录名、文件名和导出名共同构成源码检索界面。只审查目录而机械保留 basename，会让目标结构仍依赖调用方记忆上下文。

## 决策

- 采用: `src/` 是唯一 Product runtime source root，并直接包含 `definition`、`checks`、`core`、`run`、`output`、`scheduler`、`foundation` 与 `contract` 等一级模块；不保留只有一个 source category 的 `product/` 包装层，也不建立 `legacy-cli/`。
- 采用: `src/index.ts` 是当前唯一预先批准的 `index.ts`，因为它承接 npm package 的 public export root。其它 `index.ts` 默认不保留、不新增；只有某个外部工具或稳定消费契约确实要求目录默认入口、且 owner 文档逐项记录理由和验证时，才能形成新的显式例外。
- 采用: 目录使用稳定领域 owner 名词；文件使用能够区分具体能力、动作、结果或边界的名称；导出名称表达领域对象或动作。迁移账本同时记录目标目录、目标 basename、主要导出和命名理由，不以 move-only 为由自动继承旧名。
- 采用: `current`、`model`、`types`、`common`、`shared`、`utils`、`helpers`、`tools`、`workflows` 和裸 `index` 等上下文不足的名称不能作为默认容器；只有名称在局部 owner 内具有单一、可验证含义时才可保留，并由 ledger 记录该含义。
- 采用: `scripts/` 是 repository automation source root；`development`、`environment`、`foundation`、`validation`、`docs`、`package`、`project`、`decision-records` 与 `test-evidence` 分别承接当前职责。脚本入口使用描述行为的文件名并由 root command 精确指向，不按“一个目录一个 index”机械生成入口。
- 采用: built-in Check execution 与 scanner/input/measurement 由 `checks` 拥有，Check/Record final facts 与 session 由 `core` 拥有，machine publication 由 `output` 拥有；repository quality 与 Project Gate 作为 `scripts/project/` private candidate consumer 下的同级模块。
- 采用: package artifact build/manifest/pack/audit 与 local candidate cache/receipt/install 分别由 `scripts/package/artifact` 与 `scripts/package/candidate` 承接；package 不反向调用 project consumer，Product source 不导入 `scripts/**`。
- 采用: 删除临时 Product CLI diagnostic 的源码、root command、当前 owner 文档和语义 Case，不把它迁入目标结构；public package 继续只提供程序化 API，且不发布 CLI 或 bin。
- 采用: 迁移除已明确退出的临时 CLI diagnostic 外保持产品行为、public runtime/type inventory、Project Definition、Run、candidate tarball 与 Gate facts不变，并同步当前 owner 文档、配置、测试实体与 Case 引用；形成时 archive 保留原路径和名称。
- 不采用: 仅移动目录但机械保留旧 basename、为每个模块建立 `index.ts`、按文件类型建立 controller/service/utils 层、恢复独立 foundation package，或借命名整理改变 public contract、scanner 语义与发布授权边界。
