---
title: "Project Gate validation 与 external consumer type acceptance 开销审计"
formedAt: "2026-09-04T02:49:37Z"
question: "在不运行 full Project Gate 的条件下，Bun validation tooling tests 与 Bun external package consumer type acceptance 的超过 5 秒现象，哪些是 check 自身结构性成本，哪些只能归因于并发/候选生命周期环境；同族 process-backed lanes 是否已有可消除的重复启动？"
tags:
  - "external-consumer"
  - "performance"
  - "project-gate"
  - "validation"
relations: []
---

## 形成时背景

用户要求将 full Project Gate 中所有曾超过 5 秒的 Check 作为性能问题调查，而不是只对单一 candidate case 作小幅调参；其判断是普通负载下没有大 Check 应依赖超过 5 秒的执行，若出现则优先怀疑不必要的进程开销。本轮只承担其中两个 target：`Bun validation tooling tests`（此前约 3.8–5.4 秒）和 `Bun external package consumer type acceptance`（此前 full Gate 约 5.6–6.0 秒）。

Gate 的 test lane 仍为独立 process-backed Check，root `maxParallel: 3`；本轮不改变 root 并发、不放宽 timeout、不运行 full Gate。`tests-scripts-validation` 使用 documentation mutex，`tests-package-consumer-types` 依赖一次 provider 产生的 external-consumer material。工作区同时有其他任务改动 candidate 相关输入，故 candidate preparation 的波动不能计为两个 consumer Check 的自身 wall time。

## 调查目的

1. 建立两个 target 在非 full、Gate 同形负载下的 baseline，明确其不能覆盖的 Gate contention。
2. 将 wall time 分到 Bun runner、外部工具、fixture/文件扫描和已知 child-process 启动，避免把 scheduler 等待或候选重建说成 Check 本体慢。
3. 审核 validation 与 external-consumer types/docs/runtime 同族 lanes 是否有重复安装、重复 compiler 或显著多进程扇出，并提出普通负载可靠低于 5 秒的方案优先级。

## 调查范围与依据

**环境与限制。** 2026-09-04 UTC，`/workspace/vibe-check`；Bun `1.3.14`、Node `v26.7.0`、TypeScript `6.0.3`、4 logical CPUs。初始 `package:status` 为 current。没有修改正式源码、测试、Gate mapping、Decision 或 Case；只用并清理 `/tmp` fixture/helper；未运行 full Gate。

**可复核静态依据。**

- `scripts/project/gate/checks/test-execution/entries.ts` 对每个 lane 启动 `process.execPath test <files> --reporter=dots`；`lanes.ts` 显示 validation 恰含四个 test 文件，types 恰含一个。
- `scripts/project/gate/definition.ts` 将 validation 配为 documentation mutex，types 配为 `external-consumer` dependency；两者都没有 local `maxParallel`。
- `scripts/package/candidate/external-consumer/material.ts` 的 provider 一次写入三类 fixture、一次 `bun install`、一次 `bun -e import.meta.resolve`。`scripts/project/gate/checks/external-consumer-material.ts` 把这一份 material 传给 types/docs/runtime 三个 consumer；因此三者**并非各自重装 candidate**。
- `type-acceptance.ts` 顺序执行一次 `tsgo --project tsconfig.json` 与一次 TypeScript 6 LanguageService QuickInfo/JSDoc 断言。tsconfig 精确含 `public-imports.ts`、10 个 package API examples 和 installed machine Definition；其中生成的 `public-imports.ts` 单文件为 568 行。
- `scripts/validation/workspace.test.ts` 的两个 test node 各启动一次 `process.execPath scripts/validation/workspace.ts`；故 validation lane 有一个 Gate 启动的 Bun test 加至少两个 test-internal Bun child，即至少 3 个已知 Bun process starts。
- `documentation.ts` 在一个 Bun test process 内逐个启动 runtime-evidence package API examples，另启动 machine Definition runner。读取 projection registry 得到 10 个 runtime example，所以 docs sibling 至少为 **1 test runner + 10 example runner + 1 Definition runner = 12 个 Bun process starts**（不含共享 provider 的 install/resolve）。

**方法。** wall time 以 `date +%s%N` 围住命令，顺序采样；Bun 的 `Ran ... [x]` 输出与外层时间相符。validation 使用 Gate 完全相同的四文件 command：

```text
bun test scripts/validation/documentation/machine-artifacts/validation.test.ts \
  scripts/validation/documentation/workflow.test.ts \
  scripts/validation/layout-characterization.test.ts \
  scripts/validation/workspace.test.ts --reporter=dots
```

types 先以 current exact artifact 建一个 isolated consumer，再传入五个 Gate 同名 `VIBE_CHECK_EXTERNAL_CONSUMER_*` variables；因此复用 provider material，排除 provider install / candidate preparation，保留 consumer Check 的输入形状。但它不包含 scheduler contention、Gate log I/O 或其它 Check 同时运行。系统无 `strace` / `hyperfine`，未采 OS-level process-tree CPU/RSS；process 数来自 source call site，均为下界。

## 调查结果与边界

### 已确认事实

