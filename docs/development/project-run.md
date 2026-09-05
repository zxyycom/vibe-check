# Project Run

本文拥有 project-owned Run Controls、invocation inputs、Run result compatibility 与 output configuration boundary。
Project Definition 的 authoring、defaults、validation、normalization 与 `inherit` composition 由 [Project Definition](project-definition.md) 拥有。

## Invocation and results

`run(definition, controls?)` 先验证一个 Project Definition 和一个 closed `RunControls` value。一次调用的 controls 只可设置
`projectRoot`、`flags`、显式 `checkAggregation`、`signal`、`checkArtifactBaseDirectory`、`progressLogFile` 和 output overrides；它不能替换
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
`dependencies.list()`稳定枚举；二者都不授予 transitive、未声明或 scheduler-duration-model access。

invalid Definition、controls 或 aggregation selection 在 author work 前返回 configuration result。ordinary callback throw、
malformed result、Record misuse 与 cancellation 按 owning execution boundary 结算；精确 `RunResult` branches、durations、
messages、output failure priority 和 readback 见[深入 API 机制的 outputs 与 RunResult 边界](../api-mechanics.md#outputs-与-runresult-边界)。

## Run outputs and compatibility boundary

Definition 为三项相互独立的 Run output 建立以下 defaults；RunControls 只覆盖当前调用明确提供的字段：

| Output              | Definition default                                     | 配置责任                                                                                                                                                                                                                                              |
| ------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| machine publication | `{ enabled: true, directory: "artifacts/vibe-check" }` | 发布完整 machine artifact set；字节契约见 [Output](../output.md)。                                                                                                                                                                                    |
| progress rendering  | `{ enabled: true }`                                    | 呈现 invocation 与 Check lifecycle；enabled/disabled 行为、Record/message 的独立有界预览与 terminal/console 边界由 [API mechanisms](../api-mechanics.md#check-输出与受管-progress) 完整定义；caller 可用 `progressLogFile` 为本 Run 指定 tee target。 |
| diagnostic logging  | `{ enabled: false, directory: ".log/vibe-check" }`     | 以 explicit core/scheduler/learned-admission channels 记录 owner 时间线；格式与失败边界见 [API mechanisms](../api-mechanics.md#outputs-与-runresult-边界)。                                                                                           |

machine publication 与 diagnostic logging 的 `directory` 共用同一受信任 target grammar：值必须是非空且不含 U+0000 的字符串。
相对值从 effective `projectRoot` 解析，`..` 保持合法；绝对值直接作为明确 target。Definition 与 RunControls 对两项 output 使用相同 grammar，且两项仍独立配置、独立 status/failure，也可以显式填写同一目录。grammar 不 trim author text、不建立跨平台字符禁用表，也不提供 lexical/realpath/symlink containment、directory allowlist、清空或 filesystem sandbox。Definition 中的 author directory string 仍进入 declarative fingerprint；因此可移植、可重复的 Definition 应优先使用相对目录，而 invocation-specific 外部 target 通常放在 RunControls。
`progressLogFile` 同样是 optional、非空且不含 U+0000 的 caller target；relative text 从 effective `projectRoot` 解析，absolute text 直接使用。它不进入 Definition fingerprint、不会创建第二种 Definition output，也不改变 terminal presentation：Product 先写 terminal，再尽力镜像到这个 file；file setup/write/close 失败只令 `outputs.progressRendering` 失败，不能吞掉 terminal output。

Definition、controls 或 aggregation selection 无效时尚无可信 effective output configuration，因此不会创建 output。三项 output 的 status、failure isolation、machine/non-machine 边界与读取顺序由上表链接的 owner 完整表达。

Product 没有共享 comparison/reference channel 或 policy-selection layer。Producing Check 通过自己的 options 或 composition
拥有 baseline/comparison behavior；repository Gate 只在 project-owned Run 中绑定 selected Check IDs 和 aggregation。

Product 不发现 JSON/JSONC configuration，也不提供 editor profile、adjustment helper、generic parser/materializer registry、
operational dependency map、CLI 或 `bin`。Project-owned TypeScript Definition 与 bound Run 是唯一支持的执行集成路径；
随包 Check 仍各自导出 final-data parser。
