# Design

保守 argv 规划、性能校准、顺序执行、批内验收和最终汇合共同实现一次有界且全有或全无的 SCC logical measurement。

## Context

- [Windows argv 调查](../../docs/investigations/diagnose-file-metrics-scc-windows-argument-limit.md)保存约 620 个文件/34,941 字符的调用方现场、`CreateProcessW` 上限、SCC 4.0.0 输入探针与方案比较。该现场数值不是当前 Linux 工作区的复测结果。
- [SCC v4 CLI Decision](../../docs/decisions/use-scc-v4-file-metrics-cli-protocol.md)要求 adapter 固定 SCC 4.0.0、`--no-config`、by-file CSV 和 approved exact paths，public scanner 只选择 executable；[file-metrics area Decision](../../docs/decisions/let-file-metrics-areas-own-files-and-thresholds.md)要求所有 area 的 exact paths 去重并集作为一次逻辑扫描输入。该 Change 遵守两项已对齐判断，不建立新的长期 Decision。
- [`fileMetrics` owner](../../docs/checks/file-metrics.md)与[scanner dependency owner](../../docs/development/scanner-dependencies.md)分别拥有用户可观察行为和私有 command/exact-input 边界。稳定 owner 只在 runtime 行为实现并验证后同步，Change artifact 不提前改写当前事实。
- [`measurement.ts`](../../src/package-checks/file-metrics/measurement.ts)当前在 measurement 前执行一次 availability probe，并在 scanner 返回后对完整 approved union 做 exact-input acceptance；[`scanner.ts`](../../src/package-checks/file-metrics/scc/scanner.ts)当前把固定参数与全部 paths 一次交给同步 process。
- SCC 4.0.0 by-file `Code` 与 `Complexity` 是逐文件 measurements，Product 不消费跨文件 aggregate row。合法但不受 SCC 支持的文件可以不产生 row，因此可信完整结果不等于“每个 approved path 必须恰有一条 row”。
- `batch-declared-project-file-inputs` 优化一次 invocation 内多个 Check 的 file acquisition；该 Change 只处理已经批准的 `fileMetrics` exact paths 到 SCC process 的传输。`decide-file-metrics-public-scc-expansion` 只在出现真实 consumer outcome 时评审 public SCC capability，不阻塞本私有修复。

## Goals / Non-Goals

### Goals

- 让 stock SCC 4.0.0 在 Windows command-line 边界内接收大型 approved exact-path union。
- 保持一次 availability probe、一次逻辑 measurement、完整 exact scope、稳定结果、总资源预算和现有 failure taxonomy。
- 使任一 batch 失败都不能泄漏部分 metric、Finding、waiver audit 或 Record。
- 让当前非 Windows 环境可以用纯 planner 和 fake SCC integration 直接证明 transport、汇合与 fail-closed 语义。
- 用 stock SCC 的可复现 batch-size/cold-start 曲线平衡上限附近的传输裕量与多进程启动成本，并保存可独立复核的调查报告。

### Non-Goals

- 不改传目录、shell glob、临时 mirror tree，也不允许 SCC 自主 discovery。
- 不升级或 fork SCC，不增加 response-file、stdin manifest、public args、batch-size option、retry 或 degraded-success 状态。
- 不改变 file selection、area policy、Record/final data、cache identity、Project Gate policy、invocation-wide project-file batching 或通用 process runtime。

## Decisions

### Intended Change

