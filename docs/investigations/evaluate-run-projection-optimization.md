---
title: "共同 Run 投影成本的等价优化验证"
id: "261012-evaluate-run-projection-optimization"
formedAt: "2026-10-12T14:41:43Z"
question: "调度边界的重复状态投影如何影响支持运行时的公开 Run，哪些局部优化能在保留调度与观察语义时获得稳定收益？"
tags:
  - "algorithmic-complexity"
  - "performance"
  - "project-run"
relations:
  - type: "补充"
    target: "261012-profile-post-optimization-run-stages"
    summary: "补充支持运行时对照并验证循环投影优化"
---

## 形成时背景

前序 [Run 阶段调查](./profile-post-optimization-run-stages.md)在 Bun 1.3.14、P=1 的空 Check 公开 Run 中观察到大图调度循环主导，以 CPU profile 定位 snapshot/inspection/context 路径；当时没有 Node 对照。本轮于 2026-10-12 补充支持 Node 24.18.0、常规 P=4 的完整公开 Run 对照，并实施等价优化。

本轮结论：shell 已持有 immutable admission core，每轮仍创建未被消费的全态 snapshot；候选又被等值 map/freeze。消除这两处重复物化后，Node P=4、N=512 的 independent/chain 中位数分别降低 **17.4% / 16.4%**，两相邻对均同向。必要 core 扫描和观察事实保持。

## 调查目的

在最小 owner 内消除消费者不需要的重复工作，以完整公开 Run 而非私有 helper 微测证明收益。保持 hard guards、callback/measurement 前缀、过去 context 的冻结、声明顺序、取消/失败 drain 和完整终态；公开契约归[调度指南](../guides/scheduling.md)，内部责任归[Scheduler](../development/scheduler.md)及[Project Run](../development/project-run.md)。

## 调查范围与依据

- 基线 HEAD 为 `08c9166b85152168ca27d45452a4174afed50e57`。CodeGraph 与源码核对 shell、decision、admission candidate 的调用和消费边界；before/candidate 各 722 文件的冻结源码身份在测前、测后及归档一致，差异仅三个目标模块。
- Linux x64/WSL2；Node 24.18.0 为主，Bun 1.3.14 独立参考。独占窗口为 2026-10-12T14:50:52Z–14:52:42Z（110 秒），没有 profile 或重型测试混跑。宿主详情在窗口后采集，不构成 CPU 频率、GC 或进程隔离保证。
- 相同 shape/N/P/outputs/projectRoot，每 workload 用 ABBA 四个独立进程；每进程 3 次 warmup、9 次正式 samples。计时只包含完整 `await run`，import、Definition、warmup、断言和 IO 在外；慢样本保留。
- Node independent/chain 均取 N=32/128/512、P=4，以及 N=128/512、P=1；Bun 取两形状 N=128/512、P=4，共 56 进程。逐 Run 验证所有结果字段，仅将已核对有限非负的 Check duration 规范为标记，再跨进程比较 result/snapshot 签名与 declarative fingerprint。
- 操作计数、取消顺序探针和行为测试另开非计时阶段。所有性能数字属于 source API，不是 installed package 或 Gate 的性能值。

**2026-10-17 现场生命周期补记（非新增观测）：**正式 raw、差分覆盖、阶段测量和方法继续保留；原 METHODS 中“临时完整快照仍保留”只描述形成时现场，不承诺持续提供整棵源码或审查探针。
原资源中的路径继续作为形成时来源坐标；复测需要新授权及独占工作区，不保证旧临时命令在当前版本可执行。

## 调查结果与边界

### 冗余责任与采用方案

`scheduler.ts` 原先每轮复制并冻结 pending IDs、active scopes、running facts 和全部 settled 条目，再与已有 core 一起交给 `decideScheduler`。core 分支只消费 snapshot 的 abort/cancel 和取消时 pending IDs，其余 snapshot 被丢弃，随后仍由 core 构建完整 inspection。

最终三个模块采用以下调整：

1. shell 走 core + lifecycle facts 入口；完整 snapshot 入口继续服务 standalone/forced replay，两者共用同一 cycle 决策。
2. shell pending 数组只有保序删除，core inspection 按 graph 声明序过滤 pending，二者顺序相同；standalone 显式提供的 pending IDs 则保留原值，不从 core 覆盖。
3. `admissionCandidatesForCore` 已返回冻结的数组及 `{ canAdmit, task }` 元素，直接复用。公开 callback 仍由原 owner 创建冻结 DTO，未新增 identity 承诺。

