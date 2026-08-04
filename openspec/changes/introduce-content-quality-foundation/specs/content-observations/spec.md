本 delta spec 为成功质量 capability 定义非阻断、可序列化的 current observation；它是临时 change artifact，尚未完成实现前审计。

## Purpose

让文档长度等确定性数值事实在没有违规 finding 时仍可观察，同时保持 observation 与 acceptance、warning channel、comparison 和 gate 语义分离。

## ADDED Requirements

### Requirement: Observations are registered non-finding facts

Product core SHALL 使用 closed `ObservationRecord` 表达成功 capability 产生的 current-only numeric fact。每条 record MUST 包含 producing `capabilityId`、stable semantic `metricId`、normalized project-relative `path`、closed subject、finite numeric `value` 与 non-empty semantic `unit`。Subject MUST 包含 registered non-empty `kind`、stable non-empty path-local `identity` 与 optional precise source location；它 MAY 包含 human label，但 label MUST NOT 成为 identity。

Descriptor registry SHALL 为会产生 observations 的 capability 声明其 stable metric IDs、每个 metric 允许的 units 与 subject kinds、deterministic ordering，以及 cache-relevant policy projection。Machine JSON Schema SHALL 验证 record structure 与 non-empty semantic identifiers，但 MUST NOT 把 revision-specific registry IDs/units/kinds 枚举进 immutable v2 schema；producing Product revision 的 core/artifact-set validator MUST 用 registry catalog拒绝unknown或不允许的组合。

Observation MUST NOT 包含 acceptance reason、severity、suggestion、finding code、gate state、baseline、delta 或 regression state，也 MUST NOT 进入 finding `all` / `changed` / `regressions` channels。若某项事实违反 policy，capability MAY 另外产生独立 finding；二者 MUST 通过 shared semantic metric/check identity 关联，而不得把 observation 本身变成 warning。

#### Scenario: A compliant document still exposes measurements

- **WHEN** Markdown structure capability 成功计算 document、section 与 paragraph metrics，且没有阈值违规
- **THEN** current observations 保留每个已声明 numeric fact，finding channels保持为空
- **AND** gate 与 acceptance不把 observation计为finding或blocking result

#### Scenario: Registry rejects an unknown observation semantic

- **WHEN** capability result包含未由其descriptor注册的metric ID、unit或subject kind组合
- **THEN** normalized result validation将该capability判为`failed` / `invalid-result`
- **AND** invalid observation不进入machine或human output

### Requirement: Observation source location is precise but portable

Shared source location SHALL 使用 one-based start line/column，以及 optional one-based end line/column和optional zero-based UTF-8 byte offset。End存在时 MUST 不早于start；byte offset仅表示当前source bytes的位置。Observation identity、cache identity与semantic ordering MUST NOT包含absolute host path或仅由line/column/byte offset决定。

Feature capability SHALL 定义自己的path-localsubject identity，使同一input的输出确定且不会因parser/backend wording变化。Location用于定位，不自动承诺跨revisioncomparison；foundation MUST NOT为observations创建baseline或regression语义。

#### Scenario: Line movement changes location, not metric semantics

- **WHEN**同一section因前置空行移动但metric ID、subject identity、value与unit不变
- **THEN**current observation报告新的source location并保留相同semantic identity
- **AND**foundation不据此生成changed/regression finding

### Requirement: Partial observations are discarded on capability failure

Capability只有在全部eligible work完成且observations/findings均通过normalized result validation后才能以`succeeded`发布records。`failed` capability的partial observations MUST与partial findings一起丢弃；`skipped`与`no-input` MUST产生zero observations。Successful capability MAY产生zero observations，当该capability contract只产生findings或eligible inputs没有可发布numeric fact时仍保持`succeeded`。

#### Scenario: Later input failure invalidates partial observations

- **WHEN** capability先计算部分observations，随后required exact input读取或normalized result validation失败
- **THEN**capability final result为`failed`且不发布partial observations/findings
- **AND**human或machine output不能把partial measurement误作complete evidence

### Requirement: Machine and human outputs project current observations once

`MachineMetricsV2` SHALL 包含 required `observations` array，并从 final core current observations通过一个explicit mapper投影；array order MUST 是descriptor registry声明的semantic order。Warning streams MUST NOT复制observations。Human report MAY按capability分组呈现同一records或其deterministic summary，但 MUST NOT重新解析输入、重新计算value或改变machine source order。

Current observations MAY按capability exact input、content fingerprint、rules version与measurement-relevant resolved policy缓存。Baseline snapshot、report text、artifact path与unrelated capability policy MUST NOT进入observation cache identity；需要baseline observation comparison的feature必须另行修改contract。

#### Scenario: Machine output contains the only observation records

- **WHEN**complete scan产生current observations
- **THEN**`metrics.json`的`observations`按declared semantic order包含这些records
- **AND**warning streams不包含它们，report若呈现也从同一core records投影
