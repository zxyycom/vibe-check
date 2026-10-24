---
title: "Markdown Link 融合后成本：路径拼接与游标推进隔离实验"
id: "261024-profile-markdown-link-fused-path-loop"
formedAt: "2026-10-24T16:06:39Z"
question: "在已融合 source 任务的当前基线上，D10/30/60 的成本分布、路径拼接与游标推进两因素的独立及组合收益、安全边界是什么？"
tags:
  - "cancellation"
  - "cpu-profiling"
  - "markdown-link-validation"
  - "path-depth"
  - "performance"
  - "worker-threads"
relations:
  - type: "补充"
    target: "261023-evaluate-markdown-link-fusion-and-restore"
    summary: "补充融合后剩余成本及路径循环两因素隔离证据"
---

## 形成时背景

[前序调查](evaluate-markdown-link-fusion-and-restore.md)识别 source 任务融合可减少串行 Worker 交接，随后[采用证据](../development/_resources/markdown-link-source-fusion/evidence.md)记录了融合落地。
本轮以已融合、已有 `segmentIndex` 的 main `a18888eb` 为基线，调查 D10/30/60 同量级负载的剩余成本，隔离普通路径推进中的文本计算和状态更新。

## 调查目的

回答三件事：融合后主要耗时仍在哪层；路径拼接与游标推进分别、组合是否改善完整公开 Run；能否保持逐段路径观察、symlink 授权、读取预算和协作取消。

| 变体 | 唯一 Product 文件差异：`io-native.ts` |
| --- | --- |
| baseline | 当前已融合实现；逐组件 `path.join`，普通推进调用共享 helper |
| join-only（A） | POSIX、非 `.`/`..` 且不含 `/` 的单组件采用受保护拼接；root `/` 特判，其余回退 `path.join` |
| cursor-only（B） | 普通非末段原位推进调用私有 cursor；末段直接返回；symlink 仍完整重置 |
| combined（AB） | 同时应用 A、B，不改其余读取、调度或缓存流程 |

## 调查范围与依据

从冻结源码副本的 `src/index.ts` 调用 `defineConfig` / `markdownLinkValidation` / `run`。
环境为 Node 24.18.0 / Bun 1.4.4、Linux x64 / WSL2、ext4；共享 cgroup 上限 4 CPU / 6 GiB，项目内重型工作互斥。
比较只在本轮同 runtime、同深度内配对，历史窗口用于背景。

各深度均为合成的 1824 source、3,320,000 bytes、1193 occurrences（777 direct / 416 HTTP）。
296 个逻辑目标含 136 个 source overlap、32 个纯 Markdown、64 个普通文件、64 个各含一 entry 的目录。
D 为相对 canonical root 的路径组件数，含叶名；主语料无 symlink，路径安全另测。
启用 parse-facts cache、目录非空检查和单文件 1 MiB 上限；其余精确配置与输入摘要见[证据说明](./_resources/261024-profile-markdown-link-fused-path-loop/evidence.md)。

| 实际 UTC 窗口，2026-10-24 | 方法与样本 |
| --- | --- |
| 15:51:31.626–15:57:43.392 | 144 个未插桩 plain：六轮 × 两 runtime × 三深度 × 四变体 |
| 16:03:14.582–16:05:09.550 | 36 个有效插桩 Run：baseline 每组 3 次共 18；三个候选每组各 1 次共 18，仅核对工作量 |

每样本独立进程，在计时外完整预热一次，再测新 resolver 的 `await run`，包含 Worker 启停、通信及缓存收束。
预热后不主动清理 OS cache，但共享内存压力下的全窗命中没有保证。
每轮三个候选共用同 runtime/depth 的 baseline；baseline 先/后各三轮，场景起点和候选顺序轮转。
每次均断言 completed/passed、五项 data 计数和 cache 字节摘要相等。全部慢值、负收益和资源异常保留，不因结果重跑。

plain 用于端到端比较；profile 用于工作量和区间解释。后者包围 runtime API，含 clock/wrapper、计数及额外 Promise 开销，**不是未插桩 CPU 占比或 kernel latency**。

## 调查结果与边界

**深路径的主要观测成本仍是逐段 containment 中的 lstat，路径文本计算次之。A、B 及组合的完整 Run 收益受噪声和顺序影响，本轮证据不足以支持采用，三者在调查形成时均停留于隔离原型。**

### 成本与工作量

36 个 profile 的实际工作量均匹配理论且四变体一致：lstat `1984×D`、正文 open/fstat/close 各 1856、read 3712，Worker jobs 2016，显式 `setImmediate` 2142；目录 opendir/read/close 另各 64。
整份 cache restore 为 1 次、restoreRow 和 facts session 的 parse 入口各 1856 次，fresh Markdown 语法解析为 0。

以下均为 **baseline 每组三次插桩运行的区间总时长中位数，ms**；不是 plain 成本占比。lstat、pathText、cursor helper 嵌套于 containment；正文读取是另一分支，不与包含它的 Worker job 重复相加。

| runtime / D | containment | 其中 lstat / pathText / cursor helper | 正文读取 | facts session parse / restore / digest |
| --- | ---: | --- | ---: | --- |
| Node / 10 | 125.6 | 76.3 / 16.0 / 3.6 | 49.8 | 55.0 / 32.2 / 16.1 |
| Node / 30 | 351.1 | 254.3 / 49.4 / 7.3 | 60.9 | 61.4 / 33.7 / 19.5 |
| Node / 60 | 855.2 | 665.1 / 118.5 / 13.4 | 73.3 | 73.3 / 40.1 / 23.6 |
| Bun / 10 | 106.2 | 72.1 / 11.8 / 3.6 | 38.5 | 38.5 / 25.2 / 7.4 |
| Bun / 30 | 321.5 | 249.4 / 30.3 / 8.0 | 41.5 | 37.8 / 23.5 / 8.0 |
| Bun / 60 | 719.4 | 601.5 / 63.0 / 11.0 | 43.9 | 39.4 / 25.1 / 8.0 |