这属于重复物化和常数成本消除，不是 R05 整体降阶。每轮 core inspection、candidate 查询仍扫描 N 个 Task，settled facts 和 blocker summary 继续履行原有完整性义务。

### 完整 Run 对照

56 进程及 runner 均 exit 0，stderr 为空；同 shape/N/P 的四进程 result/snapshot/fingerprint 一致。下表每侧合并两个进程的 18 个 samples，单位 ms，括号为 MAD；相邻对为 B0/C1 和 C2/B3，最后一列比较各进程 median。

| runtime/workload | before ms（MAD） | candidate ms（MAD） | median变化 | 两相邻对变化 |
| --- | ---: | ---: | ---: | --- |
| bun-chain-128-p4 | 37.750（2.484） | 31.194（1.847） | -17.4% | -16.0% / -19.7% |
| bun-chain-512-p4 | 366.125（4.381） | 267.069（7.523） | -27.1% | -28.3% / -26.2% |
| bun-independent-128-p4 | 53.853（2.625） | 42.068（1.300） | -21.9% | -22.3% / -22.5% |
| bun-independent-512-p4 | 645.070（20.164） | 473.323（5.105） | -26.6% | -27.0% / -26.7% |
| node-chain-128-p1 | 16.892（1.171） | 14.616（1.231） | -13.5% | -14.8% / -10.3% |
| node-chain-128-p4 | 18.170（3.029） | 14.662（1.295） | -19.3% | -6.6% / -18.4% |
| node-chain-32-p4 | 9.154（3.588） | 6.461（2.673） | -29.4% | -39.2% / -14.3% |
| node-chain-512-p1 | 114.196（1.542） | 95.793（0.914） | -16.1% | -16.2% / -16.7% |
| node-chain-512-p4 | 115.174（2.732） | 96.311（1.591） | -16.4% | -18.3% / -15.1% |
| node-independent-128-p1 | 20.992（1.171） | 18.236（0.966） | -13.1% | -15.2% / -4.9% |
| node-independent-128-p4 | 25.989（1.472） | 20.255（1.312） | -22.1% | -18.3% / -22.6% |
| node-independent-32-p4 | 7.476（1.476） | 6.107（1.305） | -18.3% | -6.6% / -33.7% |
| node-independent-512-p1 | 183.935（3.351） | 160.040（5.543） | -13.0% | -9.3% / -14.1% |
| node-independent-512-p4 | 196.472（3.862） | 162.311（2.383） | -17.4% | -21.8% / -16.2% |

Node P=4、N=512 两形状的相邻对均改善，支持本 workload 的收益。小 N 和 N=128 chain 两对差异较大，仍有 JIT/GC/共享宿主噪声；18 个 samples 不是 18 个独立宿主实验，不据此计算 p95、置信区间或显著性。两个局部消除作为整体候选计时，无法分配各自收益或 CPU 份额。空 Check 框架负载不能外推真实 IO/扫描、高并发长尾、learned 策略或消费者 SLA。

### 独立操作计数与顺序证明

另一轮 N=8/16/32、P=4 的公开 Run 用透明 `Object.freeze` 包装计数，未进入性能样本：

| 工作 | before | candidate |
| --- | --- | --- |
| shell snapshot 次数 | 18 / 34 / 66 | 1 / 1 / 1（初始化保留） |
| snapshot pending-ID 复制 | 54 / 230 / 966 | 8 / 16 / 32 |
| snapshot settled 条目复制 | 46 / 214 / 934 | 0 / 0 / 0 |
| candidate object freeze | 92 / 428 / 1868 | 46 / 214 / 934 |

直接 shell 探针使用三个非字典序 pending IDs，before/candidate 的 cancel-pending 有序 IDs、decision facts、drain 和完整 settlement 深等且冻结。standalone snapshot 刻意提供逆序 IDs，两侧均保留该精确顺序。计数和探针支撑静态归因，不代表全部 allocation 已消失，也不替代行为测试。

### 实施与交付验证

生产落实三个候选模块，并增强既有 `task-engine.settlement.test.ts` abort/drain 实体：分别断言 shell 声明序和 standalone supplied 逆序，保留完整 settlement 与 frozen 断言。`AUX-PARALLEL-RUNNER-001` 的证明目的连续，无新增 entity/Case。

`mise exec -- bun test ./src/project-run/task-scheduler ./src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts` 在 Bun 1.3.14 上通过 61/61 项、21 文件，覆盖 core、scope/resources、custom failure/hard guards、过去 context/measurement prefix、measurement attribution 和 Invocation prepared lifecycle。随后格式化的三个生产模块，经 TypeScript 类型擦除与 JS parser-contextual AST/叶 token 核对，与已测候选运行时内容一致；当前字节不冒称原测量 hash。

