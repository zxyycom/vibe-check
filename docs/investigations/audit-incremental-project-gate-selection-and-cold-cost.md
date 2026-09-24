---
title: "审计增量 Project Gate 的选择与冷启动开销"
id: "260924-audit-incremental-project-gate-selection-and-cold-cost"
formedAt: "2026-09-24T07:41:03Z"
question: "为什么默认 check 仍偏慢；change flag 实际跳过哪些 Check、如何强制运行，以及当前 43 项在冷/热条件下各有多大开销？"
tags:
  - "change-selection"
  - "package-candidate"
  - "performance"
  - "project-gate"
  - "test-execution"
relations:
  - type: "复查"
    target: "260908-calibrate-gate-duration-variation"
    summary: "在43项新组合与本机硬阈值下复测Gate耗时"
---

## 形成时背景

2026-09-23 的用户现场为 `bun run check`：38 项中 32 passed、6 not applicable，Product Run 显示 35.5 秒；此前虽有性能门禁，用户仍观察到日常 Check 过慢。随后的工作区调整把测试执行分成更细的 lane，按 Check 自身输入 region 选择 required 项，并为 required / `--all` 使用本机手工总耗时硬阈值。用户要求重新审视 change flag 是否启动、是否仍过宽、测试是否足够原子；不把增加并行度当作拆分目的。随后发现只运行默认 required 会跳过很多项目，需用强制路径补测。

本轮采样时 HEAD 为 `a97aa92e85e76172747bf4cd3173ed59374d2989`，工作树含未提交的 Gate、文档和测试改动。用户最初的 38 项输出与本轮 43 项不是同配置 before/after。前序[Gate 时长校准](./calibrate-gate-duration-variation.md)在 2026-09-08 的旧组合与复用 candidate 上取得 5 次 `--all` 数据，服务虚拟负载校准；本轮在新组合下复查选择和冷/热开销，旧数值不能直接归因于本轮拆分效果。

## 调查目的

1. 核对默认 required 的 change flag、focused presets 和 `--all` 各能强制选择什么；澄清“未运行项目没有强制路径”的误判。
2. 在相同当前工作树快照上取得每项 Check 的冷运行量级，区分候选准备、Product Run 和外层命令墙钟。
3. 记录本机手工硬阈值的实际状态、指纹失败与验证结果，不用运行数据自动学习或更新基线。
4. 根据实际覆盖与耗时提出下一轮应先测什么、怎样按行为和变更输入继续剥离不必要测试；方案保持待验证，不把改并行度当作优化成果。

## 调查范围与依据

### 入口、环境与计时口径

- 使用公开入口 `bun run check`、`bun run check -- --all`，以及隔离副本中的 `mise exec -- bun scripts/project/gate/run.ts ...`。核对 [Gate owner](../tooling/project-gate.md)、`scripts/project/gate/runtime/controls.ts`、`eligibility.ts`、`checks/test-execution/lanes.ts`、`checks.ts`、`runtime/performance-baseline.ts` 与 `performance-observation.ts`。
- 当前环境为 Linux x64，`mise exec` 下 Bun `1.3.14`，`nproc=4`；候选显示为 `0.0.0-local.54f1b2ac9956`。直接调用工作区其他 Bun 版本不用于本轮 Gate 计量。
- `Execution summary.elapsed` 是 Product Run 内的显示值；`core.log` 的 `check.finished durationMs` 从 Check execution 到 settlement，**不含**启动前 candidate preparation、准入等待及整个命令外壳。Check 可重叠，不能相加重建总耗时。`gate.log` 的 `elapsed-to-initial-result` 才是 required / `--all` 的硬阈值比较口径。冷命令外层用 `date +%s%3N` 差值计时；此主机该格式实际给出纳秒级后缀，原始差值 `57103912351` 按纳秒换算为约 57.104 秒；外层时钟未经校准，不作为 Gate 内部阈值判定。
- 冷副本 `/tmp/vibe-check-all-cold.4524CK` 由当前工作树 `rsync` 形成，排除了根 `build`、`.cache`、`.log`、`tmp`、`node_modules`，再把根 `node_modules` 链到原工作区并复制手工基线文件。因此是**本仓候选和检查缓存冷态**，不是全新依赖安装或清除 OS page cache。完整冷日志目录为 `/tmp/vibe-check-all-cold.4524CK/.log/project-gate/2026-09-24T07-31-33.772Z-2287602-aa92b0be-3213-41e5-8990-056044bc3f4d/`；随附 CSV 从该目录 `machine/run.json` 的身份与 `core.log` 的 43 条 `check.finished durationMs` 提取，并核对 43 个 ID 唯一。
- 其它采样以各自 `.log/project-gate/<invocation>/gate.log`、`progress.log` 和 `machine/run.json` 为依据；选择矩阵资源按 Check ID 对齐原工作区 required、隔离副本 focused 并集及冷 `--all` 三次 Run 的 outcome。下表是单次观察，不含重复样本、CPU/RSS、宿主负载或置信区间。`/tmp` 和工作区 `.log` 是现场路径，未来可能清理，关键逐项数值与选择状态随附于本报告。

