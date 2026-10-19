# Admission workbench

维护者在独立合成时间模型中比较 admission policy、重放 heuristic 对照时，从本文恢复命令、协议与证据边界。
本文拥有这两种工作流的维护规则，仅供工作区使用；模拟证据与真实 Gate 性能证据分别判断。

## Virtual admission workbench

`admission:simulate` 是仓库私有的 exact-candidate consumer，用公开 `AdmissionGraph` 接受每次
`select` / `settle`，在合成时间模型中比较准入 policy。它不执行 Check、不创建 Gate transcript，也不调用
`scripts/project/gate/run.ts`；Product API 与正式 Gate 的职责保持独立。
实现位于 `scripts/project/admission-workbench/`，按命令边界、版本化 scenario/fixture、虚拟事件与 evidence 分工。

### 输入与复现

从仓库根运行：

```sh
bun run admission:simulate chain --policy static --seed 7 --replicates 2
bun run admission:simulate profile-variation --policy learned --seed 7 --replicates 2 \
  --out .cache/vibe-check/admission-workbench/profile-variation-seed-7.json
```

第一个位置参数可以是内置 fixture ID，也可以是 scenario JSON 路径。scenario `version: 1` 的输入由
`scenarioVersion`、`scenarioId`、公开 `AdmissionGraphInput`、profiles、task→profile 固定映射、
允许的 policy IDs、contention preset、assumption IDs 与可选二元 outcome / mapping identity 组成。
非有限或非正 work、空倍率、未知或重复 ID、task/profile claims 不一致、非法图及未注册 policy 都会
拒绝，不会修复或降级。

命令先验收参数、scenario 形状与注册 policy，再加载 `command-execution.ts` 的 Product/模拟执行模块。
先验输入拒绝不加载执行模块；验收后的模块装载失败记录为 failure evidence，退出 `1`。

当前固定 fixture IDs 是：

- 最小边界与手算 oracle：`empty`、`single`、`chain`、`two-shared-claims`；
- 图和事件边界：`wide-tie`、`backfill`、`scoped-capacity`、
  `weighted-mutex-multi-resource`、`unsatisfied-observes`；
- 假设压力：`profile-variation`、`long-tail-critical`；
- 静态资源形状：`gate-shape-v1`。

同一 `(scenarioVersion, scenarioId, taskId, replicate, seed)` 使用
`fnv1a32-nul-tuple+mulberry32-v1` 抽样。policy 不会取得 profile、sampled/remaining work、PRNG、
未来事件、其它 policy 结果或完整 trace；因此相同 seed 与 replicate 的不同 policy 使用同一外生
work commitment。`static` 是版本化的简单合法 baseline，不声称复制 Product 内置 static policy；
`learned` 使用公开 prepared helper，在每个 replicate 将同一固定 history snapshot 复制到独占的
absolute state directory，且不调用 `complete`。history/setup fallback 或不符合预期的 prediction
source 使该次比较失败，虚拟 settlement 不会写回 snapshot。

### Evidence 与输出边界

默认只把完整 JSON evidence 写 stdout。`--out` 要求父目录已经存在且不是符号链接，并以 exclusive
create 新建普通文件；已有文件或符号链接一律拒绝且不覆盖。若需保留本地比较证据，使用 ignored 的
`.cache/vibe-check/admission-workbench/`，不要把临时 evidence 当作稳定 owner 或提交到仓库。

当前私有 evidence IDs 为：scenario/schema `1`、policy `1`、
`public-admission-policy-context-v2`、`admission-workbench-trace-v1`。context v2 使用独立的 `cumulative`
与 `actionHistory` 字段；历史 v1 evidence 保持形成时的字段版本，重放时须配套其当时的 consumer。每个成功 result 记录 exact
installed package version 与 entry SHA-256、scenario/profile/policy/history/model/fallback identity、
seed/replicate、完整合成假设、sampled-work commitment、makespan、slot·time、逐 named resource 的
unit·time、正式 action-observation prefix 与 ordered trace。资源指标按 resource ID 分开，不能跨资源
相加。失败以非零退出并保留仍可可靠确定的 identity、boundary index、virtual time 与已发生 trace；
未通过 scenario schema 的 identity 明确为 `null`，不伪造值。

