# Design

本 Plan 在已经稳定的 Lizard 1.24.0 source-aligned port 中私有翻译 `complextags` 与 `nd`：前者只解释既有 CCN Finding，后者成为闭合的 nesting-depth metric。两者都不公开 extension mechanism。

## Context

`functionMetrics` 是 Product-owned TypeScript analyzer。公开的 metric 原本是 NLOC、standard CCN 与 parameter count；每项均经 closed per-area limit、Finding、stable waiver identity、Record/message/final-data/docs 和 adapter DTO mapping 交付。`analyzer/port-facade.ts` 只输出 Lizard-domain in-memory analysis，唯一的目录外 production consumer 是 `analyzer-adapter.ts`；input admission、I/O、resource/cancellation、Finding、waiver、Record 和 settlement 都在 port 外。

已归档的 `sync-lizard-typescript-port-to-1-24-0` Change 将 Lizard `1.24.0` tag commit `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec` 固定为当前 source identity/oracle，并确立 27 readers / 55 个大小写不敏感 suffix 的完整 enabled surface。`licenses/lizard-1.24.0-provenance.json` 是 source/range/hash/SPDX/target mapping 的唯一 machine-readable owner；本 Change 的 selected pair 在原基线中都是 deferred extension bodies。

用户已授权两项 adoption：`complextags` 记录 reader `conditions` 的每个 contributor token 与 current line；`nd` 以最大 nesting depth 作为 Product metric。ND 不是纯结构 nesting：`?` 和每个 condition 中第一个 `&&`/`||` 都参与 depth，不能换成 `ns`。当前 stable Decisions 的 deferred/no-registration 规则准确描述实施前事实；它要求独立 Change 与 Decision evolution，不否定本次已授权 adoption。

## Goals / Non-Goals

### Goals

- 在完整 27-reader/55-suffix surface 上，按 Lizard 1.24.0 source、provenance 与 oracle 翻译并验证 selected pair。
- 将 ND 作为默认 `7` 的 `nestingDepth.maximum` metric，闭合 Finding、waiver、Record、message 与 final-data。
- 仅以完整、有序 contributors 强化 CCN 超限 Finding 的 Record，并以 8 项上限强化人类 message；不改变 CCN quality decision。
- 保持 port façade / Product adapter 分层、exact-input、resource/cancellation、source order 与 no-partial-analysis guarantees。

### Non-Goals

- 不采用 `ns`、Halstead 或其它 optional body；不重定义 standard CCN，也不使 ND 成为可选 CCN counting policy。
- 不公开 Lizard extension names、数组、loader、通用 plugin/parser API、CLI、stdout/report behavior 或跨 Check scanner framework。
- 不为 `complextags` 新增独立 metric、limit、waiver identity、Finding、settlement 或 final-data field；不向未超限 CCN function 发布 explanation Record。
- 不缩窄 27-reader/55-suffix public capability，也不以 source body 较小为由省略跨-reader oracle/performance evidence。

## Decisions

### Intended Change

1. **两个 selected source body，私有组合。** 忠实翻译 `lizardcomplextags.py` 与 `lizardnd.py` 到 port-internal targets，并由 private analysis composition 显式调用；不接入 name-based loading surface。同步这两条 source-range mapping、target headers、SPDX/legal inventory、identity/deviation evidence 与 lifecycle corpus；其它 body entries 保持 deferred/no registration。既有 translated extension protocol 只是 source-aligned support seam，不是 Product plugin API。
2. **完整 private facts，狭窄 Product projection。** `FunctionInfo`/private façade 保留 source-order 的完整 complexity contributors 与 ND max depth。adapter 把 ND 映射为每函数 `nestingDepth` value；仅在 CCN Finding 已形成时把 contributors 投影到 Product Record。Record 使用 immutable `{ token, line }` sequence，保留全部 source-order entries；message 固定显示前 8 项，并准确说明余数；final data 不复制该 explanation sequence。
3. **ND 是第四个闭合 metric。** Public area limit 为 `limits.nestingDepth.maximum`，默认值为 upstream ND default `7`；options resolution/validation 只接受正安全整数。新增 `nesting-depth` Finding metric，并在 effective-limit selection、stable identity/waiver reconciliation、Record/message、final data 与 docs 中与既有 metric 同等处理。所有 enabled readers 必须提供可信 parity facts；不得把 reader-specific unsupported/null 静默转成 clean result。若 fixed-tag oracle 证明某 reader 无法支持，先修复 port parity 或显式修订本 Plan，不能暗中排除。
4. **保留 ND 的实际语义。** Port 保留 source lifecycle：FileInfoBuilder/FunctionInfo 的 per-function initialization/reset、`else if`、每个 condition 只计算第一个 logical operator、ternary/loop token、bracket/indent close 与 function/anonymous boundary。将 source monkey-patch 收敛为 typed private lifecycle seam 可以接受，但每个差异必须进入 deviation evidence；不得改写成 `ns` 或仅复用当前 structural nesting stack。
5. **长期方向只在当前事实形成后对齐。** 当前 Decision 的“optional bodies deferred/no registration”在 selected bodies 成为 translated runtime behavior 前仍正确。本 Change 必须按 Decision Records 建立 successor 或等价演进，说明仅此 pair 的 Product boundary、其余 bodies 的持续 deferred 状态和 private/no-plugin restriction；implementation、docs、tests 成为 current fact 后才可标记 aligned。Plan metadata 与 checkbox 不代替该记录。

