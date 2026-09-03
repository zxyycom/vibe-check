---
title: "Lizard Python 与 TypeScript analyzer 性能对照"
formedAt: "2026-09-03T05:55:17Z"
question: "固定 Lizard 1.24、输出相等和已声明 Linux scope 下的 Python/Lizard、TypeScript port 与 historical Product 性能证据是否授权优化？"
tags:
  - "function-metrics"
  - "lizard"
  - "performance"
  - "source-alignment"
relations:
  - type: "补充"
    target: "compare-lizard-and-scc-typescript-port-priority.md"
---

## 形成时背景

**先读结论和授权边界。** 本报告只形成性能证据，**不授权任何优化**。本 Change 不修改 source-aligned `analyzer/**` 的 core、readers、shared 或 extension protocol，也没有实施 Product 优化。当前证据不能把观察到的差异因果归属给 translated core 或 Product 外围；因此不应据此修改任一层。

同一“Python 对 TypeScript”问题在不同 scope 下得到不同结果，不能合并成一个语言结论：

| 对照层和 workload | 回答的问题 | wall 结论 | 不可外推的边界 |
| --- | --- | --- | --- |
| A：historical Product，160-byte TS/JS corpus | 迁移前后完整 Product invocation | current TypeScript 在 cold 与 warmed-operation 均为 `typescript-faster` | 包含 Lizard 1.23→1.24、I/O、subprocess/Worker 与 Product 边界变化，不隔离 analyzer cost |
| B：fixed Lizard 1.24，tiny cold-start | 极小输入的 fresh-runtime startup | `typescript-faster` | startup-dominated，不能代表吞吐 |
| B：fixed Lizard 1.24，27 reader-family representative batch | 已解码 analyzer/port cost | Python 在 cold 与 warmed-operation 均为 `python-faster` | 不含 Product read/decode、Worker、CLI/CSV 与 Product settlement |
| C：current Product decomposition | current path 的诊断定位 | 无跨语言结论 | stage 时间重叠，只能按记录的 mechanical difference 解释 |

本报告补充[此前迁移优先级调查](compare-lizard-and-scc-typescript-port-priority.md)当时“未建立正式 latency/memory/cold-start benchmark”的边界。A 使用 exact historical parent `853b30eaaa1a0545edf24b3622a5245d16c94a63` 的 public Product + Lizard 1.23 CLI contract：raw preflight 记录 worktree HEAD 同为该 commit、显式 `scanner.executable` 为 `/home/dev/.local/share/mise/installs/pipx-lizard/1.23.0/lizard/bin/lizard`，实际 `--version` 为 `1.23.0`。B 使用 fixed upstream Lizard 1.24 source commit `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec` 的 Python API/TypeScript port 对照；C 只记录 current diagnostics。三层回答不同问题，不能彼此替代。Product 未重新引入 Python/Lizard runtime、subprocess、CSV 或 fallback。

A 的 mise pin 未提供 bit-for-bit Python/Pygments/PathSpec provenance。因此 A 是已核对的 historical Product + Lizard 1.23 CLI contract reconstruction，**不是**完整 historical Python environment reproduction。

### 当前阅读导航（不属于形成时证据）

- **本报告的 evidence owner：**A historical Product、B fixed-1.24 analyzer-only、C current Product decomposition 的 workload、计时规则、output admission 与形成时解释；机器样本由本报告的随附资源拥有。
- **直接前序：**frontmatter 的 `补充 → compare-lizard-and-scc-typescript-port-priority.md`；它只补足此前缺少的正式性能证据，并不把该前序改写为本报告的 measurement owner。
- **已确认 / 推断 / 未知：**已确认的 output guard 与 wall-time 分类见“已确认的输出前置条件”和“wall-time 观察”；因果归属仍未知，故“后续实施边界”不是优化授权。
- **不能比较或相减：**A、B、C 的数值不得横向相减、相加或用一层的方向解释另一层；尤其 C stage 记录有重叠，CPU/RSS 与 long-lived session 也不在可比范围。
- **形成时建议（不是当前状态）：**若要选择优化层，先用与目标层相同的 workload/profile 取得因果证据；本报告本身只提供该调查入口，不授权改动。
- **当前状态 owner：**本轮已停止进一步性能实现；本报告的形成时调查入口不应触发新工作。当前关闭状态由[最新综合调查](compare-lizard-regex-backends-and-analyzer-cost-allocation.md)拥有。

## 调查目的

本轮形成可复核的 evidence，以回答下列问题，而不是选择优化方案：

