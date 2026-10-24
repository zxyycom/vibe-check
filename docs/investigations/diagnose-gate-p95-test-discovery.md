---
title: "Gate P95 超标与测试文件发现成本"
id: "261024-diagnose-gate-p95-test-discovery"
formedAt: "2026-10-24T15:17:04Z"
question: "第九版 all 的 P95 超标中，测试文件发现有哪些可消除成本，如何保持证据集合并验证改善？"
tags:
  - "performance"
  - "project-gate"
  - "test-evidence"
relations: []
---

## 形成时背景

2026-10-24，用户要求继续定位并优化第九版完整 Gate 的 P95 超标，明确不能靠反复重跑刷通过；lint、预算、timeout 和 Check 粒度保持。
当时工作区为 main，HEAD 为 `4cf52b42`，保留前序 Bun 1.4.4、严格离线安装及测试兼容改动，尚未提交。

起点是一次真实 `mise exec -- bun run check -- --all` 的失败现场：41 项执行检查全部通过、2 项不适用；总反馈 25,998.399 ms、mean 1,626.812 ms 达标，nearest-rank P95 5,388.372 ms 超过 5,000 ms。
日志位于 `.log/project-gate/2026-10-24T14-22-37.825Z-1691280-6c0fb928-b8b7-4927-a6ca-ea50174bc145/`。
其 candidate 为 `0.0.0-local.fc12ad0a3171`，reuse / installation-current；tarball SHA-256 为 `a7922d1a2055c0156a4a41547ba9dca79b386747b1928ba264524fd230872fa0`。

这是升级后的性能定位，不是重新解释此前 Worker 功能超时，也不改写该轮报告。新的具体问题是测试文件发现的重复开销；与其它性能报告只存在背景联系，故无直接演进关系。

## 调查目的

从同次日志确定被预算计入的慢项，找到能够在原有证明集合下消除的工作，并以同树前后对照检验候选。
不以排队时长、focused 跳过义务、统计分母变化或重复完整 Gate 取代优化；不承诺一个局部改动必然解释原 P95 的全部差额。

## 调查范围与依据

### 原始失败现场

读取 gate.log、core.log、scheduler.log 和命令型 Check 的 process.log。41 个实际执行耗时的 P95 是升序第 39 项，即第三慢项，而非最慢项。

| Check | 执行开始/结束，相对 Product Run | 执行耗时 |
| --- | --- | ---: |
| tests-product-markdown | 0.140–7.205 s | 7,064.938 ms |
| tests-scripts-project | 1.669–7.815 s | 6,146.144 ms |
| lint-product | 2.381–7.769 s | 5,388.372 ms |

这些值不包含准入排队。三者确实重叠，但现场没有进程 CPU、主机负载或限流采样，不能由重叠单独断定竞争因果，更不能断言所有超额都来自 lint。
诊断时 cgroup cpu.max 为 `400000 100000`，只表示该时点的配置，不回填为失败时负载证据。

### 定向诊断

同一 Bun 1.4.4、Linux x64、mise 绑定 Node 24.18，使用 Gate 的 lane resolver 返回原完整文件列表，不增删测试或修改超时：

- Markdown：`bun test <productMarkdown 的 21 文件>`，62 tests 通过，runner 2.67 s；最慢单测是宿主 preload/Worker 412.91 ms，未发现本次独立运行中的单个 5 s 测试。
- Gate tooling：`bun test <scriptsProject 的 15 文件> --timeout=15000`，51 tests 通过，runner 3.57 s；两个完整 Definition 测试合计约 773 ms。
- 以全局 `--cpu-prof-md` flags 尝试采样没有产生 profile；该次 2.12/2.11 s 的 lane 结果不算采样证据，也不用于关闭预算。
- 随后仅对 Gate tooling 用 `bun:jsc` 的 `startSamplingProfiler()` 与退出时 `samplingProfilerStackTraces()` 取得 1,366 个主线程栈样本。其中 177 个包含测试文件发现，176 个包含 collectDirectoryFiles，123 个包含 minimatch；441 个停在 spawnSync。采样包含同步等待，不把这些比例解释为 CPU 占比，也不覆盖 child 或 Worker 内部。

源代码与调用图确认：Gate entry 构造及其测试会调用 [文件发现器](../../scripts/test-evidence/discovery/bun-files.ts)。旧实现递归读取整个 source root，逐文件重新调用 minimatch，最后才过滤 ignore。
当时 scripts/src 共有 6,987 个普通文件，其中 5,831 个在已声明忽略的 scripts/project/node_modules 内。这个额外遍历不服务于任何实际测试执行。

