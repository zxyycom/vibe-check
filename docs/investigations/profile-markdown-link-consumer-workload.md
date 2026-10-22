---
title: "Markdown Link 性能：路径深度、读取链与文件收集"
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

外部使用者曾在 1827 份 Markdown、1193 条语义引用上记录 6.124 / 7.830 秒的 mdlink 耗时。
本调查用独立生成的同量级数据寻找复现条件，再以路径检查的快原型定位读取链和文件收集成本。
已定位的优化入口是路径/读链的执行粒度，以及文件收集中的重复祖先匹配；安全观察次数符合理论模型。
结论适用于下述隔离实验；外部现场根因仍待现场证据确认，Product 实现与公开契约保持原样。

## 调查目的

回答三个问题：什么条件能大致复现 6–8 秒；实际工作量是否符合理论；在保持路径安全、取消与资源收束的前提下，哪些开销值得优化。

## 调查范围与依据

### 负载、环境与证据窗口

下表为性能语料；安全矩阵使用受控场景，具体输入见安全附件。

| 维度 | 固定条件 |
| --- | --- |
| 源与引用 | 1824 份源、3,320,000 bytes、1193 条引用；175 份源有引用，其余仍读取、校验并可提供被引用标题 |
| 目标 | 777 条本地直接引用、416 条 HTTP；296 个逻辑直接目标，136 个同时为源；纯目标含 130 个文件、30 个目录，其中 32 个 Markdown 需标题 |
| 深度 | 相对 canonical root 的组件数，含叶名；源和目标等深，无 symlink，短目录名、共享前缀较多；加深时减少填充，保持正文总量 |
| 策略 | 目录只查存在/类型，非 Markdown 目标不读正文，HTTP 不发网络请求；单文件 1 MiB，两项总量预算关闭，逻辑计费不变 |

环境为 Bun 1.3.14、Node 24.18.0、Linux x64 / WSL2、AMD Ryzen AI 7 H 450、6 logical CPUs，语料在 `/tmp` ext4。
路径实验构建 HEAD 为 `34c58409fde4f63c264762711d99ae918e159b15`，读取/收集实验为 `808cf9ded3e2af947b76afe65224db636abf9610`。
两者 358 个实际源码/测试输入摘要一致；方法、虚拟转换及 48 个读取/收集 bundle 身份见随附 identities。

| 阶段 | 实际窗口（Asia/Shanghai） | 证据用途 |
| --- | --- | --- |
| 路径深度与执行粒度 | 2026-10-21 19:55 至 2026-10-22 00:36，各子窗口独立统计 | 异步基线、理论对账、快原型 |
| 读取/收集安全与回归 | 2026-10-22 11:06–11:08 | Bun/Node × 六变体 × 三深度及相邻回归 |
| 读取/收集性能与 profile | 2026-10-22 11:08–11:23 / 11:23–11:25 | 126 个无插桩计时样本 / 18 个 Bun profile |

### 隔离与测量方法

读取/收集实验的 `fast` 沿用路径实验的 worker-sync 后端：每 resolver 一个私有 worker 串行检查完整路径，正文使用原异步 FileHandle 算法。
它采用该实验的公共接线，绝对耗时只与同窗口六变体比较。授权、目标预算、解析缓存和发布保留原执行顺序，读取 job 在授权/计费之后发出。

指标为只含 mdlink 的公开单 Check Run。每个独立进程先预热一次解析缓存，再计时；当前正文仍重新读取。
import、生成、解包在区间外，worker 创建、消息、字节克隆及退出等待在区间内；每次独立收束。
Bun 各深度/版本 6 次，使用平衡版本排列并轮转深度；Node 仅深度 60 各 3 次。宿主未独占，不清 OS cache，全部样本保留。

无插桩计时（plain）、分阶段插桩（profile）和安全观察分别构建。profile 仅作归因：timer 包含子区间，异步读取观察 adapter 也有额外成本，各区间及其与 plain 的差值不作耗时分解。
行为 owner 为[公开指南](../checks/markdown-link-validation.md)、[解析与授权不变量](../development/markdown-link-resolution.md)
及[文件收集不变量](../development/project-files.md)。

归档保留性能样本及去重后可还原的安全测量结果、轨迹和输出摘要；完整临时输出核对后已清理。
安全 JSON 为 233,038 bytes，读取/收集实验新增 JSON 均小于 256 KiB；归档细节见安全附件。

## 调查结果与边界

### 复现条件与调用量模型

