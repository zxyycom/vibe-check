# Scanner 依赖选择

本文拥有 `ScannerDependencySnapshot`、external scanner resolution、operational override、private adapter handoff、cache backend identity 与 replacement evidence。语义 config 由 [Configuration](configuration.md) 拥有，Check/Record/DecisionPolicy 由 [Quality Metrics](quality-metrics.md) 拥有。

## Current dependency boundary

一次 invocation 在 config/usage validation 后构造一个 readonly snapshot。current 与 explicit reference 使用同一 snapshot，但各自依照自己的 approved exact inputs 决定 Check applicability/work。snapshot 有三个 private slices：scc 用于 file、Python/Lizard 用于 function、jscpd 用于 duplication；scanner executable、args、availability、process protocol、CSV/JSON reporter 与 raw output 永不进入 public catalog 或 machine set。

内置 command binding 必须由正式 package host 在 invocation 前显式提供：仓库 Bun 入口通过
`mise.toml` 的 package-private `VIBE_CHECK_PINNED_SCC_CMD` 与
`VIBE_CHECK_PINNED_LIZARD_CMD` 注入锁定的 scc executable 与 Lizard virtualenv Python，并对
后者追加固定 `-m lizard`；受支持的公开 operational override 优先于对应 private binding，
因此嵌套或已激活的 mise 环境不会吞掉调用方显式选择。jscpd 固定使用 repository
`node_modules/.bin/jscpd`（Windows `.cmd`）。缺失
Lizard 或 scc binding 是 pre-work operational failure，不得退回 `PATH` 中的 `python`、
`python3`、`scc` 或其它同名全局程序；jscpd bounded concurrency 是 `4`。snapshot construction
不探测 executable，只有 applicable Check 才做 availability/work。

## Operational overrides

支持 `VIBE_CHECK_SCC_CMD`、`VIBE_CHECK_SCC_ARGS`、`VIBE_CHECK_LIZARD_CMD`、`VIBE_CHECK_JSCPD_CMD`、`VIBE_CHECK_JSCPD_ARGS`。non-empty `_CMD` 覆盖 package-private pinned binding；non-empty `_ARGS` 必须是 strings JSON array，在 snapshot boundary 一次解析；非法值以 typed operational failure/exit `2` 返回而不回显内容。override 不进入 semantic config、report 或 machine provenance。

## Exact-input adapter handoff

Product 为 selected applicable Check 提供完整 approved exact path list、semantic slice 与 dependency slice。adapter 为每条 measurement 产出 `ScopedMeasurement<T>` 的 opaque payload 和 slash-normalized `sourcePaths`；每条至少一个 path，且必须精确属于 approved list。任一越界 path 拒绝该 invocation 全部 batch，不能转换 partial records。adapter 隔离 unavailable、execution、parser/report 与 private protocol，向 Core 报告 Check-owned terminal facts。

function adapter 只处理 `.ts`、`.d.ts`、`.rs`；duplicate adapter 按 code area 接收 exact inputs、minimum tokens 与 private config。jscpd cache hit 必须重新构造并验证 source paths；cache identity 仅含该 consumer 的 semantic measurement settings、exact-input fingerprint 与 backend identity，不能把 report/acceptance 或无关 sibling settings 当作 cache-bust。

## 验证

当前测试覆盖 snapshot single-read、override validation、current/reference reuse、zero-work no probe、scanner failure、source-scope rejection、jscpd area/cache/concurrency 与 runtime import closure。替换 scanner 必须保持 exact-input、normalized Check contribution 与 cache identity contract。