### Resulting Impacts

- **Source 与 evidence：** selected pair 的 provenance status、target-path evidence、legal inventory、source identity mapping、deviation ledger 与 direct oracle corpus 必须同轮更新；缺少完整 mapping/parity 时，不得宣称 adoption 完成。
- **Analyzer 与 adapter：** ND 改变 private per-function facts 和 lifecycle；façade 与 adapter 只增加必要 typed fields。Product layers 不得 deep-import core/reader/extension internals，也不得自行运行 source extension lifecycle。
- **Public policy：** ND 扩张 closed authoring/resolved options、Finding metric union、waiver identity/audit、Record/message 与 final-data validation/documentation。code-area overlap 仍取最严格 effective maximum，任一 matching blocking area 仍决定 finding blockingness。
- **CCN explanation：** contributors 是 CCN Finding 的 supplemental diagnostic data，必须保留 token/line/source order、immutability、bounded message rendering 与安全 remainder count；CCN 的 numeric/final-data/settlement contract 不变。
- **Evidence 与 performance：** test 修改需要 current Cases；所有 selected reader families 需要 normal/edge/malformed oracle evidence。既有 exact-input、cancellation、resource bounds、determinism 与 whole-batch failure boundary 需要回归证据，并与 current analyzer baseline 比较。

## Risks / Trade-offs

ND 的条件语义比纯结构 nesting 更宽，可能出乎只期待大括号深度的用户；保留 source semantics 可避免未记录的第二个 metric，但默认阈值 `7` 因而需要跨-reader evidence。source 以动态方式 patch lifecycle，TypeScript 必须用 typed private seam 表达；遗漏 initialization/reset 会污染后续函数。

`complextags` body 很小，但 contributor sequence 无上限。完整 Record 有助诊断，也会扩大 payload；8 项 message 上限保持人类可读性，Record 仍是完整来源。token/line fidelity 依赖 processor order 与 reader current-line behavior，而不只依赖 CCN totals。

完整 27-reader/55-suffix promise 提高 parity 成本，但保护既有 analyzer capability；静默省略 reader、把缺失 ND 当作零，或允许 partial trusted result 都会违反 Product boundary。实现事实形成前更新长期 Decision 会造成虚假对齐，因此候选 Decision 维持 `candidate + unaligned`。

## Open Questions

无阻塞问题。已选择 `complextags + nd`、all-reader scope、ND default `7`、complete Record contributors 与 message bound `8`。若 fixed-tag oracle 或当前 owner evidence 证明这些值无法在完整 enabled surface 成立，实施者必须先修订本 Plan 与对应 Decision，不能局部降级。

## Implementation Observations

### 2026-09-03：selected processor 性能与资源比较（task 2.4）

**比较对象与边界。** 这是本机、可复现的**增量 pipeline**观察：干净 detached `02423f0220483b4fe9c733a95f21242e8b0c89f3`（requested baseline，不含 selected processors）对比本 Change 当前未提交、已在 private façade 固定 `complextags + nd` 的 Product path。它不是 Python comparison，也不分别归因给任一 processor。测量未修改 Product source、tests 或 harness；worktree、drivers 与 raw evidence 均在 `/tmp`，不是稳定 owner 或 committed artifact。

