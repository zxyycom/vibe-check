# 融合后路径循环实验：证据节选

本附件承接[调查正文](../../profile-markdown-link-fused-path-loop.md)的复核细节，记录 2026-10-24 的来源、方法与观测；当前稳定规则由[Markdown 链接解析](../../../development/markdown-link-resolution.md)拥有。

| 复核任务 | 阅读入口 |
| --- | --- |
| 确认基线、变体与输入身份 | 下文来源及负载摘要；[combined.patch](combined.patch) 第一/第二 hunk 分别为 A/B |
| 重算完整 Run 收益、顺序影响及慢值 | [timing-samples.csv](timing-samples.csv) 全部 144 行；下文补充统计 |
| 核对成本区间和机制 | [profile-baseline.csv](profile-baseline.csv) 全部 18 行；[profile-counts.csv](profile-counts.csv) 全部 36 行及下文区间说明 |
| 了解安全证明层级 | 下文安全证据与边界 |

## 来源与方法身份

测量对象为源码副本的完整公开单 Check Run，依赖仓库 node_modules。
冻结于 `2026-10-24T15:49:12.683Z`，HEAD `a18888eb0bb2aa02831ed7c9fe72efc0c7bb58bf`；冻结前后 source 摘要相同。
每树 810 文件（含相邻测试）；production 子集 501，以排除路径匹配正则 `(?:\.test(?:\.|-)|test-support)` 的文件定义，并非发布材料 inventory。
SHA-256 依相对 src 路径 JavaScript localeCompare 排序，累计 path、NUL、原始 bytes、NUL。

| variant | 完整 src SHA-256 | production SHA-256 |
| --- | --- | --- |
| baseline | 7fcf74a7f44ef116d89fb58645a6e5621dc8c20cb7b47e719f567700b99f2d2f | 62af100829f8da09caf7d3825a0da0e937cd7ab997bf6e48c16b4c405c191748 |
| join-only | 79990fa1e11aa41fa3d579d3f33f7265338a78474322d1ef31ee8b53790def77 | 10c54d7baad4cab15feb24def766607eea2809dba6c905a504139ab5f3865e78 |
| cursor-only | 09f56e0588dfc8b6cd1b6f998ffa48c5755668772c6d6f350723ca31f9f1f2a7 | c9cfe5d3e7f7ad0efae026347c6b97d60bcbec8de2898c009bbbc86be6dc4a76 |
| combined | 6b4a198cc752b1ca669cd56999bdfa2ff110902856d060a208c0e31286e5e95e | 3241394c9e95ba27bd4affa2f71cd72ee56c0942b38dc3e4847d4099e9c9ad88 |

每个候选相对 baseline 只有 `io-native.ts` 内容不同。combined.patch 仅去掉 diff header 的临时绝对路径与 mtime，保留真实 hunk；两因素均保留逐段路径观察和 symlink 状态机。

- 实际 binaries：`/home/dev/.local/share/mise/installs/node/24.18.0/bin/node`、`/home/dev/.local/share/mise/installs/bun/1.4.4/bin/bun`，由 mise which 在运行时解析。
- AMD Ryzen AI 7 H 450、Linux x64 / WSL2 6.18.33.2、ext4；cgroup CPU `400000 100000`，memory `6442450944` bytes。项目内重型工作互斥，宿主/存储仍共享。
- 锁文件 SHA-256 `a40ac4004dfcbdb86b9030711a5ac8533a112348511bdcd6bafcdffd60a0373d`。实际安装包括 mdast-util-from-markdown 2.0.3、mdast-util-frontmatter 2.0.1、micromark-extension-frontmatter 2.0.0；未安装或升级。

后置 `2026-10-24T16:06:57.732Z` 核对工作区 src、四个 plain 副本、依赖 manifest/lock 与冻结相同。
此时 HEAD 已为 `0f5d2f80a0fc68d1cbf4642e070a631b89285d9b`，两 HEAD 的 src Git tree 同为 `5c949257f3c9d8adc00fd6d6b6e942b90af6c006`。
这些是前后时点核对，不是全窗连续监控。

## 合成负载与缓存

