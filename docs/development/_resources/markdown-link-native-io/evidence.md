# 原生 Markdown Link I/O 形成时验收证据

本附件保存 2026-10-23（Asia/Shanghai）真实安装包的采用依据，不是新规范 owner 或可重跑工具归档。
当前实现规则见[Markdown Link 解析](../../markdown-link-resolution.md)；[前期调查](../../../investigations/profile-markdown-link-consumer-workload.md)保存原型认识，不能替代本轮数据。

## 身份、负载与区间

| 对照 | exact candidate / tarball SHA-256 | 包内 Product 源码摘要 |
| --- | --- | --- |
| before | `0.0.0-local.aa2fb7c13136` / `08f86b67c205f841f81fd270cd3f3c56e43bf26a9ae468832576f5c624feb53f` | 376 文件 / `2cd3a8cc6458d70862fbd93f6f8dc51d5bcbc92d83dd997d6d7d38a1dc3dd61f` |
| after | `0.0.0-local.5e80d3c05c27` / `6f5eddcc003efb3fdbb5f35e0a25b13821a7771624e25a08b7035dac7dc89ee0` | 381 文件 / `89730fbe60d69564052e2171d82fa92119695d30189d0238efd30870bad2507d` |

before 来自 clean HEAD `3693317e350ba2af943e786d33f061e3343ba6a8`，after 来自同 HEAD 上冻结的本次改动，二者源码不同。
均通过 `mise exec -- bun run package:build` → `package:status` 取得 current 候选；这两个 identity 只指测量时产物。
源码摘要按包内路径的 `localeCompare` 顺序，累计每个路径、NUL、原始 bytes、NUL 的 SHA-256。
两包由 pnpm 11.1.3 分别真实安装到独占 consumer，禁用 lifecycle scripts；145 项依赖安装版本相同。

- 实际宿主：Linux x64/WSL2、Ryzen AI 7 H 450、ext4；mise Node 24.18.0 / Bun 1.3.14，共享 cgroup 上限 4 CPU / 6 GiB。
  项目内独占窗口，未清 OS cache，不是主机、存储或 cgroup 独占。
- 主 plain 窗口：UTC `2026-10-22T18:19:51.065Z`–`2026-10-22T18:33:40.283Z`，即 Asia/Shanghai **2026-10-23 02:19:51.065–02:33:40.283**。
  独立 stage 窗口为 UTC `18:34:59.103`–`18:37:49.855`；插桩与 CPU sampling 另跑，不混入 plain。
- 语料沿用[生成规则](../../../investigations/_resources/261021-profile-markdown-link-consumer-workload/consumer-fixture.ts)：1824 源、3,320,000 bytes、1193 occurrences（777 direct / 416 HTTP）、296 逻辑目标 / 136 源重叠、32 个纯 Markdown 标题读取；D 含叶名，无 symlink。
  selection 明确为 `docs/testing/cases/**/*.md`、`docs/guides/**/*.md`，启用默认排除，纯目标不作为源。
- 从各 installed root import `defineConfig` / `markdownLinkValidation` / `run`，单 mdlink、blocking、单文件 1 MiB、两项总量预算 false、启用 parse-facts cache，关闭 machine/progress 输出。
  各独立进程先预热一次相同公开 Run，安装/import/生成/预热在区间外；测量 `await run(config, { projectRoot })`，包含 Worker 创建、clone、通信、cache/Worker 收束及退出。
  每次正常大语料结果断言 source/occurrence/targetRead/finding/rejected 为 1824/1193/777/0/0。
- Node 每场景 8 对、Bun 4 对；每 round 轮转深度，各深度 before-first / after-first 分别为 4/4、2/2。
  小规模是同目录 1 或 8 个含标题/循环链接的文档；D4 是完整 1824 源浅层语料，不能把 1/8 文档数解释为深度。

## 全部计时与主结果