临时完整源码副本曾污染 Bun 的测试发现，已保留内容、模式和身份，移至同 owner 的 `node_modules/{before,candidate}` 隔离；之后完整 Test Evidence 重跑通过。没有修改 wrapper 或 Case 来绕过发现。历史 manifest/raw/脚本仍描述测量时路径，重跑需要恢复受控布局。

三项实现稳定后，同一 local candidate `0.0.0-local.15bfd8447e98` 经 required Gate（34 passed / 9 not-applicable）与 complete `--all`（43/43 passed）验收，均 exit 0；覆盖 Product/scripts 工程、入口/import boundary、Case 704/176/15、材料、artifact 和外部安装消费者 types/docs/真实 Node runtime。首次 Markdown Link 容量失败、Gate-owned 1500→2000 的收尾及最终非阻断耗时告警见[共享交付证据](./_resources/261012-evaluate-project-file-selection-optimization/delivery-verification.json)。这些结果证明本地组合验收，不是组合性能 A/B，也不证明所有 Node 源测试分支或真实用户负载。

### 后续辅助代码审查

辅助脚本整理后，以 56 份归档 raw 重算 summary，整对象与原汇总相等；另验证非法输入与 manifest 顺序。固定窗口 shell 在 IO 前拒绝参数，其窗口主体保持原字节并经独立语法/guard 检查，未重新执行。五份原始 helper 文本/hash 保存在 `helper-source-history.json`，历史 checksum 仍指原字节。当前 helper 的输入校验与此次统计复核不是新的性能样本，准备方法见随附 `METHODS.md`。

## 随附资源

