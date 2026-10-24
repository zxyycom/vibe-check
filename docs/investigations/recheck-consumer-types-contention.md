---
title: "复查 Consumer types 的并发放大与资源压力"
id: "261024-recheck-consumer-types-contention"
formedAt: "2026-10-24T03:29:45Z"
question: "逐项配对和历史接续能否复现 Consumer types 的 15 秒，哪些资源证据能解释放大、哪些仍不能归因？"
tags:
  - "performance"
  - "project-gate"
  - "resource-contention"
  - "test-execution"
relations:
  - type: "复查"
    target: "261023-diagnose-heavy-check-contention"
    summary: "以配对和历史接续复查类型验收放大并对齐旧压力窗口"
---

## 形成时背景

用户接受 Consumer types 独立运行约 3–5 秒，但不接受完整 Gate 中约 15 秒的放大，要求进行针对性并发实验。
[前序调查](./diagnose-heavy-check-contention.md)已观察到三项同起放大，却没有复现完整 Gate 的峰值。
本轮于 2026-10-24 重新取得配对、任务接续及 compiler 直接运行样本，并将旧资源采样对齐到 types 窗口。
本轮与前序的内存基线、consumer 准备方式不同，需要分别保留，不能当成优化前后 A/B。

**本轮未复现 15 秒。type-aware lint 是较强的竞争对象；旧 15 秒窗口确有内存上限事件和直接回收，
但现有证据仍不能把全部放大归因于某个 Check、内存回收或 CPU 节流。首次独立运行也用了 9.342 秒，
不能承诺只要隔离并发就稳定回到 3–5 秒。**

## 调查目的

区分 supporting、lint 及历史接续负载对 types 的影响；检查放大发生在测试包装还是 compiler 本体；
核对旧 15 秒窗口的资源压力，而非借用整轮累计数字作单项归因。不改变公开 API、测试断言、Gate
选择/调度/预算，也不借本轮决定删除验收。fixture 降层与测试命名建议在当前任务单独交付。

## 调查范围与依据

### 固定输入与准备边界

- 分支 `main`，HEAD `d15cbf6f34499fa3027ed6c99d0508436add740f`，保留已有未提交工作。
  3,393 项 tracked / 非 ignored untracked 输入前后相同，清单 SHA-256 为
  `3ebf70b1034f80b740987d41cf2fb0941ed39728fc1cc53373909846b5ba273c`。
- Bun 1.3.14、Node 24.18.0、pnpm 11.1.3、TS7 7.0.2；相关 compiler/lint backend、candidate、
  consumer 及工作树状态前后相同。与前序相关源码和已比较的工具文件无差异。
- 前序隔离 consumer 已不存在；本轮复制既有 `scripts/project/node_modules`，通过 owner 生成 type/example
  fixture。1,557 个包文件与既有 tarball 相同；与旧 consumer 比较，类型、配置、示例及声明相同，
  差异为三个 `.bin` 链接文本和缺少十一项本轮不用的 runtime fixture。**这不是一次新安装验收。**
- 无网络安装、清缓存、修改配额、人工内存压力或完整 Gate 重跑。所有条件共用一个自有临时 consumer。

### 方法与计时

按预定顺序执行十个条件：独立 A、lint 配对、supporting 配对、三项同起 A、历史接续 A/B、三项同起 B、
独立 B、直接 compiler、compiler 与 supporting/lint 同起。配对各一次，主对照各两次，不自动重试。

历史接续先运行 Markdown 与 admission 测试；admission 完成后起 types，Markdown 完成后起 supporting
与 lint；lint 完成后起 function metrics，supporting 完成后起 runtime 测试。保持任务替换顺序，
不强行复制旧启动时刻；function metrics 用独立进程的既有单 Check driver，非原 Gate host。
未回放 provider 安装、完整 Gate 前序任务或 host 保留的内存，因此不声称完整复现原环境。

每个条件前观察 2 秒，运行中约每 200 ms 采样 `/proc` 与 cgroup。命令、精确文件列表、逐项 wall、
wait4 user/system、RSS、退出状态及资源增量保存在随附 JSON。wall 为直接进程启动至退出，旧 15.028 秒
为 Gate Check execution duration，计时边界不同。wait4 包含已回收子进程 CPU；RSS 高水位不是进程树
同时占用量。自然缓存未控制，观测到的非本轮进程 CPU 非零，采样也不能排除短进程或宿主竞争。

旧采样来自 `2026-10-23T09-18-49.073Z-412657-d9ecd1af-674d-45a8-aac4-0e916a6f2ce3`。
用子进程出生时间与 Check started 对齐，六个 anchor 偏移为 2.008–2.046 秒，中位 2.021 秒；
旧采样间隔 500 ms、最近边界约有 ±250 ms 偏差。旧进程角色由 ancestry 与启动顺序推断，CPU
差分仅覆盖采样区间，不等于完整 wait4。未把旧整轮资源总数直接贴到 types 上。

