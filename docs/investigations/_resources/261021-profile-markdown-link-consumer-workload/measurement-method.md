# 测量条件与证据口径

本附件说明形成时如何取得数据，以及三个证据文件的用途。资源为经过选择的测量列与诊断节选，服务于复核报告判断；负载生成器足够短，保留原始 TypeScript。完整工具链、日志和轨迹不属于本次保留范围。

## 负载与环境

| 项目 | 实际条件 |
| --- | --- |
| 源 | 1824 份 Markdown，合计 3,320,000 bytes；175 份含引用，其中 Case 文档 6 份 |
| 引用 | 1193 条：777 条逻辑 direct、416 条 HTTP |
| 目标 | 296 个逻辑 target，其中 136 个也为源；纯目标为 130 文件、30 目录，32 个 Markdown 需要标题 |
| 路径 | 相对 canonical root 的组件数，含叶名；源与目标等深，无 symlink，短目录名、共享前缀 |
| 正文 | 等量级、近等长、各一个标题；加深时减填充，保持源总字节数。生成规则见 consumer-fixture.ts |
| 检查策略 | 目录验证存在/类型；非 Markdown 目标不读正文；HTTP 不发网络请求 |
| 预算 | 单文件 1 MiB，两项总量预算关闭；引用逻辑计费保持原样 |
| 环境 | Bun 1.3.14、Node 24.18.0；Linux x64 / WSL2，Ryzen AI 7 H 450，6 logical CPUs；语料在 /tmp ext4 |
| 宿主 | 非独占、不清 OS cache；最新窗口 cgroup 上限 4 CPU、6 GiB |

路径、读链/收集、缓冲构建分别基于 HEAD `34c58409fde4f63c264762711d99ae918e159b15`、`808cf9ded3e2af947b76afe65224db636abf9610`、`d8a7500b2d1d679811854321ca1b3e64cdeb6f61`；三者 358 个实际源码/测试输入的路径与摘要一致。候选通过虚拟源码转换构建隔离 bundle，Product 保持原样。

## 执行与对照

指标为只含 mdlink 的公开单 Check Run。每个独立进程先预热一次 parse-facts cache，再计时；当前文件仍读取、核对 bytes 摘要。import、生成与解包在区间外，worker 创建、消息、正文克隆和退出等待在区间内。

| 阶段 | 对照含义 |
| --- | --- |
| depth | 原生 async 路径与读链，仅改变深度，五个深度各 5 次 |
| probe | 固定深度 26，比 baseline、主线程同步 probe、按路径同步 worker、worker 内 async、逐组件 worker，以及原 async 读链的自适应缓冲 |
| io | fast 为按路径同步 worker + async 读链；reader-direct 改主线程同步读链，reader-worker 改同一 worker 的整文件同步读链；collection-local/prefix 复用纯 policy 判断；combined 组合 reader-worker 与 prefix |
| buffer | fixed/adaptive 共用 combined 接线；只改变工作 buffer 的初始容量与扩容策略 |

按路径 worker 每 resolver 私有、惰性创建、内部串行执行，仍逐组件检查和协作取消。正文 job 在路径授权、逻辑预算通过后发出。prefix memo 只复用本次固定 policy 的纯判断，filesystem 状态仍按原路径观察。

fixed 初始容量为 `maxBytes+1`；adaptive 为 `max(1,min(maxBytes+1,fstat.size+1))`，读满后倍增至 `maxBytes+1`。两者均持续实际 read 至 EOF 或上限，保留 final-leaf no-follow、fstat 与 finally close。最新公共接线也改变了参数和区间外标记，因此各阶段只作同窗口比较。

## 证据窗口与保留范围

下表为 Asia/Shanghai 时间。CSV 仅保留支持主线的 plain 样本列；诊断节选另保存成本与安全观察。

| 阶段 | 实际窗口 | CSV 保留 |
| --- | --- | --- |
| depth | 2026-10-21 19:55–20:02 | confirm 阶段深度 4/10/16/22/26，全 25 个样本 |
| probe | 2026-10-22 00:10–00:36 | Bun 深度 26 六版，全 36 个样本；省略小规模与其它 runtime/深度 |
| io | 2026-10-22 11:08–11:23 | Bun 三深度每版 6 次、Node 深度 60 每版 3 次，全 126 个样本 |
| buffer | 2026-10-22 13:05–13:13 | Bun 三深度每版 12 次、Node 每版 8 次，全 120 个样本 |

io 的安全/回归在 11:06–11:08、成本 profile 在 11:23–11:25；buffer 的安全/回归在 13:02–13:03、36 个成本 profile 在 13:18–13:21、8 个独立 CPU sampling Run 在 13:21–13:22。

CSV 的 `order` 为原阶段样本位置，用于恢复先后顺序；`elapsed_ms` 原样保留已归档数字。buffer 字段当时已舍入到 0.001 ms，其它阶段保留原精度。各组中位数取排序后的中间值，偶数组取中间两值均值；配对节省按同 runtime、深度、round 计算 `1-adaptive/fixed`，再取中位数。

buffer 按 round 轮转深度，版本先后由 round 与当轮 depth index 决定。Bun 每深度 fixed-first/adaptive-first 为 6/6，Node 为 4/4、3/5、5/3；两种先后顺序子组的配对节省中位均为正。所有支持报告的慢值均保留在 CSV 中。

## 诊断与安全的解释范围

- plain 无逐操作 clocks/observer；区间外两次边界标记保存进程 CPU、resourceUsage、memory，外部约每 50 ms 读取 /proc，并观察共享 cgroup。
- 成本 profile 的六个父阶段互斥但不穷尽 Run，其它 clocks 为嵌套 inclusive。不同区间中位数、跨进程时间差均各自解释。
- CPU sampling 单独对 plain bundle 执行。按 Node host-monotonic、Bun epoch 时钟裁剪到测量窗，区分 main、measured worker 与 warmup worker。权重是采样观察，不是进程累计 CPU。
- 安全观察使用受控操作屏障。共同轨迹按直接可比字段核对；增长时另以独立 fixture bytes、EOF、max+1、容量和关闭断言判断，允许 read chunks 改变。
- 诊断、安全与普通计时分别取得。已执行覆盖、两个短结果原样节选和剩余限制见 diagnostic-evidence.md。
