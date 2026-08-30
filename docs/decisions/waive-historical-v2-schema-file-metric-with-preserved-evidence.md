---
title: 保留证据地豁免历史 v2 Schema 文件指标
status: active
alignment: aligned
createdAt: 2026-08-30T17:34:10Z
purpose: 让仓库 Gate 继续测量历史 v2 run schema，同时以精确身份和理由保留其不可重写约束。
background: 该历史文件必须保持 bytes 与 URN，不应通过扫描前 glob exclusion 隐藏对应 Finding。
decision: fileMetrics 保留该 Finding，并用 exact path 与 metric waiver 使例外可审计。
tags:
  - configuration
  - workflow-policy
relations:
  - type: 拆分
    target: reconcile-finding-waivers-with-caller-defined-identities.md
---

## 目的

- 让 byte-preserved 历史材料仍进入 repository file-metrics 的实际输入与 Finding 集合。
- 将唯一例外限制在可核对的 path、metric 和 preservation reason，不扩大成历史目录豁免。

## 背景

- `docs/schemas/historical/v2/vibe-check-run.schema.json` 的 identity、URN 与 bytes 必须保持，无法通过拆分或重写消除单文件规模 Finding。
- 旧 `schemas-examples` glob exclusion 会在 SCC 前移除材料，无法证明 scanner 实际测量或例外仍准确命中。

## 决策

- 采用: repository Gate 的 `fileMetrics` 继续把历史 v2 run schema 交给 SCC，并保留完整 measurement、Finding 与 Record evidence。
- 采用: 仅以 `{ metric: "code-lines", path: "docs/schemas/historical/v2/vibe-check-run.schema.json" }` 精确身份匹配该历史文件的 code-line finding，并记录其历史 bytes 与 URN 必须不变的非空 reason。
- 采用: applied waiver 保留 Finding 与理由并使其不计入 blocking finding；unused 或 overmatched waiver 产生可见 audit，不能静默隐藏 Finding。
- 采用: 该例外不扩大到其它 v2/v3 材料、当前 Schema、其它 metric 或其它 Check；若 preservation 义务失效，应删除 waiver 而不是改宽 identity。
- 不采用: 用 directory glob、aggregate exclusion、提高全局阈值或跳过 SCC 来隐藏该 Finding。
