---
title: "Project Gate Function metrics Check 超 5 秒开销审计"
formedAt: "2026-09-04T02:46:26+00:00"
question: "full Project Gate 中的 Bun Product function metrics tests（近期 6.3 秒、曾 8.9 秒）与 direct Function metrics Check（曾 5.3 秒）为什么超过 5 秒；是否存在重复扫描、Worker/child-process 启动或测试矩阵重复执行，以及在不提高 root 并发度、不放宽 timeout 下怎样使每个 Check 的普通负载低于 5 秒？"
tags:
  - "function-metrics"
  - "performance"
  - "project-gate"
  - "test-execution"
relations:
  - type: "补充"
    target: "compare-lizard-regex-backends-and-analyzer-cost-allocation.md"
---

## 形成时背景

用户要求审计 Project Gate 中所有超过 5 秒的 Check，明确将 5 秒视为普通负载的上限信号：若超出，优先排除不必要的 process/Worker 开销、重复扫描和重复测试，而不是仅调小一个阈值。本轮只覆盖 `functionMetrics` 的两条 Gate 路径：`tests-product-function-metrics`（显示名 `Bun Product function metrics tests`）和普通 `function-metrics` repository-quality Check；没有运行 full Gate，没有改变 root global concurrency、timeout、产品源码、测试、Decision 或 Case。

本报告补充 [Lizard regex 后端与 analyzer 成本分配对比](compare-lizard-regex-backends-and-analyzer-cost-allocation.md)：前序拥有 source-aligned analyzer / runtime 候选的形成时结论和当前停止状态；本轮新增 Gate lane、资源测试及当前 repository-quality 输入范围的实测，不能据此重新授权 tokenizer、runtime、Worker protocol 或 backend 改造。

形成时环境为 Linux x64 WSL2、4 CPU quota（`cpu.max = 400000 100000`）、Bun 1.3.14、HEAD `30e22bcfbefaaf6a9cd90ff59ba585962ba88dc8`。工作树有其他并行任务的未提交调查材料；所有数值因此是这一时段的目标级观测，不能当作隔离 CI 的稳定 percentile。

## 调查目的

1. 复原两个 Gate Check 的精确入口、输入、进程和 Worker 边界，判定是否有可删除的重复工作。
2. 用同一 Function metrics lane 与同一 repository-quality policy 取得 wall/user/sys、最慢阶段和测试级耗时，而不跑 full Gate。
3. 提出不增加进程数、不提高 root 并发度且保持证据语义的优先改造方案，并明确哪些方案仍需 owner / 用户决定。

## 调查范围与依据

### 已读取的当前 owner 与代码

读取了 `AGENTS.md`、`docs/navigation.md`、`docs/coding-style.md`、`docs/checks/function-metrics.md`、`docs/testing.md`、`performance-optimization` 和 `investigation-report` skill（含固定契约），以及：

- `scripts/project/gate/definition.ts`、`checks/test-execution/{entries,lanes}.ts`、`checks/{process-entry,repository-quality}.ts`；
- `src/package-checks/function-metrics/{execution,measurement,analyzer-worker,target-files}.ts` 及相邻测试；
- 当前 Function metrics analyzer 性能调查，特别是上述直接前序。

Gate 将 Function metrics 测试 lane 精确映射为 32 个 `src/package-checks/function-metrics/**` 测试文件，并以一个 process-backed Check 执行：

```text
<process.execPath> test <32 files> --reporter=dots
```

该 invocation 没有 `--parallel`，且 `scripts/project/gate/definition.test.ts` 明确断言没有该 flag。因此 Gate 自身只为这个测试 Check 启动一个 Bun 子进程；本轮没有证据显示它对每个测试文件再显式启动 Gate-owned child process。Bun 的 `--parallel` 内部 worker 策略并未被 Gate pin，本轮也没有把 `bun test --help` 的默认说明误报为本次观测到的 worker 数。作为对照，显式 `--parallel=1` 的一次运行为 8.807 s，不能支持“减少 runner 并发即可更快”的主张。

普通 repository-quality Check 是同一 Product Run 内的 `functionMetrics(PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS.functionMetrics)`，不是外部 scanner：`createRepositoryQualityChecks` 不为它配置 executable。每次成功分析恰好构造一个 `new Worker("./analyzer-worker.ts")`；Worker 只接收 parent 已读入的 exact source text，不能重新发现文件或读取路径，且没有 child process、CLI、PATH 或网络边界。两个 area 同为 `filesystem` source，`collectProjectFileSets` 按 source 分组后只 walk 一次，再按 area 过滤；不存在 area 各自重复 walk。

### 实际目标级测量

以下命令均在 repository root 执行，未运行 full Gate。外层 Bash `time` 记录 wall/user/sys；Bun 输出记录测试或 Check elapsed：

