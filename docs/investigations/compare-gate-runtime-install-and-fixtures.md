---
title: "比较 Gate 运行宿主、隔离安装与测试夹具的优化收益"
id: "261023-compare-gate-runtime-install-and-fixtures"
formedAt: "2026-10-23T10:32:33Z"
question: "固定候选和工具链后，切换 Check 宿主、冻结隔离安装与缩小测试夹具哪项值得推进，哪些收益不足以支付维护成本？"
tags:
  - "performance"
  - "project-gate"
  - "runtime-host"
  - "test-fixtures"
relations:
  - type: "补充"
    target: "261023-diagnose-heavy-check-contention"
    summary: "将已定位重复工作与宿主差异转为三项有界实验"
---

## 形成时背景

2026-10-23，完整 Gate 在 43 项 Check 均通过后，仍因 mean / P95 超过原预算而失败。
用户在[慢检查与并发调查](./diagnose-heavy-check-contention.md)后要求把三个优化方向都试一下：
运行宿主、隔离安装、重复真实 fixture 工作。本轮保留验收与预算，用隔离实验筛选值得继续的方向。

**最强信号来自宿主：同一已安装 `functionMetrics` 完整 Check，Bun 样本中位数 4.654 秒，
Node 为 0.760 秒，完整度量一致。冻结安装未证明提速；小 fixture 有局部收益，但当前原型维护成本偏高。**
本轮没有把这三项方案写入生产，也没有证明完整 Gate 已过线。

## 调查目的

区分“有可测成本”与“值得实施”：换宿主能否保持结果、锁文件是否真正减少一次 Gate 的安装成本、
小 fixture 是否保留有价值的失效证明并获得足够收益。前序隔离了竞争与重复工作，本轮比较具体候选，
不重新归因全部慢项；两轮独立保留，避免把不同 workload 当成优化前后数据。

## 调查范围与依据

### 固定输入与测量边界

- `main` / `d15cbf6f34499fa3027ed6c99d0508436add740f`，保留已有未提交工作。
  三组实验各自的 3,385 项源码清单前后相同，SHA-256 为
  `2165e0051daf727c10d5248de79cccf80a02ab3e42581bb8490757ba5d3be813`。
- 既有 candidate `0.0.0-local.11aaf5e2c0fd`，tarball SHA-256 为
  `eacc71a0a5ae7cc73ac06da7226c6c73d4b1ebc73920fc9888c48d82c316eb76`；不重建。
  staging、installed candidate、receipt 和工具文件摘要在各窗口前后相同。
- `mise exec` 绑定 Bun 1.3.14、Node 24.18.0、pnpm 11.1.3；4 CPU / 6 GiB 共享容器。
  三组串行安排，各条件前有 2 秒预检，期间约 500 ms 采样；不停止他人进程、不清系统缓存。
- 原 types 测试 20 秒、consumer command / preparation 30 秒、supporting 外层 120 秒等边界保持。
  宿主单 Check 使用独立诊断进程安全上限，不是 Gate 预算变更。正式计时序列没有失败重试或替补样本。
- installation / fixture 表为直接进程 wall，约 10 ms 退出轮询；宿主同时给出 Check execution 和直接进程 wall。
  观察器 500 ms 轮询总时长不充当主指标。每条件少量样本只支持本轮范围与样本中位数，不提供稳定 P95。

宿主通过已安装公共 `run(defineConfig({checks: [functionMetrics(options)]}))` 执行，采用 Gate owner 原 options、
原 limits / waiver、相同 574 文件与 2,650,797 bytes，均关闭三类输出。每次 fresh process 先核对完整选择与字节，
因此文件页可能已热，但没有 analyzer warmup。另直接调用随包 Worker，仅核对完整分析结果，不计性能。

原始材料保留于本地 ignored `.log/runtime-host-experiment-20261023/`、
`.log/consumer-install-experiment-20261023-corrected/` 和 `.log/supporting-fixture-experiment-20261023/`。
随附资源保存必要计时、身份、命令、断言与原型差异，省略重复全量进程采样和大型 Worker 输出；报告在测量结束后建立。

### 失败、纠正与未完成项

1. 宿主首次预检发现外部活跃进程，未启动命令。随后 pilot 的 Check 已通过，但实验 harness 误读
   `aggregate.status` 而退出 1；只纠正为实际的 aggregate 字符串后开始主序列，原 pilot 不计入比较。
