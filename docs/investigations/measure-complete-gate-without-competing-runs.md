---
title: "完整 Gate 无其它重负载运行时的受控测量"
id: "261023-measure-complete-gate-without-competing-runs"
formedAt: "2026-10-23T08:19:45Z"
question: "固定输入且未观察到其它重负载 Gate 时，完整验收是否仍变慢并触发性能阻断？"
tags:
  - "performance"
  - "project-gate"
  - "resource-contention"
relations:
  - type: "补充"
    target: "261023-diagnose-fast-gate-lint-amplification"
    summary: "扩展至完整验收，区分外部 Gate 与共享配额压力"
---

## 形成时背景

2026-10-23，完整 Gate 曾出现 39 passed / 4 failed、执行摘要耗时 128.5 秒。
三组测试超时，另有 Case 文档行数超限；行数问题随后通过移动 Case 解决。
用户要求先做一次受控测量，判断整体慢化是否与执行环境竞争有关：固定源码、产物和工具链，
确认没有其它重负载 Gate，保留预算与完整验收，不自动重试，也不继续其它优化。

**本次 43 项验收全部通过，执行摘要降至 52.6 秒，但 mean/P95 仍超预算，最终退出 1。**
运行期间未观察到其它重负载 Gate、测试或编译；共享容器仍发生 CPU 配额节流与内存回收压力。
因此，“另一个 Gate 抢资源”不是本次性能失败的必要条件，也不能作为剩余问题的唯一解释。

## 调查目的

建立一个输入可核对、无可见外部重负载的完整验收样本，区分功能失败、总反馈预算和单项分布预算。
本轮只形成证据，不调整调度、缓存、测试选择、阈值或产品代码。

前序 [fast lint 调查](./diagnose-fast-gate-lint-amplification.md)研究两项 lint 的并行放大；
本轮在 lint 已互斥的状态下研究完整 43 项负载，补充独立运行仍存在的资源压力。
两轮 workload、候选和问题范围不同，分别保留，不把 fast 结论直接外推为 all 已解决。

## 调查范围与依据

### 固定输入与执行过程

- 工作树基于 `main` 的 `d15cbf6f34499fa3027ed6c99d0508436add740f`，包含本轮之前已有的未提交改动。
  对 tracked 与非 ignored untracked 的 3,373 项文件建立内容清单；准备前、启动前和结束后摘要一致。
  清单 SHA-256 为 `00c19833514a5a9396a103dd821f1e0bf98f4b38e143fbf16518e9d8febbf901`。
- 经 `mise exec` 固定 Bun 1.3.14、Node 24.18.0、pnpm 11.1.3、uv 0.11.28、SCC 4.0.0；
  同时保存工具路径、binary 摘要、TS7 与 lint 后端摘要，前后完全一致。
- 既有 candidate 过期，先通过 `bun run package:build` 准备一次，耗时 17.12 秒。
  这一准备窗口末尾观察到另一会话测试，因此不把它当作无竞争准备耗时样本。
- 首次启动前检查仍发现外部编译，**没有启动 Gate**。等待后取得 10 秒安静窗口；重新核对输入，
  再通过入口前 2 秒检查，于 08:15:15 UTC 仅启动一次 `mise exec -- bun run check -- --all`。
- candidate 为 `0.0.0-local.4a8cfeb642f8`，tarball SHA-256 为
  `51c0d2363606baad8037c824f4103b0102d5e488fbeab1bebcbfdbccbceb9767`。
  receipt、tarball、unpacked 与 installed package 共 3,116 项清单前后相等；Gate 明确报告 `reuse`。
- 沿用内部 maxParallel 3、test-runners 容量 2 和既有 lint 互斥；未清缓存或调度历史，
  未修改系统配额、停止他人进程、人工制造竞争或设置新的外部超时。

### 观测方法与历史可比性

观察器每 500 ms 读取 `/proc` 数值状态与 cgroup 计数，实际最大间隔 555 ms，共 109 次采样。
用 PID、启动时刻、父子关系与 session 区分本次进程树和外部工作；不保存无关 argv 或环境值。
观察器自身消耗约 0.47 CPU 秒。轮询退出识别可增加一个采样间隔，故预算判断使用 Gate 自身计时。

本次与历史使用同一组 43 个 Check ID，但不是同源码、同产物、同缓存的严格 A/B：
历史候选为 `0.0.0-local.f13819e055e6`，其后有诊断字段命名与 Case 归属收尾，历史资源状态也未采样。
本次预先准备 artifact，不能把准备移出入口的差异冒充性能收益；表中优先比较同口径 Run 摘要与 Check 时长。
17.12 秒准备加 54.79 秒命令 wall 为约 71.90 秒，但准备窗口受污染，也不是一次 Gate 的预算指标。