1. A、B、C 是否均先满足所需 output equality，且每一个计数样本保持该条件？
2. 160-byte tiny startup、27 reader-family representative batch 和 historical Product end-to-end 分别显示什么 wall-time 结果？
3. cold、`warmed-operation`、Linux CPU/RSS scope 与 C decomposition 的可比边界是什么？
4. 现有 evidence 是否直接授权 Product-owned 外围修复或 source-aligned port 优化？

## 调查范围与依据

### 对照层与输入

- **A — historical Product end-to-end：** historical public Product 与 current public Product 对 byte-identical fixture roots 的完整 invocation。它回答迁移成本，不宣称 fixed-1.24 analyzer parity。
- **B — fixed Lizard 1.24 analyzer-only：** fixed upstream Python Lizard 1.24 API 与 current private port harness 均接收同一已解码 `{path, source}`。canonical equality 只比较 Product 消费的 file、name、location、NLOC、CCN 与 parameter fields，stable-sort 后产生 digest。它不测 discovery、bytes/decode、Python CLI/CSV、Worker 或 Product settlement。
- **C — current Product decomposition：** normal Product output 及 read/decode、direct port-façade harness、Worker diagnostics。它只用于定位 current scope；total/read/decode/direct harness 有重叠，不能将它们相加或与 A/B 互代。

B 的 tiny workload 是 2 个 TS/JS 文件、160 bytes。B representative batch 是 27 reader-family representative fixtures 的 normal+edge（不含 malformed）各复制 64 次：3,456 virtual files、316,160 bytes、3,456 functions。A/C 使用 TS/JS intersection。每个 full run 使用 deterministic 15 ABBA blocks、每 side 30 raw samples；IQR outlier 仅标记，不删除；10,000 deterministic bootstrap 的 ratio 固定为 Python ÷ TypeScript。任何 output drift 都 fail closed。

### 计时、资源与解释规则

- **cold：**统计选择 supervisor 的 whole-fresh-target `observedWallMs`。
- **`warmed-operation`：**每个 fresh target 先执行一次未计入的同进程操作，driver 再计时第二次 `operationWallMs`。它不是 long-lived session。whole-target CPU/RSS 只保留为 session diagnostic，不能当作 per-operation resource。
- **资源 scope：**Linux `wait4` CPU 是 target 加其 reaped descendants；RSS 是 single-process maximum（KiB→bytes），不是 tree aggregate。parent/child fixture 已验证标签，但 CPU/RSS 的跨条件优劣仍为 `not-comparable`。
- **统计分类：**CI 全在 `[0.95, 1.05]` 下方且 Python p90 更低才是 `python-faster`；全在上方且 TypeScript p90 更低才是 `typescript-faster`；CI 完全落在 band 内才是 `no-material-stable-difference`；其他重叠或冲突是 `inconclusive`。5% band 只是本次证据分类规则，不是 Product budget、SLO 或 Gate policy。
- **C 的唯一机械差分：**同一次 Worker roundtrip 可减去其内部 adapter+port duration；adapter mapping 无法单独隔离时记录为 `null`。这不构成 hotspot 的因果归属。

B evidence 同时记录 ephemeral Python 3.12.13、Pygments 2.18 RECORD hash、uv 和 source commit；provision 不计样本且 runtime 在结束时清理。

## 调查结果与边界

### 已确认的输出前置条件

A 的 historical/current preflight snapshot digest 均为 `58465d0c049f56dfc4bcdcc2915b528c080f95c50639b638437e60ad49410026`。B tiny 两边 digest 均为 `11ef66c0dd52afbf46123c17344f0ef080519899cb83a05e96f34bc061d3dfe0`；B representative 两边 digest 均为 `cdb07113214d24a7526318363223f730c7358be9dac2a66e4d648eef6e0b4b7d`。C 的 30 个 samples 保持 normal digest `11ef66c0…d3fe0`。这些 digest 是各自 layer/workload 内的 admission 条件，**不是**层间 output equivalence 声明。

### wall-time 观察

| Layer / workload / temperature | Python median / p90 | TypeScript median / p90 | Python ÷ TypeScript 95% CI | 分类与正确解释 |
| --- | ---: | ---: | ---: | --- |
| A historical Product / cold | 442.66 / 458.60 ms | 328.87 / 342.17 ms | [1.3386, 1.3643] | `typescript-faster`；仅该完整迁移 condition 的 wall-only 结论 |
| A historical Product / warmed-operation | 185.96 / 215.39 ms | 86.32 / 94.34 ms | [2.1318, 2.2830] | `typescript-faster`；driver-timed operation，不是 long-lived/resource 结论 |
| B tiny cold-start / cold | 63.40 / 89.87 ms | 34.94 / 75.42 ms | [1.5899, 1.8278] | `typescript-faster`；startup-dominated，不能外推到 representative throughput |
| B representative batch / cold | 355.42 / 409.18 ms | 841.19 / 951.57 ms | [0.4165, 0.4281] | `python-faster`；fixed-1.24 analyzer-only 的 wall-only 结论 |
| B tiny / warmed-operation | 0.136 / 0.184 ms | 0.843 / 1.115 ms | [0.1575, 0.1727] | `python-faster`；named operation-wall observation |
| B representative batch / warmed-operation | 262.44 / 271.55 ms | 632.22 / 683.59 ms | [0.4130, 0.4248] | `python-faster`；named operation-wall observation |

