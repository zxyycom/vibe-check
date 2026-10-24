---
title: "调查 fast Gate 的 lint 耗时放大与性能阻断"
id: "261023-diagnose-fast-gate-lint-amplification"
formedAt: "2026-10-23T06:34:34Z"
question: "同一 lint 在 fast Gate 中为何显著变慢，哪些资源与编排证据足以指导不削弱检查的优化？"
tags:
  - "performance"
  - "project-gate"
  - "resource-contention"
  - "type-aware-lint"
relations: []
---

## 形成时背景

2026-10-23，用户反馈默认 `bun run check` 被性能门禁阻断，要求调查并保存报告。
当时 fast 已缩至 8 个 Check，功能检查全部通过，仍因平均耗时与 P95 超预算退出 1。
本轮保留既定硬阻断、检查内容和预算，仅调查；没有实施性能修复、自动重试或测试清理。

**结论：阻断计算符合现有策略；主要热点在 type-aware lint 后端及其运行资源，而非 Gate 误选全量或日志结算。**
并发对照显示明显慢化，CPU 限流与部分窗口的内存回收也有实测证据；原现场 12–14 秒的精确成因仍未闭合。
尝试将 lint 后端限制到两个 Go processor，未取得稳定收益，不能直接落地。

## 调查目的

判断同一 lint 在 Gate 内为何变慢，区分计时口径、命令接线与资源竞争，给下一步保留检查语义的优化确定最小实验。
本报告保存本轮认识；当前策略仍由 [Project Gate](../tooling/project-gate.md)拥有。

## 调查范围与依据

### 输入与环境

- 测量基于 `main` 的 `d15cbf6f`，Linux x64、Bun 1.3.14、Oxlint 1.89.0、oxlint-tsgolint 7.0.2004。
  起测工作树干净；最后一组对照期间仅增加本报告的空候选，产品、脚本、配置与依赖未改。
- cgroup `cpu.max=400000 100000`，即 4 CPU 配额；`memory.max=6442450944`，即 6 GiB。
  未清缓存、调度历史或隔离宿主负载；Gate 正常运行会更新其本地历史和日志。
- Product/scripts lint 分别报告 687/310 个文件、127 条规则，使用原有 `typeAware:true`。
  [lint 命令 owner](../../scripts/development/lint.ts)、[进程接线](../../scripts/process-execution/command.ts)、
  [Gate 定义](../../scripts/project/gate/definition.ts)和[预算实现](../../scripts/project/gate/runtime/performance-policy.ts)是静态依据。
- 已查询正式报告与候选。[既有时长波动调查](./calibrate-gate-duration-variation.md)说明旧 workload 的口径与采样边界，
  [类型引擎升级调查](./assess-oxlint-tsgolint-upgrade.md)提供版本背景；它们没有回答本轮 fast 阻断问题，故不建立直接演进关系。

### 实际动作与口径

1. 保全原 fast 及两次 changed 失败日志，重算实际执行项的 mean/P95；只读代理独立核对命令、环境与计时路径。
2. 06:31 UTC 运行一次带采样的正式 `bun run check`，仍退出 1；这是诊断样本，不替换原失败现场。
3. 06:32–06:33 UTC 按预定顺序运行 `serial-a → pair-a → third-a → third-b → pair-b → serial-b`。
   serial 是两 lint 依次执行；pair 是两 lint 并行；third 另加一条串行链：selection 测试 → Product typecheck → scripts typecheck → format。
   该链复用原失败现场的任务顺序，但不模拟 learned scheduler、候选准备、whitespace 或任务完成后的动态补位。
4. 用两次带 Go scheduler trace 的 Product lint 确认并发控制边界；随后固定运行
   `默认 → GOMAXPROCS=2 → GOMAXPROCS=2 → 默认` 的 third 对照。环境覆盖只施加于两个 lint，未写入仓库配置。

所有 lint 代理均从 owner 取得 Gate 同款 JSON argv、工作目录与 plain-text 环境，经同一 `mise` 工具环境执行。
代理将输出写文件，Gate 使用 pipe/transcript，故代理 wall 不是完整 Check duration。
轮询间隔 100 ms，退出检测可多计约一个采样间隔；实际调度延迟可能更大。
`/proc` 只保留所启动进程树的数值状态，短生命周期进程及退出前最后一段 CPU 可能漏采。
cgroup 差分包含其他任务，不能全部归因于本次命令。

