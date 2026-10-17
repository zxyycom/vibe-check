# Prepared facts performance evidence

本轮证据支持单次 Run 的事实交接：减少已确认的重复操作，不宣称整个 Run 或 Scheduler 渐近降阶。

适用版本：以下数据绑定本切面冻结镜像与 2026-10-13 05:02:17–05:09:03 UTC 的独占采样，不包含后续 Scheduler
需求集成或本次文档／等价代码整理。源码版本以本页 manifests 为准；未对整理后的当前工作树重新计时。

## Frozen comparison

- 环境：项目 pinned Node 24.18.0 / Bun 1.3.14，Linux x64。运行命令经 `mise exec -- bun`。
- 同份当时完整 `src` 构造 candidate/baseline；baseline 仅恢复本切面 15 个修改文件并去除两个新增文件，其它改动（包括同期 exact-key、Markdown、Duplicate）一致。源清单和差分当时位于 workspace `tmp/optimization-wave-20261013/prepared-facts/`；现有证据入口见本页末尾的历史交接。
- Baseline source manifest SHA-256：`b040a9527e2cdb64bf74774a5f1b4580cb9e3784d3ca03c4153e6f6dd4df424b`；candidate：`bc999eb08dd3a9bfb237f03ed64ba61057c7faf378616b4741870a4960662708`。
- 差分 manifest：`5d48d00322781e7a6ca1bfd7c6f2e40f0c13a45c5159578aa618059382ff15dc`；本切面工作区 owner freeze：`31697195a483948a09f235649316d39fceee7a0bd0a02232e773c3b42a18c9c3`。
- 这些是本切面冻结时的实现，不把之后串行集成的 Scheduler 需求声明当作本轮性能来源。

## Public API workload and protocol

`workload.ts` 从镜像 `src/index.ts` 导入 `defineConfig` 和 `run`；每 child 创建一份普通 Definition 并重复调用公开 Run。
N=8/128/512 executable Checks，按每组 16 个置于 container；每个 Check 有八项嵌套 options、三档 priority、named-resource claim，
每八项有一项 observe 前项。root cap=8、inherited cap=4、worker capacity=8；async no-op execution 返回 passed data。
static 与 public custom/prepared（选择首个可准入 candidate）分别测量。输出为 all-disabled 或 diagnostic-only，machine/progress 均关闭。
真实扫描、外部命令、Git 和 machine/progress IO 不在 workload 中。

每 cell 两轮 ABBA，第二轮反转且首轮按 cell 交替；每 child 3 warmups + 5 timed Runs。
每 cell 两侧各 20 timed Runs、四对 matched batches；共 96 children、480 timed + 288 warmup = 768 Runs。
计时从调用公开 `run` 到其成功返回；import、Definition authoring、创建/清理独占 workspace 临时输出目录不在计时内。
每次 Run 验证 completed/passed 与完整 Check count；进程间 JIT 独立，child 内 warm，未强制 GC。

root 独占正式采样窗口：2026-10-13 05:02:17–05:09:03 UTC，记录窗口 406 秒（6 分 46 秒），exit=0；仅执行一轮，raw 以 noclobber 创建。
前后全部冻结 source hash 与六项 harness hash 完全一致。root 独立重新核对 batch/sample 数量、版本、hash 和 paired statistics。

当时执行的是专属临时 helper，以 noclobber 保护已有 raw；现仅保留其方法与结果，不提供原目录上的重跑命令。

## Direct operation and semantic evidence

临时 instrumented source clones 在五个真实函数入口累计调用；不修改 Product、不新增 test-only interface，不参与正式 timing。
对 N=8/128/512 的 static/custom 六种公开 Run：

| Operation | Baseline | Candidate |
| --- | ---: | ---: |
| parseCheckTreeAuthoring | 2 | 1 |
| resolveParsedCheckTree | 2 | 1 |
| materializeCheckTreeAuthoring | 1 | 0 |
| planStaticCheckGraph | 4 | 1 |
| prepareTaskGraph | 4 | 1 |

独立完整 Run identity probe：strategy prepare 与 decision/generic-terminal/prepared-terminal 的 graph identity，baseline 三个 false、candidate 三个 true。
这是预期的可观察一致性改进，不宣称所有 public object identity 不变。
两个新增直接测试还证明完整静态 graph 保留未选择项、control/dependent/observer outcomes、同 cap/resource 来源及同 authored identity 跨 Run 修改后重新读取、旧 facts 不受影响。

## End-to-end observations

单位为毫秒；pooled median 使用每侧 20 样本。paired change 使用四对 batch medians 的相对变化中位数，负值表示 candidate 更快。
p95 为每侧 20 样本 nearest-rank observation，不是预算、置信区间或持续保证。

