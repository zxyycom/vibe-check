# Scanner 依赖选择

本文拥有 `ScannerDependencySnapshot`、external scanner executable resolution、private adapter handoff 和
backend/cache identity。Project Definition 语义由 [Configuration](configuration.md) 拥有；Check/Record
semantics 由 [Quality Metrics](quality-metrics.md) 拥有。

## Current dependency boundary

Package Run pre-work 只为 canonical Resolved Check collection 中需要它们的 built-ins 解析 readonly dependency
snapshot。三个 private slices 分别是 `file`（scc）、`function`（Python/Lizard）和 `duplication`（jscpd）。每个
executable 使用同一固定 precedence：

```text
explicit Run Control
  > supported environment
  > Project Definition
```

受支持环境名只有 `VIBE_CHECK_SCC_CMD`、`VIBE_CHECK_LIZARD_CMD` 和 `VIBE_CHECK_JSCPD_CMD`；名称与 dependency
identifiers 由 current public-contract source 统一拥有。missing required binding 在 project applicability 或
runner work 前返回 secret-safe typed diagnostic，不回显 executable value。

Definition/controls 只提供 executable，不提供 scanner-native args、exit mapping 或 policy。Product 为 Lizard
固定追加 `-m lizard` 与对应 availability args，为 scc/jscpd 使用各自 owned protocol，并把 jscpd backend
concurrency 固定为 `4`。`*_ARGS`、旧 pinned variables、repository mise state 和 ambient `PATH` 都不是 resolution
source。

## Exact input adapter handoff

Package Run 把 resolved Check 的 approved exact paths、该 Check 的 semantic slice 和 dependency slice 交给
adapter。adapter 隔离 availability、subprocess、parser/reporter、raw output 和 scanner-private payload；scanner
executable、args、tool result 与 resolved path 不进入 declarative Check projection、fingerprint、Core snapshot 或
machine set。

每条 measurement 必须声明 slash-normalized source paths，且全部属于 approved list。任一越界 batch 在 record
conversion 前整体拒绝，不能发布 partial records。current 与 explicit comparison 各自使用冻结的 exact inputs，
但共享同一 invocation dependency resolution。

adapter 的正常结果只通过 Check-scoped `RecordSink` 形成 QualityRecords。availability、process、parse 或 scoped
input failure 由 Product Check adapter 映射为 owning Check 的 safe unavailable outcome；它不泄漏 raw scanner
material，也不建立另一套 execution or publication facts。

## Cache and replacement

Duplicate cache identity 只包含 consumer-owned measurement settings、exact-input fingerprint 与 backend identity；
不包含 policy/acceptance、report、project module path 或无关 sibling settings。Cache hit 仍重新验证 cached source
paths。替换 scanner 必须保持 dependency precedence、availability/failure projection、exact-input acceptance、
normalized Check contribution 和 cache identity contract。

## 验证

`src/product/scanner-dependencies/index.test.ts` 证明 closed precedence、resolved-Check-only resolution、secret-safe
missing input 及没有 repository/PATH fallback；built-in Check tests 证明 availability、exact scope、zero work、
reference 和 cache behavior。Product execution tests 证明 scanner failure 通过同一个 Check scope/Core terminal
contract 关闭，而不是绕过 Task engine 或 Core session。
