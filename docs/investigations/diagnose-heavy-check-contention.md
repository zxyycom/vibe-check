---
title: "拆解完整 Gate 的慢检查与并发放大"
id: "261023-diagnose-heavy-check-contention"
formedAt: "2026-10-23T09:54:25Z"
question: "完整 Gate 最慢三项在做什么，固定输入后并发竞争能解释多少耗时，哪些局部成本值得继续处理？"
tags:
  - "performance"
  - "project-gate"
  - "resource-contention"
  - "test-execution"
relations:
  - type: "补充"
    target: "261023-measure-complete-gate-without-competing-runs"
    summary: "在验收合并后的固定输入上拆解最慢三项并发成本"
---

## 形成时背景

2026-10-23，包验收合并后的完整 Gate 仍被性能预算阻断。用户要求继续调查最慢的检查在做什么，
以及为何局部优化没有解决整体问题。本轮只调查，不修改产品、测试、调度、缓存或预算。

**固定输入的对照证实：三项并行会明显放大单项耗时，同时带来 CPU 节流与内存回收；
但没有复现完整 Gate 最慢的 15／11／9 秒，不能把全部差额都归因于这三项重叠。**
package supporting 单独运行约 3 秒，主要不是完整编译或安装；继续抠几十毫秒不是优先方向。

## 调查目的

分别回答三件事：最慢三项的实际职责、串并行对单项与整体完成时间的不同影响、package supporting
测试体与加载成本的分布。保留真实 consumer 严格类型验收和全部 36 项 supporting 测试。

本报告补充[无外部重负载完整 Gate 调查](./measure-complete-gate-without-competing-runs.md)：
前序证明外部 Gate 并非性能失败的必要条件；本轮在后续包验收合并的固定版本上，进一步隔离内部并发。
两轮 workload 和 candidate 不同，保留各自证据，不将其作为优化前后 A/B。

## 调查范围与依据

### 输入与执行

- `main` / `d15cbf6f34499fa3027ed6c99d0508436add740f`，保留已有未提交工作。
  3,383 项 tracked / 非 ignored untracked 输入清单前后相同，SHA-256 为
  `ae5554ef1eb7464395c465ce2049d1cd87591bca5ea06cc10ba382c4688a4bb1`。
- 通过 `mise exec` 固定 Bun 1.3.14、Node 24.18.0、pnpm 11.1.3、TS7 7.0.2；
  工具与 compiler/lint backend 文件摘要前后相同。
- 使用既有 candidate `0.0.0-local.11aaf5e2c0fd`，不重建；tarball SHA-256 为
  `eacc71a0a5ae7cc73ac06da7226c6c73d4b1ebc73920fc9888c48d82c316eb76`。
  receipt、staging、installed candidate 清单前后相同。
- 通过现有 external-consumer provider 单独准备一次隔离安装，所有对照共用它；consumer 全文件清单前后相同。
  准备阶段 install 为 11.553 秒，独立记录，不计入三项对照，也不将其波动归功于代码优化。
- 预先声明 `serial-a → parallel-a → parallel-b → serial-b`，串行顺序均为 types、supporting、lint。
  之后各做一次 supporting JUnit 明细、无匹配 registration probe；最后一次 compiler extended diagnostics
  只增加阶段统计，不改变 strictness、noEmit 或输入。
- 首次预检发现另一个会话测试，未启动 workload；外部进程结束后才执行上述序列。
  每个条件前有 2 秒预检，运行期间每 500 ms 采样；未观察到外部 Gate、测试或 compiler 重负载。
  未停止他人进程、清缓存、重试失败命令或重跑 Gate 取绿。

### 计时与命令边界

命令、文件列表、工具摘要和逐项结果见随附 JSON。主对照沿用 Gate owner 的调用：

- types：`bun test scripts/package/candidate/external-consumer/type-acceptance.test.ts --reporter=dots`，
  通过原环境契约传入固定 consumer，保留测试内 20 秒预算和外层 30 秒上限。
