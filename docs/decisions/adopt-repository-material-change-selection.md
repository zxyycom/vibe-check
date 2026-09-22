---
title: 采用 repository-material 变化选择
id: 260922-adopt-repository-material-change-selection
status: active
alignment: aligned
createdAt: 2026-09-22T17:02:29Z
purpose: 让 Gate 的输入闭合材料 Checks 共享保守的变更选择边界
background: 材料生成会读取 Product 与 shared scripts，但默认 required 仍静态执行
decision: 用覆盖 src 和 scripts 的 repository-material region 选择闭合 Check，并让 links 保持全量
tags:
  - configuration
  - repository-automation
  - workflow-policy
relations: []
---

## 目的

- 让日常 Project Gate 只在可信 repository-material 变化时运行输入闭合的材料验收，同时保留可恢复的完整验收入口。

## 背景

- `materials` preset 和 `materials-*` Check identity 已按 repository-material owner 固定，但 required 此前不区分材料变化。
- Product 已在一次 preparation 中提供 effective flags、可信零匹配和 unavailable 的保守注入；Gate 不应重建 Git acquisition 或 flag DSL。
- Markdown source 可以指向 region 外的 repository target。尚未建立反向 target 依赖前，仅凭 source path 选择 links 会漏掉删除或移动 target 的失败。

## 决策

- 采用: Gate 声明保守的 `repository-material` region，覆盖材料正文、材料映射/配置、全部 `scripts/**` provider/shared script 与全部 `src/**` Product 输入；schema/example publication 会读取 Product schema、serializer 和执行模型，不能只以 checked-in docs/provider path 判断。其 changed、rename、delete、staged、unstaged 与 untracked evidence 都由同一次 Product preparation 投影。
- 采用: `materials-json-validator`、`materials-schema-validator`、`materials-schema-publication-validator` 与 `materials-examples-validator` 使用 `(required AND changeFlag("repository-material")) OR materials OR all`，并保留 `propagateDependsOn: true`。可信零匹配保持 not-applicable，Git unavailable 保守运行，`--materials` 与 `--all` 始终强制运行。
- 采用: `materials-links-validator` 保持 required/materials/all 的全量 membership；quality focused selection 保持由 quality preset 决定。只有反向 link target 关系获得完整、可验证模型后，才可重新评估该保守边界。
