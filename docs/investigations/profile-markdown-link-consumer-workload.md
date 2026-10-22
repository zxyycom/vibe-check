---
title: "Markdown Link 性能：深度复现与执行粒度实验"
id: "261021-profile-markdown-link-consumer-workload"
formedAt: "2026-10-21T09:38:24Z"
question: "同量级数据如何复现 mdlink 的 6–8 秒耗时，实际调用量是否超出理论预期，如何保持安全与取消语义降低成本？"
tags:
  - "bun"
  - "cancellation"
  - "complexity"
  - "file-collection"
  - "filesystem"
  - "markdown-link-validation"
  - "path-depth"
  - "performance"
  - "serial-io"
  - "worker-threads"
relations: []
---

## 形成时背景

外部使用者在 1827 份 Markdown、1193 条语义引用上记录了 6.124 / 7.830 秒的链接执行耗时。
本轮以独立生成的同量级语料调查 mdlink，复现条件与优化取舍如下：

- **复现：**1824 份源、约 3.32 MB、1193 条引用，在本机路径深度 22/26 时稳定出现 6–8 秒。
- **定位：**主要调用量符合理论；成本随逐组件路径检查增长，正文读取与语法解析未出现次数膨胀。
- **候选：**深度 26 的 Bun 中位数从异步基线 **7.547 秒**降为主线程同步 **1.892 秒**、按路径同步 worker **2.166 秒**。
  两者保留安全检查，但分别承担主线程阻塞、worker 固定成本；其它 worker 变体未提速。

本报告记录隔离实验，产品实现与公开契约保持原样；结果用于选择下一步验证方向。

## 调查目的

确定足以复现 6–8 秒的条件，对账理论与实际调用量，并比较六种执行方式在性能、路径安全、取消和响应性上的取舍。

## 调查范围与依据

### 固定负载与环境

| 维度 | 固定条件 |
| --- | --- |
| 源与正文 | 1824 份、3,320,000 bytes；175 份有引用，其余仍读取、验证并可提供被引用标题 |
| 引用与目标 | 1193 条引用：777 条 direct local、416 条 HTTP；296 个逻辑直接目标，136 个同时为源 |
| 纯目标 | 130 个文件、30 个目录；其中 32 个 Markdown 需读取标题事实，非 Markdown 目标不读正文 |
| 策略与预算 | 目录检查存在/类型；HTTP 不发网络请求；单文件默认 1 MiB，两项总量预算关闭，逻辑计费保持 |

深度为相对根的分量数（含叶名）。所有源和目标等深、无 symlink、目录名较短且共享前缀较多；加深时减少正文填充，保持总字节、引用和目标规模。
另测 10 个源、9 条引用、深度 4 的未预热小型 Check。两类均为生成语料，目标是找到充分复现条件，而非重建外部现场。

环境：Bun 1.3.14、Node 24.18.0、Linux x64 / WSL2、AMD Ryzen AI 7 H 450、6 logical CPUs，语料位于 `/tmp` ext4。
构建时 HEAD 为 `34c58409fde4f63c264762711d99ae918e159b15`；实际输入、虚拟源码与负载 manifest 摘要随附。

证据窗口（Asia/Shanghai）：深度扩展于 2026-10-21 19:55–20:02，循环 / callback / I/O 重放于当日 22:18–23:01；
六版本安全与回归于 2026-10-22 00:08–00:09，正式性能于 00:10–00:36。各阶段独立统计。

### 本次隔离版本与测量

六版本的差异见结果表，均由现有 Product-owned measurement entry 临时构建。除 adaptive 外，仅改变路径 probe，正文读取维持异步。
转换保留逐组件顺序与安全分支；共用接线包含按路径包装，因此 baseline 是原算法在同框架下的基线，而非发布产物。
worker 每 resolver 懒创建一个，串行处理请求；worker-fine 返回类型状态，其它 worker 返回路径级结果，比较包含 DTO / 控制流差异。
完整转换、取消及生命周期协议见随附的 `probe-batch-notes.md`，原始方法与数据保真留存。

指标为公开单 Check Run（仅 mdlink），无操作观察插桩。大型语料每个独立进程预热一次解析缓存；小型语料关闭缓存且不预热。
import、生成、解包在计时外，worker 创建、通信及退出等待在计时内。Bun 每组 6 次，平衡排列版本并轮转负载；Node 深度 26/小型每组 3 次。
共 180 个计时样本，另取 18 个 Bun profile 对账。宿主未独占、不清 OS cache；小型实验也不代表冷存储或完整进程启动。

