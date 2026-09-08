# Project Run

本文拥有 invocation inputs 的验证、路径冻结、callback capability 投影与 output configuration 接线不变量。公开 Controls 和 RunResult 由 [API 机制](../api-mechanics.md)定义，输出配置与 readback 由[输出指南](../guides/run-outputs.md)定义；本页说明实现怎样维持这些承诺。
Definition validation、normalization 与 fingerprint 实现由 [Project Definition](project-definition.md) 拥有。

## Invocation and results

参数按作用范围分工：Definition 拥有项目的 Checks、各项 options / relations、scheduler 与默认 outputs；Controls 拥有当前调用的 root、flags、signal、产物目标与显式 aggregation。两者唯一的 output 配置重叠是“Definition 默认值 → 当前调用逐字段覆盖”，不是任意对象合并，也不允许用 Controls 改写 Check 或 scheduler。消费者的完整字段位置表见[参数应该放在哪里](../api-mechanics.md#参数应该放在哪里)。

`run(definition, controls?)` 先验证一个 Project Definition 和一个 closed `RunControls` value。一次调用的 controls 只可设置
`projectRoot`、`flags`、显式 `checkAggregation`、`signal`、`checkArtifactBaseDirectory`、`progressLogFile`、`diagnosticLogFileNaming` 和 output overrides；它不能替换
Checks、改变 scanner commands、注册 dependencies 或选择另一份 Definition。

`flags` 是可省略的 dense string-token array。省略、显式 `undefined` 和 `[]` 都形成冻结空数组；合法 token
必须是非空字符串，并在进入 invocation flag control 前复制、去重和按文本排序。非数组、sparse hole、空 token 或非字符串形成
`invalid-run-controls`。Product 只用 token presence 解释 executable Check 显式声明的 `enabledByFlags` 四种 predicate，并继续把完整集合交给 callback-local project context；它不定义 token vocabulary、value payload 或其它 Check 领域语义。

`checkAggregation` 没有默认值，是唯一的多 Check aggregation 输入：

```ts
{
  checks: "all" | "effective" | readonly string[],
  mode: "all" | "any",
  unavailable: "propagate" | "fail" | "exclude",
  notApplicable: "exclude" | "pass" | "fail",
  empty: "passed" | "failed" | "not-applicable"
}
```

`"all"` 选择全部 normalized executable Checks；Check-ID list 选择 caller 明示成员；`"effective"` 是显式第三种 selector，
只复用这次 Run 的 private flag-and-`dependsOn` selection（含 dependency-activated prerequisite）。它不公开 ID list、resolver 或新的
selection telemetry，也不改变 `"all"`、ID-list validation、默认 `aggregate: null` 或 `empty` policy。ID-list selection 在执行前拒绝 unknown、duplicate 或 non-normalized Check ID。配置
后只从 selected settled statuses 派生四态 aggregate，原始 Check/Record facts 始终保留。具体状态折叠由
[Quality Metrics](check-results.md#explicit-aggregation-and-repository-gate-mapping)拥有。

`checkArtifactBaseDirectory` 是只作用于本次 invocation 的可选 Check artifact base。它使用与 directory output 相同的
非空、无 U+0000 grammar：relative text 从 effective `projectRoot` 解析、absolute text 直接作为 target，`..` 保持合法；它
不提供 containment、sandbox、清空、缓存或跨 Run state capability，也不属于 Definition、normalized declarative snapshot 或
fingerprint。Run 在 callback 前一次性冻结它与其它 invocation path facts；省略时不授予 Check artifact 写入能力。

| Fact                                                                     | Authoring authority                                                     | Frozen invocation projection                                                              | Check callback visibility                   |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------- |
| project root                                                             | `RunControls.projectRoot`，省略时为 Product current working directory   | absolute effective root                                                                   | `project.root`                              |
| Check artifact base                                                      | 仅 `RunControls.checkArtifactBaseDirectory`                             | absolute base 或 `null`，不进入 Definition fingerprint                                    | 当前 Check 的 `artifactDirectory` 或 `null` |
| Gate exact Check base                                                    | Gate 选择 exact absolute `<invocation>/checks/` 后作为同一 control 传入 | Product 直接使用该 base，不创建另一层 invocation directory                                | 当前 Check 仍只见自己的 directory           |
| machine / diagnostic target                                              | Definition defaults 加对应 output override                              | owner-private absolute target；diagnostic 按 owner-channel `RunResult` file readback 投影 | 不可见                                      |
| progress transcript target                                               | 仅 `RunControls.progressLogFile`                                        | current-Run absolute target 或 `null`；terminal 仍为 primary presentation                 | 不可见                                      |
| scheduler history、Check cache、candidate state、external-tool workspace | 各自 owner 的 options / lifecycle                                       | 不属于 invocation path representation                                                     | 不可见                                      |

每个 callback 恰好收到 `{ artifactDirectory, dependencies, invocationId, options, project, records, signal }`。
`project` 只含 normalized root 与 flags，`invocationId` 在同次 Run 的每个 callback 中相同；`artifactDirectory` 要么是从
`checkArtifactBaseDirectory` 为当前 stable Check ID 确定性得到的 absolute directory，要么是 `null`。它不暴露 artifact base、
sibling Check directory、machine/diagnostic target、scheduler state 或任何 cross-Run cache/state。Product 使用 bounded
filesystem-safe Check-ID encoding，避免分隔符、traversal、常规 component-length 问题和直接 sanitize collision；raw Check ID
仍保留在既有 Check facts。`options` 是 invocation-local canonical snapshot 或 preflight prepared/fallback；Check-specific 输入、
file selection、领域 policy 和 cache 仍由 owning Check options 承接。需要成功 provider data 的 consumer 用 `dependsOn`；需要
四态 outcome 审计的 consumer 用 `observes`。两者的 direct union 都可由 `dependencies.get` 显式判断 data 可用性，或由
`dependencies.list()`稳定枚举；二者都不授予 transitive、未声明或 caller-owned learned strategy state access。

invalid Definition、controls 或 aggregation selection 在 author work 前返回 configuration result。ordinary callback throw、
malformed result、Record misuse 与 cancellation 按 owning execution boundary 结算；精确 `RunResult` branches、durations、
messages 与 Run 分支见 [API 机制](../api-mechanics.md#runresult-分支)，output failure priority 和 readback 见[输出指南](../guides/run-outputs.md#输出状态与失败处理)。

## Run outputs and compatibility boundary

公开的三项 output defaults 与逐字段覆盖由[输出指南](../guides/run-outputs.md#默认输出与本次覆盖)定义；Run 先合成并冻结有效配置，再分别初始化输出，不能从一项 output 开关推断其它输出。以下是维护解析与接线必须保持的约束。

machine publication 与 diagnostic logging 的 `directory` 共用同一受信任 target grammar：值必须是非空且不含 U+0000 的字符串。
相对值从 effective `projectRoot` 解析，`..` 保持合法；绝对值直接作为明确 target。Definition 与 RunControls 对两项 output 使用相同 grammar，且两项仍独立配置、独立 status/failure，也可以显式填写同一目录。grammar 不 trim author text、不建立跨平台字符禁用表，也不提供 lexical/realpath/symlink containment、directory allowlist、清空或 filesystem sandbox。Definition 中的 author directory string 仍进入 declarative fingerprint；因此可移植、可重复的 Definition 应优先使用相对目录，而 invocation-specific 外部 target 通常放在 RunControls。
`progressLogFile` 同样是 optional、非空且不含 U+0000 的 caller target；relative text 从 effective `projectRoot` 解析，absolute text 直接使用。它不进入 Definition fingerprint、不会创建第二种 Definition output，也不改变 terminal presentation：Product 先写 terminal，再尽力镜像到这个 file；file setup/write/close 失败只令 `outputs.progressRendering` 失败，不能吞掉 terminal output。

RunControls 对 `outputs.progressRendering` 的 `recordPreviewLimit`、`messagePreviewLimit`、`textPreviewCodePointLimit` 与 `formatter` 使用和 Definition 同型的逐字段覆盖：省略或 `undefined` 不覆盖，数量 `0` 是有效值，`formatter: null` 明确清除 Definition formatter。controls 不进入 declarative snapshot/fingerprint，也不扩展 `RunResult.outputs.progressRendering` 的 `{ enabled, status }` readback。非法数量、unknown 字段或非函数/非 null formatter（包括 disabled progress）在 author work 前形成 `invalid-run-controls`。

Controls output parser 保留各 output object / leaf 的 typed failure，并将共享 progress grammar 的字段诊断映射到
`controls.outputs.<output>.<field>`；无效 object 停在当前 node，unknown key 保留 `unknown-key`，非法值带封闭的
`expected` 提示，不读取 accessor 或回显原值。Definition 使用同一 progress grammar，但仍把 failure 折叠为
既有 `definition.outputs` 诊断，不依赖 Controls error type。消费者的定位方式与提示值由[输出配置诊断](../guides/run-outputs.md#排查输出配置错误)拥有。

Definition、controls 或 aggregation selection 无效时尚无可信 effective output configuration，因此不会创建 output。三项 output 的 status、failure isolation、machine/non-machine 边界与读取顺序由输出指南完整表达。

Product 没有共享 comparison/reference channel 或 policy-selection layer。Producing Check 通过自己的 options 或 composition
拥有 baseline/comparison behavior；repository Gate 只在 project-owned Run 中绑定 selected Check IDs 和 aggregation。

Product 不发现 JSON/JSONC configuration，也不提供 editor profile、adjustment helper、generic parser/materializer registry、
operational dependency map、CLI 或 `bin`。Project-owned TypeScript Definition 与 bound Run 是唯一支持的执行集成路径；
随包 Check 仍各自导出 final-data parser。

项目代码可以绑定 Definition 和固定 Controls，仅向自己的调用方暴露需要改变的输入；这不创建新的 Product 配置层，也不要求把 root 或 signal 搬入 Definition。仓库 Gate 的 `afterGate` 位于 Product RunResult 形成之后，负责项目结果后处理，不属于 `defineConfig` 或 RunControls 的 hook 字段；其唯一配置位置与失败规则见[Project Gate](../tooling/project-gate.md#gate-result-post-processing-and-exits)。Product 内部回调则按[作用位置](../guides/callbacks.md)区分 Check 准备、执行、呈现和调度终态观察。

### Diagnostic file naming

`RunControls.diagnosticLogFileNaming` 只为当前 invocation 选择封闭的 `"unique" | "channel"` 命名方式；省略或 `undefined` 保持 `unique`。其它值即使在 diagnostics 关闭时也在 author work 前形成 `invalid-run-controls`。它不属于 Definition 或 output override，不参与 declarative snapshot/fingerprint，也不单独启用 diagnostics。

默认 `unique` 沿用 `core-<utc-compact>-<uuid>.log` 与 `scheduler-<utc-compact>-<uuid>.log`，适用于共享输出目录。显式 `channel` 仅将 basename 改为 `core.log` 与 `scheduler.log`；不新增目录，不改变日志内容、UUID、创建时间、全局 sequence 或 elapsed。调用方应将 diagnostics directory 指向自己隔离的本次 invocation 目录；Product 不验证目录独占性。

两种模式均沿用每 channel 的 exclusive-create（`wx`）：已有文件或并发冲突使该 channel failed，不覆盖、不追加、不自动回退命名。两个文件不是事务；一个 channel 失败时另一个可以成功，不回滚已创建文件。失败目标仍通过既有 channel `file` readback 返回，Check/Record facts 和 output failure priority 不变。正式 failure/status 边界见 [API mechanisms](../guides/run-outputs.md#输出状态与失败处理)。