[计时 CSV](timing-samples.csv) 保留全部 **152 行**：144 个正式 plain 样本与 8 个独立 stage 样本，原行序与所选数值字符串不变，无删慢值或节流样本。
`scenario` 将原 `suite/depth` 显式合并为 `large-d10/d30/d60`、`large-d4`、`one-document`、`eight-documents`、`stage-d60`。
保留 runtime、round、order、variant、wall/CPU ms、minor faults、采样 RSS bytes/次数及 cgroup 节流次数/μs。
删去可由累计 CPU 表达的 user/system 分项、child 起止和 RSS 起止；152 行 major faults 均为 0，故不重复存列。
child 起止包含区间外预热，不是 wall 区间。`order` 只在原 suite 内排序，不能作为跨场景唯一 ID；按 runtime/scenario/round 配对。

`elapsedMs` 为测量单 Run；`cpuMs` 为同窗进程全部线程的 user+system 累计增量，不是主线程独占 CPU。
`sampledRssPeak` 由约 50 ms 外部 `/proc` 采样加边界值取得；短 Run 可能只有边界采样，不是严格峰值或 live-bytes 证明。
下表为便于阅读的舍入值；复核使用 CSV 原值。中位数按排序取中间值（偶数取两值均值），MAD 为相对组中位数的绝对偏差中位数；配对节省先逐对计算 `1-after/before` 再取中位数。

| runtime / D | before 秒中位数 [范围] / MAD | after 秒中位数 [范围] / MAD | 配对节省中位数 | 更快 |
| --- | --- | --- | --- | --- |
| Node / 10 | 3.204 [3.115–5.351] / 0.082 | 0.777 [0.751–0.982] / 0.005 | 75.86% | 8/8 |
| Node / 30 | 7.111 [6.865–12.924] / 0.161 | 0.997 [0.938–1.245] / 0.022 | 85.98% | 8/8 |
| Node / 60 | 12.806 [12.599–13.102] / 0.180 | 1.385 [1.365–1.509] / 0.019 | 89.14% | 8/8 |
| Bun / 10 | 3.394 [3.385–3.402] / 0.008 | 0.787 [0.780–0.795] / 0.005 | 76.80% | 4/4 |
| Bun / 30 | 8.030 [7.954–8.085] / 0.042 | 0.989 [0.966–1.001] / 0.010 | 87.72% | 4/4 |
| Bun / 60 | 15.338 [15.157–15.640] / 0.128 | 1.422 [1.416–1.425] / 0.004 | 90.73% | 4/4 |

Node D30/D60 配对绝对节省中位数为 6.114/11.389 秒，两个先后顺序子组的相对节省中位数均为正。
5 个 plain 样本有共享 cgroup 节流增量，最大 5,578,623 μs；不能归因于单 Run，也不能从 wall 扣除。
即使以 Node D30/D60 最短 before 对最长 after，仍改善 81.86%/88.02%；不据此外推无节流环境的精确比例。
Node D10 before 的 5.351 秒与 D30 before 的 12.924 秒慢值完整保留，不以可见节流指标作为单一成因解释。
CPU 中位数全组下降，但 Node D60 minor faults 中位数 7118→16765.5、Bun 三深度采样 RSS 中位数均增加；不声称所有资源指标均改善。

| runtime / 负载 | before→after 中位数 ms | 配对额外成本中位数 ms（负为改善） | 更快 |
| --- | --- | --- | --- |
| Node / 1 文档 | 4.8→28.9 | +24.0 | 0/8 |
| Node / 8 文档 | 10.6→33.2 | +22.8 | 0/8 |
| Node / 1824 源 D4 | 2032.6→719.2 | -1316.5 | 8/8 |
| Bun / 1 文档 | 5.6→21.9 | +15.5 | 0/4 |
| Bun / 8 文档 | 14.4→25.6 | +11.3 | 0/4 |
| Bun / 1824 源 D4 | 2050.0→721.7 | -1321.1 | 4/4 |

Node 1/8 文档 after 范围 27.6–34.9 ms，全部更慢。采用判断接受每 invocation 惰性新建 Worker 的有限常数代价，换取目标规模收益，不由此扩展为持久池或 timing 硬 Gate。

## 分阶段控制、工作量与 CPU 解释

独立 Node D60 各两次控制按 before→memo→buffer→after 及完整反序执行。
memo/buffer 只是 before 隔离安装副本中的解释控制，**不是正式 candidate**，不回写 Product：memo 只替换 collection 模块；buffer 再改 async bounded-read 容量规则，保留原 probe、安全 policy 与 async 后端。