行为 owner 为[公开指南](../checks/markdown-link-validation.md)、[内部不变量](../development/markdown-link-resolution.md)
及[引用图决策](../decisions/observe-markdown-reference-graph.md)；本报告是实验依据，产品行为以 owner 为准。

## 调查结果与边界

### 深路径复现与理论对账

深度扩展中，4/10/16/22/26 的中位数为 2.000 / 3.371 / 4.781 / 6.231 / 7.185 秒；各 5 次，深度 22/26 均 5/5 落入 6–8 秒。
仅用深度 4、10 校准线性耗时模型，对 16/22/26 的回顾性推算偏差为 0.8%–2.2%，与逐组件工作量增长相容。
这是本机的充分条件，尚不能归因为外部使用者的实际根因。

理论模型：独立路径 `Q=1824+296−136=1984`，无 symlink、成功完成且等深时组件量 `K=Q×D`；正文文件 `R=1824+32=1856`。
777 为引用逻辑计费数。`work-count-audit.json` 与新 18 个 profile 的操作量对账如下：

| 工作量 | 预期及实测 |
| --- | --- |
| 深度 4 / 22 / 26 的路径组件 lstat | 7,936 / 43,648 / 51,584，所有新 profile 一致 |
| 打开 / fstat / 关闭 | 各 1856 |
| 正文 read / 实际 bytes | 3712（data + EOF）/ 3,320,800 bytes |
| fresh parse / 缓存文件恢复 | 0 / 每 invocation 1 次；32 个纯 Markdown 内容相同，1825 个 cache 身份 |
| source / resolver checkpoint | 1835 / 307，均保持真实事件循环让步 |
| worker 探查请求 | 按路径 1984 次；逐组件转发为 K 次，另有启动/关闭协议 |

深度 26 的 51,584 次组件观察对应 2106 个不同路径，95.9% 在不同节点间重复共享前缀。
这类重新观察用于识别节点之间的目录替换；安全前提下应保留。同节点去重与 source/target 共享已经存在。
fstat、EOF/growth 检测与当前 bytes 核对各有职责，解析缓存只免语法重算。后续可定位路径字符串处理；物理磁盘与内核路径遍历尚待 trace。

### 完整 Run 的性能结果

下表为六版本正式窗口的中位数（秒）；完整范围、MAD、CPU/RSS 与同轮配对统计见 `probe-batch-summary.json`。

| 版本 | probe / 读取变化 | Bun 深度 4 | Bun 深度 22 | Bun 深度 26 | Node 深度 26 |
| --- | --- | ---: | ---: | ---: | ---: |
| baseline | 原异步 probe | 2.163 | 6.523 | 7.547 | 6.212 |
| direct-sync | 主线程同步 lstat/readlink | 1.376 | 1.773 | 1.892 | 1.562 |
| worker-sync | 整条路径交给 worker，同步检查 | 1.587 | 1.986 | 2.166 | 2.102 |
| worker-async | 整条路径交给 worker，内部仍异步检查 | 2.501 | 6.816 | 7.910 | 6.849 |
| worker-fine | 判断留在主线程，逐组件转发同步 metadata | 2.274 | 7.020 | 7.985 | 7.757 |
| adaptive | 原异步 probe；缓冲按文件大小起步、按需扩容，保持 max+1 bound | 2.079 | 6.494 | 7.126 | 5.844 |

direct-sync / worker-sync 在 Bun 三种深度均各 6/6 对较快，深度 26 配对中位节省 **75.0% / 71.1%**；
worker-async / worker-fine 同深度分别慢 6.1% / 5.8%，Node 补充样本方向相同。组中位数与配对中位比是不同统计量。

路径内后续判断依赖前一组件结果。同步版本仍按序等待 I/O，但减少了逐组件异步调度；worker 将一次外层消息摊到整条路径，并保持调用线程可响应。
这是与结果相容的机制解释，底层各项占比仍待 trace；worker 通信本身并非天然更便宜，worker-async 的结果也表明“搬线程”本身不足以提速。

小型未预热 Check 中位数（毫秒），用于观察固定成本：

| 版本 | Bun（6 次） | Node（3 次） |
| --- | ---: | ---: |
| baseline | 71.6 | 55.0 |
| direct-sync | 67.0 | 46.5 |
| worker-sync | 80.5 | 79.0 |
| worker-async | 86.7 | 85.9 |
| worker-fine | 88.5 | 84.7 |
| adaptive | 68.3 | 54.2 |

