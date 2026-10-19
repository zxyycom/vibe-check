---
title: "发布准备中 validation CLI 五秒超时的定向调查"
id: "261019-investigate-validation-cli-timeout"
formedAt: "2026-10-19T07:14:56Z"
question: "发布准备的默认全材料 CLI 测试为何触发五秒超时，现有证据能否确认根因与严重程度？"
tags:
  - "performance"
  - "project-gate"
  - "validation"
relations:
  - type: "复查"
    target: "260904-audit-project-gate-validation-and-type-acceptance-overhead"
    summary: "复查当前 validation 实体超时及并发影响"
---

## 形成时背景

2026-10-19，0.0.4 发布准备的文档整理已通过一轮完整 Gate，但此前完整 Gate 中
`root validate CLI runs every material task by default` 在 5078.99 ms 被 Bun 的 5000 ms
单实体超时终止。用户要求先提交文档，再定位测试问题并判断是否严重；本轮不实施修复。
文档已提交为 `b8cf54f4801397002b739c7945bf83e2ae6806ac`，本轮实测以该 clean checkout 为基线。

直接前序[开销审计](audit-project-gate-validation-and-type-acceptance-overhead.md)在 2026-09-04
观察过 validation lane 的启动成本，但未采 full Gate contention。本轮在新的源码、材料集和真实失败现场下，
复查其中 validation 的预算余量与并发影响；不重做 external consumer type acceptance 分支。
旧报告的 lane wall time 和本次单实体 timeout 不是同一个指标，保留两轮认识以免混淆。

## 调查目的

1. 区分材料内容失败、测试实体 timeout、Gate Check timeout 和性能告警。
2. 用同 runtime 的串行及并发对照缩小原因，判断是否存在产品错误或验证错误放行。
3. 判断形成时的严重程度、证据缺口和下一步边界，不用放宽 timeout 或重试通过代替定位。

## 调查范围与依据

### 形成时基线与失败现场

