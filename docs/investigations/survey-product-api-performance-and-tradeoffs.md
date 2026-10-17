---
title: "Product API 性能普查与组合优化代价对照"
id: "261015-survey-product-api-performance-and-tradeoffs"
formedAt: "2026-10-15T06:34:34Z"
question: "2026-10-15 的公开 API 正常负载覆盖了哪些成本，组合优化在哪些相同 workload 获益或变慢，哪些边界仍未覆盖？"
tags:
  - "performance"
  - "product-api"
  - "tradeoffs"
relations: []
---

## 形成时背景

2026-10-15，用户要求先完整清点当时公开 Product API 的正常负载成本，再讨论优化，不能只挑有利热点。
原普查基线为 `main` 的 `b2926b14880da7546f39aba7c0e07424f65f3977`；随后获授权的组合优化沿用同一组
helper 和 workload，保留小输入与 chain 退化，不把操作量下降等同普遍变快。

这是对当时独立一轮性能普查及其同输入后测的补录，不是清理过程中新做的调查或当前性能验证。
`formedAt` 取当时 `comparison.json.generatedAt=2026-10-15T06:34:34.474Z` 的整秒，表示该比较记录形成时点；
正式补存发生在 **2026-10-17**，每份资源另记 `supplementedAt`。原先说明和数据分散在 ignored 的
`tmp/performance-investigation-20261015/` 与 `tmp/optimization-implementation-20261015/performance/`，
现在仅作为历史来源名称，不再要求这些现场存在。

[261012 基线调查](./measure-product-performance-baseline.md)是背景，不是本轮 before 样本；版本、覆盖和 workload
不同，不计算跨报告加速比。本轮问题可独立解释，直接关系为空。具体实施验收仍由相应 Change 承接，
当前行为以公开指南、类型及 owner 为准。

## 调查目的

1. 清点九项 Check、commandCheck、Run、调度、输出和主要公开工具的有界正常工作，明确漏测区域。
2. 在保持输入、helper 和运行时相同的条件下比较组合优化，分别保存收益、反例和无变化分支。
3. 为后续定位提供当时事实，而非形成永久 benchmark、性能预算、实施授权或当前 Gate 通过证明。

## 调查范围与依据

### 版本、环境和窗口

基线覆盖 753 个 `src/**` 文件（包括测试与 fixtures），source-manifest SHA-256 为
`39a3f905f1895878b309cf8c1ed621b2e5082af39230f04956befe7e3ed0b482`。after 是同一 HEAD 下的组合优化
working tree，754 个文件，digest 为 `391adab3fe192499106600b5bc04ddc9153ea06ca326be85a0cb70ed6870f9b8`；
不是对后来提交或当前源码的计时。原 metadata、helper 和 source identity 在随附比较资源中保留。

Node 24.18.0 为当时支持基线，Bun 1.3.14 单列本地参考；未用裸 PATH 的 Node 26/Bun 1.4 代替。
Linux x64/WSL2、AMD Ryzen AI 7 H 450，容器可见 6 CPU，cgroup quota 4 CPU、6 GiB memory；
SCC 4.0.0、jscpd 5.1.1 使用已安装工具。Bun 的 jscpd 子进程也由 Bun 启动，跨运行时不混算。

最终 baseline 窗口为 2026-10-15 **05:44:49–05:47:20 UTC**，每个运行时 83 groups、418 次含 warmup 的操作，
Node 与 Bun 合计 166 groups、836 次操作。
初轮曾与其它操作计数约一秒重叠，未纳入最终统计。after 窗口为 **06:30:09–06:32:10 UTC**，
每个运行时 80 groups、406 次含 warmup 的操作，Node 与 Bun 合计 160 groups、812 次操作；
用于 before/after 比较的同名子集在每一侧均为此数量。团队暂停重负载，不代表 OS/宿主隔离、CPU pinning、
频率或温度受控。两个窗口相隔约 45 分钟、顺序采样，**不是当场交错 ABBA**。

### Workload 和测量边界

| 域 | 实际输入与计时边界 |
| --- | --- |
| Scheduler / Run | independent 或 chain，N=128/512/1024、P=4，同步 passed no-op Checks；static/custom/learned 分开。learned 每组独占新 history，后续同组 warm；未发生 fallback。 |
| 文件收集 | F=128/512/2048、每 64 文件一目录，单 glob 与 F 个 literal patterns；结果逐项相同、排序且冻结，默认 excludes 保持。 |
| Markdown Links | 128/512 sources，每份 8 条有效跨文档 anchor，16 targets×32 headings；cache-off/hit 分开，无网络。 |
| Records / 输出 | 10 Checks×100/1000 Records，每 Record 64 字符 text；machine/progress/diagnostic 专门组真实写输出，正常组关闭输出。 |
| 其它 Check | 16/64 合成有效文件，真实 SCC/jscpd/Worker 与本地 schema；不以 empty、unavailable 或 invalid 代替正常 scanner。 |
| API 工具 / 边界 | 公开 canonical/cache、Definition、simulation 等；invalid-options 和 clean Git 分支单列，不称为正常工作通过。 |