源码固定指本次 Gate 前后内容相同，并非操作系统只读快照。原始证据留在本地忽略目录
`.log/gate-controlled-comparison-20261023/`；Gate invocation 为
`.log/project-gate/2026-10-23T08-15-16.894Z-299456-7095910b-02f4-46ff-b123-3fb6740eb056/`。
报告与精简资源在测量结束后创建，不属于此次完整 Gate 验证的输入。

## 调查结果与边界

### 完整验收恢复通过，性能阻断仍成立

| 指标 | 历史慢运行 | 本次 | 原预算 |
| --- | ---: | ---: | ---: |
| 功能 Check 结果 | 39 passed / 4 failed | 43 passed / 0 failed | 全部通过 |
| 执行摘要 elapsed | 128.5 s | 52.6 s | 非预算口径 |
| Gate elapsed-to-initial-result | 未评估性能 | 53.944 s | 90 s |
| 已执行 Check mean | 未评估性能 | 3.263 s | 2 s |
| 已执行 Check P95 | 未评估性能 | 10.721 s | 5 s |

两次最终都退出 1，但原因不同：历史先有功能失败，未进行性能预算评估；本次功能通过后被 mean/P95 阻断。
P95 是本次 43 项 Check 的 nearest-rank，不是多轮 Gate 的延迟分布。
本次 adapter 的 Product Run timing 为 52.969 秒，与终端执行摘要 52.6 秒的边界不同；不混用计算。

| 同一 Check | 历史耗时 | 本次耗时 |
| --- | ---: | ---: |
| 外部 consumer 准备 | 10.0 s | 2.160 s |
| consumer types | 21.9 s，失败 | 14.125 s，通过 |
| package supporting tests | 31.8 s，失败 | 12.188 s，通过 |
| Markdown tests | 23.2 s | 10.721 s |
| Function metrics | 13.7 s | 9.269 s |
| Product lint | 22.4 s | 6.874 s |

历史列来自终端舍入摘要，本次列来自未舍入 failure context。
consumer 的新增分阶段诊断显示安装为 1.823 秒，而历史为 6.427 秒；入口解析由 2.633 秒降至 0.072 秒。
两个样本都报告 installed 146、resolved/downloaded/extracted 合计 1；这些计数不证明网络或缓存条件相同。

### 未见外部重负载，仍有明确的资源压力

- 容器配额为 4 CPU、6 GiB；全部采样未发现本次进程树之外的 Gate、测试、compiler/lint 或 package workload。
  仍有其它后台进程，本轮不是独占宿主或独立 cgroup。
- Gate 子进程树累计约 180.06 CPU 秒，共享 cgroup 增量为 185.44 CPU 秒，量级上约占 97%。
  两种统计边界不同，这个比例不是精确归因，但不支持将本窗口 CPU 消耗主要归因于其它活跃任务。
- 548 个 CPU 配额周期中 243 个发生 throttling；`throttled_usec` 增加 26,153,249。
  这是内核累计计数，不等于可以从 Gate wall 扣除的 26.15 秒。
- cgroup memory 从约 5.34 GiB 起步，采样峰值达到 6 GiB 上限；`memory.events.max` 增加 7,043，
  `pgscan_direct` 增加 408,228，memory PSI some/full 增加约 2.11/1.98 秒；无 OOM 或 OOM kill。
  这些是共享容器压力，不等于 Gate 自身 RSS，也不能据此确定具体内存 owner。

### 判断与后续边界

1. **事实：** 在未观察到其它重负载的窗口，完整 Run 比历史快约 59%，三组超时也未复现；
   但原性能预算仍不通过，不能交付为 Gate 成功。
2. **推断：** 执行条件与资源竞争是合理解释，并有本次配额压力证据；
   历史没有同期遥测且源码/缓存不完全相同，无法量化它对历史慢化的贡献，也未证明历史一定存在第二个独立 Gate。
3. **本次排除的充分解释：** 仅等待其它 Gate 退出不足以保证 mean/P95 合格；仍需考虑本次负载自身并发及共享内存占用。
4. **建议，未实施：** 若继续，应优先做相同输入下的独立资源环境或内部并发匹配对照；
   不据这一个样本扩大互斥、调高预算、删验收或承诺增加资源必然解决。
5. **观测限制：** 半秒轮询可能漏掉短命进程，无法排除容器外宿主竞争或全部非标准命令。
   本轮仅一次完整 Gate，没有自动重试；保留原性能失败，不做稳定收益或因果强结论。

## 随附资源

- [测量摘要、输入身份与原始证据摘要](./_resources/261023-measure-complete-gate-without-competing-runs/measurements.json)
