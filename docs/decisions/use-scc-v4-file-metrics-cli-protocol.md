---
title: 让文件指标 adapter 固定 SCC v4 CLI 协议
status: active
alignment: aligned
createdAt: 2026-09-01T13:33:54Z
purpose: 让 fileMetrics 以 SCC 4.0.0 的精确版本和可复现的私有 CLI 协议形成可信文件计量。
background: SCC v4 改变安装 module、Go 基线和部分计量实现，并支持 ambient config discovery；旧的 v3 协议不能再证明相同 measurement 边界。
decision: fileMetrics 只公开 executable；adapter 固定 SCC 4.0.0 和 --no-config，不保留 v3 fallback 或 public config。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: let-file-metrics-adapter-own-cli-protocol.md
---

## 目的

- 让 consumer 只选择项目已授权且直接接受 SCC CLI 参数的 executable，同时让 fileMetrics measurement 可复现。
- 保持 SCC 版本、config isolation、by-file CSV 输出、exact paths 与 timeout 是 owning adapter 的 private protocol。

## 背景

- SCC 4.0.0 使用 `/v4` Go module、要求 Go 1.26.4，并修正了 Rust `?` 等语言的 Complexity 计量。
- SCC v4 会从 `SCC_CONFIG_PATH` 和项目 `.sccconfig` 发现 ambient config；其中 `--cognitive` 等选项可以改变 CSV contract 或 measurement。
- 双版本 corpus 证明当前 Product 不需要 remap、generated、ignore 或 complexity 的非默认语义；空 private config 不会增加可维护的产品含义。

## 决策

- 采用: public constructor input 与 resolved fileMetrics scanner options 继续只包含非空 executable，默认值为 `scc`；不新增 SCC flags、config、reporter 或 metric public surface。
- 采用: custom executable 必须返回精确 `scc version 4.0.0` 并直接接受 adapter-owned CLI 参数；SCC 3.7.0 command 有意结算为 unavailable，不保留 fallback 或版本范围。
- 采用: SCC adapter 固定 `--version` probe 与 `--no-config --by-file --format csv <approved exact paths...>` measurement。`--no-config` 禁止 ambient config discovery；exact paths 始终来自 Check-owned accepted input，不来自 config。
- 采用: 不创建 Product-owned private SCC config，除非后续差分证明 v4 default 无法表达稳定 Product semantics；任何这样的 config 仍是 adapter 私有，不接受 consumer input。
- 采用: SCC adapter 与 jscpd、Lizard adapter 保持 owner-local，不建立 scanner registry、共享 backend interface 或 Product-wide command grammar。
- 采用: 当前 consumer contract 由 [`docs/checks/file-metrics.md`](../checks/file-metrics.md)、adapter boundary 由
  [`docs/scanner-dependencies.md`](../scanner-dependencies.md) 持有；本 Decision 只保存可持续的 hard-cut 与 ownership 判断。
  `upgrade-scc-file-metrics-to-v4` 的 differential evidence 只证明该次 Linux migration，不扩大为所有平台、所有语言或
  future SCC release 的兼容性承诺。