| workload | n | wall-time samples (ms) | median | 结论 |
| --- | ---: | --- | ---: | --- |
| validation Gate-identical four-file lane | 6 | 3337, 3544, 4955, 3946, 4042, 4101 | 3994 | 本轮均 <5 秒；range 1.62 秒，存在环境噪声。 |
| validation：machine-artifacts 单文件 | 1 | 780 | — | 四个文件已由同一 Bun runner 运行。 |
| validation：workflow 单文件 | 1 | 771 | — | 轻量。 |
| validation：layout-characterization 单文件 | 1 | 2169 | — | 最大单文件工作，含当前 layout/direction 检查与临时 mutation cases。 |
| validation：workspace CLI 单文件 | 1 | 1764 | — | 两个真实 CLI Bun child 是可见 startup 成本。 |
| types Gate-like reused-material lane | 6 | 4217, 4929, 4363, 4469, 4195, 4220 | 4292 | 本轮均 <5 秒；接近预算，full 5.6–6.0 秒不能归因于它本体。 |
| `tsgo --project` alone，同一 consumer | 3 | 3265, 3178, 3296 | 3265 | tsgo 是 types 的主导已测成本。 |
| `assertExternalConsumerTypes`（tsgo + TS LanguageService，非 test runner） | 1 | 4010 | — | 相对单独 tsgo 的同环境量级差约 0.7 秒；不同 sample，不作精确相减。 |

另一次同 fixture 的 outer Bun test 为 4363 ms；它与 4010 ms assertion helper 的差量和 test harness 数百毫秒相容，但不是严格配对 phase accounting。已确认结构为：types 只有一次 `tsgo` CLI typecheck；LanguageService 承担不同的 JSDoc/QuickInfo proof，并非同一 checker 的重复命令。

两次 provider fixture 准备曾为约 8.95 秒和 9.12 秒，其中 stdout 明确有约 5.22 秒 candidate runtime/declaration emit；测量时工作区并行改动使 candidate 反复失效。这些是 upstream prepared-candidate/provider lifecycle，**不计入**已依赖 provider 后的 types Check，也不能用于断言正常 provider cost。它说明 full Gate 的 wall time 必须将 candidate lifecycle 和 ready/CPU contention 与 consumer lane 分开。

### 判断

1. **validation 未复现 >5 秒本体瓶颈。** 四个 file 已合并为一次 Bun runner，六个 target sample 都 <5 秒。layout characterization 与 workspace CLI 是唯一有量级价值的局部目标；为省两个 CLI child 而直接改用函数调用会降低真实 entrypoint coverage，未有等价证据前不能实施。
2. **types 在隔离负载下也未复现 >5 秒本体问题，但余量不足。** full 的 5.6–6.0 秒比 isolated median 高约 1.31–1.71 秒。无 full scheduler sample 时，这只与 concurrent CPU/IO、ready wait、candidate/provider activity 相容；不能确定具体成因，也不能据此改 root `maxParallel`。
3. **同族最明确的结构性进程膨胀在 docs sibling，而非 types。** provider 已正确去重安装；documentation consumer 的 12 次 Bun start 是确定事实。即使其当次 wall 未知或 <5 秒，它也应先做 phase profile；这不是已经证明可合并运行，更不授权牺牲逐 example 的 failure attribution。
4. native-preview `tsgo --help` 只显示 compiler CLI/watch/build；本轮没有证据证明其有可稳定替代 TS 6 LanguageService QuickInfo 的 API。粗暴合并两项 proof 会改变独立性和 JSDoc evidence，不是可靠方案。

### 建议与优先级（未实施）

**P0：建立 check-local phase evidence。** 在 Gate process adapter / external-consumer owner 加 opt-in、non-blocking phase timer 与 process-start counter：provider（write/install/resolve）、types（runner/tsgo/QuickInfo）、docs（每 example/Definition）、validation（每 file/CLI child）。固定 current candidate、空闲机器、至少 5 次，报告 median/p95。普通负载 policy 应验收 p95 <5 秒；不要把 full Gate 中包含 ready wait 的单次墙钟冒充该 Check 本体预算。instrumentation 不得改变 aggregate、timeout、root maxParallel 或 record contract。

**P1：优先 profile 并收敛 docs 的 12-start fan-out。** 保留每 example 独立 failure attribution；对照一个 consumer-owned Bun runner 顺序动态 import/run 10 个 runtime example 和 Definition 与现有 11 个 child runner，比较 output、cleanup、failure message 和 wall p95。只有等价证明成立才合并 runner；这直接命中已确认重复启动，且不触碰 root scheduling。

**P2：validation 仅在 P0 的 p95 超标时处理。** 保持四文件单 runner。若 `workspace.test.ts` 的 child 确为主因，抽 command core；保留至少一个真正 `workspace.ts` process smoke，其余 argument/task forwarding 用同进程测试。不得以删除 CLI evidence 换数字。

**P2：types 只接受等价、非降级 compiler consolidation。** 先 spike native-preview 稳定 API 是否可在一个 process 同时完成当前 compiler acceptance 与 QuickInfo/JSDoc，并用正/负 type fixture、public import closure 和 JSDoc text 做等价比较。若不行，保留 `tsgo` + TS LanguageService 两项互补 proof；full 超时归 contention profile/lane-local policy，而非拆碎 Check 或降低覆盖。root 并发与 hard timeout 不变。

### 未知与不可外推范围

- 未运行 full Gate，不能给 full types 5.6–6.0 秒分配 scheduler wait、CPU contention、Gate transcript I/O 或并行 Check 的因果份额。
- 顺序 target sample 不代表 CI、cold checkout、不同 CPU/Bun/tsgo；six-sample range 证明单次 wall 不能判回归。
- 无 process-tree CPU/RSS、syscall 或精确 spawn duration；静态 process counts 只是下界。docs 的 12 starts 也不表示 12 次都在 critical path，需 P0 验证。
- provider 8.95–9.12 秒被并发工作区改动触发的 candidate rebuild 污染，不能作 budget/timeout 决策。
- 未实施建议；报告不授权改 Gate mapping、合并 checks、调 scheduler、放宽 timeout 或改测试。