每组 1824 source、3,320,000 bytes：前 320 份为 1821 bytes，其余 1820 bytes。
selection 为 `docs/testing/cases/**/*.md` 与 `docs/guides/**/*.md`，默认排除、blocking policy；前 777 源循环指向 296 个逻辑目标，随后 416 源各有一个 HTTP 引用，其余无 occurrence；本次不联网检查 HTTP。
目标含 136 source overlap、32 纯 Markdown（各 25 bytes）、64 普通文件、64 个单 entry 目录。
maxMarkdownBytes=1048576，maxOccurrences/maxTargetReads=false，requireNonEmptyDirectories=true，parse-facts cache enabled。

D 为相对 canonical root 的组件数（含叶名），无 symlink。source 摘要按生成器 source 索引顺序累计相对路径、NUL、bytes、NUL，区别于源码树 localeCompare 排序。
不同路径使各 D cache 身份不同，每样本 warmup 后与计时后均匹配：

| D | source path+bytes SHA-256 | cache bytes / lines | cache SHA-256 |
| --- | --- | --- | --- |
| 10 | f74b3298e62de4135ed94ff8c7457e77277464ff2747fa5917198f2d9363ce79 | 954120 / 1856 | b35db2187aca7e3e69b892743ad42bf218fcfd738b03e528e33ec3dea4511c14 |
| 30 | a1e4247e6a13e126e9b7c0b0813d67f024d6ad9b630478a169f5d735fb0c3557 | 1033374 / 1856 | 30d183ff99996a69fc5743057019d26d166570e20acee05295966b72425f8cdc |
| 60 | 29ab454ffd2ca6b53c4c0bd54cdd3248cc64e77a2f9c494d6d71a83ccee9fc11 | 1149924 / 1856 | 7f92cf30a3b12f232f00d4f128127fe345f9892a317f99355d0d1a23b20c1178 |

每次 completed/passed；data 的 sourceFileCount/occurrenceCount/targetReadCount/findingCount/rejectedInputCount 为 1824/1193/777/0/0。
targetReadCount 为逻辑计费。每进程在计时外完成生成/import、一次完整 Run 预热及校验，再测新 resolver 的完整 Run，随后校验结果与摘要。
各 D 跨进程复用同一份有效 1856 行缓存，测当前输入命中；OS cache 预热后不主动清理，全窗命中受共享内存压力影响。

## Profile 区间与工作量

36 条有效 Run：baseline 每 runtime/D 三条共 18；候选每组各一条共 18，仅验证计数，不用其局部时差证明性能。
profile-baseline.csv 保留全部 18 条所选计时列，profile-counts.csv 保留全部 36 条计数；理论与实际全部匹配：

| 操作 | 每次 Run 的实际数 |
| --- | --- |
| containment / lstat / pathText | 1984 / 1984D / 1984D，无 readlink |
| source-read / containment / read jobs | 1824 / 160 / 32，总 2016 |
| body / open / fstat / close | 各 1856 |
| read | 3712：1856 nonzero + 1856 EOF |
| 正文 bytes / initial capacity | 3,320,800 / 3,322,656 |
| exactBytes 分支数 / bytes | 1856 / 3,320,800，无 buffer growth |
| traversal / resolver checkpoint | 1835 / 307，总 2142 |
| cache restore / restoreRow / facts session parse / fresh | 1 / 1856 / 1856 / 0 |
| directory opendir / read / close | 64 / 64 / 64 |
| Atomic cancellation checks | 24448+3968D，所有变体相同 |
| path.join | baseline/B 为 1984D；A/AB 为 0 |
| cursor objectSpread / mutableAdvance 分支 | baseline/A 为 1984(D−1)/0；B/AB 为 0/1984(D−1) |

计时列均为 ms。以下关系用于避免将 inclusive 时间重复相加：