| variant | wall 中位数 ms | CPU 中位数 ms |
| --- | --- | --- |
| before | 12492.4 | 13628.2 |
| memo | 12627.4 | 13680.2 |
| buffer | 12166.0 | 11923.6 |
| after | 1371.9 | 1477.5 |

memo 两次中 1/2 更快，样本不足以声称独立稳定 wall 收益；采用依据仍为 operation-local 纯计算增长约束及观察等价。
buffer 的申请量/CPU 下降独立可见，但两次 wall 不足以估计稳定比例；控制差值不分解通信或 CPU 份额。

独立插桩公开 Run 的关键计数如下；每 invocation 口径，正常语料 before/after 必要 I/O 相同：

| 深度 | containment lstat | collection lstat / readdir（各） | subtree matcher before→after | before 重复 matcher/prefix 对 |
| --- | --- | --- | --- | --- |
| 10 | 19,840 | 18 | 4806→342 | 4464 |
| 30 | 59,520 | 58 | 46926→1062 | 45864 |
| 60 | 119,040 | 118 | 191106→2142 | 188964 |

- body open/fstat/close 各 1856，read 3712，返回 3,320,800 bytes；containment 为 `1984×D`。
- 工作缓冲均 1856 次、正常语料零扩容；累计申请 before 为 1,946,158,912 bytes，buffer/after 为 3,322,656 bytes。
  这不含精确 bytes 副本、clone、cache、runtime 或其它分配，不等于 RSS。
- after 每 Run 3840 工作 job（1984 containment + 1856 read）、1 close 控制消息、Worker 启动/退出 1/1；matcher 重复对为零。
  memo 只覆盖本次固定 policy/prefix 纯判断，Node 当前 selection 的绝对计数不与旧 Bun/不同 selection 混比。
- 独立 Node D60 V8 CPU sampling 各一次：before/after wall 为 13404.616468 / 1363.8238270000002 ms，进程 CPU 为 14244.158 / 1607.177 ms。
  窗口裁剪后，before 主线程 lstat/async fs 显著；after 测量 Worker 的 lstat 仍为主要非 idle 叶样本，主线程多等待并有 postMessage 成本；预热 Worker 在窗外。
  采样含 native/idle/wait，不能将权重、parent−Worker、嵌套跨度或组中位数之差当作 CPU 分解。

## 已安装产物 smoke 与证明边界

| 实际 installed after 场景 | 观察 |
| --- | --- |
| 并存两个 resolver | 一个 timer 取消，无普通 final data；另一个完整完成 1824/1193/777/0；Worker 创建/退出 2/2。只证明隔离/收束 smoke，不外推调度性能。 |
| 1 MiB 文档 | passed；2 read 至真实 EOF；工作缓冲 1,048,577 bytes；open/close 1/1。 |
| 1 MiB+1 文档 | fstat 后 source-too-large；零正文缓冲、零 read；open/close 1/1。 |
| fstat 后受控增长 9→28 bytes | 完整读取新增链接，1 条 missing-target Finding；容量 10→20→40、累计 70 bytes；4 read 至 EOF，open/close 1/1。不是随机 race 或任意 hostile replacement 证明。 |
| Node eval / preload | 父进程 `--input-type=module` 加 `--import` 诊断 preload，文件 Worker 读取 passed；取得 containment 1、open/fstat/close 各 1、read 2、9 bytes，Worker 启动/退出 1/1，证明该 string-only flag 过滤未丢弃 preload。V8 sampling 也取得测量 Worker profile。 |
| 标题密集 / Bun | Node 64 源×300 标题 passed；Bun installed 8 文档 passed。均不进入收益样本。 |

性能证据只覆盖上述 Linux、Node 24.18.0 / Bun 1.3.14、warm parse cache 与合成无 symlink 输入。
真实分布、冷/慢存储、Windows/macOS、任意宿主并发、故障/强杀语义不由本附件证明；直接行为与实际包验收仍由对应 owner 负责。

本目录只保留本说明与所选 CSV 列。来源为本轮临时 `summary.md`、`timing-samples.csv`、`diagnostic-evidence.json`、`cpu-summary.json` 的选择性整合，非四文件副本。
长 raw、tarball/安装、源码 archive、语料、harness 和完整 profile 不进入仓库；原临时材料在交接核对后由主代理按授权清理。