原异步深度 4/10/16/22/26 中位数为 2.000 / 3.371 / 4.781 / 6.231 / 7.185 秒，各 5 次；22/26 均 5/5 落入 6–8 秒。
浅层 4、10 校准的线性模型对 16/22/26 的回顾性偏差为 0.8%–2.2%。随后同窗口深度 26 比较为异步 7.547、主线程同步 probe 1.892、按路径同步 worker 2.166 秒。
worker 内仍异步或逐组件转发均未提速；有效差异来自执行后端与任务粒度的组合。

理论模型为独立路径 `Q=1824+296−136=1984`，等深、无 symlink、成功完成时 containment 组件量 `K=Q×D`；
正文文件数 `R=1824+32=1856`。读取/收集实验的 18 个 profile 均符合：

| 工作量 | 深度 10 / 30 / 60 的预期与实测 |
| --- | --- |
| containment 组件 lstat | 19,840 / 59,520 / 119,040 |
| 正文 open / fstat / close | 各 1856；read 为 3712（data + EOF），实际返回 3,320,800 bytes |
| 解析 / checkpoint | fresh parse 为 0；source / resolver checkpoint 为 1835 / 307，保留真实事件循环让步 |
| worker 请求 | fast 等为 1984；worker 读取候选为 3840（增加 1856 个整文件 job），每 Run 启动/退出各 1 |

777 是引用逻辑计费数。表中计数仅覆盖 containment 与正文读链，collection、root realpath 和 cache JSONL 另计。
同节点去重及 source/target facts 共享已经存在；跨新节点重新观察前缀、fstat、增长/EOF 和当前 bytes 校验各有安全职责。

### 成本定位：读取链与重复祖先匹配

下表为各版本单次 Bun profile 的累计毫秒，仅用于定位：

| 深度 | fast 读链 | 主线程同步读链 | worker 读链 | fast 文件收集 | prefix 文件收集 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 10 | 1340 | 229 | 481 | 149 | 102 |
| 30 | 1090 | 189 | 370 | 646 | 140 |
| 60 | 1005 | 168 | 353 | 1750 | 247 |

**读取链：**1856 个正常文件各执行 open → fstat → 两次 read → close，共 9280 次 API 调用。
候选保留全部步骤，改变逐项调度，worker 版将整文件读链放入一次请求；差值同时包含分配、复制、接线及通信的变化。
缓冲策略保持原样，工作缓冲累计申请为 1,946,158,912 bytes；该值反映累计分配量，RSS 另计。
路径阶段另测的自适应缓冲已显著减少累计申请，耗时收益较小；本次读链对照固定缓冲策略，详见执行粒度材料。

**文件收集：**当前实现已共享目录和 entry 观察，真正大量重复的是不同完整路径共有祖先的纯排除判断：

| 深度 | 物理 readdir / collection lstat | 逻辑祖先组件访问 | 祖先排除 matcher：fast → local → prefix |
| --- | ---: | ---: | ---: |
| 10 | 18 / 1842 | 175 | 647,780 → 641,655 → 64,540 |
| 30 | 58 / 1882 | 1735 | 2,006,480 → 1,945,755 → 65,940 |
| 60 | 118 / 1942 | 7075 | 4,202,030 → 3,954,405 → 68,040 |

同深度六版的物理操作、逻辑组件访问和最终 selected paths 完全相同。
local 只复用同完整路径的 policy 结果，收益有限；prefix 再按 policy 复用祖先判断，深度 60 的 prefix 计算从 120,058 降至 1,944。
深度 60 profile 中，物理 lstat/readdir 包装区间约 13.0/3.2 ms，policy 计算约 1588 ms（包含子区间）。

设排除 matcher 数为 `X`，原匹配量随请求路径的祖先总量增长；prefix 缓存将同 policy / prefix 的计算限制到一次，约为 `O(X×不同前缀数)`。
缓存只保存本次固定 policy 的纯布尔值；filesystem 授权与状态继续按原路径观察。祖先遍历和字符串处理仍保留，复杂度改善仅针对 matcher 工作。

### 无插桩的端到端比较

单位秒，均为同版本组中位数。Node 样本较少，单独解释。

