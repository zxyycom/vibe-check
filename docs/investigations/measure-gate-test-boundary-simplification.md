---
title: "实测 Gate 测试边界简化与验收频率取舍"
id: "261024-measure-gate-test-boundary-simplification"
formedAt: "2026-10-24T04:26:50Z"
question: "测试降层与日常验收频率调整后，哪些成本下降，完整 Gate 是否仍被原性能预算阻断？"
tags:
  - "performance"
  - "project-gate"
  - "resource-contention"
  - "test-execution"
relations:
  - type: "补充"
    target: "261024-recheck-consumer-types-contention"
    summary: "保留竞争归因边界并实测测试降层与验收频率取舍"
---

## 形成时背景

用户要求按真实证明责任简化 Gate：先移除目录组织与构建源码写法锁，再降低 package、Git、时序及
function metrics 测试的不必要层级和输入规模，最后区分日常、发布与显式执行。约束是保留公开 API、
function-metrics / duplicate-detection / markdown-lint / file-metrics 四项扫描、生产默认限额及原性能预算，
不靠拆 Check、增加 runner 或放宽 waiver 过线。

[前序 consumer-types 调查](./recheck-consumer-types-contention.md)保留了并发放大和旧内存压力的证据，
但没有闭合约 15 秒慢样本的根因，也明确区分“仅发布前运行 types”的频率取舍与性能修复。
本轮在授权实施这些测试边界和频率变化后建立 before / 失败 V1 / 修正后 V2；新输入和新问题需要单独复核，
因此独立成篇，以“补充”承接前序，不改写其结果或宣称解决了 15 秒根因。

**V2 四组局部两次均值均低于前测；routine all 的 41 项功能全部通过，但原 mean / P95 预算仍失败，最终 exit 1。**
43→41 是验收频率政策变化，不能把整体变化全部称为同 workload 的执行优化。首次 V1 的三条质量 Finding
也完整保留，不能以 V2 取代失败现场。

## 调查目的

回答已实施的测试降层、规模调整和频率选择在本轮实际条件下产生什么结果：局部执行成本是否下降，
routine all 是否满足未改变的预算，types / workbench 的显式入口是否仍可完成正确性验收。
本轮不优化类型系统或 scheduler、不修改系统配额、不清缓存、不删除四项扫描，也不以失败重试取最快值。

## 调查范围与依据

### 已实施的边界与取舍

1. **Layout：** 删除退休目录、额外 index、Gate 固定目录形状和构建源码正则锁；组织约定转由 owner / Manual CR
   承接。保留 import 依赖边界、实际 repository 扫描与 package-tools/Core 校验；负向矩阵降为内存分析，
   少量文件系统测试证明真实 caller 接线。这既有执行降层，也有用户授权删除的自动义务，不是原证明范围完全不变。
2. **Package：** 路径重叠直接测路径入口；指纹与 compiler-cache 使用最小材料和私有工具链身份注入；
   文档 guard 直接调用实际 caller 共用入口，保留无 fallback 的证明。真实 artifact 与 installed docs/runtime
   验收仍在 routine all，不用 mock 替代完整正向安装边界。
3. **Git / 时序 / 容量：** 减少三处真实 Git 初始化，逻辑分类在窄层证明，保留代表性真实 Git fixture；
   barrier 与已有可控 clock 代替无关等待。function metrics 用私有小容量策略测等值、+1、累计及 chunk 边界，
   同一生产读取路径仍保留 8 / 64 MiB 默认值；取消协议不再搭配无关巨型文本。真实 timer/I/O/Worker 资格测试保留，
   其中为真实 event-loop 让步而保留的 8 MiB 输入不是容量边界证明，不声称所有大输入均已移除。
4. **Gate 资格与命名：** 既有 Check 按真实职责更名；完整 manifest 仍为 43 项，没有为改善 mean / P95 拆 Check。
   fast / changed / routine all 不自动运行 consumer types 或 admission workbench；types 由正式 receipt + all
   或明确 `--consumer-types` 选择，workbench 仅 `--admission-workbench`。实体与 Case 不随自动选择移出而删除。
   原 root maxParallel 3、test runner / scan budget、lint mutex 与性能预算保持不变。