### 各选择条件的实际观察

| 场景（2026-09-24 UTC） | passed / N/A | Product Run 显示 | Gate elapsed-to-initial-result | 最终状态与条件 |
| --- | ---: | ---: | ---: | --- |
| 原工作区 required，07:16 | 21 / 22 | 15.5s | 16,354.0ms | passed；本机 required 20,000ms |
| 先前隔离副本 required，07:20 | 21 / 22 | 19.9s | 未作匹配评价 | 21 Check passed；副本 fingerprint 与复制的 required 记录不匹配，Gate failed |
| 同副本组合 `--test --typecheck --lint --materials --quality`，07:29 | 34 / 9 | 27.3s | focused 不评估总时限 | passed；candidate 已复用，不是全冷 |
| 新隔离副本首次 `--all`，07:31 | 43 / 0 | 40.0s | 未作匹配评价；命令外层约 57.104s | 43 Check passed；副本 fingerprint 不匹配，Gate failed |
| 新隔离副本修正 fingerprint 后 `--all`，07:33 | 43 / 0 | 29.5s | 30,398.8ms | passed；候选与缓存已热，60,000ms 门禁通过 |
| 原工作区公开入口 `bun run check -- --all`，07:33 | 43 / 0 | 31.0s | 31,905.5ms | passed；60,000ms 门禁通过 |

原工作区 required 和 `--all` 的明细日志分别位于 `.log/project-gate/2026-09-24T07-16-47.073Z-2274432-e6fb3276-c083-4656-bdc4-8ce67b09ec84/` 与 `.log/project-gate/2026-09-24T07-33-58.031Z-2297056-8d8abe60-9317-4201-8289-2f59d22aacd1/`。组合 focused、隔离冷态与隔离热态的证据目录时间戳依次为 `2026-09-24T07-29-31.007Z`、`2026-09-24T07-31-33.772Z`、`2026-09-24T07-33-02.285Z`，均在上述各自隔离副本的 `.log/project-gate/` 下。

## 调查结果与边界

### 阶段结论

- 默认 required 的 change flag 在采样快照中生效：43 项里 21 项运行，17 项 required 因变更未命中而跳过；完整强制入口 `--all` 运行 43 项。
- 本机硬阈值由人工设为 required 20 秒、`--all` 60 秒。两次失效候选 `--all` 分别为 48.1 秒通过、70.0 秒超时；随后复用候选 `--all` 为 31.0 秒、required 为 13.8 秒且均通过。失效候选没有稳定的 60 秒余量；两次样本均非完全冷机结果。
- Gate selection 测试从重复的真实 Git/Product Run 矩阵改为输入 region 矩阵；编译 raw emit 增量缓存已实施，但候选仍完整组装、审计、pack 和安装。收益只有单次顺序样本，尚不能宣称稳定提速率。

### 已确认的选择和门禁事实

1. `--all` 是已有的**完整强制路径**：忽略 change flag，43/43 均运行，包含 prepared external consumer、artifact 和三个 external-consumer acceptance。此前把 required 下 22 个 not applicable 说成“无法测量”是错误的。focused presets 也绕过各自的 change flag，但五种预设并集只选中 34/43；余下是 5 项 package acceptance 和 Source format、Prepared package candidate、Decision records、Git diff whitespace。当前没有“仅关闭 required change flag、同时排除 package acceptance”的独立 preset；本轮完整测量不需要发明它。
2. 默认 required 在本次 Git 变更快照中选中 21/43；22 个 N/A 中 **5 个是本来不属于 required 的 package acceptance，17 个是 required 的 change flag 未命中**，说明 change flag 确实参与选择。每项状态见选择矩阵资源；这个快照不证明每个 region 都足够窄或语义正确。可信 Git evidence 缺失时仍按保守路径执行，不能把跳过数量当作通用提速率。
3. 本机忽略 Git 的 `.cache/vibe-check/project-gate/performance-baseline.json` 由人工明确设置 `required=20,000ms` 与 `all=60,000ms`，按 Linux/x64/Bun 1.3.14 与声明指纹匹配。07:31 冷副本的指纹 `d4d0e25c…` 与当时复制的原工作区指纹 `60253b345…` 不同；43 项 Check 虽通过，Gate 最终失败。两根目录的指纹差异原因未调查。后来实施改动使原工作区指纹变为 `2e873b02…`，手工更新与门禁复测见下文。缺配置在 candidate preparation 前失败，指纹不匹配在 Checks 全通过后仍失败。

