# Proposal

本 Change 以局部优化计划将 `functionMetrics` 读取让步从逐块 timer 改为逐块 `setImmediate`，保持取消与完整输入边界。

## Why

父线程每个非空 32 KiB chunk 都等待一次 `setTimeout(0)`。[调查](../../docs/investigations/function-metrics-admission-yield.md)在受控 admission 对照中定位了频繁 timer 的等待成本；协作取消需要让步机会，但不要求该 timer API。真实 Worker/Check 收益尚未证明，必须以同条件完整路径验收，不能外推局部加速比。

## Outcome

生产默认使用逐非空 chunk 的 `setImmediate`，减少不必要的 timer 等待，保留同线程取消执行机会、实际字节上限、完整批次结果及 FD/Worker 清理；同一真实输入和受控压力输入的支持 Node 完整 Check 取得可复核成本与取消证据，无未解释的可重复退化。

## Scope

### Intended Change

- 仅替换 measurement 的私有默认 `yieldAdmission` helper；32 KiB chunk、逐非空 chunk 频率、checkpoint、read/decode 和 Worker port 不变。
- 不删除/稀疏化让步，不建立时间片框架、公开调度 API 或配置，不改变 analyzer/文件收集/Run 调度。
- 用生产默认、真实 Worker 和 public `functionMetrics`/`run` 对照基线与候选，固定 corpus、采用标准与观察边界见 [Design](design.md)。

### Resulting Impacts

- timer/I/O abort 的实际执行顺序会改变，须证明读取中、跨文件及 Worker 在途取消；32 KiB 不是毫秒响应保证。
- input cap、失败结算、已有 rejection 和 FD/listener/terminate 清理须直接验收；不因加速发布 metric prefix 或伪造 waiver audit。
- 直接测试/Case、支持宿主和安装后消费者须覆盖生产默认；变更日志与内部说明据实际结果同步，不将局部探针当 Gate 性能。

## Success Criteria

1. 默认不再逐块等待 timer，但每个非空 chunk 仍给宏任务取消机会；预先、读取中、跨文件及 Worker 在途取消按设计观察边界通过。
2. exact 8 MiB/64 MiB 接受，超限 fail closed；读取/解码/Worker 失败无 partial metrics，先前 rejection 保留、无伪造 waiver audit。
3. 所有成功打开 FD 在各终态关闭，listener 移除和 terminate 调用一次；不把 terminate 调用表述为等待物理线程退出。
4. 同一 corpus/config/runtime 下完整 Check Records/outcome 等价；支持 Node 的 15-block ABBA 对照取得至少一个 timer-heavy 形态的可区分收益且没有可重复完整路径退化，真实仓库成本单独报告。不新增硬毫秒 budget。
5. 行为/Case、exact artifact、installed Node consumer 及完整 Gate 验收通过；不满足采用条件时保留 timer 基线和未完成任务，不能默默改为无让步或降低频率。

## Affected Owners

- [Function Metrics](../../docs/checks/function-metrics.md)、[scanner dependencies](../../docs/development/scanner-dependencies.md)：exact inputs、完整结果、measurement/Worker 取消与清理。
- [调用方 runtime 决策](../../docs/decisions/execute-check-functions-in-caller-runtime.md)、[Node 最低宿主](../../docs/decisions/treat-node-engine-as-a-minimum-version.md)：协作执行和支持宿主。
- [测试策略](../../docs/testing/strategy.md)、[Case](../../docs/testing/case-maintenance.md)、[性能流程](../../docs/tooling/lizard-performance.md)、[包生命周期](../../docs/tooling/package-lifecycle.md)；[协调](../../docs/governance/change-coordination.md#函数指标读取优化)保持与升级/修复独立。
