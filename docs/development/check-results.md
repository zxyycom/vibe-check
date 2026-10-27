# Check 结果

本文拥有 Check/Record 的 canonical settlement、terminal closure 与 aggregation 接线不变量。公开的四态、Record 与 aggregation 语义由 [API 机制](../api-mechanics.md)定义；本页按实现职责解释这些承诺。每项随包 Check 的领域 options、
outcome、final data、Record、message 与不可用原因由对应[随包 Check 指南](../navigation.md#随包-check-指南)拥有。Definition authoring 与 typed direct dependency readback 见 [Project Definition](project-definition.md#typed-dependency-data)；machine DTO/bytes 见 [Output](../output.md)；repository Gate
adapter 见 [脚本工具](../tooling/project-gate.md)。本文不拥有 scanner commands、machine serialization、argv parsing、
generic scheduler 或 human presentation grammar。

## Check and Record facts

`check-settlement/**` 为每个 canonical executable Check 恰好 register 一次，接受 terminal result 和 Check-owned supplemental Records，最后只冻结 `{ checks, records }`。Task identity、callback、scheduler bookkeeping、scanner-private payload 和 invocation-private handoff 不是 Check facts。

package-private settled Check seam 与冻结快照复用同一 canonical final-data 引用，供运行时依赖读取使用，不建立第二份事实来源。

settlement 保持已校验注册集合的高效身份与 reason ownership 查询，并以稳定 canonical 顺序枚举 cancellation closure
与最终 Check facts；索引不得形成第二份生命周期或事实来源。

Definition 先 flatten canonical executable catalog，`check-settlement/**` 为每项保存一个 terminal fact。公开[四态与 data grammar](../api-mechanics.md#terminal-resultrecords-与-messages)在这里闭合：passed/failed 必须有 canonical final data；not-applicable/unavailable 不伪造 data。

Scheduler 区分 `observes` 终态等待与 `dependsOn` passed prerequisite；prerequisite-blocked settlement 保留 direct non-passed checkIds、null duration 且不运行 author work。dependency readback 与不进入 Check facts 的
invocation-private handoff 由 [Project Run](project-run.md#依赖读取与引用生命周期) 完整拥有。

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
接受的 terminal-message readback。自定义 Check 的 business parser、field schema 与 sensitive-content policy 属于
consumer/provider，不由 Product registry、catalog、extractor 或 presentation fallback 提供。package-provided Check 是
provider 自己拥有该责任的具体实例：各项附带并从 package root 导出自己的 final-data parser，具体入口见
[随包 Check 指南](../navigation.md#随包-check-指南)；它们不形成 generic registry 或 machine artifact reader。

## Package-provided ordinary Checks and exact inputs

随包 Check 使用同一 settlement/reporting contract；Definition、Run、aggregation 与 machine publisher 不识别其 ID/options domain。adapter、parse、cache、I/O 或 exact-input failure 只结算 owning Check，不建立第二 quality model。

领域字段、Finding identity、状态映射和 messages 完整由各[Check 指南](../navigation.md#随包-check-指南)拥有。Check-owned Finding 摘要与 generic Record preview 是独立呈现：前者选择安全字段、上限和明细入口，后者只读 local ID/canonical JSON，不解释 Finding。共享 helper 见[呈现指南](../guides/presenting-findings.md)，exact-input 接线见 [Project files](project-files.md)。

## Effective aggregation and repository Gate mapping

aggregation 是 invocation-derived result，不是 Check-facts status 或隐式质量策略。完整 settlement 后，Run 从唯一 private flag-and-`dependsOn` effective selection（含 activated prerequisites）按 canonical order 取出 `CoreCheck[]`；不会重新解析、公开成员 resolver 或投影未选 Check。公开函数与默认折叠由[API 机制](../api-mechanics.md)定义。

默认折叠只在有效列表非空且全部为 `passed` 时返回 `passed`，其余情况返回 `failed`。提供的 caller-local 同步函数可返回任一四态；它读取完整的 selected `CoreCheck`（包括 passed/failed final data），却不能复制或改写 final data、Records、messages、definition warnings、output statuses、progress presentation 或任何原始 facts。函数错误或非法返回拒绝整个 `run` Promise，而不伪造有 aggregate 的 RunResult。

repository Gate 绑定选择并消费 Product aggregate，不重建或改写 Check facts；其选择闭包、resultContributor 与
exit 映射由 [Project Gate](../tooling/project-gate.md) 拥有。

## Verification

current evidence 覆盖 recursive Definition validation、direct callback four-state outcomes、canonical final/Record data、
Check-facts ownership/terminal closure、prerequisites/cancellation、effective aggregation、Check-owned scanner exact inputs/cache 和
Gate exit mapping。machine schema/example/publication evidence 见 [Output](../output.md)；Case catalog 与验证入口见
[Testing](../testing/strategy.md)。