这些是实施后的测量条件，不是由本报告新增的规范；当前规则由 Project Gate、package、架构和测试 owner 拥有。
实现与独立复核在测量前完成；V1 暴露的局部验证遗漏按下文修正后才冻结 V2。

### 输入、时点与准备阶段

所有测量在 `main`、HEAD `d15cbf6f34499fa3027ed6c99d0508436add740f` 上保留已有未提交工作，
通过 mise 固定 Bun **1.3.14**、Node 24.18.0、pnpm 11.1.3、uv 0.11.28。
实施过程中部分早期普通验证使用过默认 PATH 的另一 Bun，不能与本表混为性能样本。
工具二进制及 compiler 摘要、命令、文件清单、source / dirty / candidate 快照见随附资源及其指向的原始证据。

| 轮次，2026-10-24 UTC | source 项数 / 清单 SHA-256 前缀 | Candidate 与准备                                      |
| -------------------- | ------------------------------- | ----------------------------------------------------- |
| Before，03:41–03:43  | 3,395 / `ed8bec8514e6`          | `11aaf5e2c0fd`，reuse / installation-current          |
| V1，04:13–04:15      | 3,403 / `ba685b9ab550`          | rebuild / receipt-input-mismatch，生成 `e8ae7bc9545c` |
| V2，04:20–04:22      | 3,403 / `97be13a12cea`          | `e8ae7bc9545c`，reuse / installation-current          |

Before 的 initial / post-Gate / final，V1 的 initial / post-Gate，以及 V2 的 initial / post-Gate / final /
after-focused 各自 source、dirty status、HEAD、branch、工具均相同。V1 的 candidate 因正常 owner rebuild 改变；
Before 与 V2 各自 candidate 清单不变，但两轮 artifact 不是同一份。完整 SHA-256、身份时点及候选摘要在资源内。

每个 before / after 版本只运行一次 `mise exec -- bun run check -- --all`。
Before 和 V2 均随后串行执行两轮 layout → package tooling → function metrics → 四文件 Git/timer；
局部命令为 mise-bound Bun 的 `test <owner 完整有序 files> --reporter=dots`，不是另跑全仓 suite。
比较键 `packageSupporting` 在 V2 映射到 owner 的 `packageTooling`；四组精确文件清单均与 Before 相同。
V1 发现功能失败后停止，未运行其局部或 focused 工作；修正后使用新 source 身份另行授权 V2。
V2 两轮局部之后再分别执行一次 `--consumer-types`、`--admission-workbench`，不混入 routine 对比。

### 环境、方法与资源保真

每项开始前检查 2 秒：无可见非本轮进程消耗超过 500 ms CPU 才开始，最多等待 30 个窗口。
V1 的外部活动自然结束后第 6 个窗口满足条件；Before 第二轮 function metrics 前等待 3 个窗口；
V2 所有项均第 1 个窗口满足。未停止他人进程、调整阈值、配额或人为制造压力。
quiet 只是启动条件，不能保证之后没有外部工作。

运行中约每 200 ms 采样数值 `/proc` 与共享 cgroup；约每 10 ms 用 wait4 观察退出。
Command wall、user/system、RSS HWM 与 Gate adapter / Check execution 是不同计时边界；
wait4 CPU 包含已回收子进程，RSS HWM 不是同时占用的整棵进程树内存。
自然缓存未清理；两次局部样本只报告原值和算术均值，不计算“稳定 P95”或取最快值。

资源从三个本地汇总、命令清单与身份快照节选：保留原数值、所有局部文件列表、身份摘要、V1 Finding、
Check identity 对应和关键压力计数，去掉重复命令、巨型文件清单与原始采样，不复制日志、node_modules 或完整测试正文。
原始 64 份 before / after 测试正文及 11 份变化 patch 留在本地证据中，测试数量相同不等于断言范围未变。

## 调查结果与边界

### V1：首次失败不能隐藏