- [统计复核、脚本身份与重跑准备](./_resources/261012-evaluate-run-projection-optimization/METHODS.md)
- [artifact-sha256.txt](./_resources/261012-evaluate-run-projection-optimization/artifact-sha256.txt)
- [before-source-manifest.json](./_resources/261012-evaluate-run-projection-optimization/before-source-manifest.json)
- [behavior-artifact-sha256.txt](./_resources/261012-evaluate-run-projection-optimization/behavior-artifact-sha256.txt)
- [behavior-validation.json](./_resources/261012-evaluate-run-projection-optimization/behavior-validation.json)
- [cancellation-probe.mjs](./_resources/261012-evaluate-run-projection-optimization/cancellation-probe.mjs)
- [candidate-source-manifest.json](./_resources/261012-evaluate-run-projection-optimization/candidate-source-manifest.json)
- [candidate.patch](./_resources/261012-evaluate-run-projection-optimization/candidate.patch)
- [count-projections.mjs](./_resources/261012-evaluate-run-projection-optimization/count-projections.mjs)
- [environment.json](./_resources/261012-evaluate-run-projection-optimization/environment.json)
- [形成时五份辅助脚本完整源码与hash](./_resources/261012-evaluate-run-projection-optimization/helper-source-history.json)
- [identity.json](./_resources/261012-evaluate-run-projection-optimization/identity.json)
- [implementation.patch](./_resources/261012-evaluate-run-projection-optimization/implementation.patch)
- [public-run.mjs](./_resources/261012-evaluate-run-projection-optimization/public-run.mjs)
- [raw/bun-chain-128-p4-0-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/bun-chain-128-p4-0-before.json)
- [raw/bun-chain-128-p4-1-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/bun-chain-128-p4-1-candidate.json)
- [raw/bun-chain-128-p4-2-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/bun-chain-128-p4-2-candidate.json)
- [raw/bun-chain-128-p4-3-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/bun-chain-128-p4-3-before.json)
- [raw/bun-chain-512-p4-0-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/bun-chain-512-p4-0-before.json)
- [raw/bun-chain-512-p4-1-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/bun-chain-512-p4-1-candidate.json)
- [raw/bun-chain-512-p4-2-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/bun-chain-512-p4-2-candidate.json)
- [raw/bun-chain-512-p4-3-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/bun-chain-512-p4-3-before.json)
- [raw/bun-independent-128-p4-0-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/bun-independent-128-p4-0-before.json)
- [raw/bun-independent-128-p4-1-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/bun-independent-128-p4-1-candidate.json)
- [raw/bun-independent-128-p4-2-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/bun-independent-128-p4-2-candidate.json)
- [raw/bun-independent-128-p4-3-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/bun-independent-128-p4-3-before.json)
- [raw/bun-independent-512-p4-0-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/bun-independent-512-p4-0-before.json)
- [raw/bun-independent-512-p4-1-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/bun-independent-512-p4-1-candidate.json)
- [raw/bun-independent-512-p4-2-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/bun-independent-512-p4-2-candidate.json)
- [raw/bun-independent-512-p4-3-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/bun-independent-512-p4-3-before.json)
- [raw/cancellation.json](./_resources/261012-evaluate-run-projection-optimization/raw/cancellation.json)
- [raw/count-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/count-before.json)
- [raw/count-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/count-candidate.json)
- [raw/node-chain-128-p1-0-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-128-p1-0-before.json)
- [raw/node-chain-128-p1-1-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-128-p1-1-candidate.json)
- [raw/node-chain-128-p1-2-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-128-p1-2-candidate.json)
- [raw/node-chain-128-p1-3-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-128-p1-3-before.json)
- [raw/node-chain-128-p4-0-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-128-p4-0-before.json)
- [raw/node-chain-128-p4-1-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-128-p4-1-candidate.json)
- [raw/node-chain-128-p4-2-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-128-p4-2-candidate.json)
- [raw/node-chain-128-p4-3-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-128-p4-3-before.json)
- [raw/node-chain-32-p4-0-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-32-p4-0-before.json)
- [raw/node-chain-32-p4-1-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-32-p4-1-candidate.json)
- [raw/node-chain-32-p4-2-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-32-p4-2-candidate.json)
- [raw/node-chain-32-p4-3-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-32-p4-3-before.json)
- [raw/node-chain-512-p1-0-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-512-p1-0-before.json)
- [raw/node-chain-512-p1-1-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-512-p1-1-candidate.json)
- [raw/node-chain-512-p1-2-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-512-p1-2-candidate.json)
- [raw/node-chain-512-p1-3-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-512-p1-3-before.json)
- [raw/node-chain-512-p4-0-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-512-p4-0-before.json)
- [raw/node-chain-512-p4-1-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-512-p4-1-candidate.json)
- [raw/node-chain-512-p4-2-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-512-p4-2-candidate.json)
- [raw/node-chain-512-p4-3-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-chain-512-p4-3-before.json)
- [raw/node-independent-128-p1-0-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-128-p1-0-before.json)
- [raw/node-independent-128-p1-1-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-128-p1-1-candidate.json)
- [raw/node-independent-128-p1-2-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-128-p1-2-candidate.json)
- [raw/node-independent-128-p1-3-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-128-p1-3-before.json)
- [raw/node-independent-128-p4-0-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-128-p4-0-before.json)
- [raw/node-independent-128-p4-1-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-128-p4-1-candidate.json)
- [raw/node-independent-128-p4-2-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-128-p4-2-candidate.json)
- [raw/node-independent-128-p4-3-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-128-p4-3-before.json)
- [raw/node-independent-32-p4-0-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-32-p4-0-before.json)
- [raw/node-independent-32-p4-1-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-32-p4-1-candidate.json)
- [raw/node-independent-32-p4-2-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-32-p4-2-candidate.json)
- [raw/node-independent-32-p4-3-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-32-p4-3-before.json)
- [raw/node-independent-512-p1-0-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-512-p1-0-before.json)
- [raw/node-independent-512-p1-1-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-512-p1-1-candidate.json)
- [raw/node-independent-512-p1-2-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-512-p1-2-candidate.json)
- [raw/node-independent-512-p1-3-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-512-p1-3-before.json)
- [raw/node-independent-512-p4-0-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-512-p4-0-before.json)
- [raw/node-independent-512-p4-1-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-512-p4-1-candidate.json)
- [raw/node-independent-512-p4-2-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-512-p4-2-candidate.json)
- [raw/node-independent-512-p4-3-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/node-independent-512-p4-3-before.json)
- [raw/smoke-before.json](./_resources/261012-evaluate-run-projection-optimization/raw/smoke-before.json)
- [raw/smoke-candidate.json](./_resources/261012-evaluate-run-projection-optimization/raw/smoke-candidate.json)
- [run-window.sh](./_resources/261012-evaluate-run-projection-optimization/run-window.sh)
- [summarize.mjs](./_resources/261012-evaluate-run-projection-optimization/summarize.mjs)
- [summary.json](./_resources/261012-evaluate-run-projection-optimization/summary.json)
- [target-tests.txt](./_resources/261012-evaluate-run-projection-optimization/target-tests.txt)
- [window-end.txt](./_resources/261012-evaluate-run-projection-optimization/window-end.txt)
- [window-start.txt](./_resources/261012-evaluate-run-projection-optimization/window-start.txt)
