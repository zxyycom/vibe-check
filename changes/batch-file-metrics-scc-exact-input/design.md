# Design

本设计把 SCC 的 OS 参数传输从完整 `fileMetrics` measurement 中划为私有有界批次，再在 adapter 内恢复一个全有或全无的统一结果。

## Context

- [Windows argv 调查](../../docs/investigations/diagnose-file-metrics-scc-windows-argument-limit.md)记录调用方约 620 个文件/34,941 字符的现场、Microsoft `CreateProcess` 上限、SCC 4.0.0 输入探针、根因和替代方案。
- [`fileMetrics` owner](../../docs/checks/file-metrics.md)当前要求所有 area 先形成稳定 exact-path 去重并集；[`scanner dependency owner`](../../docs/development/scanner-dependencies.md)要求 scanner 不重新发现或扩大输入，任何不可信 batch 在 Record conversion 前整批拒绝。
- [`scanner.ts`](../../src/package-checks/file-metrics/scc/scanner.ts)当前把固定参数与全部 `includePaths` 一次性交给同步 process；[`measurement.ts`](../../src/package-checks/file-metrics/measurement.ts)只接受统一 `SccScanResult`，并在完整 approved set 上执行 exact-input acceptance。
- SCC 4.0.0 的 by-file `Code` 与 `Complexity` 是逐文件 measurements；Product 不消费跨文件 aggregate row。因此 transport 分批可以保持当前 metric 语义，但必须显式恢复稳定顺序、唯一性、资源总预算和 all-or-nothing failure。
- 活动 Change `batch-declared-project-file-inputs` 处理 invocation 内多个 Check 的路径 acquisition 复用；本 Change 只处理一项 `fileMetrics` 已获批 exact input 到 SCC process 的传输，不修改该调用级方向。`decide-file-metrics-public-scc-expansion` 只评审未来 public SCC capability，本修复不扩大 public options。

## Goals / Non-Goals

### Goals

- 让一个大型 exact-path union 在 Windows-safe command-line 边界内传给 stock SCC 4.0.0。
- 保持一个逻辑 measurement、一次 availability probe、完整 exact scope、稳定结果和现有 Check failure taxonomy。
- 使任意批次失败都不能泄漏部分 metric、Finding、waiver audit 或 Record。
- 用平台无关的纯 partition 证据和 fake SCC integration 在当前 Linux 开发环境证明 transport 与汇合语义。

### Non-Goals

- approved exact paths 继续是唯一 scanner 输入；目录、shell glob、临时 mirror tree 和 SCC 自主 discovery
  不进入本 Change。
- SCC 版本与 public contract 保持不变，不增加 response-file、stdin manifest、public args、batch-size option
  或 scanner registry。
- file selection、area policy、Record/final data、cache identity、Project Gate policy 和 invocation-wide
  project-file batching 分别留在现有 owner；本 Change 只修复 SCC transport compatibility。

## Decisions

### Intended Change

1. 在 `src/package-checks/file-metrics/scc/**` 内建立私有 command-line partition boundary。planner 接收 executable、固定 SCC 参数和稳定 exact paths，按保守的 Windows UTF-16 command-line 成本形成有序、非空、互不重叠的 batches；普通小输入仍只有一批。
2. 成本模型计入 executable、固定参数、分隔和 quoting/escaping，并在系统上限以下保留安全 headroom。不得只按文件数分组；一个路径无法在空批次内安全编码时，在启动任何 measurement process 前返回 execution failure。
3. `scanWithScc` 在一次 availability probe 后顺序执行每个 batch，所有调用继续使用固定 `--no-config --by-file --format csv`，不允许 caller 改写协议。
4. 每批独立检查 process termination、解析 SCC 4.0.0 CSV，并将 scanner-declared source paths 限定在该批 exact set。批次只产生 adapter-private candidate measurements，不进入 Check context 或 Record publication。
5. 全部批次成功后，adapter 拒绝重复 measurement path、按 path 稳定排序并返回一个统一 `SccScanResult`；`measurement.ts` 保留完整 union 的最终 exact-input acceptance，Record conversion 继续只消费完整结果。
6. 任一批执行或结果失败时立即拒绝整个 logical scan，丢弃内存中的前序 batch candidates，并沿现有 `execution` / `invalid-result` 分类结算；不增加 partial、retry 或 degraded-success 状态。
7. 现有 scan timeout 与 output buffer/resource bound 作为一个 logical scan 的累计预算实现，不能按批次无条件重置并倍增。availability probe 仍保持自己的既有边界。
8. batching plan、阈值、批次数、批次输出和内部失败细节保持 SCC adapter 私有；public authoring/resolved options、fingerprint、machine output 和 Records 均不新增字段。