资源中的 measurements 保存计时、失败上下文摘录、来源 SHA-256 和进程汇总；invocations 保存实际参数，measure 保存一次性采样方法，
concurrency-probes 保存并发控制探针。大型逐次采样与原始输出留在忽略目录 `.log/gate-lint-investigation-20261023/`，不作为长期接口。
首个 fast 采样尚未加入 memory events/current 字段，相关字段缺失表示未测，而不是零。

## 调查结果与边界

### 1. 阻断来自真实执行耗时，不是总耗时超限或选择错误

fast 的既定预算为总耗时 30 秒、单 Check 平均 2 秒、P95 5 秒，三项独立阻断。
P95 是一次 Run 内已执行 Check 的 nearest-rank，不是多轮运行的延迟分位数；8 项时恰好取最大项。

| fast 样本 | elapsed-to-initial-result | 平均 | P95 | lint Product / scripts |
| --- | ---: | ---: | ---: | ---: |
| 原现场 06:19 | 16.07 s | 4.86 s | 14.00 s | 14.00 / 12.36 s |
| 本轮采样 06:31 | 7.37 s | 2.13 s | 5.48 s | 5.37 / 5.48 s |

两次均为 8 passed、35 not-applicable；候选包 SHA 与 definition fingerprint 相同。总耗时均合格，平均与 P95 均不合格。
独立重算与失败上下文一致，未发现算术错误；Check duration 不含此前的调度排队或候选准备。
候选 preparation 只占约 0.54–0.57 秒，不是此处 12–14 秒 lint 的解释。

changed 也有独立问题：已有 05:13/06:08 日志均实际执行 32 项，elapsed 分别 28.39/43.09 秒，
mean 2.22/3.51 秒、P95 5.65/7.24 秒。相同选择和候选不证明机器状态相同；本轮没有重新分析全部 changed 热点，
也不能用修好 fast 代替 changed 或 all 验收。

### 2. 大部分 lint 工作在类型后端，Gate 外层不是首要嫌疑

公开 lint 与 Gate 共用 invocation；主要接线差异是 Gate 额外使用 JSON 输出、异步进程与 transcript。
两者都采用 pipe/plain-text 环境，成功路径不解析 findings。原现场 stdout 很小且 diagnostics 为空。
原始 JSON `start_time` 分别为 13.8119/12.1159，数值贴近 Check 的 14.0007/12.3580 秒；
未读取 native 计时实现，不能把该字段严格等同于端到端 wall，但不支持把十余秒主要归因于日志输出。

本轮 `/proc` 看到真实 `tsgolint` 后端。单独执行两 lint 的首组中，两个主要后端累计观察到 8.46 CPU 秒，
子进程树 `getrusage` 合计 9.03 CPU 秒；CPU 工作主要在那里，而非外层 Bun/Node 包装器。
并行组中主要后端各自 RSS 峰值约 0.55–0.73 GiB，不能把文件数或 Oxlint 的线程字段当作整个 Check 的资源占用。

### 3. 重叠会放大耗时，但不足以单独解释极端现场

以下是第一组正反序代理观测，各条件 2 个样本；单位秒，不作总体分布估计。

| 条件 | Product lint wall | scripts lint wall | 整个场景 wall |
| --- | ---: | ---: | ---: |
| 两 lint 依次执行 | 2.08–2.40 | 1.66–1.75 | 3.83–4.06 |
| 两 lint 并行 | 4.41–4.43 | 3.79–3.81 | 4.41–4.43 |
| 两 lint + 第三条工作链 | 4.61–5.30 | 3.87–4.64 | 4.82–5.41 |

这表明 JSON 模式本身不必然产生十几秒耗时；并行甚至未缩短这组“两 lint 总完成时间”。
第三链进一步增加了竞争，但本组也没有重现原 14 秒。不能将表中比值当作稳定竞争系数或生产收益。

资源证据与边界：

- 带采样 fast 的 7.91 秒外层窗口内，53/79 个 CPU 配额周期发生限流，CPU PSI `some/full` 累计约 2.95/1.46 秒。
  限流累计时间跨执行上下文计数，不能直接作为命令被延长的 wall 秒数。
