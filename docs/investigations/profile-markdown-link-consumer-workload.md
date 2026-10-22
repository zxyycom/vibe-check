---
title: "Markdown Link 性能：深路径、读链与缓冲"
id: "261021-profile-markdown-link-consumer-workload"
formedAt: "2026-10-21T09:38:24Z"
question: "同量级数据如何复现 mdlink 的 6–8 秒耗时，实际调用量是否超出理论预期，如何保持安全与取消语义降低成本？"
tags:
  - "buffer-allocation"
  - "bun"
  - "cancellation"
  - "complexity"
  - "cpu-profiling"
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

外部使用者在 1827 份 Markdown、1193 条语义引用上记录过 6.124 / 7.830 秒的 mdlink 耗时。
本调查用独立生成的同量级数据寻找复现条件，再逐次定位执行粒度、文件收集与缓冲成本。
所得认识用于选择优化方向；候选均为隔离原型，Product 实现与公开契约保持原样。

## 调查目的

确认深路径能否大致复现 6–8 秒，核对理论与实际工作量，并判断保持路径安全、取消及资源收束时值得降低的开销。
最后一组对照以组合原型为基线，在深度 10/30/60 比较自适应缓冲，保留 Node 对照并补查慢样本。

## 调查范围与依据

### 固定负载与测量

| 项目 | 实际范围 |
| --- | --- |
| 数据 | 1824 份源，3,320,000 bytes；1193 条引用含 777 条逻辑 direct、416 条 HTTP |
| 目标 | 296 个逻辑 target，136 个同时为源；纯目标为 130 文件、30 目录，其中 32 个 Markdown 需读标题 |
| 路径 | 深度为相对 canonical root 的组件数，含叶名；源/目标等深，无 symlink、共享前缀较多 |
| 策略 | 源逐份读当前 bytes；目录查存在/类型，非 Markdown 目标不读正文，HTTP 不发网络请求；单文件上限 1 MiB |
| 环境 | Bun 1.3.14、Node 24.18.0；Linux x64 / WSL2，Ryzen AI 7 H 450；语料在 /tmp ext4 |
| 指标 | 公开单 Check Run；每独立进程先预热一次 parse-facts cache，worker 创建、通信与退出均在计时内 |

证据取得于 2026-10-21 至 22 日。最后一组包含 120 个 plain 样本、36 个成本 profile、8 个独立 CPU sampling Run；
Bun 每版/深度 12 次，Node 各 8 次。宿主非独占、不清 OS cache，版本先后按轮次变化，Node 排列并非完全平衡。

原生 async、执行粒度、读链/收集、缓冲属于独立测量窗口，各自使用同窗口对照。
[测量方法](./_resources/261021-profile-markdown-link-consumer-workload/measurement-method.md)说明输入版本、窗口、变体与统计口径；
[计时列](./_resources/261021-profile-markdown-link-consumer-workload/timing-samples.csv)保留支撑主线的 307 个 plain 样本；
[诊断节选](./_resources/261021-profile-markdown-link-consumer-workload/diagnostic-evidence.md)保存计数、局部成本、反例与安全结果。

行为边界以[公开指南](../checks/markdown-link-validation.md)、[解析与授权不变量](../development/markdown-link-resolution.md)及[文件收集不变量](../development/project-files.md)为依据。

## 调查结果与边界

### 主要认识与依据

| 问题 | 已取得的认识 | 关键依据 |
| --- | --- | --- |
| 何时能复现 6–8 秒 | 原生 async 在深路径下可稳定达到相近耗时 | Bun 深度 22/26 各 5 次，中位数 6.231/7.185 秒，均 5/5 落入 6–8 秒 |
| 路径观察是否超量 | 本负载的实际计数符合模型 | 独立路径 `1824+296−136=1984`，containment lstat 为 `1984×深度` |
| 哪些重复工作有收益 | 调整执行粒度、复用纯祖先排除判断有效 | 深度 26 按路径同步 worker 为 2.166 秒，原 async 为 7.547 秒；深度 60 matcher 从 4,202,030 降至 68,040 次 |
| 自适应缓冲的价值 | Bun 小幅改善，Node 明显改善 | 累计工作缓冲从 1,946,158,912 降至 3,322,656 bytes，实际读链与路径计数不变 |
| 剩余成本与慢尾 | 逐段路径观察及串行请求链仍值得关注；历史慢尾原因未知 | 深度 60 路径 job 占较大局部区间，旧 Bun 3.078 秒尾部在最后窗口未重现 |

777 是引用逻辑计费数。每 Run 正文 open/fstat/close 各 1856 次，read 为 3712 次，返回 3,320,800 bytes；
组合原型共 3840 个 worker 请求。已存在的同节点去重与 source/target 事实共享保留，跨节点的路径观察仍各有安全职责。

执行粒度实验中，worker 内仍用 async 或逐组件转发均未提速。收益来自后端与任务粒度的组合，而不是通信方式天然更快。
文件收集的 prefix memo 仅复用本次固定 policy 的纯判断，物理观察与选中路径保持一致。

