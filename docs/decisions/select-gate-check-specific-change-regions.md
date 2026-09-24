---
title: 按 Check 真实输入细化 Project Gate 变更选择
id: 260924-select-gate-check-specific-change-regions
status: active
alignment: aligned
createdAt: 2026-09-24T02:46:22Z
purpose: 避免共享宽泛 region 让无关 Check 占用日常 Gate 时间
background: 材料及质量 Checks 共用宽 flag，普通源码或文档变更会唤起不读取该变更的扫描
decision: 为各 Check 声明保守且可审查的实际输入 region，同时保留强制选择与 Git 不可用回退
tags:
  - performance
  - repository-automation
  - workflow-policy
relations:
  - type: 修订
    target: 260923-select-project-gate-required-checks-by-change
    summary: 以逐项输入 region 取代共享宽泛 flag
---

## 目的

- 默认 Gate 只唤起受当前文件变化或依赖变化影响的 Check，缩短日常反馈时间。
- 保留明确的全量和 focused 入口，不把增量运行误认为完整验收。

## 背景

- 前序决策把大部分 required Checks 接上 Git change snapshot，但五项材料检查共用覆盖全部 `src/**`、`scripts/**`、`docs/**` 的 `repository-material` flag；质量扫描也共用覆盖全部文档的 `quality-input` flag。
- Markdown lint 只读取 docs/changes Markdown，JSON Schema Check 只读取注册 schema 和 report examples，function metrics 只扫描 TypeScript。共享宽 flag 因此让无关检查占用调度 slot 与时间；20 秒本地硬阈值不能代替选择准确性。
- 生成型 machine example 确实依赖较广的 Product runtime，因此该项应继续保守覆盖 `src/**`；Markdown link 的任意 target 反向依赖尚未建模。

## 决策

- 采用: required 的材料、Markdown lint、质量扫描和 ast-grep rule tests 分别声明由 owner 的实际 corpus、实现入口和已知生成依赖确定的 change region。材料 Check 不再共用 `repository-material`，质量扫描不再共用 `quality-input`；共用的 project-files、data-boundary、Check/runtime 与脚本 helper 等依赖仍须保守纳入每个受影响的 region。
- 采用: schema-publication 关注发布 schema 与 v4 schema source；machine example 保守覆盖 `src/**`、其生成器、artifact 与 schema。JSON 和 Schema 内置 Check 关注各自 docs JSON/schema 输入和 owning Check 实现；Markdown lint 关注 docs/changes Markdown 与 lint 实现。
- 采用: 保留 Git snapshot 的 committed、rename/delete、staged、unstaged、untracked 与 unavailable 语义；无可信 Git evidence 时需要 changeFlag 的 required Checks 仍保守运行。focused preset 与 `--all` 不受 change flag 抑制，`materials-links-validator` 继续无条件 required，Markdown link validation 对任意变更运行完整 corpus。
- 不采用: 为追求计时数据而把已知 Product 生成依赖从 machine example region 排除，或将缺失 Git evidence 当作无变化。