- supporting：由 `resolveProjectGateTestLanes` 取得原 20 文件，一次 `bun test <files> --reporter=dots`；
  保留测试超时与外层 120 秒上限，不拆 lane。
- lint：`lintInvocation("product", "json")` 原命令，687 文件、127 规则、4 线程，外层 30 秒上限。

主表用直接子进程启动到退出的 wall，退出轮询约 10 ms；观察器总 wall 另有最多一个 500 ms 轮询间隔。
原完整 Gate 列来自既有 Check execution duration，包含 adapter 边界，不与直接进程计时视为完全相同口径。
两次样本、自然变化的系统缓存和共享容器状态只支持本轮范围判断，不构成稳定分位数。
原始日志位于本地 ignored `.log/top-check-contention-20261023/`；报告在主对照结束后创建。

## 调查结果与边界

### 最慢三项：真实工作与并发放大

| 检查 | 实际工作 | 独立执行，两次 | 三项并行，两次 | 既有完整 Gate |
| --- | --- | ---: | ---: | ---: |
| Consumer types | 对安装后公共声明、公开 API 正反类型用法与文档示例做严格 TS7 检查；另核对声明 JSDoc | 3.576–4.441 s | 5.818–6.676 s | 15.028 s |
| Package supporting | 20 文件、36 测试：指纹与缓存失效、公开面、材料、工具链、命令和发布 fixture | 2.569–3.397 s | 4.365–5.396 s | 10.770 s |
| Product lint | 全 Product 源码的 type-aware oxlint，含类型分析后端，不只是文本格式检查 | 1.507–1.947 s | 3.253–3.795 s | 9.128 s |

四轮主对照中 types 的 2 项、supporting 的 36 项及 lint 均通过，无 timeout。
单独 compiler 诊断为 418 文件、134,214 行、2,383,201 次类型实例化；解析 0.055 秒、绑定 0.025 秒、
类型检查 4.079 秒、emit 0 秒、compiler 总计 4.162 秒。这里主要是在检查公共类型，不是重新打包或安装；
实例化数量不是某个具体类型已被证明低效的证据，本轮未继续追泛型优化。

**单项变快不等于整组更早结束。** 三项全部完成，串行为 9.817／7.683 秒，并行为 6.686／5.828 秒。
串行降低了每项 execution duration，却增加这组约 2–3 秒的整体完成时间。
这支持评估重负载之间的有限互斥，不支持把全部 Gate 一刀切串行，也不能据此承诺完整 Gate 过线。

### 资源证据：安静环境仍会发生内部竞争

容器配额为 4 CPU、6 GiB；安静只指未观察到其它重负载，不代表容器为空。
本轮启动时 cgroup 已占约 4.7–4.8 GiB，其中约 2.9 GiB 是文件页、约 1.2 GiB 为匿名内存；
文件页并非全部不可回收，不能简单用“6 GiB 减已用”当成可用堆。

| 条件 | 累计 CPU throttled | memory.events.max 增量 | direct reclaim 页扫描 | OOM / kill |
| --- | ---: | ---: | ---: | --- |
| serial-a / serial-b | 0.094 / 0.044 s | 0 / 0 | 0 / 0 | 均为 0 |
| parallel-a / parallel-b | 4.296 / 3.680 s | 290 / 166 | 24,219 / 14,414 | 均为 0 |

两次并行采样峰值均到达 6 GiB 上限；串行峰值约 5.52／5.43 GiB。
CPU throttled 是内核累计值，不能当作可直接扣除的 wall；内存事件是共享 cgroup 统计，不等于某个 Check 的 RSS。

重新读取既有完整 Gate 采样可见，其三项重叠阶段长时间贴近 6 GiB；整轮 direct reclaim 页扫描 226,524，
文件页 refault 37,818，比本轮三项并行严重。但完整 Gate 还有前后 workload、不同启动错位及缓存状态，
没有同条件单变量对照，**剩余 15／11／9 秒的放大尚未被完整复现或逐项归因**。