V1 routine all 完整结束：**39 passed / 2 failed / 2 not-applicable，exit 1**，command wall **53.725 s**。
两个失败 Check 共有三条阻断 Finding：

| Check            | 对象                                                                                   | 实际 / 原上限        |
| ---------------- | -------------------------------------------------------------------------------------- | -------------------- |
| file-metrics     | `src/project-run/invocation/learned-scheduling.test.ts`                                | code lines 305 / 300 |
| function-metrics | `scripts/validation/module-specifier-analysis.ts` 的 `analyzeModuleSpecifiers`         | CCN 11 / 10          |
| function-metrics | `scripts/project/gate/runtime/entries.ts` 的 `validateProjectGateObservationSelection` | CCN 13 / 10          |

因初始功能结果失败，adapter 明确 **未评估性能预算**，也未输出精确 candidate-preparation / Product-Run phase timing。
保留其 core terminal elapsed 33.146 s 作为另一诊断边界，不能从 53.725 s 相减伪造精确 preparation。
资源内从 core rounded Check facts 派生的 mean 2.023 s / P95 5.143 s 只是诊断，不是一次预算评估。

最小修正由原实施者完成并独立复核：learned 两个同构 fixture 合为数据表，断言保留，code lines 296；
import / re-export 共用边提取并显式区分 type/value 语法，主函数 CCN 9；Gate 用三行 policy 包含关系表代替条件重复，
CCN 10，既有测试实体独立断言九对 policy 真值。未调整限额、waiver、runner 或预算。
V2 是这些功能修正后的新输入验证，不是对失败输入重试取绿；V1 原始现场保持不变。

### V2：功能恢复，原性能预算仍阻断

| 同口径指标                     |      Before |                          V2 |            原预算 |
| ------------------------------ | ----------: | --------------------------: | ----------------: |
| 定义 / 执行 Check 数           |     43 / 43 |                     43 / 41 |    未改变分组数量 |
| 功能结果                       |   43 passed | 41 passed，2 not-applicable | 有效选择全 passed |
| Command wall                   |    37.431 s |                    31.698 s |  非 Gate 预算口径 |
| Candidate preparation          |     0.180 s |                     0.193 s |    包含在总预算内 |
| Adapter/setup                  |     0.536 s |                     0.511 s |    包含在总预算内 |
| Product Run                    |    35.999 s |                    30.663 s |    总预算中的一段 |
| Elapsed-to-initial-result      |    36.715 s |                    31.366 s |              90 s |
| 已执行 Check mean              |     2.276 s |                     2.024 s |               2 s |
| 已执行 Check P95，nearest-rank |     6.053 s |                     5.565 s |               5 s |
| 最终 exit                      | 1，性能失败 |                 1，性能失败 |                 — |

V2 的四项扫描、artifact、installed docs/runtime 与其它有效 routine 检查均通过；API/默认值约束由实际包验收、
相邻测试及独立实施审查共同承接。较低 wall 与 Product Run 不等于性能验收已完成。
本次最慢三项为 consumer provider **7.912 s**、Gate tooling tests **6.455 s**、function-metrics 扫描 **5.565 s**。
未为这些结果再调度或重跑，也未以拆 Check 改善统计。

43→41 排除了 Before 的 types **7.048 s** 与 workbench **5.237 s**，首先是少做两项自动工作。
只按真实职责 rename 对应共同 41 项后，其累计 execution 为 **85.580→82.991 s**，mean 为 **2.087→2.024 s**，
P95 为 **5.860→5.565 s**。这只去除了统计分母 / 成员差异，源码、测试、执行重叠、自然缓存与共享环境仍不同；
不能将该匹配子集称为因果隔离、把删除两项的 duration 当作可直接扣除的 wall，或承诺固定加速倍率。

### 局部两轮：成本下降，但目的与规模差异必须一起读

以下均为直接 Bun 进程 wall，所有样本 exit 0；百分比基于两次算术均值，非多轮稳定性能结论。