- pair-a、third-a/b 窗口内观察到 cgroup 内存触及或接近 6 GiB 上限，`memory.events.max` 与直接回收计数增长；
  pair-a 的 memory PSI `some` 约 203 ms，third-b 约 167 ms。没有 OOM 或 OOM kill 增量。
- pair-b 未观察到 memory max 增量，仍与 pair-a 同样慢。因此内存回收不是全部慢化的必要条件；CPU 竞争、背景负载与缓存状态仍混杂。
- 后续默认 third 对照自身达到 5.88–8.33 秒，证明早先 4.82–5.41 秒范围不是稳定上界。

### 4. Oxlint 线程参数不能替代后端控制；两个 Go processor 未证明更快

针对当前安装版本，真实 Product lint 的探针输出为：

| 单独改变的控制 | Oxlint `threads_count` | tsgolint trace `gomaxprocs` |
| --- | ---: | ---: |
| `--threads=1` | 1 | 4 |
| `GOMAXPROCS=1` | 4 | 1 |

因此两个控制在本次调用中不是同一个资源旋钮；OS thread 数也不是可并行 Go processor 数。
探针开启了 `GODEBUG=schedtrace=1000`，只用于确认接线，不拿其时长证明优化。

随后关闭 trace 的交错对照结果如下，全部 lint/测试/typecheck/format 子命令退出 0，检查范围与规则不变：

| 顺序与条件 | Product lint | scripts lint | 场景 wall | 子进程树 CPU 合计 |
| --- | ---: | ---: | ---: | ---: |
| 默认 C | 7.34 s | 7.00 s | 8.33 s | 27.37 s |
| 后端 2，A | 11.15 s | 9.03 s | 11.16 s | 33.35 s |
| 后端 2，B | 6.24 s | 4.64 s | 6.24 s | 19.98 s |
| 默认 D | 5.88 s | 4.91 s | 5.88 s | 20.05 s |

**本轮不采用 `GOMAXPROCS=2`。** 样本少且资源状态波动明显，不能证明限制为 2 必然退化，但没有可支持落地的稳定收益。
也没有证据支持去掉 type-aware 检查、合并 Check 稀释平均值或继续缩减 fast 验收范围。

### 5. 下一步建议与未闭合事项

1. **优先做一个互斥准入实验：同时至多一个 type-aware lint，仍保留两个独立 Check。**
   第一组 serial 的累计完成时间优于 pair，值得测试 Gate 内 lint 之间的互斥；它不是已证明的 Gate 优化。
   只改变这一项，并记录与 typecheck 的实际重叠，比较 fast、changed 和 all 的总耗时、mean/P95 与完整验收结果。
2. **让后续失败留下资源上下文。** 现有日志足以恢复选择、预算、候选和任务时序，但原 14 秒现场没有同期 CPU/memory 压力快照。
   可评估由 Gate adapter 保存小型运行前后配额、CPU/PSI、memory events 差分；保留 cgroup 包含其他任务的边界，避免全量环境或任意进程命令行日志。
3. 原极端现场可能同时受 CPU、内存和背景任务影响，尚不能定出各因素贡献，亦未定位某条类型规则或某个昂贵类型。
   本轮不把这项未知扩展为全仓库类型重构。若在资源空闲且输入固定的窗口仍持续出现长尾，再进入后端 profiling。

本轮实际改变只有调查正文、最小资源与派生索引；没有应用调度、环境、预算、规则或产品代码改动。
测量中的 fast 仍失败；changed/all 没有为本报告重新运行。报告的文档验证与 Gate 性能修复是不同结论。

## 随附资源

- [实际并发控制探针](./_resources/261023-diagnose-fast-gate-lint-amplification/concurrency-probes.json)
- [同口径命令与 plain-text 环境](./_resources/261023-diagnose-fast-gate-lint-amplification/invocations.json)
- [一次性采样脚本的最终版本](./_resources/261023-diagnose-fast-gate-lint-amplification/measure.py)
- [失败现场与全部实验的最小计时摘录](./_resources/261023-diagnose-fast-gate-lint-amplification/measurements.json)
