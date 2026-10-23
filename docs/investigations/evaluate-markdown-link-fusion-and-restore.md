---
title: "Markdown Link 剩余开销：任务融合、缓存恢复与字节处理"
id: "261023-evaluate-markdown-link-fusion-and-restore"
formedAt: "2026-10-23T02:35:03Z"
question: "在已优化的原生 I/O 基线上，source 任务融合、cache 恢复去重、正文转移与 UTF-8 校验归并的收益、适用条件和安全边界是什么？"
tags:
  - "cache-design"
  - "cancellation"
  - "markdown-link-validation"
  - "performance"
  - "utf8"
  - "worker-threads"
relations:
  - type: "补充"
    target: "261021-profile-markdown-link-consumer-workload"
    summary: "补充优化基线下任务融合、缓存恢复与字节处理的性能及安全证据"
---

## 形成时背景

前序调查推动采用了串行 Worker、文件收集的路径前缀复用（prefix memo）和自适应读取缓冲，并完成[真实安装包验收](../development/_resources/markdown-link-native-io/evidence.md)。
本轮以采用后的 main `a9054d47` 为基线，调查剩余的任务交接、缓存恢复与字节处理开销。先测 source 任务融合和 cache 恢复去重，再补测正文转移和 UTF-8 校验归并。

## 调查目的

用隔离原型比较 Node/Bun 完整公开单 Check Run，判断四项方案的收益及采用条件，并检查路径安全、字节所有权和协作取消：

| 方案 | 改动边界 |
| --- | --- |
| source 任务融合（fusion） | 路径包含检查（containment）与正文读取合为一个 Worker job，仍按原顺序执行 |
| cache 恢复去重（restore） | 倒序恢复，同 digest 的后行已完整有效时跳过较早行的 facts 构建 |
| 正文转移（transfer，A） | 保留精确长度副本，以 transferList 转移成功正文的独占 ArrayBuffer |
| UTF-8 校验归并（utf8，B） | 仅在 cache disabled 时，由既有 fatal decode 同时完成验证和解码 |

## 调查范围与依据

两窗口使用相同摘要的冻结 `src/**` 副本，依赖仓库 `node_modules`；本轮证据层级为源码副本公开 API 实验。环境为 Node 24.18.0 / Bun 1.3.14、Linux x64 / WSL2、ext4，共享 4 CPU / 6 GiB cgroup。

主语料为合成的 1824 份源文档、3,320,000 bytes、1193 条语义引用（777 direct、416 HTTP），而非外部使用者的原数据。
296 个逻辑 direct target 中 136 个同时为 source，另有 32 个纯目标 Markdown 标题读取；`targetReadCount=777` 是逻辑计费数。路径深度 D 为相对 canonical root 的组件数，包含叶名；计时语料无 symlink，路径安全另测。

| 实际窗口（UTC，2026-10-23） | 隔离比较 | 未插桩计时样本 |
| --- | --- | ---: |
| 02:35:38.893–02:42:29.183 | fusion：D10/30/60、当前缓存；restore：D30、三种 cache 形状，各自对 baseline | 144 |
| 03:46:05.338–03:57:10.009 | D30、cache hit/miss/disabled 下 baseline/A/B/AB；另测 D4 大正文的 baseline/A | 168（主矩阵 144 + 大正文 24） |

cache 三形状为 current（当前缓存）、history（8 代不同 digest 后接 current）、duplicate（current 重复 9 次）；三者均命中当前输入。
history/duplicate 同为 8,995,257 bytes、16,425 行，unique digest 分别为 16,425/1825。大正文控制为 32 文档×256 KiB=8 MiB、cache hit，用于观察传输字节规模的影响，独立于主语料。

每进程一次完整 Run 预热在计时外，测量新 resolver 的公开 `await run`，包含 Worker 启停和 cache 收束；OS cache 保持预热状态。
hit 使用预热缓存，miss 删除该进程自有缓存后测重建/发布，disabled 关闭缓存。每比较六轮，候选相对 baseline 先/后各三轮；A/B/AB 每轮共用匹配 baseline，AB 仅指 A+B。fusion/restore 各自独立，组合收益留待单独验证。

计时与诊断/安全探针分开，慢值与负收益全量保留。下文节省为逐对 `1-候选/baseline` 的中位数，正值有利于候选；两个组中位数之比是另一统计量。
树摘要、采样顺序、cache 身份与安全分层见[首窗口证据](./_resources/261023-evaluate-markdown-link-fusion-and-restore/evidence.md)和[字节处理证据](./_resources/261023-evaluate-markdown-link-fusion-and-restore/transfer-utf8-evidence.md)，逐次计时见随附 CSV。

## 调查结果与边界

**优先推进 source 融合的采用验证；其余方向按负载条件评估。** cache 去重的收益集中于重复 digest，正文转移的收益集中于独立大正文控制，UTF-8 归并及 A+B 在主语料上的收益仍不稳定。

### Source 任务融合

独立诊断确认工作 job 从 3840 降至 2016；containment lstat 仍为 `1984×D`，正文 open/fstat/close 各 1856、read 3712、返回 3,320,800 bytes 均保持。收益来自减少串行任务交接，同时保留原有路径观察与正文 I/O。

