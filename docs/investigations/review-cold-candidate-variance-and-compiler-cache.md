---
title: "复核失效候选波动与编译缓存边界"
id: "260924-review-cold-candidate-variance-and-compiler-cache"
formedAt: "2026-09-24T09:25:45Z"
question: "70秒失效候选全量 Gate 的波动来自哪里，候选脚本变化是否必须重跑原始编译？"
tags:
  - "cache-design"
  - "package-candidate"
  - "performance"
  - "project-gate"
relations:
  - type: "补充"
    target: "260924-audit-incremental-project-gate-selection-and-cold-cost"
    summary: "分解70秒样本并验证候选脚本变更的编译缓存收窄"
---

## 形成时背景

前序[增量 Gate 调查](./audit-incremental-project-gate-selection-and-cold-cost.md)在同一工作树组合中记录了失效候选 `--all` 的 48.1 秒通过与 70.0 秒失败，以及热候选约 31 秒通过。用户要求开始下一阶段，不提高本机 `--all` 的 60 秒手工硬阈值，也不以增加并行度代替剥离不必要工作。本轮聚焦 70 秒样本的可解释范围和 package candidate 原始编译缓存的输入边界；先前报告的 change-selection 与测试拆分结论不在这里重做。

## 调查目的

1. 分别观察失效候选准备与 Product Run，而不是把 70 秒全归给打包、`tsgo` 或某一个 Check。
2. 核对候选身份失效时，非编译相关的 package 脚本变化是否还必须使 raw compiler emit 失效；若不必，保持完整 candidate rebuild、pack、安装和审计不变，只收窄编译中间产物的失效范围。
3. 用真实候选准备、局部测试和完整 Gate 验证修改，并界定单次节省与 60 秒门禁的关系。

## 调查范围与依据

本轮 HEAD 为 `db79ccd5f00e2e5f27dd1fd5b60bb74284d56ae7`；本轮源码和文档改动尚未提交。环境为 Linux x64、Gate 的 mise-bound Bun 1.3.14，cgroup `cpu.max=400000 100000`（四核配额）。下文 Gate 时间均来自各 invocation 的 `gate.log`，Check execution 时间来自 `core.log`；它们并行重叠，不能相加为墙钟。`/tmp` 隔离副本保留原仓依赖链接与 OS/page/package-manager 缓存，不是完全冷机。

| 场景与日志时间（UTC） | Gate 总计 | 候选准备 | Product Run | 结果 |
| --- | ---: | ---: | ---: | --- |
| 08:38 失效候选 `--all` | 48.103s | 14.872s | 32.728s | 43/43 passed，60s 门禁通过 |
| 08:58 失效候选 `--all` | 70.032s | 26.537s | 42.970s | 43/43 Check passed，60s 门禁失败 |
| 09:13–09:14 三次顺序热候选 `--all` | 28.865 / 29.593 / 31.726s | 0.126 / 0.116 / 0.120s | 28.348 / 29.108 / 31.238s | 三次均 43/43 与门禁通过 |
| 09:22 本轮修改后失效候选 `--all` | 39.253s | 9.245s | 29.445s | 43/43 与门禁通过 |

对应日志分别为 `.log/project-gate/2026-09-24T08-38-01.654Z-2338656-3b9e220d-104b-439e-9ee6-4557a4c3c608/`、`2026-09-24T08-58-52.700Z-2358378-631c7c65-4cdb-4064-9ea4-88973a1f1129/`、`2026-09-24T09-13-22.514Z-2376929-6caf54da-4914-4811-87f8-0efde5783af9/`、`2026-09-24T09-13-51.617Z-2379341-73e355a1-9933-4200-92ad-1c84388cf554/`、`2026-09-24T09-14-21.479Z-2381704-628fe782-4f9e-4091-a4cd-48c16a198963/` 和 `2026-09-24T09-22-45.557Z-2389148-7cf543f4-fb1b-4d24-9bb2-db9093a4d79b/`。除最后一次外都是修改前的同一组合；最后一次不是严格配对 before/after。

对 08:38 与 08:58 两次完整 Run 中同名的 43 项 `check.finished durationMs` 对齐，时长倍率中位数约 1.09；但四个突增项为 package supporting 1.884→9.423s、Markdown lint 4.376→10.441s、Product function metrics tests 2.818→7.234s、external consumer type acceptance 4.598→8.669s。package supporting 的 `process.log` 记录同为 29 tests / 17 files，Bun 测试 runner 报告 1.86→3.59s；Check 的其余耗时不能仅凭这份 transcript 分配到哪一步。三次热候选公开 `bun run check -- --all` 的 cgroup `cpu.stat` 差值显示各次 CPU usage 约 96.0 / 99.2 / 106.4 CPU 秒、`throttled_usec` 约 10.9 / 11.1 / 13.1 秒；这是整个 cgroup 的累计节流时间，不可直接加到 Gate 墙钟，也没有两次失效候选对应的历史采样。