| 版本 | 与 fast 的差异 | Bun 深度 10 | Bun 深度 30 | Bun 深度 60 | Node 深度 60 |
| --- | --- | ---: | ---: | ---: | ---: |
| fast | 同步 worker probe，原异步正文读取 | 1.784 | 2.620 | 4.180 | 2.296 |
| reader-direct | 正文读链改为主线程同步 | 0.769 | 1.431 | 3.316 | 1.413 |
| reader-worker | 同一 worker 内整文件同步读取 | 0.985 | 1.528 | 3.231 | 2.588 |
| collection-local | 收集内完整路径 policy memo | 1.748 | 2.211 | 3.887 | 2.363 |
| collection-prefix | local 再加每 policy 的祖先 prefix memo | 1.673 | 1.971 | 2.600 | 2.439 |
| combined | reader-worker + collection-prefix | 1.167 | 1.137 | 1.567 | 2.327 |

- **Bun：**combined 相对 fast 的配对节省中位为 42.5% / 54.7% / 58.8%，各 6/6 更快；深度 30/60 相对 reader-worker 也各 6/6 更快。
  深度 10 相对 reader-worker 仅 1/6 更快、配对中位慢 13.7%，浅层负载宜单独选型。
- **Node：**reader-direct 为 3/3 更快；reader-worker / combined 虽分别有正的配对节省中位 14.3% / 4.1%，其组中位数却慢于 fast，各仅 2/3 更快。
  两类统计量应分别保留；Node 的收益与取舍仍待更多样本确认。
- **离散：**深度 60 第六轮 fast/direct/worker/local/prefix/combined 分别为 4.854 / 5.369 / 6.668 / 9.014 / 5.009 / 3.078 秒，全部保留。
  combined 的范围仍为 1.527–3.078 秒，低 MAD 与尾部波动并存；串行配对存在窗口变化，离散原因尚未定位。

范围、MAD、CPU 和逐轮配对保存在 summary / performance 材料。Bun RSS 各组呈同一观测值，内存收益仍属未知。

### 路径安全、取消与采用边界

Bun/Node × 六版 × 三深度的 **36 组**均通过：每组 24 项路径共同场景、14 项共同读链场景及 19 项取消相关探查；
各版另测 probe worker 异常退出，worker 读取版再测 read-job 异常退出。12 组 × 29 个相邻回归、6 组 × 13 个收集回归及 6 组 observer smoke 均通过。

共同结果与有序轨迹在同 runtime / 深度下相等，24 项路径结果也与路径实验的 worker-sync 证据一致。
覆盖逐段越界与再入、external policy、40/41 hops、前缀替换、节点固定观察、final-leaf no-follow、短读至 EOF、fstat 拒绝及增长 max+1。
错误/取消后句柄余额为零、worker 启停数相等，Check 入口不发布部分普通 Records/final data。
close 错误在真实关闭后注入，worker 异常退出在 native open 前触发；OS close 失败与在途 read 强杀另待验证。

读链候选观察取消后停止新操作，仍完成 close；原异步读链保留节点级取消。8000 边探查使用真实 timer / I/O 回调，保留事件循环 checkpoint。
collection 仍是同步、无 signal 的 API：允许完成当前收集，再由 Check 取消收束，未开始后续 probe/body 工作。

100 ms 受控读操作替身下，主线程同步版的 timer 约在 100.3 / 100.5 ms（Bun/Node）送达，worker 读取版约 5–7 ms，仍等待在途操作结束。
该替身用于展示主线程可响应性；真实慢盘延迟、同步 collection/parser 的阻塞和 syscall 抢占均在证明范围外。

**建议：**Bun 深路径优先验证 worker 读链 + 纯 prefix memo；浅层和 Node 保留独立对照，主线程同步读链须明确接受阻塞代价。
采用前补充安装产物 worker 加载、Windows、真实慢/冷存储、并行 Check 与更多路径/文件形状，再整理生产实现并运行完整 Gate。

## 随附资源