### Resulting Impacts

- `src/package-checks/file-metrics/scc/scanner.ts` 将从单 process wrapper 变为有序 batch workflow；必要的 planner/aggregate helper 保留在同一 owner，除非实现证明存在独立职责才拆相邻模块。
- `src/package-checks/file-metrics/scc/scanner.test.ts` 需新增 oversized argv、稳定 partition/merge、后续批失败、单路径不可传输和累计资源边界证据；修改前后维护现有 Test Evidence Case，并运行最窄 SCC/file-metrics tests。
- `docs/checks/file-metrics.md` 需把“全部路径交给 SCC 一次”改为“一次逻辑 scan、一个或多个有界 process batches”；`docs/development/scanner-dependencies.md` 需说明 transport batching 不改变 exact-input ownership 与整批拒绝语义。
- 由于用户可观察到 Windows 大输入从 unavailable 恢复为正常结果，完成前须由非实施代理从实际 diff 反查用户说明、内部 owner、测试和未改变的 public API；没有 Windows runner 时明确保留平台验收缺口。
- 该修复不修改 `scripts/project/gate/checks/repository-quality.ts`、通用 process runner、project-files collection、schema、示例或 package exports；若实施发现必须触及这些边界，应先修订 Change 而不是顺手扩大范围。

## Risks / Trade-offs

- 多批次增加 SCC process startup 和 CSV parse 次数，但该成本是超过 transport budget 的大型输入为保持 exactness 支付的兼容成本，不改变本 Change 的非性能定位。
- command-line quoting 的实际规则由 Windows process creation 和 Node/Execa encoding 共同决定；过紧估算仍可能失败，过保守则增加批次数。planner 应使用可审阅的保守上界而不是追求填满 32,767。
- 分批会自然诱发“每批 300 秒/64 MiB”的资源放大；若不维护 logical-scan 总预算，修复会改变拒绝边界和最坏资源占用。
- SCC 对合法但不支持的文件可以不产生 row，所以“完整汇合”不能错误地要求每个 approved path 恰有 measurement；它要求所有已产生 rows 均可信、无重复且所有批次正常结束。
- 当前开发环境只能模拟 Windows-safe partition，不能证明真实 `CreateProcessW`、路径 quoting 和 stock SCC 的 Windows binary 已通过；该限制必须保留到取得 Windows acceptance evidence。

## Open Questions

- 私有安全预算采用多少 code units/headroom，以及用精确 Windows quoting estimator 还是更保守的上界；进入 Plan 前需用调用方现场规模、最长路径和构造性边界测试确定。
- 当前 300 秒 timeout 与 64 MiB process max buffer 如何精确投影为 logical-scan 累计预算，尤其 stdout/stderr 分开计量和最后一批的剩余预算；进入 Plan 前需读取 host process contract 并形成可测试选择。
- 当前交付是否具备真实 Windows runner。若没有，Plan 必须把纯 planner、Linux fake scanner 与未验证 Windows acceptance 明确分开，不能把模拟通过表述为平台修复已经生效。