**综合结论：**scope 会翻转方向。tiny cold 的 TypeScript 更快不代表 representative analyzer throughput；B representative 的 Python 更快不代表 historical/current Product invocation；A 的 current TypeScript 更快也不证明 translated core 更快。CPU/RSS 结论均为 `not-comparable`，long-lived warm session 未覆盖，且结果不跨 host、runtime version、workload 或 Product layer 泛化。

### 后续实施边界

当前没有 evidence 把差异因果归属到 translated core 或 Product 外围，因而本报告**不授权优化**。未来只有 profile 直接指向 Product-owned read/decode、Worker lifecycle/transfer、adapter 或 measurement glue 时，才可实施最小外围修复，并以同一 manifest、host 和 protocol 取得 before/after raw evidence。若 profile 需要深入 source-aligned port，本 Change 只记录 profile、source-alignment/provenance risk 与候选方向；是否修改必须另开 Investigation Report，并由独立 Decision/Change 授权。

原始 `evidence.json` 是 machine-readable samples、environment、scope 和派生统计的事实来源；`summary.md` 只是其生成的定位摘要。本报告是本轮 human conclusion/interpretation owner，不能用 raw summary 替代上述 scope、比较规则或授权边界。

## 随附资源

- [a-historical-product-full/evidence.json](./_resources/compare-lizard-python-typescript-performance/a-historical-product-full/evidence.json)
- [a-historical-product-full/historical-product-request.json](./_resources/compare-lizard-python-typescript-performance/a-historical-product-full/historical-product-request.json)
- [a-historical-product-full/summary.md](./_resources/compare-lizard-python-typescript-performance/a-historical-product-full/summary.md)
- [a-historical-product-warmed-operation-full/evidence.json](./_resources/compare-lizard-python-typescript-performance/a-historical-product-warmed-operation-full/evidence.json)
- [a-historical-product-warmed-operation-full/historical-product-request.json](./_resources/compare-lizard-python-typescript-performance/a-historical-product-warmed-operation-full/historical-product-request.json)
- [a-historical-product-warmed-operation-full/summary.md](./_resources/compare-lizard-python-typescript-performance/a-historical-product-warmed-operation-full/summary.md)
- [b-fixed-lizard-1.24-full/evidence.json](./_resources/compare-lizard-python-typescript-performance/b-fixed-lizard-1.24-full/evidence.json)
- [b-fixed-lizard-1.24-full/representative-batch-request.json](./_resources/compare-lizard-python-typescript-performance/b-fixed-lizard-1.24-full/representative-batch-request.json)
- [b-fixed-lizard-1.24-full/summary.md](./_resources/compare-lizard-python-typescript-performance/b-fixed-lizard-1.24-full/summary.md)
- [b-fixed-lizard-1.24-full/tiny-cold-start-request.json](./_resources/compare-lizard-python-typescript-performance/b-fixed-lizard-1.24-full/tiny-cold-start-request.json)
- [b-fixed-lizard-1.24-warmed-operation-full/evidence.json](./_resources/compare-lizard-python-typescript-performance/b-fixed-lizard-1.24-warmed-operation-full/evidence.json)
- [b-fixed-lizard-1.24-warmed-operation-full/representative-batch-request.json](./_resources/compare-lizard-python-typescript-performance/b-fixed-lizard-1.24-warmed-operation-full/representative-batch-request.json)
- [b-fixed-lizard-1.24-warmed-operation-full/summary.md](./_resources/compare-lizard-python-typescript-performance/b-fixed-lizard-1.24-warmed-operation-full/summary.md)
- [b-fixed-lizard-1.24-warmed-operation-full/tiny-cold-start-request.json](./_resources/compare-lizard-python-typescript-performance/b-fixed-lizard-1.24-warmed-operation-full/tiny-cold-start-request.json)
- [c-current-product-full/current-decomposition-request.json](./_resources/compare-lizard-python-typescript-performance/c-current-product-full/current-decomposition-request.json)
- [c-current-product-full/evidence.json](./_resources/compare-lizard-python-typescript-performance/c-current-product-full/evidence.json)
- [c-current-product-full/summary.md](./_resources/compare-lizard-python-typescript-performance/c-current-product-full/summary.md)