| N | Strategy | Outputs | Median before → after | p95 before → after | Paired change; range |
| ---: | --- | --- | ---: | ---: | ---: |
| 8 | static | disabled | 5.752 → 3.983 | 8.857 → 7.505 | -25.06%; -50.3..-23.4% |
| 8 | static | diagnostics | 10.491 → 9.011 | 18.422 → 13.334 | -15.98%; -25.1..+12.0% |
| 8 | custom | disabled | 6.043 → 5.478 | 8.696 → 8.592 | -9.66%; -13.2..-2.1% |
| 8 | custom | diagnostics | 9.715 → 7.729 | 15.607 → 12.525 | -9.27%; -28.1..+3.7% |
| 128 | static | disabled | 57.382 → 49.455 | 62.959 → 57.415 | -10.28%; -18.1..-4.9% |
| 128 | static | diagnostics | 147.743 → 139.190 | 160.642 → 148.871 | -5.88%; -7.4..-2.6% |
| 128 | custom | disabled | 94.945 → 93.130 | 108.609 → 125.407 | -3.43%; -10.9..+30.7% |
| 128 | custom | diagnostics | 173.554 → 156.191 | 187.563 → 228.399 | -8.72%; -11.7..+5.3% |
| 512 | static | disabled | 517.307 → 484.138 | 537.368 → 815.999 | -4.10%; -5.9..+12.5% |
| 512 | static | diagnostics | 1755.835 → 1717.789 | 1814.509 → 1863.841 | -3.33%; -3.9..+1.9% |
| 512 | custom | disabled | 1110.769 → 1065.547 | 1255.720 → 1107.834 | -4.87%; -14.3..-1.3% |
| 512 | custom | diagnostics | 1889.299 → 1875.609 | 1944.587 → 2041.905 | -0.96%; -4.4..+4.3% |

重复构造确实消失；small static-disabled、128 static 两种输出和 512 custom-disabled 的四对 batches 一致较快。
其它 cell 包含反向 pair；128 custom-disabled 为两胜两负且范围较宽，512 custom-diagnostics 的 -0.96% 也只有两胜两负，不能据此证明加速。
部分 candidate p95 更差，保留在表中，不以 pooled median 掩盖尾部波动。
大图端到端仍主要承担未优化的调度与 measurement/output 成本，操作减少不等于全路径成本降阶。

各 cell 的 child peak RSS 已存 raw/summary；observed maxima baseline 142–247 MiB、candidate 136–244 MiB（包含 startup/import 与全部 warm/timed calls）。
这些进程高水位不是 retained heap 或 allocation 证明；此 Change 延长部分 validated static facts 引用生命周期，不据此保证内存降低。

采用依据：公开路径每 Run 不再重复 parse/resolve/plan/prepare，交接具 provenance/cap 约束，无跨 Run cache 或公开 compile API；small absolute overhead 未出现可确认代价，
部分代表 cell 有一致收益。对噪声或大图 collector-dominated cell 不主张显著加速；原调度安全、输出与取消契约继续由 tests 和独立 review 证明。

## Audit files and remaining verification

- `timing.ndjson` SHA-256：`3e28937a323fb482311fb3f8377edbf66e87e3576206481967a3e27a6dfe0f49`。
- `timing-summary.json`：`00508b31c24887df5da80a2408730c25301d18102170808221be1e05f9c39efe`。
- `harness-freeze.json` / `harness-after.json`：同为 `bac525c6371dd511f03ee1977a6246a8e48e925690800c529e5594906e400861`。
- `operation-counts.ndjson`：`a1a89da25d3597394598b439796fe6f0da408d4ed515d44588ef7e8e2455b09b`；`identity-probe.ndjson`：`cdfc0d5b11f33c9cfad13362a64b1372b541faa9b314d12f36a660a58c8fdeda`。
- 切面冻结时 pinned Definition+Run：197 pass；product/scripts typecheck、product lint、局部 diff check 通过。独立 reviewer 29 frozen tests pass、无阻断；当时 Case check 706/176/15 通过，并更新三个内部 owner。
- 上轮串行集成后的组合 Gate、dependency 和安装包验收已通过；完整记录见[任务交付证据](tasks.md#delivery-evidence)。本次文档与等价代码整理后的验证由主线程另行记录；上述切面计时不证明整理后源码重新测量。

## Historical evidence handoff

2026-10-17 补存：[本切面历史验收材料](evidence/historical-acceptance.json)承接仍需复核的样本、方法、身份与边界。
本页其余 `tmp/`、旧 `.log/` 路径仅标注形成时现场，不再承诺保留、读取或执行；历史 source digest 不等于
可重建当时全部未提交源码。源码镜像、fixture、生成 IO、完整 profile 与一次性工具退出，未重新采样或运行 Gate。
这些材料只解释本 Change 的形成时验收，不是永久 benchmark 或可重跑 SDK。