2. 主序列预定 Bun、Node、Node、Bun、Node、Bun、Bun、Node；完成七次，第八次 Node 被外部 CPU
   预检阻断，未补跑。完整 Worker 语义检查的安静预检也被阻断，之后独立做非计时检查，不拿其耗时补样本。
3. 安装初版 harness 额外要求所有祖先不存在 `node_modules`，被既有 `/tmp/node_modules` 拦下，
   尚未执行安装；这是实验设计错误，不是产品安装失败。删除超出 owner 的 blanket guard 后，在新目录执行预定六条件，
   保留真实入口、候选及实际依赖的 containment 验收。原四次 guard 失败与两次依赖跳过均保留。
4. fixture 首次 smoke 因隔离副本无法解析真实 `execa` 而失败；只在 fixture 内链接既有真实依赖，
   新标签 smoke 通过后开始 ABBA。没有修改生产依赖或把导入失败当成有效负向测试。

## 调查结果与边界

### 运行宿主：秒级差异，值得继续，但尚非 Gate 迁移

| 指标 | Bun，4 次 | Node，3 次 |
| --- | ---: | ---: |
| Check execution 范围 | 4.144–7.430 s | 0.674–1.162 s |
| Check execution 样本中位数 | 4.654 s | 0.760 s |
| 直接进程 wall 样本中位数，含 import / 输入核对 | 5.106 s | 1.369 s |

七次公开 snapshot、Records、messages 和终态一致；额外 Worker 核对的 **4,404 个度量、1,515,703 bytes
规范化结果逐字节相同**。不仅是最终告警相同，也不是换了扫描器或少读文件。
每个完成样本中观测到的外部进程 CPU 增量合计约 70–710 ms，未见命名重负载竞争者；
采样仍可能漏掉短进程，不能声称环境绝对静止。七次数据存在波动，差额也尚未细分到 JIT、GC 或具体引擎机制。

建议优先验证 **Node 承载 Gate 的 Product Run，Bun 继续承担明确的 test / install / 工具命令**。
这是宿主分工，不是在 Product analyzer 内增加一个 Node 子进程；Product 的内置 Worker 契约保持。
当前 [command helper](../../scripts/process-execution/command.ts)、
[test invocation](../../scripts/project/gate/checks/test-execution/entries.ts)和
[consumer material](../../scripts/package/candidate/external-consumer/material.ts)用 `process.execPath`
执行 Bun 专属参数，不能直接把启动命令替换成 Node。后续需显式分开宿主与工具 executable，再经唯一 Gate 入口验收。

本轮不支持“Bun 普遍慢六倍”或“换宿主即可解除完整 Gate 阻断”；仍有多项重负载，原 Gate P95 是第三慢项。
也没有证据要求再重写 tokenizer；本次收益不依赖 tokenizer 改动。

### 隔离安装：正确性闭合，提速证据不足

每条件创建新的外部 consumer，安装同一 exact tarball，保留现有包管理器缓存的自然状态，不复用 `node_modules`。
顺序为 A1 → B1 → C1 → C2 → B2 → A2：A 为原 `install --no-save --ignore-scripts <tgz>`；
B 在该新目录 `--lockfile-only` 后 `--frozen-lockfile`，两阶段都计时；C 只复制 B1 的 manifest / lock，重新真实安装。
下表验收合计包含额外的 tarball 字节、依赖图和 owner 审计，以及串行 types / docs / runtime；
不包含观察器预检间隔，也不是 Gate 并行调度下的 wall。

| 条件 | 包管理器耗时，两次 | 完整准备耗时，两次 | 准备加完整验收，两次 |
| --- | ---: | ---: | ---: |
| A 原方案 | 7.618 / 1.981 s | 7.939 / 2.182 s | 17.224 / 13.286 s |
| B 生成锁再冻结安装 | 2.303 / 2.122 s | 2.489 / 2.329 s | 21.581 / 11.911 s |
| C 复制既有锁后重新安装 | 2.113 / 2.142 s | 2.317 / 2.311 s | 16.798 / 14.609 s |

六条件全部通过原 types 2 项、docs 2 项、runtime 1 项，共 30 项；每次 1,557 个候选文件与 tarball 逐字节一致，
148 个已安装包的图一致，19 个直接依赖约束、302 条 required dependency containment 和完整许可审计通过。
冻结安装未改变锁字节；没有降低 strict 类型检查或跳过真实示例。