1. **用保守上界规划 argv。** planner 的输入是 `scanner.executable`、固定 SCC arguments、稳定 exact paths 和 adapter-private ceiling。对每个 argument 使用 `2 × argument.length + 2` 作为 Windows quoting/escaping 上界，再加 argument 间单个空格和终止 NUL；hard maximum 是 `28_000` UTF-16 code units，至少为系统 32,767 上限保留 4,767 code units，同时上界已按每个原始 code unit 最多翻倍计入 quoting。
2. **所有平台采用同一确定性 planner。** 逐路径按输入顺序贪心填充当前 batch；下一路径会超预算时结束当前 batch。输出必须有序、非空、互不重叠并覆盖全部输入。小输入自然得到一批；单个路径连同 executable 与固定参数都无法装入空 batch 时，planner 在任何 measurement process 启动前返回 `execution` failure。
3. **先建立可复现性能曲线。** 在修改 production scanner 前，benchmark harness 使用 stock SCC 4.0.0、约 620 个小型 TypeScript files 和合计约 34,941 个字符的稳定相对路径，固定 binary、runtime、host、fixture 与输出验证。它分别测量当前 `scanWithScc` 单进程 baseline、单文件 process cold start、显式 batch sizes `1/5/10/25/50/100/200/310/620`，以及 ceilings `8_000/12_000/16_000/20_000/24_000/28_000`；2 轮 warm-up 不计入结果，随后至少 10 轮记录完整 logical scan wall-time median/p95、invocation count 和 measurement digest。
4. **用曲线选择更小的有效 ceiling。** 安全约束优先于吞吐。在不超过 `28_000` 的候选中选择 median 不高于最快候选 `110%` 且 p95 不高于最快候选 `115%` 的最小 ceiling；这使性能接近最优时优先取得更多 command-line headroom。噪声或结果无法支持选择时，先修正 workload、测量方法或 Plan，不默认采用最大值。
5. **性能证据形成独立后继 Investigation。** 报告说明 workload、fixture、host、runtime、SCC version、warm-up/rounds、原始与汇总数据、输出等价 guard、阈值选择、最终 runtime 复测和 Windows 不可外推边界；受管资源保留实际执行的 harness、CSV/text 数据和 batch size/ceiling 对 wall time 的曲线图。初始曲线形成后创建完整 candidate，最终复测后发布并以 `补充` 关系指向 `260912-diagnose-file-metrics-scc-windows-argument-limit`；没有实际测量时不创建空 candidate。
6. **保留一次 availability，顺序执行 measurement batches。** `measureFileMetrics` 继续先调用一次 `checkScc`；成功后才进入 `scanWithScc`。scanner 不重复 probe，所有 batches 都使用同一 executable、cwd 与固定 `--no-config --by-file --format csv`，也不提供 caller 可改写的 protocol seam。
7. **批内验证先于汇合。** 每批先检查 process termination，再解析 SCC CSV，并以该 batch 的 exact set 调用现有 exact-input acceptance。越界 source path 或 malformed CSV 立即返回 `invalid-result`。解析结果只保存在 adapter-local candidate collection 中，不进入 Check context。
8. **最终汇合保持全有或全无。** 全部 batches 成功后，按 `payload.path` 拒绝重复 measurement，并稳定排序后返回一个 `SccScanResult`。`measurement.ts` 保留对完整 approved union 的最终 acceptance，后续 area policy、waiver 与 Record conversion 不感知 batches。SCC 合法省略未测量文件仍被允许；该 Change 只拒绝已产生但不可信的 rows。
9. **共享 logical-scan deadline。** 在第一个 measurement batch 前读取 monotonic time，形成 300 秒 deadline；每批只取得剩余毫秒。剩余时间不大于零时不再启动 process 并返回 `execution` failure。availability probe 不计入该 deadline，保持当前独立边界。
10. **累计 output budget。** stdout 与 stderr 各自从 64 MiB 开始计账。每次 process 的 `maxBuffer` 使用两者剩余预算中的较小值，完成后按 UTF-8 byte length 分别扣减；任一预算不足或超出即返回 `execution` failure。该保守投影无需扩张通用 process runner，也避免 batches 把一次 logical scan 的现有 output bound 倍增。
11. **保持私有与可审查。** command-line budget、估算函数、batch plan、deadline/output accounting 和失败细节都属于 `src/package-checks/file-metrics/scc/**`。实际执行的 benchmark harness 与数据随性能 Investigation 作为受管资源保存，不建立 Product 或 workspace public command；production helper 不从 package root 导出，也不进入 options、fingerprint、schema、Records 或 machine output。
12. **Windows 端到端证据非阻断。** 有 runner 时补测 stock SCC 4.0.0 超预算 exact-path workload；没有 runner 时明确记录该边界即可完成 Change。任何当前平台 planner、fake scanner 或 stock SCC 数据都不得冒充真实 Windows acceptance。

### Resulting Impacts

- scanner owner 新增 partition 与 aggregate 状态，但 availability、parser、measurement 和 Record owner 的职责顺序不变。
- adapter tests 需要构造总估算超过最终 production ceiling 的 paths，记录 fake SCC 收到的每个 argv，并证明单批兼容、多批覆盖/顺序/汇合、batch-local 越界、重复 row、第二批失败、单路径过长、deadline 和 output budget。
- 性能 harness 与后继 Investigation 共同拥有形成时曲线；runtime constant 只消费报告支持的选择，不复制整份 benchmark 数据。
- `AUX-SCC-ADAPTER-OUTCOMES-001` 应扩展为 transport 与 all-or-nothing adapter 证据；`WB-SCANNER-FILE-METRICS-SCOPE-001` 的 `Proves` 应把“one SCC invocation”改为“one logical SCC scan”，但只有测试实际证明对应结果时才调整 Case。
- runtime 生效后同步用户 owner 与内部 owner；文档明确 process batching 是私有实现，不暗示 batch 配置、结果或诊断成为 public capability。
- 完成前按项目文档影响审查要求，由非实施代理从 runtime/test diff 反查公开说明、内部 owner、Case 和无需修改的 schema/exports。

## Risks / Trade-offs

- 保守估算可能比真实 Windows serialization 更早切批，增加 SCC startup 与 CSV parse 次数；这是超过 transport budget 的大型输入为保持 exactness 支付的成本。预算不公开，后续可在不改变产品契约的前提下依据证据调整。
- `28_000` 只是可选 ceiling 的 hard maximum，不是 `CreateProcessW` 的替代规范；最终 production ceiling 可能更小。Node/Execa/Windows transport 变化时必须重新核对 estimator 和性能曲线。
- Linux cold-start 曲线可以比较 batch 数量成本，但不能证明 Windows process startup 或 quoting 开销相同；它用于选择安全候选，不把平台差异消除为一个数字。
- 顺序 batches 会把单进程 timeout 误放大为批次数倍数，因此必须传递剩余 deadline；同步 process 无法在执行中共享可变 deadline，只能在每批启动前计算剩余值。
- 64 MiB output accounting 使用解码后字符串的 UTF-8 byte length。stock SCC 输出是 UTF-8 CSV；malformed encoding 最终仍会被 parser 拒绝，不能据此外推 arbitrary custom executable 的二进制输出兼容性。
- 当前环境不能证明真实 `CreateProcessW`、Node/Execa quoting 与 stock SCC Windows binary 的端到端行为；强保守 planner 降低风险，但不替代真实 Windows acceptance。

## Open Questions

无。
