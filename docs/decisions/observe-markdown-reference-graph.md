---
title: 按引用图观察 Markdown 节点并保留显式解析缓存
id: 261017-observe-markdown-reference-graph
status: active
alignment: aligned
createdAt: 2026-10-17T09:42:24Z
purpose: 降低重复引用的节点工作量，保持独立链接判断与缓存安全边界。
background: 逐引用授权和目标探测放大热点路径成本，成功标题 memo 无法复用缺失及源节点事实。
decision: 采用单次私有引用图与固定节点观察，保留 exact-bytes 显式缓存和容量提醒。
tags:
  - cache-design
  - markdown-link-validation
  - performance
  - product-contract
relations:
  - type: 修订
    target: 261013-warn-on-explicit-markdown-parse-cache-capacity
    summary: 以单次节点观察取代逐引用探测并保留显式缓存
---

## 目的

- 按单次私有引用图取得节点事实并逐边判断，降低重复引用工作量，保留每条引用的位置、Finding 与逻辑计数。
- 保留显式 parse-facts cache 的配置、内容身份和容量提醒，不扩大到通用图、共享 resolver 或跨调用目标状态。

## 背景

- 前序采用 persistent + successful canonical target memo，仍逐引用授权与探测，失败不 memoize；热点、缺失目标及已加载源事实不能完整复用。
- 文档引用增长需要按节点需求组织授权和 I/O。单次固定观察降低重复工作，但后续替换或创建只能在下次 invocation 发现，不再承诺每边重查目标状态。
- 采用依据是完整输入、安全与操作量证明；耗时和 RSS 必须同输入测量，不以未经测量的硬阈值代替规模收益判断。

### 形成时采用证据

- 2026-10-17 在固定 Node 24.18.0 / Bun 1.3.14 下完成 27 组各五对独立进程对照，并单独通过操作量门禁：8k/深32热点每轮 lstat 从 264,001 降为 34，logical targetReadCount 仍为 8,000；唯一目标同场景仍为 264,001 次，不借共享前缀或相同 bytes 跳过授权。所选源互引只读取两个源；missing、目录单 entry、无正文需求与独立别名均有计数证明。
- 本次取舍不要求每种输入更快。热点 8k/深32关闭 cache 中位耗时为 25,094.0 → 906.1 ms；无节点复用的 unique 8k/深3/hit 为 7,340.5 → 7,763.0 ms（约 +5.8%）。unique 8k/深32/off 的进程峰值 RSS 为 338.3 → 352.4 MiB；冻结真实 corpus 的 empty cache 为 282.8 → 315.6 MiB。接受这些局部调度/图状态代价，换取按节点增长的目标观察、源复用与协作取消；这些是特定完成样本的观察，不成为新耗时或内存阈值，也不保证任意 workload 加速。

## 决策

### 引用图与节点观察

- 采用: Markdown Link 使用单次私有有向多重图；节点身份是 canonical root 基准的归一化逻辑绝对路径与授权域，不合并不同别名。源与目标角色可重叠；全部源读取建边后，按首次入边观察目标，再按源及 occurrence 顺序逐边结算。纯目标不递归发现源。
- 采用: 同域已加载源事实可供目标使用；同一节点成功或缺失观察固定，本次后续替换不重查。授权、读取、解码或解析失败立即 unavailable；不发布部分普通链接 Records 或 final data。root-external 三模式、逐段 symlink containment、no-follow final leaf、文件字节界和目录单 entry 均保留。
- 采用: 在阶段、每源/目标节点及每 256 条边边界以真实事件循环让步协作取消，节点 I/O 串行；不承诺同步解析内抢占或全文件系统原子快照。
- 采用: maxOccurrences 与 maxTargetReads 接受正安全整数或 false，省略默认保持 10,000 与 1,000；移除两者固定配置最大值。targetReadCount 仍是进入验证的逻辑引用，包含节点命中；同文档及远程/外部 ignore/report 不计费。必要授权分类后、额外正文或目录 read 前，对节点全部计费边整批预检。单文件 maxMarkdownBytes 原边界不变。

### 显式缓存与容量提醒

- 采用: cache 省略或关闭仍为封闭 { enabled: false } 且无 cache I/O；启用 branch 仍为 { enabled: true, directory, warnAboveBytes? }。directory 是非空、无 U+0000、可信可删除的 host-absolute caller-owned path。阈值是可省略正安全整数，默认 16,777,216 bytes；不扩展其它 Check 或 generic cache。
- 采用: 首次实际 restore 成功 read 返回且未取消时，仅消费已读 bytes；严格超阈值才每 invocation 至多一次 warning，给出大小、阈值、准确可删除路径。missing/read-failed 不提醒；成功读到超阈值无效内容仍可提醒，UTF-8 decode failure 停止 publication。本次 append 跨阈值下次实际读取才提醒。
- 采用: 容量 warning 沿普通 messages 输出且在正常 unavailable 返回保留，不进入 Finding、Record、final data 或计数，不改变 policy、status 和错误优先级。Product 不扫描、自动清理、停用、配额、TTL/LRU 或远程共享；容量和删除由调用方拥有。

### 缓存身份、内容与退化

- 采用: persistent identity 仍绑定当前授权读取的 exact bytes SHA-256、parser contract 与 payload version，仅保存 strict private occurrences/headings/ranges。命中只替换解析；selection、授权、节点观察、Findings、Records 和 settlement 每 invocation 新建。source-derived 材料可能落盘，不提供机密性、防篡改、跨进程协调或持久性保证。
- 采用: miss、invalid payload 与 read/write failure 继续以 current bytes fresh-parse；publication 幂等 awaited best-effort，开始前及 mkdir 后检查取消，append 已开始则等待。不缓存 whole Check settlement。除独立容量提醒外，退化不改变输出。
