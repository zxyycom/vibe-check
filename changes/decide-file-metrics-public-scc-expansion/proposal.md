# Proposal

本 Draft 只评审 SCC 4.0.0 migration 之后，`fileMetrics` 是否值得形成新的 public capability；它不授权当前 runtime 变化。

## Why

当前 `fileMetrics` 只公开 `scanner.executable`。SCC v4 的 config、language remap、generated-file handling、complexity
modes 和其它 CLI capability 都可能改变 measurement contract、exact input、cache identity 或 consumer compatibility。
直接透传 flags 或 config 会把 adapter-owned protocol 误变成 Product policy。

已完成的 SCC migration evidence 只确认 SCC 4.0.0、`--no-config`、十列 CSV，以及 Rust `?` Complexity `0 → 1`。
它不证明存在新增 public capability 的 consumer 需求，也不授权 API 或 runtime 改动。

## Outcome

对每个具体 SCC-related candidate，先确认 consumer outcome、唯一 owner、compatibility、validation、cache identity 和
installed-consumer evidence，再决定是否形成独立 public contract。默认结论保持 executable-only；没有真实 consumer
case 能满足这些条件时，以“不扩张”结束，不为预置 capability 建立抽象。

当前 stable consumer contract 由 [`docs/checks/file-metrics.md`](../../docs/checks/file-metrics.md) 持有，scanner-private
boundary 由 [`docs/scanner-dependencies.md`](../../docs/scanner-dependencies.md) 持有。本 Draft 只承接未来判断：它不阻塞
Lizard 或当前 scanner implementation。