`performance.now()` 包围完整公开工具调用或 `await run(...)`；import、进程启动、fixture 准备、常规 Definition
构造、断言与汇总 IO 在 span 外，专门 `defineConfig` 和 invalid-options 组的构造除外。
scheduler/records-output 为 2 warmups+5 repeats，collection 为 2+7，Links 为 1+5，其余为 1+3。
保留每个 warmup 和所有正式样本，统计 median/min/max；没有 p95、显著性或置信区间主张。

主体/survey 的 parent CPU delta、结束后 RSS/resourceUsage 不等于 scanner 子进程总 CPU、阶段归因或 heap/GC peak。
14 份 before/after fixture manifests 与实际输入 bytes 逐项相同；after helper SHA 与 before 相同。
三个 baseline groups `maintenance-1`、`maintenance-16`、`run-git-changes-clean` 不后测：工作区已 dirty，不能
伪造 clean Git workload 或恢复工作树迎合旧断言。完整排除规则见 comparison 资源。

### 本次资源投影与复核

2026-10-17 只读旧数据后补存：四份 baseline/after×runtime 资源保留所有 group/workload、样本、warmup、CPU/RSS 字段。
仅把重复的大 `value` payload 替换为规范 JSON 的 SHA-256；归一化只涉及经有限非负校验的 `checkDurationSumMs`
以及已启用的 diagnostic file 路径。maintenance 原始观察没有 `value` 字段，保留其原字段。
补存时重新比较四对原 evidence 的全部 **812 对 observation**（每个运行时 406 对，包含 warmup），上述归一化后的已记录值均相等；
这不等于完整 Run snapshot、机器文件 bytes、context identity 或全部失败顺序相等。

每份资源记录原始文件 SHA/bytes、历史来源和实际补存时间。method 资源保存原 helper 文本供审阅，而不是可执行 SDK；
完整源码副本、fixture、history、机器输出、初轮重叠现场和 CPU profiles 不继续保存。
源 digest 识别历史版本，不承诺据此重建所有未提交内容；如需当前比较，应另行授权、重新固定输入和窗口。

## 调查结果与边界

### 有界收益与负结果

以下是同名 workload 的 median ms，完整 160 个 runtime×group 的比较与全部原始 timing 在资源中，未只挑有利项。

| workload | Node before→after | Bun before→after | 判断 |
| --- | ---: | ---: | --- |
| literal collect F2048 | 275.012→65.947 | 314.683→94.981 | 两运行时 range 下移，支持本合成大 literal workload 获益。 |
| glob collect F512 | 2.428→5.094 | 8.112→8.547 | Node 小绝对量仍有代价，不能以其它大规模收益覆盖。 |
| independent learned N1024/P4 | 1879.500→1040.340 | 4083.290→3007.559 | no-op 框架成本下降，不证明真实长任务 makespan 或 Gate 提速。 |
| chain learned N1024/P4 | 299.997→404.548 | 682.645→816.860 | 两运行时 median 上升且范围更宽，未 profile 归因，不能宣称普遍加速。 |
| full custom context N512/P4 | 344.937→245.331 | 988.564→687.046 | 完整组合改动的观察，不分配单个改动因果收益。 |
| 10000 Records / machine enabled | 219.951→221.311 | 360.165→288.981 | Node 未改善，保留真实 IO 和运行时差异。 |

Node glob F128/F512/F2048 分别增加 1.991/2.666/2.822 ms；literal F128 增加 3.378 ms。
chain N1024 的 Node before range 为 256.003–325.867、after 为 227.195–537.535 ms；
Bun 为 647.377–791.713 与 628.691–1131.465 ms。范围重叠不构成回归排除，未进一步取得根因。
微秒级 helper、带 Worker/外部进程/IO 的小样本也可发生较大百分比波动；不跨 80 groups 取一个误导总平均。

### 未证明的内容

当时九项 Check 均有正常执行样本，但并未覆盖所有 options、输入规模或真实消费者分布。
单层 inherited Run、unknown-root-key invalid Definition、简单 chain simulation 不代表 deep inheritance、广 relation、
共享 executable DAG 等病理边界；这些另由实施切面的计数与行为证明承接。
未测 installed package、cold startup/import、Windows/TTY、稳定 tail、heap/GC peak；未放宽预算、timeout、并发或选择。
这些历史数据不表示当前源码仍有同样性能，不作为未来采用的自动门禁。

全域普查、负结果和测量方法在本报告长期保留；各 Change 的具体采用与正确性验收仍归相应 Change，
不因该报告补存而重建实施授权。本次没有运行采样、产品测试、Gate、build 或依赖安装。

## 随附资源

- [after Bun全部样本投影](./_resources/261015-survey-product-api-performance-and-tradeoffs/after-bun.json)
- [after Node全部样本投影](./_resources/261015-survey-product-api-performance-and-tradeoffs/after-node.json)
- [baseline Bun全部样本投影](./_resources/261015-survey-product-api-performance-and-tradeoffs/baseline-bun.json)
- [baseline Node全部样本投影](./_resources/261015-survey-product-api-performance-and-tradeoffs/baseline-node.json)
- [完整比较、排除、输入身份和环境](./_resources/261015-survey-product-api-performance-and-tradeoffs/comparison.json)
- [形成时helper与计时runner文本](./_resources/261015-survey-product-api-performance-and-tradeoffs/method.json)