## 调查结果与边界

### 当前对照：没有重现 15 秒

| 条件 | types / compiler wall | user + system CPU | 该条件 cgroup throttled 增量 |
| --- | ---: | ---: | ---: |
| types 独立 A，首次 | 9.342 s | 12.557 s | 0.019 s |
| types + lint | 6.904 s | 8.557 s | 3.151 s |
| types + supporting | 3.992 s | 5.566 s | 0.401 s |
| types + supporting + lint，A / B | 5.787 / 5.249 s | 6.741 / 6.137 s | 4.456 / 3.600 s |
| 历史接续，A / B | 7.436 / 6.482 s | 8.804 / 7.717 s | 6.458 / 5.222 s |
| types 独立 B | 3.491 s | 5.203 s | 0 s |
| 直接 compiler 独立 | 4.104 s | 6.906 s | 0.164 s |
| 直接 compiler + supporting + lint | 6.581 s | 8.440 s | 5.484 s |

CPU 可因多线程大于 wall；throttled 是共享 cgroup 的累计值，历史接续列还覆盖 types 前后任务，
不能从 types wall 扣除，也不能解释为 types 自己等待了这些秒数。

十个条件的所有 workload 均 exit 0；types 各 2 测试、supporting 各 36 测试通过，lint 保持 687 文件、
127 规则且无诊断。直接 compiler 两次都保持 418 文件、134,214 行、2,383,201 次实例化。
这支持“并发使 compiler 本身变慢，不只是测试 wrapper 慢”，但单次配对及自然缓存不足以得出固定倍率。
supporting 配对样本远低于 lint 配对，不支持把 supporting 单独认定为 15 秒的主要原因。

首次独立 A 必须保留：其 compiler 采样 CPU 约 12.24 秒，晚期独立 B 约 4.75 秒；A 只有约 3.25 MB
`read_bytes`、零 major fault、cgroup I/O PSI full 约 18 ms，且几乎无 CPU 节流。没有足够证据把它
简单归因为冷磁盘读取、内存回收或 concurrent Gate。环境/缓存/compiler 工作量变化的具体机制仍未隔离。

### 旧窗口：资源压力集中在 supporting 与 lint 重叠段

容器限额同为 4 CPU、6 GiB。本轮各条件开始约 3.95–4.05 GiB，峰值最高约 5.45 GiB；
所有条件的 `memory.events.max`、direct reclaim 和 memory PSI 增量均为零。

旧 types 近似窗口为 core 时间 5.539–20.945 秒，包住实际 Check 的 5.668–20.696 秒：

- cgroup 从约 5.62 GiB 开始，峰值到 6 GiB；`memory.events.max` **增量 5,275**，非开机累计值。
- direct reclaim 扫描 **226,524 页**；上述 max 事件和扫描几乎全部落在 supporting/lint 重叠段。
- CPU PSI some 约 3.734 秒，memory PSI full 约 0.516 秒；无 OOM/kill。
- 旧 types native compiler 在可见采样区间内 CPU 增量至少 **14.96 秒**，并非整个 15 秒只在等 runner。
- 该窗口 file refault 为 **345**；旧整轮的 37,818 不能用作本窗口数字。

这些是旧慢窗口真实存在资源竞争的证据；但共享 PSI、节流、回收计数不能逐项分账，CPU 时间升高也
尚未被具体归因。当前实验未到旧内存边界，因此“当前回放只有 6–7 秒”不能推翻旧 15 秒，也不能证明
某个互斥配置必然解决它。本轮保留“CPU 竞争，旧环境另叠加内存压力”的解释，**不宣称根因已闭合**。

### 建议与实际动作

如继续解决执行性能，优先验证 types 与 type-aware lint 的受控错峰，同时观察整体 Gate wall 与单项耗时；
不把全部 Check 串行，也不通过切碎 Check 改善 mean/P95。要声称消除 15 秒，还需在可比的完整 Gate
资源状态下取得证据，并解释首次独立慢样本。用户接受仅发布前执行 types，是频率取舍，不是性能修复；
本轮没有实施该选择，也没有外推到 installed consumer runtime。

本轮仅新增调查报告、资源与派生索引；产品、测试、调度、预算、公开 API 和 Git index 未改。
原始辅助材料保留于 ignored `.log/consumer-types-contention-20261024-jpYA8M/`，自有 consumer
在 `/tmp/vibe-check-consumer-contention-20261024-0KH6r5/`；其 `ARTIFACT-NOTE.md` 记录来源、归宿和精确清理范围。
资源 JSON 原样复制本轮汇总，包含命令与身份但不复制全量日志、依赖或原始采样。完整 Gate 未运行，
本轮也未证明任何性能修复或新测试方案已经生效。

## 随附资源

- [固定输入、十条件计时与旧压力窗口对齐](./_resources/261024-recheck-consumer-types-contention/measurements.json)
