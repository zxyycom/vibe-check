---
title: "Function metrics 读取让步：取消场景、局部成本与简化取舍"
id: "261008-function-metrics-admission-yield"
formedAt: "2026-10-08T03:06:36Z"
question: "functionMetrics 为什么在读取中让步，setImmediate 或取消主动让步各改变什么，哪些取消、字节和清理边界需要保留？"
tags:
  - "cancellation"
  - "function-metrics"
  - "input-admission"
  - "performance"
  - "resource-boundaries"
relations:
  - type: "补充"
    target: "260904-audit-project-gate-function-metrics-check-overhead"
    summary: "补充父进程让步原意、当前边界与setImmediate对照"
---

## 形成时背景

用户报告 `functionMetrics` 读取中的 `setTimeout(0)` 带来额外等待，随后追问取消的原始场景，
以及能否简化或删除主动让步。本轮调查围绕这一个取舍收敛：**取消是产品能力，逐块 timer 是实现选择；
字节限制和资源清理由另外的机制负责。**

直接前序[Function metrics Check 开销审计](./audit-project-gate-function-metrics-check-overhead.md)
已观察到逐块 timer 对边界测试的成本。本轮补充历史意图、当前责任边界和局部对照，承接其成本认识。

## 调查目的

1. 恢复取消及读取让步的场景，区分产品目标、历史实现和未知的调参理由。
2. 比较保留 timer、改用 `setImmediate`、取消主动让步三种选择。
3. 保存能支持取舍的证据，并明确实施时要验证的行为。

## 调查范围与依据

形成时源码 HEAD 为 `d266937d0c3e76dfeeee87f7b0901316e162dea3`。调查环境为 Linux，
使用 mise-bound Bun 1.3.14 / Node 24.18.0；相关产品源码保持不变。

| 依据 | 实际检查与覆盖 |
| --- | --- |
| 当前实现与 owner | 读取 [measurement](../../src/package-checks/function-metrics/measurement.ts)、[Worker port](../../src/package-checks/function-metrics/analyzer-worker-port.ts)、[execution](../../src/package-checks/function-metrics/execution.ts)及 [Check 指南](../checks/function-metrics.md)，核对读取、取消、发布和清理。 |
| 历史 | 子代理通过 Decision 查询和限定路径的 Git 历史，恢复 8 月取消场景、9 月迁移设计及首次逐块 yield。主代理抽样复核原 Plan、最终 design 和迁移前源码。 |
| 局部性能对照 | 主代理只替换私有 `yieldAdmission`，注入同步返回空 metrics 的受控 Worker port；每组合三次，同进程、warm cache，fixture 创建在计时外。覆盖读取、解码和受控端口结算。 |
| 同轮后续取消探针 | 主代理在一个 8 MiB 文件上比较三种 yield，每种一次；受控端口不发布分析结果，直到 timer abort 才结算。观察创建、提交和 terminate 调用边界。 |
| 源树测试 | 调查子代理与独立审阅者执行 resource、encoding、Worker、constructor 四文件：Bun 12 pass / 0 fail；额外 Node 探针 11 pass / 1 fail。 |