### Supporting 明细：有重复工作，但不是十秒的固定成本

单次 JUnit profile：36 passed，Bun 自报 2.718 秒、直接进程 2.750 秒；测试体合计 2.114 秒。
只累计 `<testcase>`，不重复累加父子 suite 或嵌套 child 的时间。

| 测试体 | 耗时 | 主要工作 |
| --- | ---: | --- |
| Manifest fingerprint | 508 ms | 两次复制完整 fingerprint 输入清单，9 次 fingerprint；不复制依赖、不构建 |
| Public API inventory | 406 ms | 小型三文件 TS 模块图、公开值检查、逐 public name 扫描源码相邻中文 JSDoc |
| Compiler cache | 333 ms | 11 次 cache preparation，真实指纹和失效矩阵；compile callback 只写小 fixture |
| Missing documentation wiring | 267 ms | 两个真实 Bun child，在缺失输入 guard 失败；仍承担静态模块加载 |
| Compiler toolchain | 251 ms | 两个 compiler `--version`、一个 resolver child、两次真实工具链 fingerprint |

前五合计 1.766 秒，占测试体 83.5%。工具链 fingerprint 每次读取包括 native binary、TS6 API 在内的 12 文件；
相关测试至少 23 次调用，仅三个大文件就约 778 MB 逻辑读取/哈希。这不是磁盘物理读取量，也未分离纯 hash 耗时。
源码依据为 [manifest test](../../scripts/package/artifact/manifest.test.ts)、
[compiler cache test](../../scripts/package/artifact/compiler-cache.test.ts)、
[toolchain owner](../../scripts/package/compiler-toolchain.ts)和
[public API test](../../scripts/package/public-api-inventory.test.ts)。

无匹配 probe 为 0.580 秒：20 文件、36 skipped，exit 1 明确表示零匹配，不是验收通过。
它包含 runner、加载、注册、过滤和退出；与 JUnit 总时长减测试体的约 0.603 秒相近，但不能全算成 TS6 import。
同一 lane 只有一个 runner，各文件共享模块加载；跨 child 才重新加载。
command 测试体仅 0.764 ms，release Git fixture 56 ms，overlap 负向测试 59 ms，均非当前主热点。

### 性能阻断含义与建议

既有完整 Gate `2026-10-23T09-18-49.073Z-412657-d9ecd1af-674d-45a8-aac4-0e916a6f2ce3`
是 **43 Check passed，但最终 exit 1**：elapsed-to-initial 为 44.885 秒，小于 90 秒；
mean 2.688 秒超过 2 秒，P95 9.128 秒超过 5 秒。它不是命令 timeout。
43 项的 nearest-rank P95 是第三慢项；当时有 7 项超过 5 秒，除了上述三项，还包括 Markdown 测试、
function metrics、admission workbench 与 Product runtime 测试。因此只压低一项未必解除阻断。

优先方向是把**重负载的准入与实际资源压力**一起验证：下一步可只对 compiler/type-aware lint 等重负载
做有界互斥的完整 Gate 对照，同时看原 mean/P95 与整体 wall，不减验收、不加预算。
实施前仍要确认具体覆盖的 Check，不能把本轮三项实验等同于已确定最佳调度策略。
若资源压力明显下降后仍超预算，再处理 supporting 已定位的重复指纹与源码扫描；其独立成本目前是几百毫秒量级。
本轮不建议继续泛型微调、为过线拆小统计单元或新增跨轮缓存。

本轮未重跑完整 Gate，未证明最新工作树性能已通过；只新增调查材料，未更改任何验收义务。

## 随附资源

- [固定输入、命令、逐项计时及资源观测](./_resources/261023-diagnose-heavy-check-contention/measurements.json)