- [I/O 观察与同序列 API 重放方法](./_resources/261021-profile-markdown-link-consumer-workload/audit-filesystem-cost.ts)
- [理论调用量与模型只读复核方法](./_resources/261021-profile-markdown-link-consumer-workload/audit-work-counts.ts)
- [读取链与枚举隔离构建方法](./_resources/261021-profile-markdown-link-consumer-workload/build-io-experiment.ts)
- [隔离 bundle 与相邻回归构建方法](./_resources/261021-profile-markdown-link-consumer-workload/build-path-experiment.ts)
- [执行粒度隔离 bundle 构建方法](./_resources/261021-profile-markdown-link-consumer-workload/build-probe-batch.ts)
- [隔离源码、方法与 bundle 身份](./_resources/261021-profile-markdown-link-consumer-workload/candidate-identities.json)
- [候选无插桩计时与 profile 原始结果](./_resources/261021-profile-markdown-link-consumer-workload/candidate-performance.json)
- [安全轨迹、取消与回归原始结果](./_resources/261021-profile-markdown-link-consumer-workload/candidate-safety.json)
- [候选配对统计与复核断言](./_resources/261021-profile-markdown-link-consumer-workload/candidate-summary.json)
- [纯 policy 缓存、计数模型与收集边界](./_resources/261021-profile-markdown-link-consumer-workload/collection-experiment-notes.md)
- [收集回归、FS 顺序与 observer smoke 结果](./_resources/261021-profile-markdown-link-consumer-workload/collection-experiment-smoke-results.json)
- [收集候选的独立正确性复跑方法](./_resources/261021-profile-markdown-link-consumer-workload/collection-experiment-smoke.ts)
- [纯 policy 候选与收集分阶段插桩](./_resources/261021-profile-markdown-link-consumer-workload/collection-experiment.ts)
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
- [路径阶段 I/O 耗时、重复路径与 API 重放原始结果](./_resources/261021-profile-markdown-link-consumer-workload/filesystem-cost-results.json)
- [读取链与枚举实验输入、转换与 bundle 身份](./_resources/261021-profile-markdown-link-consumer-workload/io-experiment-identities.json)
- [六候选完整 Run 无插桩计时](./_resources/261021-profile-markdown-link-consumer-workload/io-experiment-performance.json)
- [读取链与枚举分阶段 profile](./_resources/261021-profile-markdown-link-consumer-workload/io-experiment-profiles.json)
- [受控异步与同步 FileHandle 后端](./_resources/261021-profile-markdown-link-consumer-workload/io-experiment-runtime.ts)
- [读链与收集取消的证明范围](./_resources/261021-profile-markdown-link-consumer-workload/io-experiment-safety-notes.md)
- [去重后可还原的安全结果与有序轨迹](./_resources/261021-profile-markdown-link-consumer-workload/io-experiment-safety.json)
- [路径安全、读链与收集取消场景](./_resources/261021-profile-markdown-link-consumer-workload/io-experiment-safety.ts)
- [读取/收集统计、计数与行为复核汇总](./_resources/261021-profile-markdown-link-consumer-workload/io-experiment-summary.json)
- [虚拟读链转换与私有 worker 接线](./_resources/261021-profile-markdown-link-consumer-workload/io-experiment-transform.ts)
- [隔离安全与性能测量方法](./_resources/261021-profile-markdown-link-consumer-workload/measure-candidates.ts)
- [负载测量入口](./_resources/261021-profile-markdown-link-consumer-workload/measure-consumer.ts)
- [六候选串行采样与安全 driver](./_resources/261021-profile-markdown-link-consumer-workload/measure-io-experiment.ts)
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
- [安全证据去重、还原与大小约束方法](./_resources/261021-profile-markdown-link-consumer-workload/retain-io-evidence.ts)
- [候选统计与断言重算](./_resources/261021-profile-markdown-link-consumer-workload/summarize-candidates.ts)
- [只读统计重算](./_resources/261021-profile-markdown-link-consumer-workload/summarize-consumer.ts)
- [读取/收集只读统计重算与独立断言](./_resources/261021-profile-markdown-link-consumer-workload/summarize-io-experiment.ts)
- [深度扩展只读统计重算](./_resources/261021-profile-markdown-link-consumer-workload/summarize-path-depth.ts)
- [六版本只读统计与独立断言重算](./_resources/261021-profile-markdown-link-consumer-workload/summarize-probe-batch.ts)
- [理论对账、深度模型与 I/O 统计结果](./_resources/261021-profile-markdown-link-consumer-workload/work-count-audit.json)

## 复核入口

只读重算，验证保留的性能统计、计数和紧凑安全证据：

```sh
res=docs/investigations/_resources/261021-profile-markdown-link-consumer-workload
mise exec -- bun run "$res/summarize-io-experiment.ts" "$res"
```

复跑、轨迹还原与归档步骤见[安全附件](./_resources/261021-profile-markdown-link-consumer-workload/io-experiment-safety-notes.md#归档证据与复跑)，
收集切面的模型与独立验证见[收集附件](./_resources/261021-profile-markdown-link-consumer-workload/collection-experiment-notes.md)。
按当前源码/依赖重跑得到新证据；形成时的 bundle 身份和各阶段结果以对应归档摘要为准。
