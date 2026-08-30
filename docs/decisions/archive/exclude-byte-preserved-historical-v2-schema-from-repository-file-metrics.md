---
title: 从仓库文件指标中精确排除保留字节的历史 v2 schema
status: archived
alignment: aligned
createdAt: 2026-08-30T14:06:36Z
purpose: 让 repository-private file-metrics 不以重写历史 v2 schema 的方式处理其不可拆分的单文件规模。
background: v2 run schema 的历史 identity 与 bytes 必须保留，而 current runtime、package 和消费者验证均已隔离该材料。
decision: 仅从 Gate 的 schemas-examples file-metrics 输入排除该 v2 run schema，并继续保留其严格 schema 校验与其余当前材料的指标检查。
tags:
  - configuration
  - workflow-policy
relations: []
---

## 目的

- 让 repository-private file-metrics 继续衡量可维护的 current schema/example 材料，而不要求为降低单文件行数而改变受历史 identity 约束的 v2 run schema bytes。
- 将例外限定为一个可复核路径，不把 historical 目录、current schemas、examples、其它 quality Checks 或 Gate aggregation 变成默认豁免对象。

## 背景

- `docs/schemas/historical/v2/vibe-check-run.schema.json` 的 `$id` 为 `urn:vibe-check:schema:run:v2`，当前 SHA-256 为 `5406c85d854cb4812c80797c255295d6a003849e887cf9bdcecc3699ad5f50a5`；它与创建提交 `ce93aec727eb007304976e8c1b481021292fea01` 和移入历史目录的提交 `ca15d1f539cde4ff212fa1d37511742cbdc78f39` 中的 bytes 相同。
- `hard-cut-prestable-machine-contracts.md` 要求不在同一 URN 下覆盖旧 schema bytes。该历史 run schema 有 1,557 个 code lines，超过 Gate `schemas-examples` area 的 500 行 low-decision allowance；拆分或重写会改变需要保留的历史材料，而不是恢复 current implementation 的职责边界。
- documentation schema registry 仍以 `HISTORICAL_SCHEMAS` 显式登记该文件，并使用 strict AJV compile 验证；package machine-material registry、candidate 与 external-consumer acceptance 只纳入 current v4 materials，不纳入该历史 schema。

## 决策

- 采用: 在 `scripts/project/gate/repository-quality-checks.ts` 的 repository-private `schemas-examples` **file-metrics** selection 中，仅排除 `docs/schemas/historical/v2/vibe-check-run.schema.json`。
- 采用: 保持 `docs/schemas/historical/v2/vibe-check-record.schema.json`、current `docs/schemas/*.schema.json` 和 `docs/examples/**` 的原有 selection；不排除 `docs/schemas/historical/**` 或其它目录。
- 采用: 不改变 file-metrics 的 `300 + 500/10` limits、non-blocking finding policy、duplicate/function/Markdown quality Checks、eligible selection 或 explicit `all` aggregate。
- 采用: 该例外不替代 historical strict compile，也不宣称有新的 byte-integrity checker。若该路径、SHA-256、URN、历史材料登记或 package-isolation 边界发生变化，必须重新审阅此例外，不能从本记录推导出对新历史材料的豁免。
