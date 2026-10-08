# Design

本 Draft 在 Check-owned input admission 内比较让步策略，以最小局部调整兑现 [Proposal](proposal.md)。

## Context

- [调查报告](../../docs/investigations/function-metrics-admission-yield.md)保存取消场景、历史选择和局部对照。
  `setImmediate` 的受控样本较快，但尚未证明真实 Worker/Check 收益；移除宏任务让步的探针仍最终取消，
  却在 abort 回调执行前完成读取并提交了全部输入。
- [measurement](../../src/package-checks/function-metrics/measurement.ts)拥有同步分块读取、字节统计、signal checkpoint
  和逐块 yield；[Worker port](../../src/package-checks/function-metrics/analyzer-worker-port.ts)拥有分析阶段取消与端口清理。
  当前默认仍是 `setTimeout(0)`。
- [Check 指南](../../docs/checks/function-metrics.md)和[分析器决策](../../docs/decisions/adopt-selected-lizard-extensions-in-product-owned-analyzer.md)
  拥有 exact inputs、完整结果、资源和取消边界；[调用方 runtime 决策](../../docs/decisions/execute-check-functions-in-caller-runtime.md)
  定义协作执行，正在运行的同步调用仍不可抢占。
- [宿主决策](../../docs/decisions/treat-node-engine-as-a-minimum-version.md)规定 package 仅支持 Node >=24.18；
  Bun 用于仓库脚本和测试。两类执行均记录实际版本，Bun 源树观测不代替 installed Node consumer 验收。

## Goals / Non-Goals

- **目标**：选定更低成本的读取让步策略，证明取消、字节、结果与清理边界，并保存可比较的完整 Check 观测。
- **责任边界**：本 Change 聚焦 admission；指标算法、上游 reader 升级、文件收集和 Run 调度由各自 owner 负责。
  同步公共文件收集 API 的取消能力不在本范围内。
- **保持局部**：优先使用现有私有依赖 seam 比较，不为这一处读取循环建立公共调度 API 或通用时间片框架。

## Decisions

### Intended Change

以下为待验收候选，不是已采用的产品行为：

| 候选 | 预期结果与选择条件 |
| --- | --- |
| 逐块 `setImmediate` | 优先评估的最小调整：保留 checkpoint 与宏任务让步频率，去掉 timer delay；证明真实收益和取消机会。 |
| 较低频率的宏任务让步 | 当完整 Check 观测仍指向调度成本时评估；明确何时让步及允许的取消延迟。 |
| 删除主动让步 | 仅在明确接受读取阶段延后响应同线程 timer/I/O 取消时采用；更新相关行为承诺。 |

先冻结当前生产默认、输入 corpus 和观测条件，再比较候选。私有受控端口用于定位成本，真实 Worker/Check
用于判断采用；低噪声的局部差异不作为完整 Gate 加速比。耗时先作为 observation，硬预算另行确定。

### Resulting Impacts

| 影响 | 处理与验证要求 |
| --- | --- |
| 取消与结算 | 覆盖预先、读取中、跨文件及 Worker 在途取消；验证既有 input-rejected Records 保留，测量失败不发布指标前缀。 |
| 输入和清理 | 覆盖 exact 8/64 MiB、超限、读取/解码/Worker 失败；检查 FD 的 finally 关闭、listener 清理与 terminate 调用。线程物理退出与 terminate 调用分开取证。 |
| 性能与宿主 | 同一真实 corpus、配置、环境与缓存条件比较 before/after；覆盖多短文件和较大文件，并验证生产默认而非仅测试注入。 |
| 稳定 owner | 按最终选择同步 Check 指南、内部分析器说明、必要 Decision 和测试证据；只有响应承诺或用户行为改变时补相应迁移说明。 |

后续实施验证按[文档导航](../../docs/navigation.md#交付验证)选择 measurement/Worker/Check tests、
typecheck/lint、文档及 Case 检查，再运行跨边界 Gate；包消费者或完整 Gate 收益须有对应路径证据。

## Risks / Trade-offs

- 任一候选都不能抢占正在执行的同步 I/O 或解码；32 KiB 不是响应时间保证。
- 删除或稀疏化让步可能让取消发生在全部读取或 Worker 提交之后；signal checkpoint 本身不能调度 abort 回调。
- 已有局部性能数据未覆盖真实 analyzer、冷缓存或延迟分布；Node 源树探针还有一项对象 prototype 断言失败，
  实施验收需区分基线问题与候选回归。
- 与指标修复/源码升级可独立收敛；实际共享 measurement、测试、Case 或包 owner 时串行实施与合入，
  升级不是这一局部优化的硬前置。

## Open Questions

1. 第一版保留读取阶段宏任务取消机会吗？若保留，逐块 `setImmediate` 是否足够，还是有证据支持调整频率？
2. 哪个真实 corpus 和取消触发条件代表调用方场景，怎样判定耗时收益及响应退化可接受？
3. 哪些失败与清理路径已有直接测试，哪些需要补充？支持宿主的基线测试问题怎样闭合？

保持 `draft`；问题收敛后补全 Plan proposal 并派生 tasks。