- 形成时行为依据：[仓库材料验证](../tooling/repository-material-validation.md#material-task)与
  Case `AUX-DOCS-VALIDATION-CLI-001`；当时要求保留真实 CLI 默认全任务完成与退休入口拒绝的证明。
- `scripts/validation/workspace.test.ts`：目标实体同步启动当前 Bun 的 `workspace.ts materials`，
  核对零退出、空 stderr 及 JSON/schema/examples/links 的成功摘要；package API task 没有独立成功摘要。
  本实体没有显式 timeout。
- `scripts/validation/workspace.ts` 与 `repository-material/workflow.ts`：等待五项 material task，
  内容错误返回非零，非预期异常继续抛出；没有把失败转成通过的路径证据。
- `scripts/project/gate/checks/test-execution/{checks,entries,lanes}.ts`：validation lane 没有
  `testTimeoutMs` override；四文件在一个 Bun test runner 内执行。Gate 的 120 秒 process 上限与
  本次 5 秒实体 timeout 分属两层；均值/P95 性能预算也不是这次失败原因。
- 失败现场：`.log/project-gate/2026-10-19T06-53-17.296Z-737251-b38a5100-be37-40a4-ac1c-7d927ca47eec/`。
  `process.log` 明确为 7 pass / 1 fail，目标实体 timed out after 5000ms；Gate 返回 failed / exit 1。
- 对照成功现场：`.log/project-gate/2026-10-19T06-55-39.956Z-744608-1a54842a-fc39-4341-8d21-6ffd3d21cf8c/`。
  43/43 passed；这是此前文档验收，不是本轮修复后的验收。两轮之间有 changelog 修改及候选重建，
  不能当作严格单变量 before/after。

失败时 validation lane 从 Run 相对时间 40.644 秒运行到 49.281 秒；product typecheck 为
40.644–53.085 秒，scripts typecheck 为 42.181–54.211 秒。成功轮 validation 为
1.306–5.809 秒，两项 typecheck 分别只用约 1.30、1.20 秒。
这确认失败窗口与长 typecheck 重叠；原次缓存状态和进程 CPU 未采集，不能由时长反推冷缓存已获证明。

### 测量条件与方法

实测于 2026-10-19 07:06–07:13 UTC，在 release preparation worktree、Linux WSL2 x86_64、
4 logical CPUs、cgroup CPU quota 4 核下进行；全部由 `mise exec -- bun` 使用 Bun 1.3.14，
不混入宿主 Bun 1.4.2 的历史复跑。材料集为 489 个 JSON、5 个 schema、1 组 current artifact、
4 个历史 report examples、575 个 Markdown。以下数据均在本报告及资源加入材料集之前取得。

临时 probe 用 `performance.now()` 围住 child spawn 至 close；记录退出码、stdout/stderr 时间点，
并设置独立 30 秒 watchdog。所有样本均在 watchdog 前自然退出。各组串行进行，组内按声明并发，
未修改共享 typecheck cache、测试、runtime、Gate 或 timeout。

关键命令形状如下；实际运行均由 mise 固定 Bun。随附资源保存完整样本、参数与原 Gate 现场节选，
用于核对下表计时和失败窗口：

```text
bun test scripts/validation/workspace.test.ts
bun scripts/validation/workspace.ts materials
bun scripts/validation/workspace.ts materials <task>
bun test scripts/validation/repository-material/links.test.ts \
  scripts/validation/repository-material/schema/strict-json.test.ts \
  scripts/validation/repository-material/workflow.test.ts \
  scripts/validation/workspace.test.ts --reporter=dots
bun node_modules/@typescript/native-preview/bin/tsgo.js -p <tsconfig> \
  --tsBuildInfoFile <new-probe-cache> --diagnostics
```

冷 compiler 对照同时运行 `tsconfig.product.json` 与 `tsconfig.json`，每个样本使用此前不存在的
probe 专属 build-info 路径；不清空项目已有缓存。exact lane 与 direct CLI 两组分别测试相对 compiler
启动延迟 0、500、1500 ms，以覆盖不同重叠时序。它们模拟原 Gate 的两个 compiler 竞争，
没有重建完整 Gate 的进程调度、日志或机器外部负载。

采集的 cgroup `cpu.stat` 是整个共享组的窗口增量，不是目标进程 CPU；并发窗口重叠，不能相加。
每组仅 3 次且非随机交错；报告样本范围，不估计失败率、P95 或统计显著性。

## 调查结果与边界

### 已确认的直接原因与对照结果

**直接失败机制是 Bun 的 5 秒单实体 timeout，而不是材料错误断言、Gate 120 秒超时或性能告警。**
目标实体内部执行真实全材料 CLI，因而把 child 启动、模块加载和全部五项验证纳入同一个预算。
日志的 `killed 1 dangling process` 表示 runner 当次清理了 child，不能据此认定存在持续进程泄漏。
超时前 child 的细分进度没有从测试透出，原次究竟慢在哪一步仍未知。

| workload（每行 n=3） | 目标实体时间 ms | 整个 child 时间 ms | 结果 |
| --- | --- | --- | --- |
| 单独 workspace test 文件 | 2115 / 2284 / 1502 | 3124 / 3191 / 2390 | 每次 3/3 passed |
| 单独全材料 CLI | 不适用 | 1507 / 1808 / 2670 | 全部 exit 0、stderr 空 |
| workspace test + 两个全材料 CLI | 3485 / 3158 / 2691 | 5169 / 4737 / 4336 | 每次 3/3 passed；陪跑 CLI 也全通过 |
| workspace test + 两个冷 compiler | 4666 / 3469 / 3531 | 6076 / 5309 / 5184 | 每次 3/3 passed；compiler 全通过 |
| exact 四文件 lane + 两个冷 compiler | dots 不输出成功实体计时 | 6189 / 5381 / 5333 | 每次 8/8 passed；compiler 全通过 |
| 全材料 CLI + 两个冷 compiler | 不适用 | 3500 / 3704 / 3079 | 全部 exit 0、stderr 空；compiler 全通过 |

整个 test child 超过 5 秒与单实体超时不是一回事，表中通过结果没有矛盾。
冷 compiler 组中可见实体最高 4665.77 ms，距上限剩 334.23 ms（约 6.7%）；
并发下明显变慢、预算余量小有直接样本支持，但这些组**没有再次触发原来的 timeout**。
串行窗口的 cgroup throttled periods 增量为 0；单文件配两个冷 compiler 时为 54 / 51 / 41，
支持共享资源压力存在，不证明它贡献了目标实体的多少耗时。

进一步拆选 task 的单次 child wall time 为 json 1755、schema 679、examples 869、links 614、
package-api-documentation 574 ms。它们都包含共同模块加载，不可相加或直接当作纯 task 成本。
三次全 CLI 的首个 JSON 成功摘要分别在 1084 / 1249 / 1893 ms 出现；这段包含初始化和 JSON Run，
不能全部归因于 JSON 扫描，也没有证据把 Markdown links 认定为原次瓶颈。

### 原因判断与严重程度

- **首要假设：并发资源竞争放大了真实 CLI 集成测试成本，使默认五秒实体预算不稳健。**
  原 Gate 的长 typecheck 重叠、对照中的变慢和共享 CPU throttling 相互吻合；仍缺原次 phase/进程级证据，
  不能写成“已确定由 tsgo 或 CPU throttling 导致”，也不能排除其他短时环境影响。
- **本轮暂定 P2：仓库验证可靠性问题，不是已发现的严重产品缺陷。** 失败会阻断 Gate/发布准备；
  现有流程正确返回失败，没有静默放行。所有定向材料样本都通过，未发现数据损坏、安全影响、
  持续挂死或 Product 功能错误；这只说明本轮未观察到，不是对全部 Product 或平台的正确性证明。
- 测试的真实 CLI proof 有独立价值，不能用 mock 全替换以消除计时，也不能把单次重试通过称为修复。
  当时已观察到的风险是验收不稳定和重复运行成本，尚无 Gate 错误放行证据。

### 形成时动作、建议与未证明范围

本轮仅提交前序文档、读取源码与既有日志、完成定向测量，并保存本报告；未改 runtime、测试、Case、
调度、超时、性能预算或豁免。独立只读 reviewer 对照全部五组原始输出核对 47 个命令样本，
并审阅报告、资源和当前发布证据，同意保留首要假设而不宣称根因闭合。

本轮建议在正式发布前独立处理该可靠性风险，而非依赖重试消项。以下为当时尚待授权的定位/修复路径：

1. 优先取得完整 Gate 竞争下的 child 启动、模块加载和各 material phase 证据，保留真实 CLI、负例和非零退出证明。
2. 只对已证明的耗时或资源竞争点选择局部修复；若必须调整实体预算，应明确有限的集成测试预算及异常挂起保护，
   不扩大为全局 timeout 或降低材料覆盖。本轮尚未选择这些方案。
3. 修复后用原代表性并发条件重复验证；正式 release 仍须重新冻结 source，并对新 exact artifact 完整验收。

本轮未重新运行 full Gate、没有原失败的稳定复现、未采进程级 CPU/RSS 或 OS page-cache 状态，
也未验证 CI、其他机器/平台与更多 Bun 版本。若空闲串行仍超时、出现内容错误或持续资源残留，
应重新评估竞争假设和严重程度。这个报告按复杂 Bug 的环境/时序与跨进程调查条件沉淀，
不因建立报告而宣告严重产品 Bug 或取得修复、发布授权。

## 随附资源

- [样本、计时口径与原 Gate 现场节选](./_resources/261019-investigate-validation-cli-timeout/measurements.json)
