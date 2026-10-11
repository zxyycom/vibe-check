# Design

以逐块 `setImmediate` 的局部调整减少 timer 等待，按同条件真实 Check 与取消证据决定采用。

## Context

- [admission 调查](../../docs/investigations/function-metrics-admission-yield.md)保存受控端口成本对照与 timer abort 探针；setImmediate 较快且未提交 Worker，无宏任务让步则先读完并提交全部输入。这不是真实 Check/线程的性能或取消分布。
- [准备度核对](../../docs/investigations/prepare-function-metrics-change-plans.md)确认当前 measurement 默认仍是 timer；measurement 内 helper、私有 yieldAdmission seam、actual bytes/checkpoint/finally 和 Worker port 分别承接准入、取消及清理。
- package 支持 Node >=24.18；Bun 用于仓库脚本/测试。旧 Node 源树探针的一项 constructor null-prototype 断言差异不是 yield 回归，也未证明当前 installed consumer 失败；本 Change 不借机改变 Product data normalization。

## Goals / Non-Goals

- **目标**：消除已定位的 timer 等待，保持读取阶段协作取消机会，证明完整 Check 输出与成本。
- **保持**：每 32 KiB 非空 chunk 让步、实际 8/64 MiB caps、exact inputs、完整批次、拒绝事实、FD 和 Worker port 生命周期。
- **非目标**：删除或降低 yield 频率、硬取消 deadline、抢占同步 I/O、算法升级、公共文件收集取消、通用调度 API、Worker 强制等待退出或公共配置。

## Decisions

### Intended Change

#### 生产策略

在 `src/package-checks/function-metrics/measurement.ts` 替换私有默认 helper 为 Promise 包裹 `setImmediate(resolveYield)`，使用当前 Node 内置能力，不增加依赖或 timer fallback。其余读取循环、chunk size、signal checks、byte checks、decode 和 Worker 传输不变。

`setImmediate` 提供宏任务机会而非响应时间保证；同步 open/read/concat/decode 仍不可抢占。实现前冻结 timer 基线，策略须通过下述采用条件；失败保留 baseline，不能自行扩大到无 yield 或稀疏 yield。

#### 完整路径与性能采用条件

1. 冻结真实仓库 `src/**/*.ts` approved exact union、每文件字节/hash 和总 bytes；避开输出/生成目录，before/after 使用同一只读 snapshot。追加 200×128-byte 短文件、1×4 MiB 文件作为报告形态的受控压力输入，明确它们不代表真实消费者语言分布；fixture 建立不计时。
2. Node 支持宿主按 package lifecycle 的 exact candidate 入口分别准备 before/after 产物；public `functionMetrics`→`run`→真实 Worker、相同 areas/limits/outputs 且 machine publication 禁用。冻结候选 hash、OS/Node/Bun 版本、storage、cache/temperature 和 baseline commit；基线与候选只有 helper 差异。一次不计时 warmup，然后 15 blocks ABBA、每 side 30 samples；记录 wall median/p95、paired 差异和噪声范围。cold-start 单独观测，不与 warmed 统计混合。
3. 每样本对 canonical Records/outcome 比较：忽略 run IDs/time/elapsed 等非语义字段，保留全部 Finding/rejection/waiver data、messages 的语义与结果；异常不得静默剔除。controlled-port admission、measurement harness 和 Bun 源树只定位成本，不作 Node 完整 Check 替代；已有性能 B 固定上游，不是此 I/O 优化入口。
4. **采用标准**：行为/取消/资源条件全部通过；至少一个 timer-heavy 压力形态的完整 Check 配对 wall 差异可区分于噪声，真实 corpus 与另一形态无可重复退化。报告效应和不确定性，不设置新绝对 ms 预算，不承诺 Gate 加速。若失败或不可区分，保留 timer 与未完成项；结论不能被“局部样本更快”覆盖，后续策略扩大需重新授权。

#### 可观察取消边界

| 场景 | 验收出口 |
| --- | --- |
| 预先 abort | cancelled；不创建 Worker、不发布 metric/waiver audit。 |
| 单大文件读取中 | 在第一次读取让步安排同线程 timer 及 I/O abort，记录 callback 执行和 admitted bytes；候选实际在后续 checkpoint 停止，Worker 未创建。通过私有受控端口计数定位边界，另外用生产默认/真实 Check 验证终态。 |
| 多文件/跨文件 | abort 发生于早期文件 yield 或文件间 checkpoint；后续 exact inputs 不提交，已打开 FD 关闭。 |
| Worker 在途 | 真实 port abort 结算一次、卸载 listeners 并调用 terminate；无迟到结果、metric prefix 或 waiver audit。controlled port 证明 late-event 幂等，不冒称真实线程退出时刻。 |
| rejection + 任一取消 | earlier input-rejected Records/warning 保留；无 final data、不伪造 waiver audit。 |

定时器竞态不能靠 wall timeout 证明：先观察已进入读取/yield 或 Worker 提交边界，再触发 abort 并断言 terminal 与副作用。纯延迟 race 探针保留实际调度/读字节原始观察，不承诺固定 chunk 数或硬毫秒。

### Resulting Impacts

1. **输入/失败/清理。** exact 8 MiB、exact 64 MiB、各 +1、empty、multifile、missing/open/read 失败、UTF-8/BOM/newline/invalid-byte fallback 及 Worker create/post/message/error/exit 都覆盖；保留 actual bytes 和超限先于 yield。decode 的现有 ignore fallback 不新造公开 decode-failed reason。用有界私有 fault injection 或直接资源观测证明 finally 关闭 FD，不改公开 API；无法稳定自动化的边界写 Manual CR，不建名义 Case。
2. **测试/Case。** 既有 resource tests 用微任务 seam 跳过等待，不能证明生产默认；新增默认 helper 的取消/完整 Check 证据，复用已有独立证明目的。Node 源树 prototype 断言若仍失败，隔离 baseline/候选并在 consumer 观察时按公开字段比较；不为测量改 Product normalization 或降低失败标准。
3. **稳定 owner/包。** 实施验证后更新内部实现说明及 changelog。公开指南已有“可观察工作边界取消”，本方案保留其承诺；只有实际公开变化才补指南，不新增每 chunk 响应时间承诺。Worker 协议/包配置不改，但 installed Node consumer 必须真实使用默认 helper 和 Worker。最后完整 Gate 独立验收，耗时改善不能代替行为。

## Risks / Trade-offs

- 当前同步 I/O 本身不可抢占，32 KiB 与 setImmediate 都不是 latency budget；线程物理退出与 terminate 调用仍分开。
- 旧局部成本未含真实 analyzer，既有测量 harness 的 canonical 字段不含完整 ND/contributors，需完整 Records 对照，不能误报等价。
- 无可分辨收益或有回归则不采用；冻结 corpus 保持一致，后续策略扩大或新增抽象须重新取得授权。
- 升级/修复非硬前置。共享 measurement、tests/Case 或 package owner 时串行实施与合入，各自独立验收/提交。

## Open Questions

无待定方案。完整 Check 收益和边界由 [Tasks](tasks.md)取证，按采用标准决定保留候选或 timer 基线；扩大策略、联网及新依赖仍须当前任务授权。