自适应方案将工作缓冲累计申请从 **1,946,158,912 降到 3,322,656 bytes**，保持字节上限及正常负载的 read 次数。
Bun 深度 4/22/26 配对节省 2.7% / 2.1% / 2.6%，小型 Node 未稳定受益。
累计申请仅指工作缓冲；Bun 深度 26 的进程峰值 RSS 中位数为基线 170.7 → 176.1 MiB，Node 为 310.2 → 273.7 MiB。
峰值包含预热和 Run，增长时还需扩容/复制，因此这首先是分配量优化，而非已证明的普遍内存或耗时下降。

早期循环整理约 2.9% 收益、callback 未稳定提速，排查由此收敛到组件执行路径；同序列 I/O 重放仅作 API 成本参照。
完整过程见 candidate / filesystem-cost 材料，整项收益以上述 Run 为依据。

### 安全、取消与主线程响应性

六版本 × Bun/Node 的每个组合均通过 **24 个共同场景、5 个取消场景、29 个现有回归测试**；worker 另通过异常退出场景。
共同结果及顺序化访问轨迹一致，覆盖逐段越界、越界再入 root、三种 external policy、40/41 hops、共享前缀替换、同节点固定观察、
final-leaf no-follow、实际 max+1 读取及增长。EACCES 为注入；adaptive 仅归一化请求容量，仍核对实际 bytes / bound。
普通 Records/final data 完整发布，取消终态无部分结果，观察到的句柄与正式 worker 会话均收束。

source/target/symlink 三处受控 abort 后，基线及 adaptive 可继续原节点工作，直接同步和 worker 候选均停止新操作。
8000 边场景通过 timer 和真实 I/O 触发取消，保留事件循环 checkpoint；安全屏障仅用于行为验证。

在 I/O 入口注入 100 ms 宿主操作替身，并在开始时安排 5 ms timer，得到：

- 主线程同步版本：Bun / Node 的 timer 实际送达约 **100.5 / 100.6 ms**。
- 按路径同步 worker：约 **5.1 / 5.2 ms**，但 probe 在 abort 后仍等约 **95.5 ms** 才返回；没有抢占在途操作。

此处是受控机制演示，实际慢存储延迟仍待测。worker 让取消及时送达，但收束仍等待在途操作；不能抢占同步 I/O。
原生 AbortSignal 使用共享取消标志；Bun 测试 Proxy receiver 的兼容退化与 worker 退出处理见方法附件，正式 profile 无此退化。

### 当前判断与采用边界

1. **继续比较主线程同步与按路径同步 worker。**前者更简单且本机最快，下一步应测真实存储下的主线程停顿；后者隔离阻塞，但增加生命周期与固定成本。
   worker-sync 的 Bun / Node 小型配对分别慢 14.6% / 49.2%，Bun 深度 26 峰值 RSS 中位数从 170.7 增至 184.5 MiB。
2. **独立评估自适应工作缓冲。**已证明减少申请量，耗时收益较小且随 runtime / 负载变化，适合单独验证不同文件大小与增长模式。
3. **保留其余 worker 变体为对照。**本轮未显示收益；可迁移的研究方向是任务粒度与组件后端的组合，其它 I/O 消费者仍需自己的负载证据。

采用前需补证：安装产物的 worker 加载（原型使用临时绝对路径）、Windows、真实慢存储 / 冷 OS cache、并行 Check 响应分布及 symlink 密集性能。
这些实验是同框架原型比较，尚非发布验收；若决定实施，再整理生产边界、完成真实包验收与完整 Gate。

## 随附资源