- 六 stage root/discovery/sources/resolve/candidates/finalize 互斥但不穷尽 Run；sourceJobAwait、sourceParseAwait 嵌套于 sources。sourceParseAwait 含 1824 源的 cache.parse，总 cache.parse 还含 32 个纯 Markdown targets。
- restoreRow ⊂ restoreContents ⊂ restore ⊂ cache.parse；digest 在 restore 之后、仍属 cache.parse。parse 是 facts session 入口，含 UTF-8 验证/恢复/摘要/lookup，不是 fresh Markdown 语法重算。不可重复相加 inclusive 时间。
- worker.job.source-read 含对应 native.containment+native.body；纯 target containment/read jobs 另计。lstat/pathText/cursorAdvance 为 containment 的兄弟子区间；open/fstat/read/close/bufferConstruct/exactCopy 为 body 的兄弟子区间，typedArrayConstruct 嵌套 bufferConstruct。
- pathText 包围完整 nextPath 表达式，baseline 内含 pathJoin 调用计数开销。clock、closure、计数及额外 Promise 有显著且差异化开销，未独立校准；API 包围时间不是 kernel latency 或 plain CPU 组成，源码分支计数不是实际 heap allocation。
- workerCreate 只计同步构造，不是 ready 全程；jobAwait 含启动/调度/消息/结算。Worker busy 是三种 job elapsed 之和，不是 thread CPU。parentAwaitMinusWorkerBusy 不等于纯通信 CPU。
- Worker 关闭时写小 profile JSON，进入 drain/finalize 时间，不能外推生产关闭成本。warmup Worker 不计入 measured profile。
- CSV 的 stageSum/workerBusy/parentJobAwait/checkpointTotal 等先逐 Run 求和，差值先逐 Run 相减再聚合；不把 marginal medians 加减。

有效样本选择：首次 profile 在第一条 Node D10 的事后容量断言停止，原因是 typed-array 包装令 initialCapacity 注入漏命中；产品结果/native 计数正确，但该条不能提供完整成本证据。
修复独立 harness、预检容量 1856 / 3,322,656 后取得正式 36 条。plain 全部保留，修复与慢值筛选无关。
有效 profile 窗无节流或 memory max 增加，2 个样本窗 memory some/full pressure 增加，无 OOM；其它宿主干扰未独立监控。

## 安全证据与边界

独立四变体副本通过薄 shim 调用真实 fs，在操作返回后追踪或暂停，保持原 probe/cancel/read/finally 逻辑；公开 Run 经 workerData/SharedArrayBuffer 观察。
以下数量均为每 runtime，目标 Node 24.18.0/Bun 1.4.4 执行均 exit 0。首次误用 PATH 的 Node 26 运行不计入目标证据；Bun 的 process.version 兼容值也不作 Node 执行版本。

| 层级与数量 | 检查对象及观测 |
| --- | --- |
| 四变体 84 probe，含 57 个结果/有序 native trace 差分 | 普通/depth32、root `/`、directory、missing/ENOTDIR、规范化与 POSIX 特殊名称；相对/绝对 symlink suffix、越界首 hop/再入、40/41 hops/loop、两 probe 间前缀替换 |
| 四变体 16 native read + 16 真实 Worker source-read | empty/exact/oversize/no-follow；Worker 中的 symlink、escape 与读取上限 |
| baseline/AB 各六个真实操作返回后取消 | lstat 第三组件、readlink、open、fstat、read、close；pending/finalize 等待释放，已打开 descriptor 恰 close 一次，自然 exit 0、failed=false，Worker/abort listeners 清空 |
| AB 公开 Run 取消 | cancelled/execution，无普通 Records/data；read/close=1/1 |
| AB 两项 first-error | source-too-large 与 target-read-limit-exceeded；均无普通 Records/data |

取消探针六位置的 read 次数依次为 0/0/0/0/1/2；lstat/readlink 无 open，其余 open/close=1/1。
证明范围是公开调用提供 canonical POSIX root 下的原型语义与操作返回后取消；两 probe 间替换不等于并发 race 消除。
非 canonical 私有 root、Windows、hostile 并发替换、同步操作中抢占及安装包仍未验证。

## 全部 plain 与比较统计

timing-samples.csv 保留原 JSONL 全部 144 行所选字段、原 order 和 JS 数值字符串，无删行；环境列为 cgroup 窗口差。
wall 为 performance.now 跨度；CPU 为 process.cpuUsage user+system，含所有线程；maxRssKiB 是含 import/warmup 的进程高水位，而非窗口 peak 或 heap 分配量。
baseline 先/后各三轮，场景起点与候选顺序轮转；偶数 median 取中间两值平均。
paired 节省先每 round 算 `1−candidate/baseline` 再取 median；ratio 节省为 `1−median(candidate)/median(baseline)`。
例如 Node D10 A 的 paired 节省为 +0.41%，ratio 为 −7.58%；二者回答不同统计问题，不能互换。