| workload | 样本 | wall s | user s | sys s | 直接结果 |
| --- | --- | ---: | ---: | ---: | --- |
| Gate exact 32-file lane，dots | 1 | 5.459 | 2.320 | 1.457 | 96 pass，Bun 5.30 s |
| 同 lane | 2 | 8.147 | 2.519 | 1.434 | 96 pass，Bun 8.10 s |
| 同 lane | 3 | 6.552 | 2.360 | 1.152 | 96 pass，Bun 6.51 s |
| 同 lane，console（用于逐 test 计时） | 1 | 5.180 | 2.080 | 1.290 | 96 pass，Bun 5.15 s |
| 同 lane，显式 `--parallel=1` | 1 | 8.807 | 3.291 | 1.601 | 96 pass，Bun 8.77 s |
| direct exact repository-quality Check | 1 | 4.009 | 2.795 | 1.814 | Product execution 3,442.914 ms |
| 同 direct Check | 2 | 3.739 | 2.749 | 1.931 | Product execution 3,163.912 ms |
| 同 direct Check | 3 | 3.917 | 2.000（Bash 格式显示为 `2.:00`） | 1.728 | Product execution 3,129.021 ms |

一次 console lane 的最慢两个测试是 `measurement.resource.test.ts`：8 MiB single-file boundary 为 986.56 ms，64 MiB aggregate boundary 为 2,590.43 ms，合计 3.577 s；该 lane 的其它 94 个测试大多低于 160 ms。其余显著测试为 source identity 156.52 ms、port facade resolver 87.45 ms、area findings 70.00 ms；它们不是 5 秒主因。

为区分真实 resource 语义与 timer 调度成本，本轮仅以 `/tmp` preload 将测试中的 `setTimeout(0)` 临时替换为 microtask，且只选择上述两个 boundary tests；临时文件已删除、未修改工作区。原测试为 3.728 s（Bun 3.71 s），控制为 0.658 s（Bun 635 ms），两项分别从 986.56/2,590.43 ms 降为 339.94/132.50 ms。该控制**不**证明可以改变生产让步语义；它只证明这些 test workload 的大部分 wall 是 `measurement.ts` 每个 32 KiB chunk 的定时器让步，而非 resource-limit 判定、磁盘读取或测试 runner 启动。

当前 direct Check 选择 395 个 `product-source` 文件（1,809,305 bytes）和 151 个 `script-tooling` 文件（约 707 KB），共 546 个 accepted TypeScript files、2,516,211 bytes；没有 rejected input。三次单独 selection walk 为 156.015、184.802、260.222 ms（另一次受并行负载影响为 483.902 ms）。在 direct Check 内的临时 Worker 观测为：Worker 构造前 874.112–900.499 ms，构造至 postMessage 的同步段仅 0.152–0.219 ms，postMessage 至 terminate/完成 2,156.071–2,492.612 ms。最后一段包含 Worker 真正启动/import、structured-clone、analyzer、response 和 result handling，不能把它全部归因为启动。

同一 546-file、2,516,211-byte source request 直接在既导入的 adapter 中连续运行三次为 1,891.034、1,946.142、1,984.281 ms，均得 4,619 metrics。这是 analyzer 主导的强信号，但与 one-shot Worker 不是可直接相减的同协议 sample；它不授权移除 Worker。已有 owner 文档还要求 Worker 保持 analyzer 的 exact-input、取消与 failure boundary。

最后，对 policy 变更作了一个临时、未落盘的对照：仅从 `product-source` 排除 `src/**/*.test.ts` 与 `src/**/*.test-support.ts` 后，完整 direct Check 是 1,829.047 和 1,821.552 ms（outer wall 2.395/2.340 s）。当前 `src` 中该两类文件共有 184 个、1,053,783 bytes；实际功能 Check 的 source-aligned analyzer root 已另被排除。该对照改变 Finding/Record scope，因而是方案证据，不是可直接采纳的性能数字。

## 调查结果与边界

### 已确认事实

1. **没有 Function metrics 的重复 scanner/process 问题。** repository-quality 的两个 file areas 共用一次 filesystem candidate walk；accepted sources 一次性、稳定去重后只交给一个 Worker。该 Check 不启动 child process，也不重扫 Worker 内路径。
2. **测试 lane 只有一个 Gate-owned Bun command，但测试自身真实地执行了 32 files / 96 tests。** 没有文件在 lane 内重复列入；lane partition 对重复文件 fail closed。`--parallel=1` 更慢，不能以“单 worker”替代诊断。
3. **测试 lane 的可行动主因是测试基础设施放大。** 两个 resource-boundary tests 占 5.15 s console lane 的约 69%，而两者仍读取真实 8/64 MiB 输入。每 32 KiB `setTimeout(0)` 使 aggregate test 产生约 2,048 次 timer yield；temporary control 的 3.728→0.658 s 证明这不是一个小数点级调参空间。
4. **direct Check 的可行动输入范围包含测试源。** 它不是只扫描 production implementation：`product-source: src/**/*.ts` 还包含 test/test-support。排除这些输入的临时同路径结果约从 3.13–3.44 s 到 1.82–1.83 s；它比 Worker construction-to-post 的不足 0.22 ms 大两个数量级。
5. **direct Check 的最大成本是 source-aligned analyzer operation，而非 Worker object 创建。** 2.16–2.49 s Worker round trip 和 1.89–1.98 s adapter operation 支持这一点；不能把它描述为“一次多余 Worker 启动”。

