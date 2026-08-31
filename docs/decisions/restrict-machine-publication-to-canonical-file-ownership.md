---
title: 将 machine publication 限于 canonical file ownership
status: active
alignment: aligned
createdAt: 2026-08-31T15:26:59Z
purpose: 让显式 machine target 中调用方已有的 legacy-named 文件不被 v4 publication 删除。
background: root 外或 absolute target 是可信调用方选择，runtime 删除旧人读文件会越过 v4 的 canonical two-file ownership。
decision: publisher 只替换或失败清理 run.json、records.ndjson 和私有 temp；不删除 legacy-named 或其它调用方文件。
tags:
  - product-contract
relations:
  - type: 修订
    target: treat-run-output-directories-as-explicit-trusted-targets.md
---

## 目的

- 让 machine v4 在任意明确 target 中保持精确、可审计的文件 ownership。

## 背景

- v4 的可信集合仅由 `run.json` 与 `records.ndjson` 组成，private temp 仅服务其 publication。
- 目录 target 可以由 Definition 或 RunControls 指向已有、root 外的调用方目录，因此遗留名称不等于 Product-owned 文件。

## 决策

- 采用：保留相对/绝对 trusted target grammar、独立 diagnostic logging 和非-sandbox 边界。
- 采用：成功 publication 仅替换 canonical pair；handled partial failure 仅清理可能混合的 canonical files 与 owned temps。
- 不采用：删除 `metrics.json`、`report.md`、`warnings-all.ndjson`、`warnings.ndjson` 或任何其它调用方文件的 legacy cleanup。