| runtime | D10 / D30 / D60 配对节省 | 更快 |
| --- | --- | --- |
| Node | 31.31% / 21.92% / 16.26% | 各 6/6 |
| Bun | 29.31% / 25.84% / 13.80% | 各 6/6 |

两种先后顺序子组的节省中位数均为正，进程 CPU 中位数各组也下降；配对绝对节省中位数约 200–265 ms。深路径下比例下降，符合减少固定交接、保留逐段路径观察的解释；通信、等待与 CPU 各自份额仍待分离。

### Cache 恢复去重

duplicate 的完整 facts 构建从 16,425 降至 1825，`JSON.parse` 与 header 校验仍各 16,425；读取字节、current/history 的构建工作量保持。无效后行仍回退到较早有效行，六次按 identity/facts 比较完整 restored Map 均相等。

| runtime | current 节省 / 更快 | history 节省 / 更快 | duplicate 节省 / 更快 |
| --- | --- | --- | --- |
| Node | -1.01% / 3/6 | -2.22% / 2/6 | 16.92% / 5/6 |
| Bun | 4.41% / 4/6 | -3.49% / 1/6 | 13.82% / 6/6 |

duplicate 两种顺序子组的节省中位数均为正，CPU 中位数也下降；Node 仍有一对慢 10.69%。采用价值取决于重复 digest 比例，而非 cache 文件体积：不同历史 digest 的累积仍需其他策略。采用前应确认真实重复比例及 current/history 的退化风险。

### 成功正文转移（A）

A 保留 1856 次 exact slice / 3,320,800 bytes，独立插桩确认成功回复 `senderDetached=1856`。该观察证明发送形式与所有权转移，物理 memcpy 次数和 RSS 变化未测。
D30 主语料六组（Node/Bun×hit/miss/disabled）配对节省为 -3.19%–1.33%，更快 2–4/6；独立大正文控制为 Node 7.53%、Bun 7.66%，各 6/6，两种顺序子组中位数也均正。
据此优先在正文较大的负载继续评估，1824 源主语料的稳定提速仍待证实。

### 关闭缓存时的 UTF-8 校验归并（B）及 A+B

B 在 disabled 使 `isUtf8` 从 1856 降至 0，fatal source decode 仍 1856；enabled hit/miss 保持原流程，包括在 cache I/O 前拒绝非法 UTF-8。
disabled 的 Node/Bun 配对节省为 3.31%（4/6）/ -3.99%（1/6），方向不一致；enabled 的工作量相同，其计时波动仅作控制观察。
AB 的 disabled 节省为 1.96%/2.80%（均 5/6 更快），但 hit/miss 混有负值；相对 A 的同轮增量同样波动较大。当前仅保留组合观察，B 的稳定增量与协同机制仍待证实。

### 安全与采用边界

- **语义与资源收束：** Node/Bun 的路径安全、cache facts/字节等价、正文所有权和 UTF-8 检查通过。
  受控操作边界取消时，finalize 等待在途操作返回，已打开 descriptor 关闭一次，Worker 退出、listener 清空；公开 Run 取消/失败时不发布普通 Records 或 final data。
  同步 syscall、parse 与恢复的强制抢占不在证明范围。
- **测试层级：** fusion 的原相邻 Bun suite 为 21/22，唯一差异是旧 fake Worker 未识别新 job；独立最小适配后原 finalization 断言另行通过，采用时仍需正式接入。
  字节实验的四个未插桩副本各通过既有 Bun 44/44；真实 Worker、受控注入与 transport doubles 的分层和计数保留在证据中。
- **波动与外推：** 首窗口出现一次共享节流；字节窗口节流为零但 Bun disabled 第六轮仍达 2.58–5.96 秒，全部保留。宿主外部负载未独立监控。
  收益适用范围为所述 runtime、合成负载和 warm OS 条件；冷/慢盘、真实分布、其他平台、小文档常数开销及独立安装包仍需验收。
  受控边界探针也不等同于任意文件替换或强杀场景证明。

本轮交付调查材料，Product 与真实 cache 保持不变；四项原型均尚未被采用。

## 随附资源

- [测量条件、工作量与安全证据节选](./_resources/261023-evaluate-markdown-link-fusion-and-restore/evidence.md)
- [source-read 独立原型差异](./_resources/261023-evaluate-markdown-link-fusion-and-restore/fusion.patch)
- [cache 恢复独立原型差异](./_resources/261023-evaluate-markdown-link-fusion-and-restore/restore.patch)
- [全部 plain 样本的所选计时列](./_resources/261023-evaluate-markdown-link-fusion-and-restore/timing-samples.csv)
- [字节处理补证的测量、安全与工作量](./_resources/261023-evaluate-markdown-link-fusion-and-restore/transfer-utf8-evidence.md)
- [字节处理补证全部 plain 的所选计时列](./_resources/261023-evaluate-markdown-link-fusion-and-restore/transfer-utf8-timing-samples.csv)
- [成功正文转移独立原型差异](./_resources/261023-evaluate-markdown-link-fusion-and-restore/transfer.patch)
- [disabled-cache UTF-8 独立原型差异](./_resources/261023-evaluate-markdown-link-fusion-and-restore/utf8.patch)