### 同树固定次数对照

基线实现与 HEAD 的 bun-files.ts 一致；改动前复制到私有临时目录，仅把 module imports 改成指向同一仓库依赖/源码的绝对路径以便加载。
同一进程导入 before 与 after，以当前 profile 调用 `resolveBunTestFiles({ workspaceRoot, profile })`；先各执行一次预热与集合深比较，再按 `B A A B B A A B B A` 固定顺序测量，各五次，不以结果决定追加次数。
用 performance.now 计直接调用墙钟；两版都暂时包装 fs.readdirSync 计目录与目录项，finally 恢复。每次结果都与同一基线深比较。

[原始十行观测](./_resources/261024-diagnose-gate-p95-test-discovery/discovery-comparison.json)保留顺序、未舍入时间、profile 和计数；没有复制完整 CPU profile 或无关成功日志。

| 指标 | Before | After |
| --- | ---: | ---: |
| 精确返回文件数 | 298 | 298 |
| 每次目录读取数 | 796 | 129 |
| 每次读取目录项 | 7,784 | 1,284 |
| 五次中位数 | 77.347 ms | 5.070 ms |
| 五次范围 | 62.424–88.622 ms | 4.292–6.966 ms |

这是调用内 warmed filesystem/runtime 的局部比较，测试集合与安装树相同；不估计长期尾延迟、跨主机收益或完整 Gate 的因果加速。

## 调查结果与边界

已实施两个局部动作：同次发现复用编译后的 Minimatch；惰性遍历只在所有 include 都有真实文件见证、且 ignore 以终止 `/**` 确定排除整个目录子树时剪枝。
保持 include 先于 ignore 的存在性判断、过滤后空集合诊断、显式 source root/supplemental 验证、符号链接边界、唯一且排序的输出，以及每次重新发现当前树。

不缓存文件集合，不以 node_modules 名称无条件排除；普通文件级 ignore 不能剪掉其未匹配后代。剪枝后不再观察已排除子树内部的读取错误，这是不读取排除材料的明确边界；include 尚无见证时仍可能需要遍历它。

目标及相邻 7 tests、整个 Test Evidence 18 tests、Gate tooling 51 tests、scripts typecheck/lint、format（1,028 文件）和全树 789 entities / 192 Cases / 17 topics 通过。
三个私有变异分别取消剪枝、忽略 include 见证条件、把普通文件 ignore 也当作整树规则；新增测试均让 runner exit 1，并定位对应断言。

非实施代理独立运行 7 tests，通过 561 组小型真实文件树的基线/修改版集合及错误字符串差分，以及 1,070 项终止 `/**` 蕴含检验；未发现实质阻断。语义审查覆盖代码、Case、内部 owner 与公开文档影响。Product、公开 API、README、随包指南、schema 和示例未改变，无需改变这些公开承诺。

修改后的单次 Gate tooling 为 2.76 s，但修改前定向运行本身在 2.12–3.57 s 间波动，不能据此声明 lane 端到端提速。确定的收益是上述同树遍历/匹配成本减少。
首轮形成时，修改后的完整 all 尚未执行；同轮后续验收见下节。两阶段证据共同保留，不把后取得的结果回填为初始判断。
后续若 P95 再超标，应从新现场继续定位具体重项，不据局部结果调整门槛，也不把本次发现器认定为唯一根因。

### 同轮后续完整验收

2026-10-24 15:21 UTC，执行修改后的唯一一次 `mise exec -- bun run check -- --all`，41 passed / 0 failed / 2 not-applicable，exit 0。
总反馈 25,987.6 ms、mean 1,682.5 ms、P95 4,879.7 ms 均在原 90,000 / 2,000 / 5,000 ms 预算内；累计执行 68,983.7 ms。
日志为 `.log/project-gate/2026-10-24T15-21-45.271Z-1735231-baeba634-1ad4-4ab1-a37b-1683e8d2a78a/`，candidate 仍为 `fc12ad0a3171`。

本次最慢三项为 Markdown tests 6,764.0 ms、Gate tooling tests 5,166.0 ms、supporting Check tests 4,879.7 ms，P95 仅约 120 ms 余量。
mean 与累计执行没有比起点更低；完整验收通过不等于证明发现器独自造成全部改善，也不证明未来每次都达标。没有追加完整重跑，没有改变 lint、timeout、预算、调度、Check 粒度或选择。

## 随附资源

- [测试文件发现同树对照](./_resources/261024-diagnose-gate-p95-test-discovery/discovery-comparison.json)
