---
title: "函数指标未闭合输入的性能退化与取消边界调查"
id: "261012-audit-function-metrics-pathological-input-cost"
formedAt: "2026-10-12T09:44:01Z"
question: "在当前源码公开 API 中，极小未闭合模板和重复注释起点为何产生显著耗时增长，现有输入上限与取消机制分别能约束什么？"
tags:
  - "algorithmic-complexity"
  - "cancellation"
  - "function-metrics"
  - "performance"
  - "source-alignment"
relations: []
---

## 形成时背景

**Bun 1.3.14 上，81 字节未闭合 TS 模板的完整 Run 中位耗时约 216 ms；97 字节模板触发调用方的 1 秒取消。**
很小的输入已出现明显计算开销，问题跨越 tokenizer、Worker 和输入资源边界，依
[复杂 Bug 沉淀规则](../governance/knowledge-maintenance.md#复杂或严重-bug-的自动调查沉淀)保存。

本篇承接未闭合输入专题；整体覆盖见[算法复杂度复查](review-product-algorithmic-complexity.md)与
[性能基线](measure-product-performance-baseline.md)。既有[regex 成本调查](explain-cpython-jsc-lizard-regex-performance-gap.md)
研究正常语料的运行时差距，属于另一问题。

## 调查目的

确认两类未闭合输入的耗时增长，解释候选机制，并区分字节上限、Worker 隔离和调用方取消各自约束的对象。

## 调查范围与依据

取证日期为 2026-10-12，源码 `5cb448b23453edc90e02b25d003efd57dcdd3509`；
实际运行时为 mise 锁定 Bun 1.3.14，原始 Node/V8 字段为兼容信息。
宿主为 Linux `6.18.33.2-microsoft-standard-WSL2`、x86_64、AMD Ryzen AI 7 H 450，可见 6 个逻辑 CPU。

| 测量项 | 条件 |
| --- | --- |
| 入口 | `src/index.ts` 的 `defineConfig`、`functionMetrics`、`run`；源码 API，取证时候选包 stale / rebuild，安装包／Gate 未测 |
| 配置 | 单文件、`findingPolicy: "non-blocking"`、根并发 1；machine、progress、diagnostic 输出关闭 |
| 样本 | 每档 6 次，首轮预热，取后 5 次墙钟中位数；外层进程重复调用，每次新建 Worker |
| 窗口 | 完整 `await run(...)`，文件准备和 Definition 构造在计时外 |
| 取消 | 每次 `AbortSignal.timeout(1000)`，按 Run 返回顺序串行；无外部进程硬超时，Worker 物理退出时间未观测 |

| 输入 | 文件 | 构造 | 字节数 |
| --- | --- | --- | --- |
| 未闭合 TS 模板 | `input.ts` | 反引号拼接 `'${x}'.repeat(N)` | `1 + 4N` |
| 未闭合 C 注释 | `input.c` | `'/* '.repeat(N)` | `3N` |

两类输入均在 Check 接受的文件类型与字节范围内，但语法未闭合。关键依据为：

- [TS reader](../../src/package-checks/function-metrics/analyzer/readers/typescript.ts)：第 15 行模板规则，第 84–85 行接入共享 tokenizer；TSX 复用该规则。
- [共享 reader](../../src/package-checks/function-metrics/analyzer/shared/code-reader.ts)：第 543–566 行组合注释、语言扩展与回退分支，以 `matchAll` 消费。
- [Worker port](../../src/package-checks/function-metrics/analyzer-worker-port.ts)：第 63–102 行处理响应／错误／退出／取消；第 44–46 行请求终止而不等待物理退出，无内建 deadline。
- [Check 契约](../checks/function-metrics.md#工作原理)：启发式指标分析；[输入上限](../checks/function-metrics.md#参数与默认配置)为单文件 8 MiB、合计 64 MiB。

## 调查结果与边界

### 完成耗时与取消返回时间

| 输入 | N | 字节 | Run 墙钟中位数 | 后 5 次结果 |
| --- | ---: | ---: | ---: | --- |
| TS 模板 | 8 | 33 | 19.14 ms | 5/5 `completed` |
| TS 模板 | 12 | 49 | 20.68 ms | 5/5 `completed` |
| TS 模板 | 16 | 65 | 32.05 ms | 5/5 `completed` |
| TS 模板 | 20 | 81 | 216.34 ms | 5/5 `completed` |
| TS 模板 | 24 | 97 | 1002.25 ms（取消） | 5/5 `cancelled` |
| C 注释 | 1000 | 3000 | 29.91 ms | 5/5 `completed` |
| C 注释 | 2000 | 6000 | 49.82 ms | 5/5 `completed` |
| C 注释 | 4000 | 12000 | 128.94 ms | 5/5 `completed` |
| C 注释 | 8000 | 24000 | 426.89 ms | 5/5 `completed` |
| C 注释 | 16000 | 48000 | 1002.77 ms（取消） | 5/5 `cancelled` |

`completed` 行是完整 Run 耗时，Check 均 passed；指标结果与语法合法性分别判断。
`cancelled` 行仅记录调用方取消后的返回时间，正常完成耗时未知，不能用于完成时间拟合或解释为 Product 内建 timeout／输入上限触发。

### 机制与保护边界

1. **模板组合回溯**：`${x}` 同时可由插值分支整段消费或一般字符分支逐字符消费；缺少末尾反引号时，
   传统深度优先回溯模型有指数级候选拆分路径。
2. **注释后缀重复搜索**：每个 `/*` 都寻找缺失的 `*/`，失败后继续下一个起点；常规扫描模型下，
   累计后缀长度二次增长，输出 token 数仍随输入线性增长。

源码推导与实测超线性增长相符，精确引擎操作量仍待剖析；TSX 的结论限于共享规则，运行样本只有 TS 和 C。
字节限制约束输入量，两组样本远低于上限，仍发生耗时退化。调用方取消使 Run 约 1 秒返回，Worker 的实际停止时点待观测。

CPU/RSS 仅为进程级诊断：模板 N=24 后 5 次 CPU 约为墙钟两倍。transport 不等待线程退出，
相邻 Worker 重叠是候选解释；单 Worker 成本、保留内存和终止行为尚未隔离。
适用范围限定本基线、Bun 1.3.14 和两类合成未闭合输入；真实频率、合法输入对照、其它运行时／reader、
无取消完成时间及峰值内存仍待取证。产品实现保持原样。
Tokenizer 的来源对齐与维护边界见 [scanner owner](../development/scanner-dependencies.md#package-maintenance-evidence)。

### 复核与有界复测

JSON 保存各次样本和运行时。`scaling.ts` 为原样历史 helper，另含本篇未使用的 scheduler 分支。
复测副本须放在仓库 `tmp/<独占目录>/scaling.ts`，使相对 import 指向源码入口：

```sh
mise exec -- bun run tmp/<独占目录>/scaling.ts template
mise exec -- bun run tmp/<独占目录>/scaling.ts comment
```

脚本会覆盖该独占目录内的 fixture 与结果；复测应保持输入上界，并补充外部进程超时和 Worker 退出观察。

## 随附资源

- [C 注释输入原始样本](./_resources/261012-audit-function-metrics-pathological-input-cost/comment-scaling.json)
- [形成时测量 helper](./_resources/261012-audit-function-metrics-pathological-input-cost/scaling.ts)
- [TS 模板输入原始样本](./_resources/261012-audit-function-metrics-pathological-input-cost/template-scaling.json)