- [I/O 观察与同序列 API 重放方法](./_resources/261021-profile-markdown-link-consumer-workload/audit-filesystem-cost.ts)
- [理论调用量与模型只读复核方法](./_resources/261021-profile-markdown-link-consumer-workload/audit-work-counts.ts)
- [隔离 bundle 与相邻回归构建方法](./_resources/261021-profile-markdown-link-consumer-workload/build-path-experiment.ts)
- [执行粒度隔离 bundle 构建方法](./_resources/261021-profile-markdown-link-consumer-workload/build-probe-batch.ts)
- [隔离源码、方法与 bundle 身份](./_resources/261021-profile-markdown-link-consumer-workload/candidate-identities.json)
- [候选无插桩计时与 profile 原始结果](./_resources/261021-profile-markdown-link-consumer-workload/candidate-performance.json)
- [安全轨迹、取消与回归原始结果](./_resources/261021-profile-markdown-link-consumer-workload/candidate-safety.json)
- [候选配对统计与复核断言](./_resources/261021-profile-markdown-link-consumer-workload/candidate-summary.json)
- [实现与 bundle 输入摘要](./_resources/261021-profile-markdown-link-consumer-workload/consumer-bundle-identities.json)
- [容量实验原始结果](./_resources/261021-profile-markdown-link-consumer-workload/consumer-capacity-results.json)
- [容量实验方法](./_resources/261021-profile-markdown-link-consumer-workload/consumer-capacity.ts)
- [同量级语料生成器](./_resources/261021-profile-markdown-link-consumer-workload/consumer-fixture.ts)
- [负载参数与 manifest 摘要](./_resources/261021-profile-markdown-link-consumer-workload/consumer-fixtures-summary.json)
- [主矩阵与分阶段原始结果](./_resources/261021-profile-markdown-link-consumer-workload/consumer-results.json)
- [统计与计数断言](./_resources/261021-profile-markdown-link-consumer-workload/consumer-summary.json)
- [深度扩展实现与 bundle 输入摘要](./_resources/261021-profile-markdown-link-consumer-workload/depth-bundle-identities.json)
- [深度扩展负载、探查、重复计时与 profile 原始结果](./_resources/261021-profile-markdown-link-consumer-workload/depth-results.json)
- [深度扩展统计与操作量断言](./_resources/261021-profile-markdown-link-consumer-workload/depth-summary.json)
- [本轮 I/O 耗时、重复路径与 API 重放原始结果](./_resources/261021-profile-markdown-link-consumer-workload/filesystem-cost-results.json)
- [隔离安全与性能测量方法](./_resources/261021-profile-markdown-link-consumer-workload/measure-candidates.ts)
- [负载测量入口](./_resources/261021-profile-markdown-link-consumer-workload/measure-consumer.ts)
- [路径深度实验方法](./_resources/261021-profile-markdown-link-consumer-workload/measure-path-depth.ts)
- [六版本安全与性能实验 driver](./_resources/261021-profile-markdown-link-consumer-workload/measure-probe-batch.ts)
- [两个隔离候选的源码转换](./_resources/261021-profile-markdown-link-consumer-workload/path-candidates.ts)
- [实验前的路径检查方案与验证设计](./_resources/261021-profile-markdown-link-consumer-workload/path-check-optimization.md)
- [六版本源码、虚拟替换和 bundle 身份](./_resources/261021-profile-markdown-link-consumer-workload/probe-batch-identities.json)
- [执行粒度、观测方法与生命周期边界](./_resources/261021-profile-markdown-link-consumer-workload/probe-batch-notes.md)
- [六版本完整 Run 性能原始结果](./_resources/261021-profile-markdown-link-consumer-workload/probe-batch-performance.json)
- [隔离 worker 生命周期与后端原型](./_resources/261021-profile-markdown-link-consumer-workload/probe-batch-runtime.ts)
- [六版本安全、取消和相邻回归原始结果](./_resources/261021-profile-markdown-link-consumer-workload/probe-batch-safety.json)
- [六版本安全与响应性场景](./_resources/261021-profile-markdown-link-consumer-workload/probe-batch-safety.ts)
- [六版本配对统计与计数复核](./_resources/261021-profile-markdown-link-consumer-workload/probe-batch-summary.json)
- [隔离安全与取消场景](./_resources/261021-profile-markdown-link-consumer-workload/probe-safety.ts)
- [bundle 与异步插桩生成器](./_resources/261021-profile-markdown-link-consumer-workload/profile-links.ts)
- [候选统计与断言重算](./_resources/261021-profile-markdown-link-consumer-workload/summarize-candidates.ts)
- [只读统计重算](./_resources/261021-profile-markdown-link-consumer-workload/summarize-consumer.ts)
- [深度扩展只读统计重算](./_resources/261021-profile-markdown-link-consumer-workload/summarize-path-depth.ts)
- [六版本只读统计与独立断言重算](./_resources/261021-profile-markdown-link-consumer-workload/summarize-probe-batch.ts)
- [理论对账、深度模型与 I/O 统计结果](./_resources/261021-profile-markdown-link-consumer-workload/work-count-audit.json)

## 复核与重跑

只读复核全部新统计及计数：

```sh
res=docs/investigations/_resources/261021-profile-markdown-link-consumer-workload
mise exec -- bun run "$res/summarize-probe-batch.ts" "$res"
```

新目录内重跑；消耗同量级本地实验资源，不覆盖历史结果：

```sh
out=$(mktemp -d .cache/vibe-check/performance-investigation/new-probe-batch-XXXXXX)
mise exec -- bun run "$res/build-probe-batch.ts" "$out"
mise exec -- bun run "$res/measure-probe-batch.ts" "$out" safety
mise exec -- bun run "$res/measure-probe-batch.ts" "$out" performance
mise exec -- bun run "$res/summarize-probe-batch.ts" "$out"
```

重跑使用当前源码与依赖；历史身份以保存的摘要为准，原始数据字段的解释由各自 summary 与方法附件承接。
