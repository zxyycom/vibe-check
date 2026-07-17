# Quality Metrics

本文是 Vibe Check 基础质量指标、warning channels、baseline comparison 和质量状态的 owner
文档。它维护 Product Core / Scanner 在 normalized scan scope 后如何生成 metrics、聚合
report data、产生 warnings，并计算 `passed` / `warning` / `failed` 状态。

Output 只投影本文定义的 report data；CLI 只负责参数、入口和最终状态映射。本文不拥有
project-root 解析、scan scope 路径规则、artifact 序列化格式或 scanner dependency 选择。

## 实施状态

当前 owner 是 `src/product/**` 下的 TypeScript/Bun quality core。默认 thresholds、code
areas、scanner commands、artifact paths 和 profiles 由 `src/product/config.ts` 唯一拥有；
`src/product/quality-core/**` 提供 quick / full、optional baseline comparison、scc、
Python/Lizard、jscpd、warning channels、cache 和 artifacts。已退役的 Rust metrics /
warning contract 不属于当前产品行为或测试来源。

## Pipeline boundary

当前 TypeScript product pipeline 顺序：

```text
collect + classify normalized scan scope
  -> build input fingerprints and changed-file scope
  -> run scc + Python/Lizard (+ jscpd in enabled profiles)
  -> normalize scanner results and raw artifacts
  -> aggregate metrics
  -> optionally scan/compare baseline
  -> generate all / changed / regression warning channels
  -> write report artifacts
  -> validate metrics
  -> calculate passed / warning / failed status
```

Scanner inputs 只能来自 normalized scan scope。Adapter 不重新发现 project root，不重新应用
include / exclude，也不把第三方输出结构交给 aggregation、warning 或 Output。

## Vibe Check-owned models

Product Core 使用仓库自有模型隔离 scanner protocol。现有模型包括：

- `FileMetric`：path、language、code area、changed 标记、lines、可用的 code/comment/blank
  lines，以及 Vibe Check-owned decision-token metric。
- `FunctionMetric`：file、code area、stable function name、start/end line、Lizard NLOC、
  parameter count、cyclomatic complexity 和 changed 标记。
- `DuplicateCodeFragment`：stable id、token/line count、归一化 locations、涉及的 code
  areas 和 changed-scope 标记。
- `FatalIssue`：tool、phase 和可行动 error。

这些类型属于 product core contract。scc CSV record、Lizard CSV row、jscpd reporter
object、process result、临时 config 和 component-private data 不得越过 adapter boundary。

## scc file metrics boundary

现有 TypeScript product config 解析 scc command。Adapter 运行 by-file measurement，把
scc output 归一化为 `FileMetric`，并保留 file code lines、comment/blank lines、language
和 decision-token input。

scc 的 CSV header、language taxonomy、native error 和 process protocol 只属于 adapter。
Availability preflight 失败继续按现有 behavior 记录并跳过 scc；已进入 invocation 后的
未知 header、不可解析 output 或执行失败进入既有 normalized failure channel，不能被当成
zero metrics。

scc command、args、file-line thresholds、decision-token allowance、aggregate 公式和 raw
artifact 都属于当前 product contract；修改时必须同步对应 owner 与测试。

## Python/Lizard function metrics boundary

Structural scanning 使用 product config 解析的 Python/Lizard component。当前产品
通过 Python command 与 `-m lizard` 调用 Lizard，并解析 CSV；process 和 parser behavior
由现有 adapter tests 验证。

Product core 只向 adapter 传递 normalized scan scope 中受支持的 `.ts` / `.d.ts` 和 `.rs`
exact paths。`.go`、`.py`、`.tsx`、`.js` 和 `.jsx` 不在 pinned TypeScript selector 中。
Adapter 不扫描 project root，也不接收被 scope rules 排除或 unsupported 的文件。

Adapter 向 core 返回 Vibe Check-owned `FunctionMetric` 或 normalized failure。Lizard
process protocol、CSV output 和 private fields 留在 adapter 内；为了复现行为保存的 raw
material 只属于 scanner artifact，不成为稳定 product output field。

现有 parser 归一化 function name、file path、line range、NLOC、parameter count 和
cyclomatic complexity。Lizard 保持 external component；parser、function identity、
threshold 或 warning algorithm 的变化必须作为对应 scanner / metrics contract 变更处理。

## jscpd duplicate boundary

Duplicate scanning 使用 product config 解析的 jscpd component。当前 TypeScript adapter
按 code area 规划任务，把 product core 已批准的 exact paths 写入私有临时 config，调用
repository-managed jscpd CLI，并解析 JSON reporter output。

Adapter 向 core 返回 Vibe Check-owned `DuplicateCodeFragment` records 或 normalized
failure。临时 config、CLI process protocol、reporter JSON 和 private configuration 留在
adapter 内；raw reporter output 即使为复现而保存也只能作为 scanner artifact，不能成为
stable product output field。

以下边界保持现有行为：