| 组，前后 files 数              |      Before 两次 / 均值 |          V2 两次 / 均值 | 均值变化 | 测试数 Before→V2 |
| ------------------------------ | ----------------------: | ----------------------: | -------: | ---------------: |
| Repository layout，1           | 2.941 / 2.320 / 2.630 s | 1.768 / 2.051 / 1.909 s |   −27.4% |              1→2 |
| Package supporting→tooling，20 | 2.741 / 2.531 / 2.636 s | 1.580 / 1.599 / 1.590 s |   −39.7% |            36→36 |
| Function metrics 行为，39      | 2.247 / 2.574 / 2.410 s | 1.724 / 2.312 / 2.018 s |   −16.3% |          113→113 |
| Git/timer，4                   | 0.893 / 1.124 / 1.009 s | 0.630 / 0.731 / 0.680 s |   −32.6% |            18→18 |

Layout 同一 Check 内将真实接线与内存矩阵分成两个测试实体，并移除了已退休的自动组织 / 写法义务；
该 27.4% 不能全称为保留原覆盖的算法优化。Package 保留真实正向验收，而错误路径 / 指纹测试降低调用层级；
Git/timer 保留目的但减少真实初始化和无关等待；function metrics 保留私有策略可控的边界判定，缩小逻辑容量。
这些是不同层级、规模或频率的工程取舍；相同文件或测试数量本身不能证明义务完全等价。

### Focused 正确性与共享资源压力

两项在 V2 routine / local 结束后独立计量，各只执行一次：

- `mise exec -- bun run check -- --consumer-types`：wall **8.620 s**，3 passed / 40 not-applicable，exit 0。
  选中 prepared candidate、external consumer provider 与 installed types，实际类型验收通过。
- `mise exec -- bun run check -- --admission-workbench`：wall **5.828 s**，1 passed / 42 not-applicable，exit 0。
  workbench 显式入口通过，不反向加入 routine。focused policy 不评估性能预算，也不输出上述 adapter phase timing。

容器仍为 4 CPU / 6 GiB。Before / V2 routine 均采样到约 6 GiB 峰值；max events 增量 **603 / 605**，
direct reclaim scan **41,338 / 80,828 页**，CPU throttled **16.120 / 13.931 s**，memory PSI full **0.890 / 0.214 s**。
V1 rebuild + Run 整个 command 窗口则为 max events +5,031、direct scan 234,273 页，不能贴到某个 Check 上。
局部八项 V2 均无 max events 或 memory PSI full 增量。

启动前 quiet 不保证后续独占：采样到的非本轮 CPU Before / V2 routine 为 **5.290 / 2.860 s**，
两个 focused 为 **7.930 / 3.840 s**；types focused 另有 max events +2,163、memory PSI full 0.282 s。
这些共享计数不能逐进程分账，也不能排除短进程或宿主竞争；focused 只支持正确性结论，不能当作 types 隔离性能样本。
本轮没有重新复现、排除或解释前序 15 秒根因。

### 实际交付与未覆盖边界

本轮测量证明新 routine 选择、保留扫描及安装验收在 V2 输入上功能通过，并观察到局部成本降低；
**原完整 Gate 性能阻断仍未解除**。若继续处理性能，须另以明确 workload / baseline 验证，不把统计分母调整当作修复。
本轮未运行正式 release receipt、release prepare / verify、发布分支或远端写入；focused types 不替代同一正式 receipt 的发布证据。

测量 worker 未修改实施源码或 owner；报告只新增本文、精简资源和派生索引，不提交或暂存。
报告及之后的 owner / Decision / Change 收尾不属于 V2 测量输入，不能声称它们已经由该次 Gate 验证。
原始辅助材料分别保留在 ignored `.log/gate-test-boundary-before-20261024-Tz7JLO/`、
`.log/gate-test-boundary-after-20261024-cVxbnt/`、`.log/gate-test-boundary-after-v2-20261024-QEjJJn/`；
各自 ARTIFACT-NOTE 说明来源、归宿和精确清理边界。本轮不删除它们或旧报告。

## 随附资源

- [三轮身份、命令与精简测量对比](./_resources/261024-measure-gate-test-boundary-simplification/measurements.json)