另用隔离输出目录直接调用 `preparePackageCandidate`，并在不改变行为的 `execaSync` 包装下记录子命令。三个独立的新 state 样本总计 7.865 / 7.229 / 6.488s，其中 `tsgo` 为 4.702 / 4.632 / 4.194s、pack 均约 0.145s、安装约 0.7s；同一 source/state 保留 emit 后强制 rebuild 约 2.5–2.8s。较早的独立新 state 样本也出现 12.3–16.5s，总体说明全局缓存/主机条件仍变动。这些都是源码不变、依赖与 OS 缓存未清的局部样本；08:58 的候选没有逐子阶段历史计时，无法判定其 26.5 秒具体卡在哪一步。

改动后的物理对照在两个由当前工作树复制的 `/tmp` 仓库中进行：排除 `.git`、`build`、`.cache`、`.log`、`tmp` 和 `node_modules`，把 `node_modules` 链回原工作区；每个副本独占 build/state/consumer。旧组把 `compiler-cache.ts` 换成 HEAD 字节，新组保留本轮代码。各组先冷 `preparePackageCandidate`，再只在该副本的 `scripts/package/candidate/install.ts` 追加注释并再次准备；在同一个副本内比较 version、action、`candidate.tsbuildinfo` mtime 和 `performance.now()` 耗时。两个副本的绝对路径与外层脚本均为临时调查材料，已在 `finally` 清理，没有改动工作区的候选状态。

## 调查结果与边界

**70 秒不能只解释为候选打包回归。** 相比 48.1 秒通过样本，08:58 候选准备多 11.665 秒，Product Run 多 10.242 秒；多个异类 Check 同时变慢。热候选三次为 28.9–31.7 秒，未复现该失效候选故障。cgroup 节流及宿主负载是待检验解释，不是已证根因；没有 08:58 的系统级历史指标或候选子阶段 trace。也不能把本次 39.3 秒通过当作旧 70 秒环境下会通过的反事实。

**找到并移除一个确定的不必要冷编译。** 旧 `fingerprintCompilerInputs` 把所有非 test 的 `scripts/package/**` TypeScript 都纳入 raw emit 配置摘要；因此仅改候选安装/receipt/external consumer 脚本也会清掉 compiler state。候选版本的 `createArtifactFingerprint` 仍有理由覆盖整个 package lifecycle，并且本轮未收窄它。修改后 raw emit 配置只绑定 `build.ts` 的编译调用、compiler cache 自身、source inventory、package contract/public inventory、Bun 运行包装与 process runner 闭包，以及既有 toolchain/manifest/lockfile；Product 源码集合及内容仍单独绑定。`preparePackageCandidate` 每次候选指纹失效仍完整重建 staging、审计、pack、安装、核对和写 receipt。

| 隔离副本的 candidate-only 脚本变更 | 首次冷准备 | 变更后再次准备 | 再次 action / version | `candidate.tsbuildinfo` |
| --- | ---: | ---: | --- | --- |
| HEAD 旧缓存规则 | 8.733s | 7.245s | rebuild / version 变化 | mtime 变化，重新编译 |
| 本轮新缓存规则 | 8.105s | 2.663s | rebuild / version 变化 | mtime 不变，复用 emit |

同场景第二次准备的单次观察差为约 4.58 秒；顺序副本采样不是随机化配对，也没有 p50/p95，不能声称稳定改善整个 `--all` 4.58 秒。它与直接记录的 `tsgo` 约 4.2–4.7 秒相符，证明本轮收窄命中的是编译而非跳过候选验收。局部 `compiler-cache.test.ts` 同时断言文档/候选安装脚本变化复用 emit，编译调用变化、源码内容/集合变化与缓存损坏仍触发应有编译。测试仍是原有一项 Case 目的，不新增名义 Case。

验证：`mise exec -- bun test scripts/package/artifact/compiler-cache.test.ts` 1/1 passed；`bun run package:candidate:integration` 6/6 passed（该脚本实际使用主机 Bun 1.4.2，而 Gate 使用 mise-bound 1.3.14）；`bun run typecheck -- scripts`、`bun run lint -- scripts`、`bun run format -- check`、`bun run validate`、`bun run test-evidence -- check --root .` 均通过；真实 `bun run check -- --all` 43/43 和本机 60 秒门禁通过。另以 `git diff --check` 核对局部 whitespace。`docs/tooling/package-lifecycle.md` 已把 candidate 身份和 raw emit 缓存边界分开说明。本轮没有提高/自动更新任何本地性能阈值，也未改调度并行配置。

**09:27 报告建立后的日常路径复测。** 原工作区 `bun run check` 为 21 passed / 22 N/A，Gate `elapsed-to-initial-result=15.547s`，其中候选准备 0.141s、Product Run 15.038s，本机 required 20s 门禁通过。日志位于 `.log/project-gate/2026-09-24T09-27-51.310Z-2398114-f7bcd8c3-6ff5-4e71-8849-a9b341b353fa/`；这是热候选且依当前未提交变更选择的快照，不能代表所有日常改动。

后续若要定位偶发 70 秒失败，优先采集失效候选阶段的 `tsgo`、staging audit、pack、安装与验收分段时间，并在同一运行窗口记录 CPU/IO/内存压力；没有这些数据前不应据单项 Check 排名扩大资源 claim、删除测试或放宽硬阈值。当前优化只降低**非编译相关 package 脚本变更**之后的候选准备开销；Product Run 的波动与全量冷态 60 秒余量仍未得到保证。