共享资源：33 个样本窗 nr_throttled 增加、32 个样本窗 throttled_usec 增加（order137 次数增加但时间为 0）、7 个样本窗 memory.events.max 增量非零、27 个样本窗 memory some/full pressure 累计量增加，oom/oom_kill 无增。这是非零窗口数，不是事件总次数。
order113 起多项异常及慢值集中，前段也有异常；共享指标不归因于单进程。全部观测保留，wall 不扣除节流时长。

下表只列主文之外的补充统计；六组主要配对百分比及胜率见正文，全部 wall 值及慢值见 CSV。

| runtime / D / 变体 | 配对绝对节省中位数 ms | baseline 先 / 后：配对节省中位数 % | CPU 中位数 baseline → 候选 ms |
| --- | ---: | --- | --- |
| node / 10 / join-only | 1.94 | -4.08 / 9.67 | 710.01 → 692.90 |
| node / 10 / cursor-only | 16.46 | -0.27 / 16.03 | 710.01 → 678.92 |
| node / 10 / combined | -18.43 | -5.07 / 3.43 | 710.01 → 709.83 |
| node / 30 / join-only | 103.47 | 11.39 / 17.17 | 943.90 → 867.98 |
| node / 30 / cursor-only | -6.10 | -2.48 / 7.52 | 943.90 → 949.13 |
| node / 30 / combined | 5.11 | 7.77 / -4.14 | 943.90 → 908.94 |
| node / 60 / join-only | 100.18 | 6.71 / 9.99 | 1366.91 → 1264.16 |
| node / 60 / cursor-only | -56.93 | -7.25 / -1.80 | 1366.91 → 1364.18 |
| node / 60 / combined | 104.73 | 8.76 / 8.69 | 1366.91 → 1200.34 |
| bun / 10 / join-only | 16.26 | 4.82 / 1.37 | 610.87 → 625.04 |
| bun / 10 / cursor-only | 9.26 | -0.56 / 3.71 | 610.87 → 644.88 |
| bun / 10 / combined | 12.47 | 5.41 / -8.68 | 610.87 → 657.88 |
| bun / 30 / join-only | 21.65 | 3.14 / 0.69 | 876.28 → 895.71 |
| bun / 30 / cursor-only | -143.26 | -17.25 / -21.20 | 876.28 → 963.35 |
| bun / 30 / combined | -26.21 | -1.17 / -5.31 | 876.28 → 918.71 |
| bun / 60 / join-only | 62.59 | 2.77 / 4.97 | 1435.51 → 1523.49 |
| bun / 60 / cursor-only | 43.55 | 6.88 / 1.64 | 1435.51 → 1328.64 |
| bun / 60 / combined | 68.01 | 18.04 / -1.66 | 1435.51 → 1342.30 |

## 留存与复核

file-lifecycle-hygiene：三个 CSV 和最小 combined patch 分别保留全量计时、成本区间、工作量及原型边界；正文解释关键判断，本附件补足独立复核所需的方法与身份。
数据核对后已清理本轮两个隔离实验目录；全树、raw JSON、完整 trace、harness、语料与 cache 不在留存范围。长期资源可独立用于复核结论，不是可重跑工具归档。
独立只读审计核对 144 唯一配对、cache/data/runtime、36 条理论/实际计数、nested 区间和所选 CSV 数值，并重算四份 plain 与工作区源码树、各 D 全部 source/缓存摘要，复核依赖 manifest/lock。

| 对象 | SHA-256 |
| --- | --- |
| plain原JSONL，未归档 | 6b7b74a9050683a5bf3b6dc2a950e7b2839c9fe06931d183d9930a82a9ae3eb9 |
| profile原JSONL，未归档 | f755c7a0a5a0750b4e1d205b59494bbbf0ea734e265e84a8a4a352646083f256 |
| timing-samples.csv | 539405b01fb47f1805d52dd5548548c4aa5d0991074a8f379a717cae10ae1d17 |
| profile-baseline.csv | ba202311a9336e43a001558ef53c7dd3f0253c5eb067439b7d264e55b7750817 |
| profile-counts.csv | 73d9e8ee7d364a5553336f67e5212bf5c9e7ff5e470f191e62e4fd28f8e63272 |
| combined.patch | 379136d7120148fe2a640d6952e280d3c0e470cb7a0d3da06555fecda8fa6035 |
