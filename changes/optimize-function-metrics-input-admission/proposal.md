# Proposal

本 Draft 规划简化 `functionMetrics` 的读取让步，在降低执行开销的同时明确取消响应边界。

## Why

当前父线程每读取一个非空 32 KiB chunk，就等待一次 `setTimeout(0)`。
[调查报告](../../docs/investigations/function-metrics-admission-yield.md)的受控对照发现频繁 timer 等待增加读取阶段成本；
历史依据支持协作取消，但没有证明当前 API 和频率是必要或最优选择。

取消让步、改用 `setImmediate` 和降低频率会产生不同的取消响应，需要在真实 Check 路径上比较后选定。
字节限制、完整结果和资源清理分别有自己的机制，应随优化一起验收。

## Outcome

`functionMetrics` 使用经证据选定的读取让步策略，减少不必要的等待，并做到：

- 读取中及 Worker 在途取消有明确的可观察边界；若改变读取阶段的响应承诺，先明确采用该取舍。
- 保持实际读取字节的单文件 8 MiB、aggregate 64 MiB 限制，以及整批分析、失败结算和既有拒绝事实。
- 文件描述符与 Worker port 按既有生命周期清理，成功时指标与 Findings 保持等价。
- 在受支持的 Node 宿主，用同一代表性输入对照完整 Check 耗时与取消响应；Bun 源树诊断单独记录。

当前交付限于 Draft；策略和验收条件收敛后形成 Plan，产品实施另行授权。