- quick profile 跳过 jscpd；启用 duplicate scanning 的 profile 继续按 configured code
  area、format 和 minimum-token values 运行。
- format 为 `null` 时省略 format override，并不跳过至少有两个 exact inputs 的 area；被
  scan scope 排除的 paths 不进入 task，没有足够 inputs 的 area 正常跳过。
- availability preflight 失败继续记录并跳过 jscpd；已进入 invocation 后的 non-zero
  execution、缺失 report 或 parse failure 不伪装成 successful empty duplicate result。
- duplicate fragments 的 location、token count、code area、ordering、cache identity 和
  warning mapping 保持 pinned TypeScript source 的实现。

当前产品不采用或保留已退役 Rust duplicate integration contract。

## Aggregation

Aggregation 只消费 Vibe Check-owned metrics，并保持现有 TypeScript shape：

- overall totals：files、lines、functions，以及可用的 code lines、decision tokens、
  function lines/complexity/parameters 和 duplicate fragments。
- by-language totals：files、lines、code/comment/blank lines。
- by-code-area totals：warning policy、files、lines、functions 和可用的 scanner totals。
- current/baseline fingerprints、baseline metadata、comparison status 和 trends。

缺失的可选 scanner value 保持现有 `null` / omitted semantics，不得用猜测值补齐。排序、
fingerprint、baseline identity、cache key 和 comparison algorithm 由当前产品实现和测试
共同验证。

## Warning rules and channels

现有 TypeScript core 从 current metrics、changed scope、optional baseline、absolute floor
和 changed delta 生成三个 channels：

- `all`：当前 scan 的全部 warning records。
- `changed`：按现有 scope / comparison policy 选出的 changed warnings。
- `regressions`：超过 configured delta floor 的 changed warnings。

规则集合保持 pinned source 与 product config 不变：

| Rule | Source |
| --- | --- |
| `scc-file-code-lines` | file code lines 与 decision-token-aware floor |
| `lizard-cyclomatic-complexity` | function cyclomatic complexity |
| `lizard-function-code-density` | Lizard NLOC 与 complexity-aware floor |
| `lizard-parameter-count` | function parameter count |
| `jscpd-duplicate-code` | normalized duplicate fragment |

Code-area warning policy 继续控制 strict、moderate、relaxed、watchlist-only 和
exclude-warnings 行为。Accepted warning configuration 只给匹配 warning 增加
`acceptedReason`；不删除 `all` / `changed` / `regressions` records。未匹配的 accepted
configuration 是否产生 warning 继续由现有 validation option 决定。

改变 rule id、message、metric、threshold、policy、排序、accepted reason 或 channel
selection 时，必须作为 Quality Metrics contract 变更处理。

## Baseline and profiles

Quick profile 继续跳过 baseline comparison 和 jscpd。Full profile 运行全部 configured
scanners；baseline comparison 仍是显式 opt-in。Baseline unavailable、input unchanged 和
compared 状态，以及 current/baseline cache identity，都保持 pinned source 行为。

显式 changed-files input 与自动 changed scope 只影响 existing changed/regression context，
不改变 full metrics inventory。

## Status and failure

质量扫描有三个 core outcomes：

- `passed`：scan 完成且没有 warning records。
- `warning`：scan 完成且存在 warning records；默认仍是 non-blocking development result。
- `failed`：存在 scanner/runtime fatal issue 或 metrics validation failure。

当前 consumer 只在 core 返回 `failed` 时映射非零质量扫描退出结果；`passed` 和 `warning`
保持成功退出。Verification output 对带 accepted reason 的 warnings 使用既有过滤语义。
未处理顶层 error 不产生 core outcome，由 CLI 保持既有 error mapping。新的 blocking
gate、exit mapping 或 status 必须先更新对应 owner contract。

无发现、没有 supported inputs、profile skip、availability preflight skip 和 invocation
failure 必须保持不同的 observable context。现有 availability preflight skip 不产生 fatal
issue；已调用 component 后的 execution/report/parse failure 和 invalid normalized output
不能被归一化成 successful empty result。

## Verification

当前产品证明资产来自 `src/product/**` 下的 TypeScript tests 与 fixtures，不使用已删除的
Rust tests / fixtures 补建 coverage。现有证明资产包括：

- scanner parser 与 wrapper tests：scc CSV、Lizard CSV、jscpd version/report，以及
  unavailable / execution / report / parse failures。
- jscpd area task tests：per-area planning、稳定 task/file ordering 和 fatal issue channel。
- cache、fingerprint、Git pathspec 与 explicit changed-files tests。
- warning generator tests：file、function、duplicate、accepted warning 与 channel semantics。
- Markdown report tests：ranking、changed-file summary、accepted reason 和 scanner metrics。

日常交付按改动面运行 product import boundary、typecheck、lint、tests 和 dogfood
verification。初次产品化已用同一隔离 Git project 对照迁移前 consumer 与当前产品入口的
quick、full、baseline 和显式 changed-files outputs；该 parity 是一次性迁移证据，不是每次
质量变更的固定 gate。
