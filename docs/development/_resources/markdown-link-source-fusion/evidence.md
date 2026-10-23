# Markdown Link source 任务融合采用证据

本附件保存 2026-10-23 的 source 任务融合采用依据；当前规则由[Markdown Link 解析](../../markdown-link-resolution.md)拥有。
性能来自**源码副本公开 API**对照；独立插桩用于解释机制，真实安装包 smoke 用于验证功能、安全分支与收束。
[原型调查](../../../investigations/evaluate-markdown-link-fusion-and-restore.md)中的 cache 恢复去重、正文转移与 UTF-8 校验归并未进入此候选。

## 对照身份与测量条件

baseline 从 main `dd8f0675a37fbf676991de58efbcf0f8628cefb0` 的 `git archive ... src` 冻结；after 为采样时的 `src/**` 冻结副本。
baseline 有 803 文件，after 有 805 文件，均包含相邻测试并依赖仓库 `node_modules`；这里记录的是源码树身份，不是安装包文件清单。
SHA-256 按相对 `src` 路径的 JavaScript `localeCompare` 顺序，累计路径、NUL、原始 bytes、NUL：

| 对照 | 被测冻结源码 SHA-256 |
| --- | --- |
| baseline | `840e1cd44828f45c89e3ba92cef629e26923cbd19277e2eb52c84adb4f19d966` |
| after | `11664607143ca679dae187f95149ec6ecd3e0a489d7cb61e259773d1f8c2c515` |

对照差异限于四个 Product 文件（protocol/session/worker/source-reader）及相邻测试/支持文件。
窗口前后摘要一致，窗口结束时工作区 `src` 与 after 无文件差异；以下计时只直接证明上述冻结版本，含测试的树摘要不保证当前全树相同。

- 环境：Linux x64 / WSL2 6.18.33.2、AMD Ryzen AI 7 H 450、ext4，Node 24.18.0 / Bun 1.3.14。
  共享 cgroup 上限 4 CPU / 6 GiB；协调项目内无并行重型工作，不是主机或存储独占。
- 实际 plain 窗口：UTC `2026-10-23T05:16:08.044Z`–`2026-10-23T05:19:00.884Z`。
  六轮 × 两 runtime × 三深度 × baseline/after，共 72 个未插桩样本；每组两种先后顺序各三轮，各组起始位置轮转。
- 每样本独立进程从冻结的 `src/index.ts` 导入 `defineConfig` / `markdownLinkValidation` / `run`。
  完整等价 Run 预热一次后，测量新 resolver 的 `await run`，包含 Worker 创建、通信、drain/exit 与 cache 收束。
  import、生成、预热、校验及摘要计算均在计时外；OS 与 parse cache 保持 warm，不清 OS cache。

## 负载与 cache 身份

baseline/after 配对使用同一份确定性语料与 cache bytes；它与历史窗口只是同量级负载，不作跨窗口配对。
每个 D10/D30/D60 场景均有 1824 源、3,320,000 bytes、1193 occurrences（777 direct / 416 HTTP）；D 为相对 root 的组件数，含叶名，无 symlink。
sources 在 `docs/testing/cases` 与 `docs/guides` 交替分布，各类共享深目录；前 777 源循环引用 296 个逻辑目标，随后 416 源各含一个 HTTP 引用，其余无 occurrence。
source 为 1820/1821 bytes，以普通 prose 补齐总量。

296 目标含 136 个 source 与 160 个纯目标（32 Markdown、64 普通文件、64 个含一 entry 的目录）。
source overlap 与 Markdown target 使用 heading fragment；32 份纯目标 Markdown 各 25 bytes 且内容唯一。
纯目标文件/目录为 96/64，不同于历史窗口的 130/30；当前 cache 为 1856 行/unique digests，不同于历史的 1825。

selection 为 `docs/testing/cases/**/*.md`、`docs/guides/**/*.md`，启用默认排除与 blocking policy，
`requireNonEmptyDirectories=true`，其余 anchor/external policy 保持默认；单文件 1 MiB，两项总量预算 false，启用 parse-facts cache。
历史主计时未启用 directory non-empty checking；本轮 64 个目录各读取一个 entry，baseline/after 均保留这项工作。
machine、progress 与 diagnostic 输出关闭。每次断言 source/occurrence/targetRead/finding/rejected 为 1824/1193/777/0/0；targetRead 是逻辑计费，不是 physical read 数。

各深度使用独立绝对 cache directory；每个样本预热后与计时后摘要均匹配下表，计时不包含 cache 重建：

| D | cache bytes / lines | cache SHA-256 |
| --- | --- | --- |
| 10 | 927365 / 1856 | `5035926f8be011772fdf3f15678f420cc94fb1c0fbf8103447c89391af421f3c` |
| 30 | 978929 / 1856 | `518008678b5bc23ebd1a7167691fa6870c2f19251482a7e7ad527f46c78f406a` |
| 60 | 1056419 / 1856 | `4e2b5cc779a201ceff3941981bc21d9e9c31d04c644003a9c931d8958c2aee0f` |

## 全部计时与采用结果

