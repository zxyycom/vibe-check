---
title: 让重复检测 adapter 独占 CLI 协议与执行调优
status: archived
alignment: aligned
createdAt: 2026-08-28T05:40:11Z
purpose: 让 duplicateDetection 只暴露区域政策和 executable 选择，不把 jscpd CLI 协议或性能旋钮变成产品配置。
background: public workers 虽是合法 jscpd 参数，但没有产品行为需求；version、config、output 与扫描阈值则是 adapter 形成可信 measurement 的内部步骤。
decision: duplicateDetection 只暴露区域政策和 executable；adapter 固定版本探测、exact-input JSON 协议与自动 worker policy。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: construct-duplicate-detection-from-defaulted-policy.md
---

## 目的

- 让 consumer 只配置重复检测的区域、文件范围、显著性阈值和明确授权的 custom executable。
- 区分必须保留的 measurement protocol 与没有产品需求的 scanner tuning，避免“工具支持”自动扩张成 public capability。
- 让 private command data 以真实调用职责命名，不再看起来像可透传的 public arguments。

## 背景

- `duplicateDetection(options?)` 已负责补齐 cache、area files/thresholds 与 package/custom command defaults，并返回普通 Check。
- jscpd 5.0.11 的 `--version`、`--config`、`--output`、`--workers` 都是真实 CLI 能力，但它们不具有相同的产品意义。
- version probe 的结果进入 raw-cache identity；临时 config 承载 exact paths、最低 line/token 阈值与 JSON reporter policy；临时 output directory 是可信读取结构化 report 的隔离边界。
- worker 数只影响一次扫描的执行调优。当前没有 consumer budget、benchmark 或部署约束要求覆盖 jscpd 的 `auto` policy，repository dogfood 也不配置它。

## 决策

- 采用: `duplicateDetection(options?)` 继续是带默认值的专用 constructor；每个 `codeAreas[id]` 继续拥有可默认化的 files、line threshold 与 token threshold。
- 采用: public `scanner` branch 只允许可省略的 `command`，command 恰为 `{ kind: "package" } | { kind: "custom", executable }`。不公开 args、availability args、workers 或其它 jscpd tuning。
- 采用: resolved Check scanner options 恰为 `{ command }`。adapter 不传 `--workers`，固定沿用锁定 jscpd 的自动 worker policy。
- 采用: adapter 保留 version probe，用结果区分 tool availability 并形成 raw-cache identity；保留临时 config 以传递 exact-input paths、最低有效 line/token 阈值与 report policy；保留隔离 output directory 以读取 JSON report。它们是 private measurement protocol，不是 constructor fields。
- 采用: package command 的 scan-prefix argument 只用于执行 package manifest 声明的 bin target；custom executable 直接接受 adapter 生成的 jscpd arguments，不支持 consumer prefix arguments。
- 采用: private command fields 使用 `scanPrefixArguments` 与 `versionArguments` 表达实际职责，不沿用看似公共透传能力的 `args` / `availabilityArgs` 名称。
- 采用: 只有以后出现明确的执行 budget、profiling evidence 或部署约束，才重新评估 worker policy；工具自身支持某个 flag 不构成 public API 理由。
