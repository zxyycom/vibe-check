---
title: "csv-parse 7.0.1 至 7.0.3 升级价值"
id: "261021-assess-csv-parse-upgrade"
formedAt: "2026-10-21T03:30:06Z"
question: "csv-parse 的新增修复对本项目 SCC CSV 数组解析是否值得采用？"
tags:
  - "csv-parse"
  - "dependency-upgrades"
  - "file-metrics"
relations: []
---

## 形成时背景

调查时，根声明 `^7.0.0`，实际安装与 lockfile 为 `7.0.1`，不能用声明下限 7.0.0 作为基线。[发布 manifest](../../scripts/package/artifact/release-manifest.json)将 7.0.1 精确用于运行时；[parseCsvRows](../../src/package-checks/host-environment/csv.ts)消费 `csv-parse/sync`，为 SCC 输出生成字符串矩阵。

## 调查目的

确定新增修复、当前暴露面与最低成本验证，不将上游漏洞存在等同当前路径可利用。

## 调查范围与依据

2026-10-21 UTC 读取 [npm latest](https://registry.npmjs.org/csv-parse/latest)与维护者 [7.0.3 changelog](https://github.com/adaltas/node-csv/blob/csv-parse%407.0.3/packages/csv-parse/CHANGELOG.md)。最新稳定候选 `7.0.3`，在根声明范围内；读取本地 parseCsvRows 和 [SCC parser](../../src/package-checks/file-metrics/scc/parser.ts)。

## 调查结果与边界

**建议：优先做低成本维护升级到 7.0.3，但不按已确认可利用漏洞紧急处理。**

7.0.2 修复 `columns` 可达的 prototype replacement，并减少 ResizeableBuffer.toString 的无谓分配；7.0.3 修正 typed column keys 和 delimiter_auto callback 类型。当前调用只设置 BOM、宽松列数、跳过空行和 trim，返回数组且未启用 `columns`、`objname`、delimiter_auto，因此未确认该漏洞可由现有 SCC 路径触发；列类型修复也不是当前明确收益。仍值得在同 major 小补丁窗口收敛已知缺陷，不能承诺未测量的提速。

升级时同步根锁定与发布 manifest，跑 CSV/SCC parser 与 fileMetrics 实际 Run，重点保持 quoted comma/newline、BOM、CRLF、空行、宽松列数和非字符串拒绝；再验证 candidate 的 Node 24 运行时依赖。未安装或执行新版本，当前用途下的性能、语义完全等价和漏洞不可达均未被动态证明。