### 组合原型与自适应缓冲

组合原型为私有串行 worker 的逐段路径检查、整文件同步读链，以及本次收集的纯 prefix memo。
fixed 一次申请 `maxBytes+1`；adaptive 按 fstat size 加一并钳制到该上限起步，读满后有界倍增，仍读取到真实 EOF 或上限。

下表为组中位数，单位秒。配对节省是各轮 `1−adaptive/fixed` 的中位数，与两个组中位数之比是不同统计量。

| Runtime | 深度 | fixed | adaptive | 配对节省 | 更快配对 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Bun | 10 | 0.815 | 0.800 | 5.45% | 11/12 |
| Bun | 30 | 1.077 | 1.058 | 3.35% | 10/12 |
| Bun | 60 | 1.558 | 1.465 | 2.51% | 11/12 |
| Node | 10 | 0.983 | 0.737 | 24.62% | 8/8 |
| Node | 30 | 1.820 | 0.919 | 49.52% | 8/8 |
| Node | 60 | 2.140 | 1.311 | 37.95% | 8/8 |

两种先后顺序的子组配对节省中位均为正。正常语料零扩容，36 个成本 profile 的路径、读取、返回 bytes 与 worker 请求数一致；
减少的是累计缓冲申请，RSS 与物理 I/O 各自解释。

此前六变体比较中，Bun 深度 60 的 fast/combined 中位数为 4.180/1.567 秒；浅层 combined 相对 reader-worker 仅 1/6 更快。
该窗口 Node 每版仅 3 次，combined 相对 fast 只有 2/3 更快。这些反例保留于 CSV，最新缓冲收益只支持其自身对照。

### 剩余开销与慢样本

Bun adaptive 深度 60 的一个成本 profile 中，Run 为 1657.804 ms：文件发现 221.901 ms，源处理 1328.296 ms，引用解析 101.189 ms。
worker 路径 job 为 643.559 ms，其中 lstat 为 466.838 ms；正文 job 为 64.837 ms，cache restore/digest 为 32.946/7.243 ms。
这些是有嵌套关系的局部区间，说明路径观察及串行请求链值得继续隔离，缓存恢复与摘要计算暂非首要方向。

Node 深度 60 的 plain 进程 CPU 中位数从 2335.787 降至 1487.273 ms，minor faults 从 436,478.5 降至 4,666.5。
结合缓冲策略这一单一差异和相同读链计数，支持分配及页面提交/初始化路径是额外成本的重要来源；allocator、清零与 GC 的份额尚未分离。

最后 120 个 plain 样本均低于自身组中位数的 1.5 倍，Bun fixed 深度 60 范围为 1.464–1.634 秒。
观察到的 major faults、共享 cgroup 节流及 memory pressure/max events 增量为零；部分 Bun 慢样本伴随较长线程排队，但 CPU 也不同。
这些观察只覆盖本窗口，历史 3.078 秒尾部仍需重现后定位。

成本 profile 与 CPU sampling 用于诊断，不作 plain 的 CPU 分解：Node fixed CPU 采样 Run 为 1.673/1.401 秒，已偏离 plain 的 2.077–2.217 秒。
Node 取得 main 与 measured worker profile，Bun 仅 main；父线程请求跨度和 postMessage 栈权重均包含更广的等待/调度含义。

### 安全、取消与采用建议

最后 12 组安全矩阵全部通过：每组 24 项路径、16 项读链/worker 故障、19 项既有取消探查、16 项共同缓冲场景；
adaptive 另有 6 项扩容转移场景。4×29 个相邻回归也通过，worker 启停平衡、句柄余额为零。

覆盖越界再入、symlink 限额、前缀替换、final-leaf no-follow，以及 fstat 后真实增长/缩小、短读至 EOF、max+1、扩容后取消和失败。
共同结果与直接可比的轨迹一致；增长时另按独立 bytes、EOF、容量和关闭断言核验。Check 取消后不发布部分普通 Records/final data。

取消被观察后停止新操作并完成 close；运行中的同步 syscall 仍不可抢占，collection 的取消在同步收集结束后由 Check 收束。
close 错误为真实关闭后注入，worker fault 在 native open 前触发；安装产物加载、Windows、真实慢/冷存储、并行 Check 及在途强杀仍需后续验收。

**建议：**组合原型加自适应缓冲值得进入生产采用验证；Bun 按小幅缓冲收益评估，Node 保留独立验收。
下一步可隔离 probe/read 任务融合，以减少串行请求开销，同时保留授权、状态观察与取消边界；该方向尚未验证。

## 随附资源

- [同量级语料生成器原文](./_resources/261021-profile-markdown-link-consumer-workload/consumer-fixture.ts)
- [成本、慢样本与安全结果节选](./_resources/261021-profile-markdown-link-consumer-workload/diagnostic-evidence.md)
- [测量条件、变体与证据口径](./_resources/261021-profile-markdown-link-consumer-workload/measurement-method.md)
- [支撑主线的计时样本列](./_resources/261021-profile-markdown-link-consumer-workload/timing-samples.csv)
