---
title: 让文件指标 adapter 独占 SCC CLI 协议
status: active
alignment: aligned
createdAt: 2026-08-28T06:39:32Z
purpose: 让 fileMetrics 只暴露 SCC executable 选择，不把版本探测、输出格式或参数透传变成产品配置。
background: 当前公共 scanner options 暴露 args 与 availabilityArgs，允许调用方改变可信 measurement 协议并扩大 scanner 输入。
decision: fileMetrics scanner policy 只保留 executable，版本探测、CSV 参数、exact paths 与 timeout 全由 SCC adapter 固定。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让 consumer 只选择项目已授权且直接接受 SCC CLI 参数的 executable。
- 保持 version probe、by-file CSV output、exact inputs 与 process timeout 是 private measurement protocol。
- 防止参数透传在 exact-input acceptance 之前扩大 scanner 读取范围或改变 parser contract。

## 背景

- 当前 `FileMetricsScannerOptions` 公开 `executable`、`args` 与 `availabilityArgs`，adapter 把公共 args 拼在固定 CSV 参数和 exact paths 之前。
- `--version`、`--by-file` 与 `--format csv` 不是 file-size policy；它们只服务 dependency availability 与可信结构化 measurement。
- Check options 仍需拥有 Check-specific execution dependency，但拥有 executable 不要求把其私有调用协议一起公开。

## 决策

- 采用: public constructor input 与 resolved `fileMetrics` scanner options 只包含非空 `executable`，默认值为 `scc`。
- 采用: custom executable 必须直接接受 SCC CLI 参数；需要 prefix arguments 的通用 runtime 不属于受支持 command，项目可以提供显式授权的 wrapper executable。
- 采用: SCC adapter 固定 version probe、`--by-file --format csv`、approved exact paths 与 timeout，不提供 public scan args、availability args、format、exclude 或 tuning passthrough。
- 采用: repository dogfood 可以通过锁定工具环境解析默认 `scc` command；环境与 Run Controls 不隐式改写 Check options。
- 采用: SCC adapter 与 jscpd、Lizard adapter 保持 owner-local，不建立 scanner registry、共享 backend interface 或 Product-wide command grammar。