### 建议的实施顺序（均未在本轮实施）

| 优先级 | 建议 | 预期收益 | 行为与证据边界 |
| --- | --- | --- | --- |
| P0 | 为 `measurement.ts` 引入仅内部可见、默认仍为生产 `setTimeout(0)` / real Worker 的 measurement dependency seam；resource boundary tests 继续写入并读取真实 8 MiB/64 MiB bytes，但使用立即完成的 test yield 与受控 fake Worker。保留独立 cancellation integration test 使用默认真实 yield，断言取消发生时 Worker、Records、waiver audit 都不发生。 | 同一低负载算术估计：完整 lane 可回收约 `3.728 - 0.658 = 3.070 s`，把 5.15 s 基线约降至 2.08 s；不是已实现后的承诺。无新增 process/Worker。 | 必须证明精确 8 MiB / 64 MiB fail-closed 边界、无 prefix analysis、真实默认 cancellation cooperative behavior 与 Worker transport 各自仍被测试。不得把 preload 或 microtask 当成 production 默认。因会修改测试正文/实体，需按 `test-evidence-review` 更新并运行最窄测试及 Case check。 |
| P1 | 由 quality-policy owner 决定 repository Function metrics 是否只约束 Product / script implementation，而不把 `src/**/*.test.ts`、`src/**/*.test-support.ts` 纳入 `product-source` quality Check；若确认，显式排除它们并同步 repository-quality policy tests/docs。 | 临时同路径对照为约 1.3–1.6 s Check execution 回收，得到约 1.82 s direct Check；不增加任何进程。它为 full-Gate contention 留出比当前 3.1–3.4 s 更大的余量。 | **这是 scope 改变，不是“消除重复”。** 将不再发布测试代码的 function-metric Findings/Records；Bun tests 继续证明行为，不能替代 test-code quality policy。现有 policy 测试明确要求 test boundary 被选择，故需显式 owner 决定，不能自行修改。 |
| P2 | 不把 Worker pool、Node child process、CLI 或 tokenizer/backend 微调作为本问题的第一修复。只有 P0/P1 后 direct Check 仍在受控普通负载超过 5 秒，才在重新授权后以当前 exact 546-file corpus、metric digest、cancel/resource/package gates复查 analyzer runtime 路径。 | 本轮没有可靠的端到端收益估计。 | one-shot Worker 创建本身没有 material evidence；child process 会违反当前 Function metrics I/O 边界。前序调查的 runtime/backend 路径处于停止状态，本报告不重开它。 |

### 验收方案

P0 实施后，先运行 `bun test src/package-checks/function-metrics/measurement.resource.test.ts` 和完整 exact 32-file lane；在同一 4-CPU host、同一 Bun 版本，收集至少五个无 full-Gate 的普通样本，要求 lane 的 p90 小于 4 s（为 5 s budget 留余量），并逐项保留 resource/cancellation assertions。P1 若获批准，使用同一 policy、同一 source count/bytes 和 five-sample direct Product invocation，要求 p90 小于 3 s；随后才在不改 root concurrency/timeout 的 Gate-level normal load 下确认没有 Check 超过 5 s。

两项验收都应额外报告 wall/user/sys、selected/accepted file 数和 bytes、Worker construction count（direct Check 应仍为 1）以及完整 outcome/Record scope。时间观测是 performance evidence，不应把 p90 门槛自动变成 hang timeout 或 correctness failure。

### 未知与不可外推范围

- 本轮未运行 full Gate、未在 CI、其他 OS、冷 page cache 或无并行任务的独占主机复现；5.3/6.3/8.9 秒历史 Gate 读数不能与本轮孤立样本简单相减。
- Bun 未显式 pin test-runner `--parallel` worker policy；本轮确认的是一个 Gate process command，未得到 runner 内部实际 OS worker count。实现若要依赖该数量，必须用独立 process-tree telemetry 测量，不能猜测。
- P1 是否应免除测试源质量扫描是产品/质量策略判断；本报告只给出成本与证据边界，不替用户作出该质量取舍。
- P0 的 temporary preload 只是一项诊断 ablation，未验证 dependency seam 的最终测试代码，也不证明最终 lane 的 p90；实施后必须按上述 exact verification 重测。