Node 的[定时器文档](https://nodejs.org/download/release/v24.18.0/docs/api/timers.html)
说明 timeout 小于 1 ms 的 delay 归一为 1 ms，`setImmediate` 安排在 I/O callbacks 后；
[微任务说明](https://nodejs.org/download/release/v24.18.0/docs/api/process.html#when-to-use-queuemicrotask-vs-processnexttick)
解释已完成 Promise 的 continuation。Bun 的结论来自上述实测，而非用 Node 文档推定其内部实现。

原始样本、完整测试命令与首次实现节选分别保留在随附资源。一次性性能脚本和 fixture 已清理；
这些记录支持条件复核，重建 harness 将产生新样本。真实 Worker / analyzer 的端到端成本、
冷缓存、CPU/RSS 与取消延迟分布属于后续验证范围。

## 调查结果与边界

### 取消场景与让步来源

- **产品场景：调用方停止一次 Run。** 2026-08-15 的[历史取消决策](../decisions/archive/cancel-task-admission-and-drain-started-work.md)
  明确列出 CLI、service、editor、CI 将 Ctrl+C、timeout 或用户停止映射到 `AbortSignal`。
  Product 停止新任务准入，并等待已启动工作协作收尾、保留已形成的事实。
- **执行边界：Check 留在调用方 runtime。** [当前决策](../decisions/execute-check-functions-in-caller-runtime.md)
  允许单个 Check 私用 Worker/process；同线程任意项目代码的强制抢占不属于 Run 能力。
- **局部方案：同步读取让步，同步分析交给 Worker。** 9 月 1 日原迁移 Plan 要求定期检查 signal；
  9 月 2 日实施提交 `d356dcb4` 才选定有界父线程读取和单个 Worker。上游 analyzer 没有取消 hook，
  因而取消由 Check-owned execution 承接。[现行 analyzer 决策](../decisions/adopt-selected-lizard-extensions-in-product-owned-analyzer.md)
  继续保留 resource、cancellation 和完整输入失败边界。

迁移主因是 Python/Lizard 安装分发摩擦。8 MiB 文件和深层 conditional 是合成稳健性验证；
这轮历史检索没有找到由真实用户取消投诉促成该方案的记录。

迁移前的 Lizard 使用同步进程、固定 300 秒 timeout，只在扫描前后观察 signal，本来就会阻塞
同线程 abort。新增 yield 提供了读取阶段的协作机会，不能解释为恢复旧实现已有的中途响应能力；
新 Worker 模型也没有据此证明保留了原来的 300 秒 deadline。

`32 KiB` 和 `setTimeout` 是可追溯的历史实现值。检索未找到它们的专项选值依据或最优性证明。

### 当前边界由哪些机制负责

| 边界 | 负责机制 | 准确限制 |
| --- | --- | --- |
| 协作取消 | 读取 checkpoint 检查 signal；逐非空 chunk 的 task yield 给 abort 回调执行机会；Worker 阶段监听 abort。 | 正在执行的同步 open/read/concat/decode 仍不可抢占；32 KiB 不是毫秒级响应保证。 |
| 字节与完整输入 | 按实际 `bytesRead` 累加，接受单文件至多 8 MiB、aggregate 至多 64 MiB；整批完成后创建唯一 Worker。 | 超限检查在 yield 前；可能先读到一个至多 32 KiB 的超限块。输入 cap 不等于 IO、heap、RSS 或耗时上限。 |
| 清理 | 成功打开的 FD 在 `finally` 中关闭；端口一次性移除 listeners、调用 terminate 并结算。 | Node 端口不等待 terminate Promise；调用终止与证明物理线程已退出是两件事。 |

当前每个非空文件至少 yield 一次：200 个短文件产生 200 次，正常读取 4 MiB 通常产生 128 次。
空文件 EOF 不 yield；发现超限则直接退出读取。

measurement 未完整完成时，Check 返回 `unavailable`，不发布 metric prefix 或伪造 waiver audit；
此前已发布的 input-rejected Records/warning 保留。取消测试的“零 Records”只适用于其 accepted-only fixture。

### 三种方案的观察与取舍

下表为本轮局部性能样本的 median，单位 ms。真实 analyzer 未参与计时；完整三次样本和微任务诊断值
见 admission 观测资源。

| Runtime / 输入 | 默认 timer | 注入 setImmediate |
| --- | ---: | ---: |
| Bun 1.3.14 / 200 × 128-byte 文件 | 240.38 | 5.08 |
| Bun 1.3.14 / 1 × 4 MiB 文件 | 157.68 | 7.72 |
| Node 24.18.0 / 200 × 128-byte 文件 | 232.30 | 4.75 |
| Node 24.18.0 / 1 × 4 MiB 文件 | 153.83 | 5.07 |

**推断：**这些受控输入中，频繁 timer 等待是主要 wall 差异。缺少逐 phase telemetry，
比例仅适用于本地 admission 对照，不能外推成完整 Check 或 Gate 加速比。

同轮后续探针把 `yieldAdmission` 换成 `Promise.resolve()` 来移除宏任务让步，其结果为：

| 8 MiB / timer abort / Bun 1.3.14 | 受控端口创建次数 | 提交 source bytes | 结算 |
| --- | ---: | ---: | --- |
| 当前 timer | 0 | 0 | cancelled |
| setImmediate | 0 | 0 | cancelled |
| 无宏任务让步 | 1 | 8,388,608 | cancelled，随后调用 terminate |

这直接观察到：去掉 task yield 后可以最终取消，但取消回调可能在读完并到达 Worker 创建、提交边界后
才执行。端口计数不是实际线程测量；该探针也没有直接删除读取循环中的全部 `await`。

**建议与采用条件：**

1. 保留响应取消这一结果，先评估将 timer 换成 `setImmediate`，维持现有 checkpoint、字节和清理机制。
2. “每 32 KiB 让步”可以另行调节，但应由代表性输入与取消响应证据决定频率。
3. 若产品接受读取阶段不主动响应同线程 timer/I/O 取消，可以选择删除让步；这是明确的行为取舍，
   需要修订该阶段的承诺。保留字节 cap 或 signal 检查本身不会给尚未执行的 abort 回调运行机会。

### 验证状态与后续实施

当前 production 默认仍为 `setTimeout(0)`。本轮交付是调查报告和证据，候选默认替换及上述行为取舍
均未实施。Bun 四文件通过；额外 Node 失败是 `constructor.test.ts:100` 的 null-prototype/plain-object
断言差异，字段与 passed 状态相同，与 yield 注入无关。完整输出保留在观测资源中。

实施验证应覆盖：

- 候选默认下的预先取消、读取中取消、跨文件和 Worker 在途取消；完整结果及已有 rejection 保留。
- exact 8/64 MiB、超限、读取失败、decode、Worker 各终态和清理；测试注入的微任务 seam 与生产默认分别验证。
- 同一真实 corpus 的完整 Worker/Check 输出与 wall 对照；声明包或 Gate 收益时再覆盖对应消费者路径。
- timer/I/O 竞争、支持的宿主与平台；有硬延迟或资源预算需求时单独建立测量条件。

当前测试与探针支持原意、控制流和局部成本判断。FD fault injection、终止完成时刻、真实 E2E 性能
及稳定 latency/RSS budget 仍待取证。

后续策略和验收讨论由[读取优化 Draft](../../changes/optimize-function-metrics-input-admission/proposal.md)承接；
报告中的样本保存取证时结果。

## 随附资源

- [取消决策时间线、旧同步 Lizard 边界与无宏任务让步探针](./_resources/261008-function-metrics-admission-yield/cancellation-scenarios-and-no-yield-probe.md)
- [局部 admission 原始样本、方法及源树测试节选](./_resources/261008-function-metrics-admission-yield/chat-admission-observations.md)
- [首次逐块让步及后续依赖 seam 的历史节选](./_resources/261008-function-metrics-admission-yield/history-evidence.md)
