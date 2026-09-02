---
title: 将历史 Schema 移出可维护性指标
status: active
alignment: aligned
createdAt: 2026-09-02T06:42:06Z
purpose: 让不可改写的 historical Schema 保留完整性证据，但不产生无法通过维护动作消除的质量提示。
background: 历史 Schema 的 bytes 与 identity 必须保留，file 和 duplicate metrics 因此不能提供可行动整改。
decision: 仓库质量范围排除 historical Schema，显式 strict validation 继续拥有其完整性与兼容性证据。
tags:
  - configuration
  - workflow-policy
relations:
  - type: 替代
    target: waive-historical-v2-schema-file-metric-with-preserved-evidence.md
---

## 目的

- 让 repository quality metrics 只衡量可以通过当前维护动作改善的文件。
- 继续验证 historical Schema 的结构、身份和兼容性，不把质量范围排除误解为删除历史证据。

## 背景

- `docs/schemas/historical/**` 保存不能在原 identity 下重写的历史契约；拆分、格式化或改写这些文件会破坏历史 bytes，而不是改善当前实现。
- 现行做法让历史 v2 run Schema 进入 file metrics，再用单条 waiver 接受超限；duplicate waiver 扩展后，同一文件还会产生多项内部重复候选。
- documentation validation 已通过显式 `HISTORICAL_SCHEMAS` registry 对历史文件执行 strict schema compile；当前 package material registry 只发布 current v4 contract。

## 决策

- 采用: Project Gate 的 duplicate detection 与 file metrics 从各自 `schemas-examples` selection 中排除 `docs/schemas/historical/**`；不为这些被排除的质量指标配置 waiver。
- 采用: documentation validation 继续显式登记并严格验证 historical Schemas；历史 identity、bytes 或 registry 约束由其既有 owner 承接，不因质量排除而减弱。
- 采用: current Schemas 与 examples 继续进入适用质量指标；本决策不建立任意 `historical` 目录的 package 公共默认排除。
- 采用: 项目治理的 `**/archive/**` 排除继续由 repository-owned file defaults 配置；公共 `defaultProjectFileSelection` 不假定普通 `archive` 目录一定不是业务源码。
- 不采用: 继续扫描后逐条 waiver historical metric Finding，或从完整性/schema validation 中移除历史材料。