**不能用 A1 的 7.9 秒与后续 2.3 秒相减来宣称优化。** A 自身就从 7.9 降到 2.2 秒；首轮 Bun
combined resolution marker 为 120，后续解析为 1，这不是网络分段计时，更未证明锁消除了哪段等待。
types 的直接进程 wall 仍波动于 4.254–9.592 秒，并出现内存回收，验收总耗时不能归功于安装模式。

B1 生成锁本身 454 ms，B1+C1+C2 共计准备 7.117 秒、准备加验收 52.988 秒，未隐藏 seed 成本。
当前一次 Gate 只准备一个 consumer，没有理由假设多次摊销；C 仅证明当前同一候选的可行性，不证明未来 candidate 的锁维护。
因此本轮不采用锁文件提速方案，也不新增跨轮缓存；确定依赖图若成为独立需求，再单独评估。

### 小 fixture：确有局部节省，但不采用当前维护架子

原型保留真实 compiler-toolchain 测试、一次完整 fingerprint 输入复制及两次真实指纹相等证明；
原 manifest 敏感性矩阵与 compiler-cache 的 11 次 preparation 断言转到小型真实文件。
它仍调用未改写的 resolver、输入发现、哈希和缓存逻辑，没有 mock hash 或新增生产注入面。
另增强 12 项工具链字节敏感性、14 项仓库输入敏感性及相应 cache 失效证明；原 compile callback
仍只写 fixture，不能冒充真实编译验收。

| 范围，均 ABBA | 原方案范围 / 中位数 | 原型范围 / 中位数 |
| --- | ---: | ---: |
| 两个目标文件，4 项测试 | 0.909–0.980 / 0.944 s | 0.480–0.554 / 0.517 s |
| 完整 supporting lane，20 文件、36 项测试 | 2.747–3.274 / 3.011 s | 2.245–2.429 / 2.337 s |

全部计时样本通过，lane 的完整 test name / suite 集合一致。六个隔离 owner 变异分别忽略工具链、manifest、
源码、输出损坏或 buildinfo：三项在断言失败，三项由 owner 的 staging 前二次一致性校验抛错，均非导入错误。
但复制后的测试路径改变了 Bun 实际文件执行顺序，lane 的约 673 ms 差额含加载顺序与自然缓存效应，
不能全归因为少做哈希；目标文件约 427 ms 的差额是更直接的局部证据。

代价是维护 93 行 helper、25 个真实模块的显式复制闭包，以及 `execa` 解析接线；初次 smoke 已实际暴露这项脆弱性。
本轮判断：**节省不到一秒，不足以为当前 Gate 引入这套夹具维护负担**。原型仅留作证据，正式测试与 Case 不变。

### 本轮交付与下一步

只建立本调查及证据资源；没有修改生产代码、测试、预算、缓存、调度或依赖。
三条方向均已实际尝试，但“尝试通过”不等于“方案已采用”。下一步首选宿主分工的小范围实施与完整 Gate 对照，
同时保留所有内置 Check 的真实使用，而不是继续削弱验收或追逐 fixture 的零碎收益。
本轮未运行完整 Gate，仍未证明原 mean / P95 阻断解除；没有 Git 暂存、提交或推送。

## 随附资源

- [Fixture 计时、完整实体集合与变异证据](./_resources/261023-compare-gate-runtime-install-and-fixtures/fixture-measurements.json)
- [六条件安装成本、身份与验收结果](./_resources/261023-compare-gate-runtime-install-and-fixtures/install-measurements.json)
- [实际公开 Check 诊断 driver](./_resources/261023-compare-gate-runtime-install-and-fixtures/runtime-driver.mjs)
- [原 Gate options 与 574 文件字节身份](./_resources/261023-compare-gate-runtime-install-and-fixtures/runtime-input.json)
- [宿主样本、工具身份与未完成项](./_resources/261023-compare-gate-runtime-install-and-fixtures/runtime-measurements.json)
- [仅供审阅、未落地的 fixture 实际差异](./_resources/261023-compare-gate-runtime-install-and-fixtures/supporting-prototype.patch)
- [非计时的随包 Worker 完整结果核对](./_resources/261023-compare-gate-runtime-install-and-fixtures/worker-parity.mjs)
