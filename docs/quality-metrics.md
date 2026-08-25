# Quality Metrics

本文拥有 Check、supplemental Record 与 explicit Check aggregation 的事实语义。Definition authoring、typed direct
dependency readback 见 [Configuration](configuration.md)；machine DTO/bytes 见 [Output](output.md)；repository Gate
adapter 见 [脚本工具](script-tooling.md#project-gate)。本文不拥有 scanner commands、machine serialization、argv
parsing、generic scheduler 或 human presentation grammar。

## Check and Record facts

`src/definition/**` validates and flattens recursive Check tree；`src/core/**` 为每个 executable Check 保存一个 terminal
fact：

| `outcome.status` | 含义 |
| --- | --- |
| `passed` | Check 完成自己的质量结论，并带 canonical final `data`。 |
| `failed` | Check 完成自己的质量结论，并带 canonical final `data`。 |
| `not-applicable` | Check 有意没有 work；reason code 可省略，且不伪造 final data。 |
| `unavailable` | Product 无法给出正常结论；必须有 `reason.code`，且没有 final data。 |

四种 outcome 都满足 dependency ordering：declared direct upstream settle 后，dependent Check 才可 admission。需要
upstream data 的 callback 使用 Configuration 的 `dependencies.get` contract。本文只定义该读取的事实基础：
`passed`/`failed` 有 canonical final data；`not-applicable`/`unavailable` 没有；Product 不为 ordinary upstream
outcome 合成 `prerequisite-unavailable`。

callback 通过 Check-owned reporter 报告零个或多个 supplemental facts：

```ts
records.report({ id: "sample:health" }, { latencyMs: 820, statusCode: 503 });
```

`id` 仅在 owning Check 内非空且唯一；Core identity 是 `{ checkId, id }`，不同 Check 可复用同一 local ID。
final data 与 Record data 共用 descriptor-based canonical JSON boundary：root 必须是 non-array object，Product
拒绝 unsupported descriptors/prototypes、cycles、sparse arrays 与 non-finite numbers，不调用 getter 或 `toJSON`。
Core snapshot 的 data 是 detached、null-prototype、deep-frozen facts；其 JavaScript own-key enumeration 不构成
canonical text or fingerprint order。

Record 的存在、数量和 data 不决定 Check status。invalid final data、invalid/duplicate Record、callback throw 或
Product protocol failure 只使 owning Check unavailable；已接受的 Records 保留，无关 Check 继续。callback settlement
后 reporter closed，late write 会抛错，不能修改 frozen facts。terminal messages 不属于 Check outcome 或 Record/Core
facts。

`src/run/**` 的 completed/effect results 提供 canonical Check/Record readback；final-snapshot result 另提供已经
接受的 terminal-message readback。Check data 的 business parser、field schema 与 sensitive-content policy 属于
consumer/provider，不由 Product registry、catalog、extractor 或 presentation fallback 提供。

## Direct defaults and exact inputs

`src/checks/builtins/**` 的 default Checks 是 `duplicate-detection`、`file-metrics` 与 `function-metrics`。它们的
direct callbacks own scanner options，只处理 Product-approved exact input paths，并只在 detail 是 supplemental
finding 时报告 Records。adapter availability、process、parser、cache 或 scope failure 将 owning Check settle 为
unavailable，不创建并行 quality model。scanner adapter boundary 见 [Scanner dependencies](scanner-dependencies.md)。

三个 default Check 和 custom callback 使用同一 four-state grammar。Check options 只影响其 own metric/scanner
semantics；aggregation 与 output presentation 不属于这些 options。

## 维护提醒评估

`maintenanceReminders(entries)` 不是第四个默认 Check 值，也不会为每个条目创建 Check。它只形成一个
`maintenance-reminders` 所属 Check；条目 ID、评估结果、提示文本和基线都只在该 Check 内有意义。输入规则、固定身份和原生对象组合边界见[配置](configuration.md#维护提醒)。

callback 只在项目根目录的已提交 Git 历史中工作：它解析 `HEAD`，要求每个不可变的完整 `baseCommit` 位于
`HEAD` 的 `first-parent` 链上，并统计不含基线的 `base..HEAD` `first-parent` 提交。每个提交的变更行数是相对其第一个父提交的 Git `numstat` 增加行加删除行；合并提交只按第一个父提交的差异计算一次，回滚按实际差异计算，二进制文件计为零行，重命名遵循 Git `numstat`。工作区和暂存区差异不参与；任一已配置上限被**严格超过**才算到期，Product 不会自动推进基线。

成功完成的 callback 的最终数据始终为 `{ entries }`，并按作者声明顺序保存以下局部评估：

```ts
{
  id: string;
  mode: "advisory" | "enforcing";
  assessment: "clear" | "due" | "unavailable";
  baseCommit: string;
  headCommit: string | null;
  commitCount: number | null;
  changedLines: number | null;
  exceeded: readonly ("commits" | "changed-lines")[];
  reason?: string;
}
```

`reason` 只会出现在 `unavailable` 条目上；它是稳定、可行动的原因代码：

| `reason` | 含义与下一步 |
| --- | --- |
| `head-unavailable` | 无法执行或读取 `HEAD`；检查 Git 可执行文件和仓库状态。 |
| `head-invalid` | `HEAD` 命令输出不是完整 commit ID；检查被调用的 Git 工具或仓库对象。 |
| `first-parent-history-unavailable` | 无法读取 `HEAD` 的 `first-parent` 历史；检查 Git 命令和仓库历史。 |
| `first-parent-history-invalid` | 返回的 `first-parent` 历史为空、含无效 ID 或未以 `HEAD` 开始；检查 Git 工具或仓库对象。 |
| `base-commit-unavailable` | 条目的 `baseCommit` 无法解析；将其改为可用的完整 commit ID。 |
| `base-not-first-parent-ancestor` | 条目的基线不在 `HEAD` 的 `first-parent` 链上；选择该链中的复核基线。 |
| `numstat-unavailable` | 无法读取某个提交的 `numstat`；检查 Git 工具和仓库对象。 |
| `numstat-invalid` | `numstat` 输出无法安全解析或累计；检查 Git 工具和仓库对象。 |

无法解析 `HEAD` 或历史时，callback 仍会为每个条目形成 `unavailable` 评估；单条基线、祖先关系、`numstat` 或解析失败也只会使该条目不可测量，后续条目继续测量。这样在数据完整时不会把 `unavailable` 伪装为 `clear`，也不会丢掉其它条目。只有取消、内部失败或其他无法可信形成完整有序数组的边界，才会使整个 Check 以四态结果 `unavailable` 结束。

| 条目评估 | `advisory`（默认） | `enforcing` |
| --- | --- | --- |
| `clear` | 不附提示，不导致失败。 | 不附提示，不导致失败。 |
| `due` | 所属 Check 为 `passed`，附警告。 | 所属 Check 为 `failed`，附错误。 |
| `unavailable` | 所属 Check 为 `passed`，附警告。 | 所属 Check 为 `failed`，附错误。 |

提示使用所属 Check 持有的稳定 code，只经 progress 和 `RunResult.checkMessages` 供人阅读；不会创建补充 Record。若要通过聚合阻断进程，仍须显式选择唯一的 `maintenance-reminders` Check ID，不能选择单个条目。机器发布继续只投影通用最终数据，见[输出](output.md#维护提醒评估数据)。

## Explicit aggregation and repository Gate mapping

multi-Check aggregation 是每次 invocation 的 derived result，不是 Core status 或 implicit quality policy。需要它的
caller 显式在 `RunControls.checkAggregation` 配置 selected Checks、`all | any` mode、unavailable handling、
not-applicable handling 与 empty-set handling。selection 在 work 前验证；`"all"` 选择全部 normalized Checks，
explicit ID list 可表达 Gate eligibility set，且不隐藏 excluded raw facts。

`src/run/check-aggregation.ts` 仅从 selected settled Check statuses 计算 `passed | failed | not-applicable |
unavailable`。未配置 aggregation 时 `RunResultFacts.aggregate` 是 `null`。aggregate 不复制 evidence，不消费 Records、
definition warnings、effects、output、presentation 或 arbitrary final data。

`scripts/project/gate/**` 将 required/full eligibility selection 绑定到 explicit aggregation configuration，读取
`RunResult.aggregate`，并单独把 configuration/run/effect facts 映射到 process status `0`、`1` 或 `2`。它不遍历
snapshot Checks 重建 quality conclusion；也不由 dependent Check 或 process-local reducer 取代。

## Verification

current evidence 覆盖 recursive Definition validation、direct callback four-state outcomes、canonical final/Record data、
Core ownership/terminal closure、prerequisites/cancellation、explicit aggregation、default-scanner exact scope/cache 和
Gate exit mapping。machine schema/example/publication evidence 见 [Output](output.md)；Case catalog 与验证入口见
[Testing](testing.md)。
