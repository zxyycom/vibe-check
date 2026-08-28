# Quality Metrics

本文拥有 Check、supplemental Record 与 explicit Check aggregation 的事实语义。Definition authoring、typed direct
dependency readback 见 [Configuration](configuration.md)；machine DTO/bytes 见 [Output](output.md)；repository Gate
adapter 见 [脚本工具](script-tooling.md#project-gate)。本文不拥有 scanner commands、machine serialization、argv
parsing、generic scheduler 或 human presentation grammar。

## Check and Record facts

`src/project-definition/**` validates and flattens recursive Check tree；`src/check-settlement/**` 为每个 executable Check 保存一个 terminal
fact：

| `outcome.status` | 含义                                                                |
| ---------------- | ------------------------------------------------------------------- |
| `passed`         | Check 完成自己的质量结论，并带 canonical final `data`。             |
| `failed`         | Check 完成自己的质量结论，并带 canonical final `data`。             |
| `not-applicable` | Check 有意没有 work；reason code 可省略，且不伪造 final data。      |
| `unavailable`    | Product 无法给出正常结论；必须有 `reason.code`，且没有 final data。 |

四种 outcome 都满足 dependency ordering：declared direct upstream settle 后，dependent Check 才可 admission。需要
upstream data 的 callback 使用 Configuration 的 `dependencies.get` contract。本文只定义该读取的事实基础：
`passed`/`failed` 有 canonical final data；`not-applicable`/`unavailable` 没有；Product 不为 ordinary upstream
outcome 合成 `prerequisite-unavailable`。

callback 通过 Check-owned reporter 报告零个或多个 supplemental facts：

```ts
records.report({ id: "sample:health" }, { latencyMs: 820, statusCode: 503 });
```

`id` 仅在 owning Check 内非空且唯一；Check-facts identity 是 `{ checkId, id }`，不同 Check 可复用同一 local ID。
final data 与 Record data 共用 descriptor-based canonical JSON boundary：root 必须是 non-array object，Product
拒绝 unsupported descriptors/prototypes、cycles、sparse arrays 与 non-finite numbers，不调用 getter 或 `toJSON`。
Check-facts snapshot 的 data 是 detached、null-prototype、deep-frozen facts；其 JavaScript own-key enumeration 不构成
canonical text or fingerprint order。

Record 的存在、数量和 data 不决定 Check status。invalid final data、invalid/duplicate Record、callback throw 或
Product protocol failure 只使 owning Check unavailable；已接受的 Records 保留，无关 Check 继续。callback settlement
后 reporter closed，late write 会抛错，不能修改 frozen facts。terminal messages 不属于 Check outcome 或 Record/Check-facts
facts。

`src/project-run/**` 的 completed/output results 提供 canonical Check/Record readback；final-snapshot result 另提供已经
接受的 terminal-message readback。Check data 的 business parser、field schema 与 sensitive-content policy 属于
consumer/provider，不由 Product registry、catalog、extractor 或 presentation fallback 提供。

## Package-provided ordinary Checks and exact inputs

每项 `src/package-checks/<check-owner>/**` 都实现一个普通 Check。`duplicate-detection`、`file-metrics` 与
`function-metrics` 分别拥有自己的 jscpd、scc 与 Lizard adapter；`json-validation`、
`json-schema-validation` 与 `markdown-link-validation` 同样完整拥有自己的 options validation、execution 和 domain
facts。Definition、Run 与 Check facts 不识别这些 Check ID 或 option shape。

需要文件的 Check 各自从 Check-owned file selection 形成 selected/exact input paths：三个 metric Check 使用每个
`codeAreas[id].files`，其它 file-reading Checks 使用顶层 `options.files`。它们只在 detail 是 supplemental finding 时报告
Check-local Records。adapter availability、process、parser、cache 或 exact-input failure 将 owning Check settle 为
unavailable，不创建并行 quality model。owner-local tool boundary 见
[Check-owned scanner dependencies](scanner-dependencies.md)，file mechanism 见
[Project files and Check exact inputs](scan-scope.md)。

`function-metrics` 对每个超过 effective area limit 的 metric 发布一条 Record；data 包含 stable-sorted `codeAreas`、
`blocking`、metric、limit 与 function location/value。effective limit 是全部 matching areas 对该 metric 的适用 maximum
最小值；任一 matching area blocking 时 `blocking` 为 true。它不会因 blocking finding 短路 scanner 或后续 conversion。正常
final data 恰为 `{ findingCount, blockingFindingCount }`；blocking count 非零时 failed，否则 passed，因此 passed Check
可以携带 non-blocking finding Records。zero input 与 adapter/measurement failure 仍分别结算为 not-applicable 和 unavailable。

`json-validation` 的 Check-local facts 固定如下：

- 每个 invalid eligible file 恰报告一个 `{ id: path }` / `{ path, reason }` Record；第一个发现的 document
  issue 决定这个唯一 Record，`reason` 只能是 `too-large | bom | invalid-utf8 | invalid-json | duplicate-key`。
- 所有 eligible file 都正常结算后，Check 才以 `passed` 或 `failed` 返回恰为
  `{ scannedFileCount, validFileCount, invalidFileCount, issueCount }` 的 final data；其中
  `scannedFileCount = validFileCount + invalidFileCount`，`issueCount = invalidFileCount`。
- 没有 eligible input 时返回带 `no-eligible-input` 的 `not-applicable`；cancellation、read 或 strict-document
  boundary failure 返回没有 final data 的 `unavailable`。后续文件 unavailable 时，先前已接受的 Records 保留普通
  Check-facts semantics。
- JSON-specific published facts 仅为 path、counts 和 closed reason；不得发布 document bytes/text、key、pointer、
  location、parser message 或 stack。

`json-schema-validation` 的 Check-local facts 固定如下：

- **输入与 normal final data：** Check 只拥有显式配置的 schema resources 和 bindings。正常 final data 恰为
  `{ schemaCount, bindingCount, validBindingCount, invalidBindingCount, blockedBindingCount, issueCount, reportedIssueCount, issuesTruncated }`，
  且 `validBindingCount + invalidBindingCount + blockedBindingCount = bindingCount`。schema document 或 compile
  failure 会 block 其 dependent bindings；它不会为这些 bindings 猜测 keyword violation。
- **Record 形状与脱敏：** domain Record 只能是 `schema-document`、`schema-compile`、`instance-document` 或
  `keyword-violation`。它只含 configured schema/binding ID、normalized project path、closed document/compile
  reason，或 sanitized instance pointer 和 allowlisted keyword。它绝不含 raw `$id`/`$ref`、source/response
  bytes、URI userinfo/query、absolute path、engine `schemaPath`、message、stack 或 transport detail。
- **显示上限：** Check 会验证每个可处理 binding，但每次 invocation 最多发布 100 条 domain Record。
  `issueCount` 是真实发现总数；`reportedIssueCount` 是已发布 prefix；`issuesTruncated` 只说明该 prefix 是否
  漏掉一条或多条 Record。该显示上限不会制造 synthetic issue，也不会把 `failed` 改成 `passed`。
- **状态与 resolution：** zero bindings 带 `no-bindings` 返回 `not-applicable`；正常无 issue 返回 `passed`；
  任一 domain issue 返回 `failed`。cancellation、local strict-document I/O/boundary failure、engine failure 或
  authorized HTTPS transport failure 都返回没有 final data 的 `unavailable`，已接受的 Records 保留 ordinary
  Check-facts semantics。resolution 由 Check 自己拥有：local registered engine identities 和 package-fixed 2020-12
  catalog 无需 request；只有 explicit allowlisted HTTPS source 可以 fetch。adapter 不使用 credentials、headers、
  redirects、ambient callback 或 persistent cache；unapproved/unsupported reference 安全失败。

All package-provided Checks, including the value returned by `duplicateDetection(options?)`, and custom callbacks use the
same four-state grammar. Check options affect only their own
semantics; aggregation and output presentation do not belong to these options.

### Markdown Link findings and outcomes

`markdown-link-validation` 拥有 local-reference finding，而不是 general target validator。每个 normal issue 恰好报告一个
Check-local Record，其 reason 只能是 `missing-target`、`target-outside-project-root`、`empty-directory`、
`anchor-on-directory`、`anchor-target-not-markdown`、`missing-anchor` 或 `unsupported-target-type`。有 normal issue 时
Check 为 `failed`；没有 normal issue 时为 `passed`。

Link Record 标识 source relative path、one-based occurrence ordinal 和 reason。其 data 只能包含 reason、occurrence kind
（`link` 或 `image`）、slash-normalized root-relative source path、source navigation range 与 safe target descriptor。对
`same-document`、`project-file`、`project-directory` 或 `project-path` target，descriptor 可携带 root 内 relative path 和
decode 后 fragment。`project-path` 表示尚未确定 endpoint type，包括缺失的 direct target。`outside-project-root`
descriptor 不携带 target path 或 fragment。这是在 shared canonical JSON boundary 下的普通 supplemental Record data，
不是新的 Record family 或 cross-Check catalog。

`passed` 和 `failed` 的 final data 严格为 `{ sourceFileCount, occurrenceCount, targetReadCount, findingCount }`。
`occurrenceCount` 包含每一个 parser-semantic occurrence，包括未进入 local target validation 的 occurrence；
`targetReadCount` 统计进入 direct endpoint validation 的 occurrence。没有 eligible Markdown source 时，Check 以
`no-eligible-input` 结算为 `not-applicable`。cancellation、source/target read、decode、parser、containment 或 limit
failure 均为 `unavailable`：它们不带 final data，也绝不能把 partial work 变为 clean result 或 partial Record set。
其 `unavailable.reason.code` 是共享 four-state grammar 中的受控 public code，且只能是：`cancelled`、
`project-root-unavailable`、`source-unavailable`、`source-too-large`、`markdown-parse-failed`、
`invalid-local-destination`、`target-unavailable`、`occurrence-limit-exceeded` 或 `target-read-limit-exceeded`。
`source-unavailable` 汇总 source collection/read/decode/access failure；`target-unavailable` 汇总 containment probe、
target I/O/read/decode/parse 与 directory error。code 不得以 raw target path、URL、query/userinfo 或 target content
代替；resolver private type 与 target detail 不构成 public catalog。

## 维护提醒评估

`maintenanceReminders(entries)` 不是另一个无参 package Check value，也不会为每个条目创建 Check。它只形成一个
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

| `reason`                           | 含义与下一步                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| `head-unavailable`                 | 无法执行或读取 `HEAD`；检查 Git 可执行文件和仓库状态。                                  |
| `head-invalid`                     | `HEAD` 命令输出不是完整 commit ID；检查被调用的 Git 工具或仓库对象。                    |
| `first-parent-history-unavailable` | 无法读取 `HEAD` 的 `first-parent` 历史；检查 Git 命令和仓库历史。                       |
| `first-parent-history-invalid`     | 返回的 `first-parent` 历史为空、含无效 ID 或未以 `HEAD` 开始；检查 Git 工具或仓库对象。 |
| `base-commit-unavailable`          | 条目的 `baseCommit` 无法解析；将其改为可用的完整 commit ID。                            |
| `base-not-first-parent-ancestor`   | 条目的基线不在 `HEAD` 的 `first-parent` 链上；选择该链中的复核基线。                    |
| `numstat-unavailable`              | 无法读取某个提交的 `numstat`；检查 Git 工具和仓库对象。                                 |
| `numstat-invalid`                  | `numstat` 输出无法安全解析或累计；检查 Git 工具和仓库对象。                             |

无法解析 `HEAD` 或历史时，callback 仍会为每个条目形成 `unavailable` 评估；单条基线、祖先关系、`numstat` 或解析失败也只会使该条目不可测量，后续条目继续测量。这样在数据完整时不会把 `unavailable` 伪装为 `clear`，也不会丢掉其它条目。只有取消、内部失败或其他无法可信形成完整有序数组的边界，才会使整个 Check 以四态结果 `unavailable` 结束。

| 条目评估      | `advisory`（默认）               | `enforcing`                      |
| ------------- | -------------------------------- | -------------------------------- |
| `clear`       | 不附提示，不导致失败。           | 不附提示，不导致失败。           |
| `due`         | 所属 Check 为 `passed`，附警告。 | 所属 Check 为 `failed`，附错误。 |
| `unavailable` | 所属 Check 为 `passed`，附警告。 | 所属 Check 为 `failed`，附错误。 |

提示使用所属 Check 持有的稳定 code，只经 progress 和 `RunResult.checkMessages` 供人阅读；不会创建补充 Record。若要通过聚合阻断进程，仍须显式选择唯一的 `maintenance-reminders` Check ID，不能选择单个条目。机器发布继续只投影通用最终数据，见[输出](output.md#维护提醒评估数据)。

## Explicit aggregation and repository Gate mapping

multi-Check aggregation 是每次 invocation 的 derived result，不是 Check-facts status 或 implicit quality policy。需要它的
caller 显式在 `RunControls.checkAggregation` 配置 selected Checks、`all | any` mode、unavailable handling、
not-applicable handling 与 empty-set handling。selection 在 work 前验证；`"all"` 选择全部 normalized Checks，
explicit ID list 可表达 Gate eligibility set，且不隐藏 excluded raw facts。

`src/project-run/aggregation.ts` 仅从 selected settled Check statuses 计算 `passed | failed | not-applicable |
unavailable`。未配置 aggregation 时 `RunResultFacts.aggregate` 是 `null`。aggregate 不复制 evidence，不消费 Records、
definition warnings、output statuses、progress presentation 或 arbitrary final data。

`scripts/project/gate/**` 将 required/full eligibility selection 绑定到 explicit aggregation configuration，并从
`RunResult.aggregate`、definition warning 和 progress output 形成一个初步 `ProjectGateResult`。一个项目私有
`afterGate` 阶段可以在 bound Run 返回后把该结果转换为同类型的最终结果。Hook 的完整上下文字段、执行依赖排除项和
失败边界由[脚本工具](script-tooling.md#gate-result-post-processing-and-exits)拥有；quality aggregation 只约束它不得遍历
snapshot Checks 重建 aggregate，也不得改写 Check outcome 或 Product facts。调用方与 process exit 只消费处理后的一个
最终结果，不需要合并并行的 base、acceptance 和 final 模型；Product 不增加公共 lifecycle Hook。

## Verification

current evidence 覆盖 recursive Definition validation、direct callback four-state outcomes、canonical final/Record data、
Check-facts ownership/terminal closure、prerequisites/cancellation、explicit aggregation、Check-owned scanner exact inputs/cache 和
Gate exit mapping。machine schema/example/publication evidence 见 [Output](output.md)；Case catalog 与验证入口见
[Testing](testing.md)。
