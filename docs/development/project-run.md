# Project Run

本文拥有 invocation inputs 的验证、路径冻结、callback capability 投影与 output configuration 接线不变量。公开 Controls 和 RunResult 由 [API 机制](../api-mechanics.md)定义，输出配置与 readback 由[输出指南](../guides/run-outputs.md)定义；本页说明实现怎样维持这些承诺。
Definition validation、normalization 与 fingerprint 实现由 [Project Definition](project-definition.md) 拥有。

## Invocation and results

Run 先验证 Definition 和 closed Controls，再生成 invocation-private inputs。公开字段归属见[参数位置](../api-mechanics.md#参数应该放在哪里)：唯一重叠是 Definition output defaults 被当前 Controls 逐字段覆盖，不是对象 merge，也不能借 Controls 改写 Checks 或 scheduler。

flags 在进入 control barrier 前复制、去重、排序并冻结；省略/undefined/空数组形成同一空集合，malformed dense-token input 形成 invalid-run-controls。Product 只解释声明的 presence predicates，不定义 token vocabulary；完整 canonical flags 继续交给 callback project context。

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

Run 在 work 前拒绝 unknown、duplicate 或 non-normalized ID-list selection；effective selector 复用唯一 private flag-and-dependsOn closure，不公开成员表或建立第二 resolver。状态派生接线见 [Check results](check-results.md#explicit-aggregation-and-repository-gate-mapping)，公开折叠规则见 [API 机制](../api-mechanics.md)。

所有 invocation path facts 在 callback 前冻结，后续只消费其 absolute representation，不再次解释 caller directory text。Check artifact base 与其它 directory target 使用同一 trusted grammar，不提供 containment、cleanup 或跨 Run state capability；省略时 callback artifactDirectory 为 null。

| Fact                                                                     | Authoring authority                                                     | Frozen invocation projection                                                              | Check callback visibility                   |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------- |
| project root                                                             | `RunControls.projectRoot`，省略时为 Product current working directory   | absolute effective root                                                                   | `project.root`                              |
| Check artifact base                                                      | 仅 `RunControls.checkArtifactBaseDirectory`                             | absolute base 或 `null`，不进入 Definition fingerprint                                    | 当前 Check 的 `artifactDirectory` 或 `null` |
| Gate exact Check base                                                    | Gate 选择 exact absolute `<invocation>/checks/` 后作为同一 control 传入 | Product 直接使用该 base，不创建另一层 invocation directory                                | 当前 Check 仍只见自己的 directory           |
| machine / diagnostic target                                              | Definition defaults 加对应 output override                              | owner-private absolute target；diagnostic 按 owner-channel `RunResult` file readback 投影 | 不可见                                      |
| progress transcript target                                               | 仅 `RunControls.progressLogFile`                                        | current-Run absolute target 或 `null`；terminal 仍为 primary presentation                 | 不可见                                      |
| scheduler history、Check cache、candidate state、external-tool workspace | 各自 owner 的 options / lifecycle                                       | 不属于 invocation path representation                                                     | 不可见                                      |

callback capability 按上表投影；完整 context shape 由[Check authoring 指南](../guides/extending-check-lifecycle.md)定义。Check artifactDirectory 从 stable Check ID 确定性派生，采用 bounded filesystem-safe encoding，避免 traversal、component-length 和直接 sanitize collision；raw ID 留在 Check facts。

options 为 canonical authored snapshot 或 invocation-local prepared/fallback；file selection、领域 policy 与 cache 留在 owning options。dependencies 只授权 normalized direct relation union，不授予 transitive 或未声明访问。artifact base、sibling namespace、output target 和 scheduler/cross-Run state 不进入 callback context。

invalid Definition、controls 或 aggregation selection 在 author work 前返回 configuration result。ordinary callback throw、
malformed result、Record misuse 与 cancellation 按 owning execution boundary 结算；精确 `RunResult` branches、durations、
messages 与 Run 分支见 [API 机制](../api-mechanics.md#runresult-分支)，output failure priority 和 readback 见[输出指南](../guides/run-outputs.md#输出状态与失败处理)。

## Run outputs and compatibility boundary

公开的三项 output defaults 与逐字段覆盖由[输出指南](../guides/run-outputs.md#默认输出与本次覆盖)定义；Run 先合成并冻结有效配置，再分别初始化输出，不能从一项 output 开关推断其它输出。以下是维护解析与接线必须保持的约束。

machine/diagnostic directory、artifact base 和 progressLogFile 共用非空、无 U+0000 trusted-target grammar：不 trim 文本，relative 从 effective root resolve，absolute 直接使用，`..` 合法。不额外建立字符禁用表、allowlist、lexical/realpath/symlink containment 或 sandbox。Definition author directory text 进入 fingerprint；Controls paths 不进入。

progress overrides 与 Definition 复用同型 grammar：undefined/省略不覆盖，数量 0 有效，formatter null 明确清除。disabled progress 仍验证全部字段；effective policy 在初始化前冻结，不改变 progress `{ enabled, status }` readback。progressLogFile 是 invocation-only tee，不创建第二 Definition output；terminal-first 与 file-only failure 的实作见[人读输出](human-output.md#lifecycle-与写入)。

Controls output parser 保留各 output object / leaf 的 typed failure，并将共享 progress grammar 的字段诊断映射到
`controls.outputs.<output>.<field>`；无效 object 停在当前 node，unknown key 保留 `unknown-key`，非法值带封闭的
`expected` 提示，不读取 accessor 或回显原值。Definition 使用同一 progress grammar，但仍把 failure 折叠为
既有 `definition.outputs` 诊断，不依赖 Controls error type。消费者的定位方式与提示值由[输出配置诊断](../guides/run-outputs.md#排查输出配置错误)拥有。

Definition、controls 或 aggregation selection 无效时尚无可信 effective output configuration，因此不会创建 output。三项 output 的 status、failure isolation、machine/non-machine 边界与读取顺序由输出指南完整表达。

项目可以绑定 Definition/固定 Controls，向自己的调用方只暴露必要输入；这不新增 Product 配置层。Product 不发现配置文件或提供 CLI/bin，领域 baseline/comparison 由 producing Check 的 options/composition 承接。Gate afterGate 位于 Product RunResult 之后，其配置和失败规则仅见 [Project Gate](../tooling/project-gate.md#gate-result-post-processing-and-exits)，不是 Definition/Controls hook。

### Diagnostic file naming

公开 unique/channel 命名、collision 和状态读取由[输出指南](../guides/run-outputs.md)定义。Controls parser 即使 diagnostics disabled 也验证 closed naming enum；省略/undefined 规范化为 unique。该 control 不属于 Definition/output override，不参与 fingerprint，也不单独启用 diagnostics。

Invocation 只更换 basename；UUID、startedAt、sequence 和 elapsed correlation 保持同一次事实。每 channel 使用 exclusive-create (`wx`)，冲突不覆盖、不追加、不改名回退；两文件不构成事务，一个失败不回滚另一个已创建文件。失败 target 仍进入 channel file readback，事实闭合和 primary/output failure priority 不变。Product 不验证 caller directory 的独占性。