### 当前量级和可能的优先级

冷 `--all` 的最慢 Check 是 `typecheck-product=10.050s`、`typecheck-scripts=9.947s`、`tests-scripts-validation=7.087s`、`tests-scripts-package-tools-boundary=5.040s`，其次是 `markdown-lint=4.101s`、`tests-scripts-project-selection=4.018s`、`markdown-link-validation=3.910s`。这只是同次并发 Run 内单项 execution duration，不表示它们依次占满墙钟。完整 43 项的 Check ID、显示名、毫秒值见随附 CSV。

冷首次 `--all` Product Run 约 40 秒，而外层命令约 57.1 秒；**约 17 秒差额发生在 Product Run 外**，主要候选准备是合理调查方向，但本次没有冷 Gate phase 明细（最终因指纹不匹配而未输出匹配基线的 timing description），不能将整段差额严格归因给 candidate builder。`prepared-package-candidate` Check 自身仅 5.610ms，不能拿它当冷候选准备成本。暖 `--all` 的 candidate preparation 在原工作区仅 143.0ms，说明冷/热候选状态对总时间的影响值得独立测量。

过去称为“Project Gate 工具测试约 14 秒”的大 lane，在当前分组下是 `tests-scripts-project`：14 个文件、51 个 tests，冷执行 **2.851s**。真实 Git 选择矩阵已移至 `tests-scripts-project-selection`（4.018s），layout、package-tools boundary、machine-artifact 也已单列。不能因为当前仅 2.851s 就认定剩余 14 文件已足够原子：`project-tests` 的 change region 仍包括整个 `src/**`、`scripts/package/**`、`scripts/validation/repository-material/**` 等广域输入。本轮未取得逐文件时间与依赖矩阵，不能声称其中哪一个文件最重或应怎样无损拆分。

### 日常路径与调整方案

原工作区 required 的 Product Run 约 15.5 秒。selection lane 执行 8.714 秒，在 Product 时钟约 8.88 秒处已结束；最后完成的较大工作是 Project Gate tooling（3.249 秒，约 15.55 秒完成）、layout（3.354 秒，约 14.65 秒完成）和 Markdown links（3.191 秒，约 14.49 秒完成）。另一隔离副本的 required Check 冷态约 19.9 秒，尾部是 scripts typecheck（6.617 秒，约 19.98 秒完成）和 selection lane（5.620 秒，约 18.65 秒完成）。两次缓存与路径条件不同；逐项时长和完成时刻见随附 CSV，不能由此推定关键路径或稳定提速率。

由此把下一步收敛到两个独立问题：

1. **selection lane 的证明是否重复。** 原 Gate 测试以六个测试实体反复创建真实 Git fixture 并执行 Product Run；Product 已验证 Git changed-path、rename 与 unavailable fallback，Gate Definition 已验证 required/all/focused 接线。应保留 Gate 自己的 region 映射证据，并逐条审查 `AUX-PROJECT-GATE-SELECTION-001` 是否还需要重复的端到端矩阵。下面的 08:20–08:33 补充记录了实际取舍与结果。
2. **整包身份与编译中间产物能否分开维护。** 形成方案时，`preparePackageCandidate` 的 rebuild 会删除 `candidate.tsbuildinfo`，然后重新编译、组装、审计、pack 和安装；341 个逐模块 `.mjs` 文件并不自动意味着跨 rebuild 的 emit 缓存。旧[Candidate lifecycle 进程审计](./audit-project-gate-candidate-lifecycle-process-overhead.md)曾在另一 workload 量到 `tsgo` 约 7.37 秒、一次 install 约 7.78 秒、pack 约 0.124 秒，仅支持优先调查编译/安装，不足以归因本轮约 17 秒外层差额。下面的补充记录了 raw emit cache 的实施和隔离构建样本。