**环境与协议。** 2026-09-03 UTC；Bun `1.3.14`；Linux `6.18.33.2-microsoft-standard-WSL2` x86_64，AMD Ryzen AI 7 H 450（6 logical CPUs），7.8 GiB RAM。共享 WSL 的 scheduler/cache noise 意味着结果仅为本机比较，不是可移植 performance budget。`/tmp/lizard-selected-extension-bench.ts` 从 `TARGET_ROOT` 导入正常 Product adapter，读取固定 1.24 fixtures `typescript/normal.ts` 和 `javascript/normal.js`，各复制 64 个唯一命名版本，构成 128 files / 128 functions batch。每个 fresh Bun child 先做一次未计入的同进程 warmup，再执行 24 次完整 adapter + port batch analysis，`operationMs = elapsed / 24`。基线 worktree 只共享 `node_modules`；15 个交替 ABBA/BAAB blocks 产生每侧 30 个 fresh-child samples。peak RSS 为计数 workload 后 `process.resourceUsage().maxRSS`（Linux KiB 转 bytes），是单 child process peak，不是 process-tree total。

**命令。**

```sh
# clean comparison tree（requested SHA）
git worktree add --detach /tmp/vibe-check-base-02423f0 02423f0220483b4fe9c733a95f21242e8b0c89f3
ln -sfn "$PWD/node_modules" /tmp/vibe-check-base-02423f0/node_modules
# temporary driver 与 ABBA/BAAB supervisor（不提交）
TARGET_ROOT="$PWD" bun /tmp/lizard-selected-extension-bench.ts
python3 /tmp/run-lizard-selected-extension-bench.py \
  > /tmp/lizard-selected-extension-evidence.json
# existing boundary regression evidence
bun test src/package-checks/function-metrics/analyzer-worker.test.ts \
  src/package-checks/function-metrics/measurement.resource.test.ts
# fixed 16-contributor Record/message serialization probe
bun /tmp/lizard-selected-extension-payload.ts \
  > /tmp/lizard-selected-extension-payload.json
```

**结果（每侧 30 samples）。**

| 指标 | baseline `02423…` | selected pipeline | 差异与解释 |
| --- | ---: | ---: | --- |
| adapter+port batch median | 7.427 ms | 8.491 ms | +1.064 ms，**+14.3% latency**；median throughput 为 0.875×（约 **12.5% lower**） |
| operation sample range | 6.509–17.177 ms | 7.462–18.082 ms | host noise 明显；means（8.796 vs 9.586 ms）仅作上下文 |
| paired block median ratio | — | 1.142× | 15 block ratios 为 0.705–1.355；median 的 nonparametric bootstrap（10,000 resamples，seed 0）为 1.084–1.207：本次观察显示 overhead，但不构成通用上限 |
| process peak RSS median | 139.82 MiB | 142.19 MiB | **+2.36 MiB**（+1.7%）；ranges 分别为 135.07–142.68 与 137.95–144.90 MiB |
| Worker/resource/cancellation boundary | pass | pass | 6 个 targeted tests 通过：8 MiB per-file、64 MiB aggregate fail-closed caps、missing-source、synchronous postMessage whole-batch failure，以及 Worker/Records/waiver audit 前 cancellation；这证明边界保持，不是 timed cancellation latency budget |

样本没有发现 resource-cap 或 cancellation-contract regression。吞吐/latency 与 RSS 增量应作为已知 trade-off 保留；但该小型固定 corpus 和噪声不能证明 cross-machine regression，也没有为本 Change 建立 acceptance budget 或核心优化义务。

**Payload impact。** 128-function adapter JSON metric payload 由 22,125 增至 36,077 bytes（**+13,952 bytes；+109 bytes/function**），原因是运输 ND 与完整 contributor facts；这是 in-memory Worker/Product payload，不是 final-data publication size。固定 16-contributor CCN Finding probe 的 serialized Record data 为 564 bytes（无 contributor property 时 145，**+419 bytes**）；bounded 8-item message 为 268 UTF-8 bytes（旧 prefix 75，**+193 bytes**），并准确说明另外 8 项。一个 representative nesting-depth Finding Record data 为 136 bytes；实际 Record count 仍由 policy/input 决定。这些测量不界定无上限 contributor sequence 或完整 project snapshot；残余风险由“Record-only + full-sequence”设计承担。

**复现边界。** raw 60-row evidence 为 `/tmp/lizard-selected-extension-evidence.json`；driver、supervisor、payload probe 分别为 `/tmp/lizard-selected-extension-bench.ts`、`/tmp/run-lizard-selected-extension-bench.py` 与 `/tmp/lizard-selected-extension-payload.ts`。它们刻意不入库；后续只应在空闲环境重跑，并同时报告 raw rows、source SHA、runtime、fixture digest、iteration count 与 RSS scope，才可比较。