证据来源必须分别解释：

1. `source: "virtual"` 只说明公开 legality 下的合成事件与虚拟毫秒；
2. `shared-closure.test.ts` 的真实 Check lifecycle 只证明 public Run 的 cancel/drain 接线，并与虚拟
   `unsatisfied` settlement 分开；
3. 正式 `bun run check -- --all` 的 Gate 时间只用于观察平台未覆盖的偏差和接线边界，不能反向拟合
   contention 系数或证明策略收益。

`profile-variation` 的四个 profile 固定自时长调查的 proxy median 与 `sample / median` 向量；它们不是
完整 Gate Check baseline，core execution duration 也不能叠加成无竞争基线。zero / weak / strong 的
`α=0 / 0.25 / 1` 及 `5.5×` long-tail 都是明标的合成敏感性假设，不是实测竞争参数或发生概率。
`gate-shape-v1` 只冻结 `project-gate-named-resources@b30477b6` 的 root `3`、17 个 test-lane 对
`project-gate-bun-test-runners` capacity `2` 的 claim，以及 4 个 quality task 对
`project-gate-repository-scans` capacity `2` 的 claim；它不是完整 Gate 的 36-Check 依赖、mutex 或
时长模型，禁止把其 makespan 与正式 Gate wall time 计算预测误差比例。任何模拟结果都不保证真实
Gate 加速。

## Learned admission heuristic 对照记录

`scripts/project/admission-workbench/learned-heuristic-evaluation/evaluation.ts` 是双 artifact 对照的私有脚本入口。
该子模块拥有 evaluation、input、comparison、cost 与 types；父层的 `policy.ts` 和
`learned-heuristic-policy-state.ts` 供模拟与对照共同消费。
从仓库根运行，并提供两个已构建 package directory 的公开 `index.mjs`：

```sh
bun scripts/project/admission-workbench/learned-heuristic-evaluation/evaluation.ts \
  --baseline-artifact <baseline-package-directory> \
  --candidate-artifact <candidate-package-directory> \
  --out <new-evidence.json>
```

[冻结协议](../../scripts/project/admission-workbench/learned-heuristic-evaluation/protocol.json)拥有场景、主指标与成本门禁：每个场景、
每次 replicate 的 makespan 退化均拒绝候选，即使独立的 1.25× host-cost guard 通过。成本 corpus 只从基线
公开 policy 捕获；两个 artifact 各自新建 prepared policy，计时区间只调用原始 public `decide`，fallback
在计时外检查，发生 sticky failure 时使本次对照无效。虚拟结果与宿主成本分开报告，均不证明真实 Gate 加速。

同目录的 `input.ts` 在加载 artifact 或重放场景前校验协议中实际消费的字段，包括：

- `scenarioInputs` 每项恰有一个非空字符串 `fixtureId` 或 `path`；
- `virtualComparison.replicates`、`hostCost.samples`、`hostCost.corpusIterations` 为正 safe integer，
  `virtualComparison.seed`、`hostCost.warmups` 为非负 safe integer；
- `virtualComparison.secondary.improvementEligibleScenarioIds` 为字符串数组。

校验失败定位到具体字段；loader 从有效输入建立消费视图，不重写冻结 JSON 或改变实验门禁。

冻结 protocol 与 evidence 保持原始 bytes；protocol 的 regression scenario 路径相对仓库根解析。
重放时须保留这些输入路径及其内容，才能核对原有 identity。

重放历史对照须提供与 evidence identity 相符的两个公开 package artifact；仓库不从当前 Product source
自动重建旧候选。`historical-non-gating` evidence 只保存探索来历，不能替代
[双 artifact 对照证据](../../scripts/project/admission-workbench/learned-heuristic-evaluation/learned-heuristic-dual-artifact.evidence.json)。已结束的
c1/c2 结果、反例解释和未采用理由见[调查报告](../investigations/explain-learned-heuristic-rejection.md)，
不作为当前 Product 行为或新的优化授权。