facts session parse 包含 UTF-8 验证、首次恢复、摘要及 lookup；restore、digest 嵌套其中，不能横向求和。
显式 checkpoint 总时长中位数为 Node 15.7/16.6/23.4 ms、Bun 8.2/9.0/8.7 ms。
parent job-await 减 Worker busy 的逐 Run 差值中位数为 Node 344.1/405.1/438.6 ms、Bun 306.4/328.8/341.0 ms；它含启动、排队、调度、消息及异步结算，**不是纯通信 CPU**。

逐段授权使 lstat 次数随 D 线性增长；A、B 只降低循环计算，保留了这项主要深度工作量。

### 两因素的完整 Run 比较

节省先逐轮算 `1-候选/baseline` 再取六对中位数，正值有利于候选；不等于两组 wall 中位数之比，也不是显著性检验。括号为更快的配对数。

| runtime / D | baseline wall 中位数 ms | A：join-only | B：cursor-only | AB：combined |
| --- | ---: | --- | --- | --- |
| Node / 10 | 626.8 | 0.41%（3/6） | 2.73%（3/6） | -3.08%（2/6） |
| Node / 30 | 857.0 | 12.10%（5/6） | -0.62%（3/6） | 1.82%（3/6） |
| Node / 60 | 1235.9 | 8.35%（4/6） | -4.83%（1/6） | 8.73%（5/6） |
| Bun / 10 | 597.8 | 2.60%（4/6） | 1.57%（3/6） | 1.98%（4/6） |
| Bun / 30 | 834.9 | 3.02%（5/6） | -17.42%（2/6） | -3.24%（2/6） |
| Bun / 60 | 1282.0 | 3.87%（4/6） | 3.40%（5/6） | 5.58%（3/6） |

A 的 Node D30/D60 配对绝对节省中位数为 103.5/100.2 ms；但 Node D10 的 baseline 先/后子组为 -4.08%/+9.67%，且 Bun 三深度 A 的进程 CPU 中位数均增加。
B 的方向跨 runtime/深度不一致。AB 在 Node D60 的两种先后子组均约 +8.7%，但 Node D30、Bun D10/D60 的顺序子组变号；不能将 A、B 的中位数相加，也没有稳定协同证据。
计数确认 A 令普通路径 `path.join` 调用由 `1984×D` 降为 0；B 将 `1984×(D−1)` 次对象展开分支换为原位推进，并同时减少 helper 调度与末段终止判定。这是源码分支计数，不能单独归因为 heap 分配收益。

共享 cgroup 在 33 个 plain 样本窗节流次数增量非零（32 个节流时间增加）、7 个样本窗 memory.events.max 增量非零、27 个样本窗 memory pressure 累计量增加，无 OOM/OOM-kill 增加。
后半窗多个慢值明显，最大为 Bun D60 AB 3896.4 ms，均完整保留。共享指标只能描述环境，不能单因归于某个 Run。
因此，六对样本中的正中位数尚不足以证明稳定加速；A 是可继续验证的计算降本方向，B 和 AB 的独立增量仍待证实。

### 安全、状态与外推

目标 Node/Bun 各完成四变体 84 项 probe（含 57 个 ordered native trace/result 差分）、16 项 native bounded/no-follow read、16 项真实 Worker fused source-read。
baseline/AB 各在 lstat/readlink/open/fstat/read/close 六个真实操作返回后暂停取消：finalize 等待释放，已打开 descriptor 关闭一次，Worker 自然 exit 0，Worker/abort listeners 清空。
AB 的代表性公开 Run 取消与两项 first-error 检查确认无普通 Records/final data；安全探针不是正式 tests/Case。

这些检查支持 canonical POSIX root 下单组件快拼接与调用私有 cursor 的语义：symlink suffix、全量 reset、40-hop 和 native 前后取消点保持，Atomic 检查仍为 `24448+3968×D`。
覆盖 root `/`、含尾段 symlink、越界再入、40/41 hops、missing/ENOTDIR 和两次 probe 间前缀替换；任意 hostile 并发替换、同步 syscall 中抢占及 Windows 执行仍在证明范围之外。

本轮只交付调查与隔离原型，Product、正式测试/Case、脚本、包和真实 cache 保持原状，未运行 Gate/build/安装包验收。
结论适用于上述 runtime、合成语料、预热方法与共享宿主；真实分布、冷/慢盘、小规模、跨平台及 heap/GC 尚待验证。
若继续推进采用，下一步是在低干扰窗口和目标语料上确认计算节省及常数代价，再完成对应实现、正式安全测试与包验收。

## 随附资源

- [两因素组合原型差异](./_resources/261024-profile-markdown-link-fused-path-loop/combined.patch)
- [方法、身份、补充统计及安全证据](./_resources/261024-profile-markdown-link-fused-path-loop/evidence.md)
- [18 次 baseline 插桩运行的所选计时列](./_resources/261024-profile-markdown-link-fused-path-loop/profile-baseline.csv)
- [36 次有效插桩运行的工作量计数](./_resources/261024-profile-markdown-link-fused-path-loop/profile-counts.csv)
- [全部 144 次未插桩运行的所选计时列](./_resources/261024-profile-markdown-link-fused-path-loop/timing-samples.csv)