[计时 CSV](timing-samples.csv)保留全部 **72 行**所选列，原行序与数值字符串不变，含全部慢值，未因结果重跑。
文件 SHA-256 为 `637f6fb766c320f0a43f2517037a960762636f2ce85b85939ae9b4eeb5514ebe`。
按 runtime/depth/round 配对；`order` 是全窗口样本顺序，`pairOrder` 表示本对先后，`position` 为对内位置。
wall 是单 Run 的 `performance.now` 差值；CPU 是同窗 `process.cpuUsage` 的 user+system 增量，包含进程全部线程，不作主线程或通信份额分解。
共享 cgroup 有两个样本的 `throttlePeriods` / `throttleUsec` 非零：order 20（Node D30 baseline，第 2 轮）为 3 / 279459，
wall 1122.298 ms；order 60（Bun D10 after，第 5 轮）为 1 / 26180，wall 607.288 ms。均完整保留，不从 wall 扣除节流时间；
共享指标不归因于单 Run，外部宿主与存储负载也未独立监控。

下表为 ms 舍入值。中位数取排序中间两值均值，MAD 为相对组中位数的绝对偏差中位数；
配对节省先计算每对 `1-after/baseline` 再取中位数，不等于两组中位数之比。

| runtime / D | baseline wall 中位数 [范围] / MAD | after wall 中位数 [范围] / MAD | 配对节省中位数 | 更快 | CPU 中位数 baseline→after |
| --- | --- | --- | --- | --- | --- |
| Node / 10 | 785.7 [778.9–810.4] / 6.7 | 567.4 [558.6–579.1] / 7.8 | 28.42% | 6/6 | 886.0→661.5 |
| Node / 30 | 994.9 [971.0–1122.3] / 12.7 | 759.2 [745.9–770.2] / 6.3 | 23.93% | 6/6 | 1109.1→869.5 |
| Node / 60 | 1434.3 [1428.6–1464.6] / 2.8 | 1214.8 [1197.3–1246.8] / 8.4 | 15.31% | 6/6 | 1564.0→1343.3 |
| Bun / 10 | 768.4 [737.1–782.2] / 7.4 | 530.8 [510.2–607.3] / 9.9 | 31.09% | 6/6 | 934.8→661.5 |
| Bun / 30 | 987.2 [977.9–999.6] / 7.8 | 758.0 [753.3–769.7] / 4.0 | 23.01% | 6/6 | 1172.5→906.9 |
| Bun / 60 | 1493.0 [1480.3–1517.7] / 9.6 | 1262.7 [1250.6–1268.9] / 3.9 | 15.75% | 6/6 | 1757.0→1492.3 |

各 runtime/depth 在两种先后顺序子组的配对节省中位数均为正，所有 CPU 组中位数也下降。
深路径的节省比例较小，与保留逐段观察、减少固定交接的机制一致；这是解释，不是通信、等待或 CPU 份额的实测分解。

## 独立机制诊断与真实安装包 smoke

未进入 plain 的诊断副本在 Worker job dispatch 与 native helper 调用处计数。
小语料为三 source、一个纯 Markdown target、两条 direct edge（一个 source overlap）；Node/Bun 观察相同：

| 观察 | baseline | after |
| --- | --- | --- |
| 工作 job | 8（4 containment + 4 read） | 5（3 source-read + 1 containment + 1 read） |
| lstat / open / fstat / read / close | 8 / 4 / 4 / 8 / 4 | 8 / 4 / 4 / 8 / 4 |
| 返回正文 bytes | 97 | 97 |

该小语料的 dispatch/helper 计数支持“减少交接、保留所需 I/O”的机制解释，不外推为主语料 job 数、syscall trace、物理 memcpy 或 CPU 份额。

真实安装包验收使用 exact candidate `0.0.0-local.6aee59903814`：tarball SHA-256
`2f4db53be3d8e777419a155bb5b0fa11ea9a5906597ec7576f9166cfc09dc47a`，只从
`/workspace/vibe-check/scripts/project/node_modules/@zxyycom/vibe-check/index.mjs` 导入，不回退仓库源码。
UTC `05:19:10.089`（Node）/ `05:19:10.805`（Bun）各十项 smoke 达到预期：正常与取消后独立 Run passed；
source/target 超限分别为 source-too-large/target-unavailable；contained target symlink passed，escape target 为 blocking Finding；
escape source 由 collection 排除而 not-applicable（不是 source-reader containment 证明）；非法 UTF-8 为 source-unavailable；
预取消与执行中 timer 取消均无普通 Records/final data。
两个进程在外部 30 秒 timeout 内自然退出 0，只证明该 smoke 的收束/liveness，不是 installed descriptor/listener 计数或任意 syscall 取消证明。

## 证明与留存边界

性能范围限上述 Linux、runtime、warm cache 与合成负载；未测 RSS、profile、syscall latency、真实分布、冷/慢盘、其他平台或小规模常数代价。
安全 smoke 不证明任意 hostile concurrent replacement、强杀或抢占式取消；具体安全与取消不变量仍由 owner 和相邻测试承接。

file-lifecycle-hygiene：本说明与 CSV 从采样时的方法、身份、计时、诊断和 smoke 材料选择性整合，
于 `2026-10-23T05:19:44Z` 核对数据，长期保留以恢复采用依据。临时实验目录已清理；harness、raw JSON、cache、冻结源码、语料及安装副本不在留存范围，本附件不是可重跑工具归档。