`markdown-link-validation` 的任意变更选择覆盖尚未建模的链接目标反向依赖；layout lane 扫描当前源码。这两项需要先证明可收窄的输入闭包，不能仅凭单次 3–4 秒观察关闭。下一轮性能结论也需要固定 Git 变更矩阵、candidate、Bun/主机和冷/热定义，多次比较命中、阶段计时、最终结果与测试证据。

### 2026-09-24 08:20–08:33 补充：测试剥离与原始编译缓存

Gate 侧的 `runtime/eligibility.test.ts` 从 6 个测试实体、约 1058 行真实 Git fixture/Product Run 矩阵，改为 3 个测试实体、约 150 行路径→region 输入矩阵；使用与 Product config-glob 相同的 `minimatch` 选项，不跨脚本/产品 import 边界。真实 Git changed-path、rename、删除及 unavailable fallback 仍由 Product 的 `src/project-run/changes/git.test.ts` 验证，Gate `definition.test.ts` 仍覆盖 required/all/focused 条件和聚合。`AUX-PROJECT-GATE-SELECTION-001` 的实体与证明说明已同步。测试证明的组合边界从“Gate 再执行一遍完整 Product Run”改为“Product 拥有 Git 快照、Gate 拥有 region 数据和 flag 接线”；这不是同一执行路径的端到端证明，若将来改变二者交界应重新审查是否需一条针对性集成测试。

同一工作区单独 `bun test scripts/project/gate/runtime/eligibility.test.ts` 的顺序观测：调整前 **4.465 秒**，调整后 **0.386 秒**（约少 4.08 秒、91%）；旧六项中的物理矩阵分别约 0.38、0.79、1.00、0.24、1.40、0.09 秒，调整后三项约 0.034、0.013、0.099 秒。Bun 启动、OS 文件缓存及宿主负载未控制，不能将 4.08 秒直接等同为默认 Gate 墙钟缩短量。一次后续完整 `--all` 中 selection lane 为 **442.5ms**，43/43 Check 自身通过，Product Run **32.9 秒**，外层命令约 **34.04 秒**；但该次最终因本机旧声明指纹 `60253b…` 与新指纹 `2e873b…` 不匹配而失败，**不能记为性能门禁通过**。日志位于 `.log/project-gate/2026-09-24T08-28-59.791Z-2323993-0221e28d-a587-4292-9b1d-dfb14c9ed02e/`。

候选构建另增非发布的 raw compiler emit cache：`candidate.tsbuildinfo` 配合 `tsgo --incremental`，在 `.cache/vibe-check/package-candidate/compiler-emit/` 保存 `.js`、source map 与 declarations，并以源码集合/内容、工具链与 package builder 输入及输出摘要校验。文档-only 变更可跳过 `tsgo`；源码内容变更且文件集合不变可借编译器增量图处理，集合/配置变化或输出损坏会清空 compiler cache 重新 emit。每次 candidate rebuild **仍重新拷贝/归一化到唯一 staging、完整审计、pack、审计 tarball、安装并核对**；没有“逐模块 npm tarball”或跳过安装的承诺。脚本/产品分区和 cache 损坏的轻量测试已增加，`bun run package:build` 真实 rebuild 成功，显式 `package:candidate:integration` 6/6 通过。独立的同源码 artifact 构建顺序样本为冷 **7072.7ms**、使用同一 compiler cache 的第二次 **1704.7ms**（各 1407 个包文件、不含安装）。另在隔离仓库副本仅给 `src/index.ts` 加一行注释后，独立 artifact 构建由冷 **8633.4ms** 到源码变更后的增量 **2327.4ms**，两次均生成 1407 个包文件并通过 staging/tarball audit；该副本已删除。两组都是单次顺序样本，证明原始编译阶段有可复用空间，但不是冷 Gate 的配对 before/after，也不证明单文件编辑后整个 `check` 已达 20 秒。当前本机缓存校验是防误用/损坏机制，不是对能同时改写输出与摘要的本地攻击者的认证。

