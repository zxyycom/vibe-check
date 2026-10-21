---
title: "Oxfmt 0.74.0 升级价值与格式漂移"
id: "261021-assess-oxfmt-upgrade"
formedAt: "2026-10-21T03:31:13Z"
question: "Oxfmt 0.63.0 至 0.74.0 是否值得升级，哪些改动会实际影响当前显式格式目标？"
tags:
  - "dependency-upgrades"
  - "formatting"
  - "oxfmt"
relations: []
---

## 形成时背景

调查时，根声明 `^0.63.0`，lockfile/安装 `0.63.0`。[format.ts](../../scripts/development/format.ts)只处理[显式 targets](../../scripts/development/format-targets.ts)：TS、JSON、YAML、TOML 等，不含普通 Markdown 文档；[.oxfmtrc.json](../../.oxfmtrc.json)关闭 import/package sorting。

## 调查目的

评估注释与格式正确性，区分未消费的新 Markdown formatter 和实际格式基线变动。

## 调查范围与依据

2026-10-21 UTC 读取 [npm latest](https://registry.npmjs.org/oxfmt/latest)、官方 [0.64.0 所在发布](https://github.com/oxc-project/oxc/releases/tag/apps_v1.79.0)、[0.72.0](https://github.com/oxc-project/oxc/releases/tag/oxfmt_v0.72.0)、[0.73.0](https://github.com/oxc-project/oxc/releases/tag/oxfmt_v0.73.0)、[0.74.0](https://github.com/oxc-project/oxc/releases/tag/oxfmt_v0.74.0)。最新稳定 `0.74.0`；它不在 `^0.63.0`（小于 0.64.0）范围内，需显式选择新 minor。Node `^20.19.0 || >=22.12.0` 支持 Node 24。

## 调查结果与边界

**建议：可选单独维护升级，先 check/diff，不与语义改动混入大规模自动重排。**

新版确证修复 union/EmptyStatement 周边注释、JSDoc cast/description/code span、embedded snippet LF、YAML document marker/front matter 与无效 JSON 不应被丢弃等。这些与当前 TS 注释和配置格式目标有交集，具有正确性价值，但未在当前语料发现损坏。0.72 把 Markdown parser 切至原生 formatter，0.73 改 prettier migration/TOML；普通 Markdown 当前不在 targets，不能把 Markdown 改善作为本仓库直接提速理由。sort-imports fixes 也不能归为已关闭功能的收益。

如果采用 0.74.0，先在授权后的隔离工作区跑 `bun run format -- check` 并审阅 TS/JSDoc/YAML/TOML 差异；只在确认后执行写入，保持 source mapping/fixtures 的排除与语义不变。运行 Oxfmt failure-records/Gate tests 和 validate，不为追新临时扩大 targets。当前没有安装/运行新版，格式漂移大小、round-trip 完整性或速度尚未证明。
