# 选择公开回调位置

需要把项目规则、调度策略或呈现逻辑接入 Vibe Check 时，先按要改变的结果选择扩展点。本页只介绍当前 package API；每个位置的完整输入、返回与失败契约由链接的专题拥有。相邻执行阶段不表示同一种 callback，也不共享控制权。

## 按任务选择

| 你要完成的任务 | 使用的公开位置 | 输入、作用与边界 |
| --- | --- | --- |
| 执行前验证 options，或准备本项执行所需的值 | Check `prepare(options, context)` | 只在本 Check 获准入后至多一次；成功或明确带 fallback 继续后交给 `execute`，block、throw 或非法结果只使本项 unavailable。见[自定义 Check](extending-check-lifecycle.md)。 |
| 运行领域规则并决定 Check 终态 | Check `execute(options, context)` | 形成 terminal data、messages 和可选 Records；不要遗留未等待的工作。见[自定义 Check](extending-check-lifecycle.md)。 |
| 读取 direct upstream 的类型化 data | provider `parseData(data)` 与 dependency read | parser 验证 terminal data；relation 授权和读取失败由[依赖与类型化数据](check-dependencies.md)定义。 |
| 在外部进程 spawn 前选择环境 | `commandCheck({ resolveEnvironment })` | 接收 prepared command options，返回 closed environment policy；不负责领域结算。见[命令环境](command-check.md#环境)。 |
| 把完整外部命令结果转为领域事实 | `commandCheck({ afterCommand: { execute } })` | 接收冻结 `{ options, command }`，在完整 numeric-exit result 上返回 Check result；spawn/capture/取消等失败不交给它。见[调用方完成阶段](command-check.md#调用方完成阶段)。 |
| 为一次 Run 准备自定义调度策略 | prepared admission strategy `prepare` | static graph 有效后至多一次，返回同步 `decide` 与可选 `terminalEffect`。见[调度 Check](scheduling.md)。 |
| 决定下一次准入哪些 Check | simple / prepared strategy `decide` | 同步提出 select/wait，Scheduler 验证合法性；不执行 Check。见[自定义准入 policy](scheduling.md#自定义准入-policy)。 |
| 在 Scheduler 终态读取测量或执行事实 | `scheduler.terminalEffects[]` 或 prepared `terminalEffect` | 只在 drain 并 seal 后交付声明的冻结字段；不能改写 Check 或 Scheduler 结果，也不是必达的 `finally`。见[调度 Check](scheduling.md)与[输出状态](run-outputs.md#输出状态与失败处理)。 |
| 改变有效 Check 的整体四态汇总 | `RunControls.checkAggregation(checks)` | 完整结算后至多一次，同步折叠 canonical-order 的有效 `CoreCheck[]`；不是 RunResult transform。见[Check aggregation](../api-mechanics.md#runcontrols-与-check-aggregation)。 |
| 定制受管进度的 preview 文本 | `outputs.progressRendering.formatter` | 只格式化受预算限制的显示文本，不改变终态或 Records。见[配置 preview 文本](run-outputs.md#配置-preview-文本)。 |
| 按项目策略处理最终结果或释放调用方资源 | 在 `await run(...)` 后处理，资源清理使用调用方 `try/finally` | 先区分 completed、取消、配置或输出等分支。见[RunResult 分支](../api-mechanics.md#runresult-分支)。 |

## 接着编写 Check

选定 `prepare` 或 `execute` 后，按[自定义 Check 的完整可执行示例](extending-check-lifecycle.md#定义-check)编写 options 验证、取消、Records、messages 与 terminal data；该专题拥有 Check authoring 契约与示例，不在本页重复。
第一业务参数是 options，不是 `{ options }`；需要框架字段时才在第二参数取得声明的 context。

## 调用时序与失败处理

Check `prepare` 只对通过选择、依赖与准入的本项运行，preparation 允许继续后才进入 `execute`。
所有 Check 完整结算后，Run 才汇总有效 Check；需要最终 RunResult 的代码应留在调用方。

Check prepare/execute、Scheduler prepare/decide/terminal 与 command environment/complete 都接受
[声明式 callback context](callback-context.md)：业务 input 独立，普通 function 默认零需求，
需要框架字段时用对应 helper 声明；各 phase 的合法字段由其专题定义。回调是受信任宿主代码，声明需求不是 sandbox。

Scheduler terminal effects 按配置顺序逐个 await，之后才交付 prepared strategy 的 terminalEffect；任一失败不阻止后续 effect，
也不回写 sealed facts。早期取消、无效 graph 或策略准备失败没有 sealed context，因此不能依靠这些 effect 做必达清理。
失败的 readback 与 primary/output 优先级见[Run 输出与诊断](run-outputs.md#输出状态与失败处理)。

`checkAggregation` 的 throw、Promise/thenable 或非法返回会直接拒绝 `run` Promise，而不是变成普通 Check unavailable；
调用方应按[API 机制](../api-mechanics.md#runcontrols-与-check-aggregation)处理这一不同的失败边界。