在同一手工阈值 `required=20s`、`all=60s` 下，把本机忽略 Git 的基线文件指纹**手工**从旧声明更新到完整 Run 实测的新声明 `2e873b02e3ea68576e2b77582df5baf8acffb65b237da484dd4205bfdd39e642`，未修改阈值，也未添加自动更新路径。更新后默认 `bun run check` 为 21 passed/22 N/A，Product Run 显示 12.8 秒，Gate 计量 **13,589.2ms**（候选准备 122.8ms），外层约 14.18 秒，门禁通过。完整 `--all` 首次重试遇到 `markdown-link-validation` 一次 `source-unavailable`，其余 42 项通过；因此那次性能门禁未评估，不能记为全量通过。随后不改源码的再次 `--all` 为 43/43 passed、Product Run 显示 27.9 秒、Gate 计量 **28,933.2ms**（候选准备 160.7ms）、外层约 29.21 秒，60 秒门禁通过，日志位于 `.log/project-gate/2026-09-24T08-32-13.247Z-2333403-f5f725dc-71fc-4c7e-ba40-26bd05258418/`。`source-unavailable` 的根因未在本轮定位，不能从一次通过推断全量检查无间歇性问题。这两次最终 Gate 都使用**热候选**，不能据此评价失效候选的 60 秒余量。

**08:38 最终代码补测。** 缓存记录进一步加入 `candidate.tsbuildinfo` 摘要，状态文件被改写也必须冷 emit；对应的轻量测试通过。修改 package builder 后候选指纹失效，完整 `bun run check -- --all` 从重新准备候选起执行，43/43 passed，Gate 计量 **48,102.7ms**（候选准备 **14,872.1ms**、adapter/setup 503.2ms、Product Run 32,727.5ms），外层约 **48.37 秒**，60 秒门禁通过；日志位于 `.log/project-gate/2026-09-24T08-38-01.654Z-2338656-3b9e220d-104b-439e-9ee6-4557a4c3c608/`。这是本仓**失效候选及失效 compiler cache**的补测，不是清除 OS page cache/依赖缓存的完全冷机试验，也不与先前 57.1 秒样本构成严格配对。之后同一最终源码的 required 为 21 passed/22 N/A，Product Run 显示 14.9 秒，外层约 15.99 秒，20 秒门禁通过。`mise exec -- bun run package:status` 读到当前 exact candidate；直接用主机另一 Bun 版本查询会得出不同指纹的 stale 状态，不应用来判断 Gate 候选状态。

**08:58 文档与编码审查后的补测。** 修改了 package compiler cache 校验与说明后，公开入口 `bun run check -- --all` 的 43 项 Check 全部通过，但硬阈值将最终 Gate 判为 failed：`elapsed-to-initial-result` **70,032.0ms**，其中 candidate preparation **26,537.0ms**、adapter/setup **525.3ms**、Product Run **42,969.7ms**，超过本机手工 60,000ms 阈值。日志位于 `.log/project-gate/2026-09-24T08-58-52.700Z-2358378-631c7c65-4cdb-4064-9ea4-88973a1f1129/`。改过的 compiler-cache 源码按当前指纹规则需要重新校验或重建；本次没有单独的 tsgo/安装阶段计时，不能把 26.5 秒归给某一阶段。单次结果证明硬门禁生效，也证明 60 秒对这一失效候选与当前宿主负载组合没有稳定余量；不能用前一次 48.1 秒通过覆盖这次失败。

**09:00–09:01 复用候选复测。** 不再修改 package builder 后，`--all` 的 43/43 Check 和最终 Gate 均通过：总 **31,007.4ms**，candidate preparation **145.9ms**、Product Run **30,430.3ms**；日志为 `.log/project-gate/2026-09-24T09-00-42.085Z-2364781-1f708b2e-f58a-4c46-8801-d8e56a9e9e71/`。随后默认 required 为 21 passed/22 N/A，Gate **13,816.0ms**（candidate preparation **132.2ms**、Product Run **13,259.1ms**），20 秒门禁通过；日志为 `.log/project-gate/2026-09-24T09-01-19.245Z-2367165-3f69e288-c4ff-43c6-a6aa-68dcc5b0b690/`。这两次只证明复用候选路径，不能消除前一次失效候选的 70.0 秒失败。

本轮仍缺重复采样、逐文件成本和 `markdown-link-validation` 间歇性 `source-unavailable` 的根因。当前规则由代码 owner、Decision 与测试策略承担；本报告只保存本轮证据和边界。

## 随附资源

- [冷态全量 43 项 Check duration](./_resources/260924-audit-incremental-project-gate-selection-and-cold-cost/cold-all-check-durations.csv)
- [两次 required 的 21 项 Check duration 与完成时刻](./_resources/260924-audit-incremental-project-gate-selection-and-cold-cost/required-check-timings.csv)
- [三种选择下的 43 项 Check outcome 矩阵](./_resources/260924-audit-incremental-project-gate-selection-and-cold-cost/selection-matrix.csv)
