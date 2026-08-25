# Quality Metrics

本文拥有 Check、supplemental Record 与 explicit Check aggregation 的事实语义。Definition authoring、typed direct
dependency readback 见 [Configuration](configuration.md)；machine DTO/bytes 见 [Output](output.md)；repository Gate
adapter 见 [脚本工具](script-tooling.md#project-gate)。本文不拥有 scanner commands、machine serialization、argv
parsing、generic scheduler 或 human presentation grammar。

## Check and Record facts

`src/definition/**` validates and flattens recursive Check tree；`src/core/**` 为每个 executable Check 保存一个 terminal
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

`src/checks/builtins/**` 的 scanner defaults 是 `duplicate-detection`、`file-metrics` 与 `function-metrics`；
`src/checks/json-validation/**` 提供 `json-validation`，`src/checks/json-schema-validation/**` 提供
`json-schema-validation`。它们只处理 Product-approved exact input paths，并在 detail 是
supplemental finding 时报告 Check-local Records。adapter availability、process、parser、cache 或 scope failure 将 owning
Check settle 为 unavailable，不创建并行 quality model。scanner adapter boundary 见 [Scanner dependencies](scanner-dependencies.md)。

`json-validation` 的 Check-local facts 固定如下：

- 每个 invalid eligible file 恰报告一个 `{ id: path }` / `{ path, reason }` Record；第一个发现的 document
  issue 决定这个唯一 Record，`reason` 只能是 `too-large | bom | invalid-utf8 | invalid-json | duplicate-key`。
- 所有 eligible file 都正常结算后，Check 才以 `passed` 或 `failed` 返回恰为
  `{ scannedFileCount, validFileCount, invalidFileCount, issueCount }` 的 final data；其中
  `scannedFileCount = validFileCount + invalidFileCount`，`issueCount = invalidFileCount`。
- 没有 eligible input 时返回带 `no-eligible-input` 的 `not-applicable`；cancellation、read 或 strict-document
  boundary failure 返回没有 final data 的 `unavailable`。后续文件 unavailable 时，先前已接受的 Records 保留普通
  Core semantics。
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
  Core semantics。resolution 由 Check 自己拥有：local registered engine identities 和 package-fixed 2020-12
  catalog 无需 request；只有 explicit allowlisted HTTPS source 可以 fetch。adapter 不使用 credentials、headers、
  redirects、ambient callback 或 persistent cache；unapproved/unsupported reference 安全失败。

All six defaults and custom callbacks use the same four-state grammar. Check options affect only their own
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
